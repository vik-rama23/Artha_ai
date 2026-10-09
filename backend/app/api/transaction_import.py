import csv
from datetime import date
from decimal import Decimal, InvalidOperation
from io import StringIO
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.accounts import Account
from app.models.categories import Category
from app.models.transactions import Transaction
from app.models.users import User
from app.services.transactions import recalculate_account_balance, validate_account, validate_category


router = APIRouter(prefix="/api/v1/transactions/import", tags=["Transaction Import"])
MAX_CSV_BYTES = 2_000_000
MAX_ROWS = 5000
FIELDS = {"transaction_date", "transaction_type", "amount", "account", "category", "merchant", "description", "notes"}
REQUIRED_FIELDS = {"transaction_date", "transaction_type", "amount", "account"}


class ImportMapping(BaseModel):
    transaction_date: str
    transaction_type: str
    amount: str
    account: str
    category: str | None = None
    merchant: str | None = None
    description: str | None = None
    notes: str | None = None


class ImportRequest(BaseModel):
    csv_content: str = Field(min_length=1)
    mapping: ImportMapping


def _parse_rows(db: Session, user_id: UUID, payload: ImportRequest):
    if len(payload.csv_content.encode("utf-8")) > MAX_CSV_BYTES:
        raise HTTPException(status_code=413, detail="CSV file must be 2 MB or smaller.")

    try:
        reader = csv.DictReader(StringIO(payload.csv_content.lstrip("\ufeff")))
        headers = [str(header or "").strip() for header in (reader.fieldnames or [])]
        if not headers or any(not header for header in headers):
            raise HTTPException(status_code=400, detail="CSV must contain a header row with column names.")
        if len(set(headers)) != len(headers):
            raise HTTPException(status_code=400, detail="CSV contains duplicate column names.")
        if len(headers) > 100:
            raise HTTPException(status_code=400, detail="CSV contains too many columns.")
        mapping = payload.mapping.model_dump()
        for field in REQUIRED_FIELDS:
            if mapping.get(field) not in headers:
                raise HTTPException(status_code=400, detail=f"Select a CSV column for {field.replace('_', ' ')}.")
        for field, header in mapping.items():
            if header and header not in headers:
                raise HTTPException(status_code=400, detail=f"Mapped column '{header}' was not found in the CSV.")
        raw_rows = list(reader)
    except csv.Error as exc:
        raise HTTPException(status_code=400, detail=f"Unable to read CSV: {exc}") from exc

    if len(raw_rows) > MAX_ROWS:
        raise HTTPException(status_code=413, detail=f"CSV can contain at most {MAX_ROWS} rows.")
    accounts = db.query(Account).filter(Account.user_id == user_id).all()
    categories = db.query(Category).filter(
        Category.is_active.is_(True),
        ((Category.user_id == user_id) | (Category.is_system.is_(True))),
    ).all()
    account_by_name = {a.name.strip().casefold(): a for a in accounts}
    category_by_name_type = {(c.name.strip().casefold(), c.category_type): c for c in categories}
    output = []
    seen = set()

    for row_number, raw in enumerate(raw_rows, start=2):
        errors = []
        def value(field):
            header = mapping.get(field)
            return (raw.get(header, "") or "").strip() if header else ""

        try:
            parsed_date = date.fromisoformat(value("transaction_date"))
        except ValueError:
            parsed_date = None
            errors.append("Date must use YYYY-MM-DD format.")
        tx_type = value("transaction_type").upper()
        if tx_type not in {"INCOME", "EXPENSE"}:
            errors.append("Type must be INCOME or EXPENSE.")
        try:
            amount = Decimal(value("amount").replace(",", "").replace("₹", "").strip())
            if not amount.is_finite() or amount <= 0 or amount.as_tuple().exponent < -2 or amount > Decimal("9999999999999.99"):
                raise InvalidOperation
        except (InvalidOperation, ValueError):
            amount = None
            errors.append("Amount must be a positive number with up to 2 decimal places.")
        account = account_by_name.get(value("account").casefold())
        if account is None:
            errors.append(f"Account '{value('account') or '(blank)'}' does not match an account you own.")
        category_name = value("category")
        category = category_by_name_type.get((category_name.casefold(), tx_type)) if category_name and tx_type in {"INCOME", "EXPENSE"} else None
        if category_name and category is None:
            errors.append(f"Category '{category_name}' does not match an active {tx_type.lower()} category.")
        description = value("description") or None
        merchant = value("merchant") or None
        notes = value("notes") or None
        duplicate = False
        signature = None
        if parsed_date and amount is not None and tx_type in {"INCOME", "EXPENSE"} and account:
            signature = (parsed_date.isoformat(), tx_type, str(amount), str(account.id), (merchant or "").casefold(), (description or "").casefold())
            duplicate = signature in seen
            if not duplicate:
                existing_query = db.query(Transaction.id).filter(
                    Transaction.user_id == user_id,
                    Transaction.account_id == account.id,
                    Transaction.transaction_date == parsed_date,
                    Transaction.transaction_type == tx_type,
                    Transaction.amount == amount,
                )
                if merchant:
                    existing_query = existing_query.filter(Transaction.merchant == merchant)
                elif description:
                    existing_query = existing_query.filter(Transaction.description == description)
                duplicate = existing_query.first() is not None
            if duplicate:
                errors.append("Possible duplicate transaction; this row will be skipped.")
            else:
                seen.add(signature)
        if len(description or "") > 255:
            errors.append("Description exceeds 255 characters.")
        if len(merchant or "") > 150:
            errors.append("Merchant exceeds 150 characters.")
        output.append({
            "row_number": row_number,
            "transaction_date": parsed_date.isoformat() if parsed_date else value("transaction_date"),
            "transaction_type": tx_type,
            "amount": str(amount) if amount is not None else value("amount"),
            "account": account.name if account else value("account"),
            "account_id": str(account.id) if account else None,
            "category": category.name if category else (category_name or "Uncategorized"),
            "category_id": str(category.id) if category else None,
            "merchant": merchant,
            "description": description,
            "notes": notes,
            "errors": errors,
            "valid": not errors,
            "duplicate": duplicate,
        })
    return output


@router.post("/preview")
def preview_import(
    payload: ImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = _parse_rows(db, current_user.id, payload)
    return {
        "total_rows": len(rows),
        "valid_rows": sum(1 for row in rows if row["valid"]),
        "skipped_rows": sum(1 for row in rows if not row["valid"]),
        "rows": rows,
    }


@router.post("/confirm")
def confirm_import(
    payload: ImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = _parse_rows(db, current_user.id, payload)
    valid_rows = [row for row in rows if row["valid"]]
    if not valid_rows:
        return {"imported_count": 0, "skipped_count": len(rows), "message": "No valid rows to import."}

    account_ids = {UUID(row["account_id"]) for row in valid_rows}
    try:
        for row in valid_rows:
            account_id = UUID(row["account_id"])
            category_id = UUID(row["category_id"]) if row["category_id"] else None
            validate_account(db, current_user.id, account_id)
            validate_category(db, current_user.id, category_id, row["transaction_type"])
            db.add(Transaction(
                user_id=current_user.id,
                account_id=account_id,
                category_id=category_id,
                transaction_type=row["transaction_type"],
                amount=Decimal(row["amount"]),
                transaction_date=date.fromisoformat(row["transaction_date"]),
                merchant=row["merchant"],
                description=row["description"],
                notes=row["notes"],
            ))
        db.flush()
        for account_id in account_ids:
            recalculate_account_balance(db, account_id)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Import could not be saved. No transactions were imported; review account/category mappings and try again.")

    return {
        "imported_count": len(valid_rows),
        "skipped_count": len(rows) - len(valid_rows),
        "message": f"Imported {len(valid_rows)} transaction(s).",
    }
