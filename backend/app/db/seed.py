import uuid
from decimal import Decimal

from app.db.session import SessionLocal
from app.models.accounts import Account
from app.models.categories import Category
from app.models.users import User


def seed() -> None:
    db = SessionLocal()

    try:
        # Check whether our test user already exists.
        user = db.query(User).filter(
            User.email == "demo@artha.local"
        ).first()

        if user is None:
            user = User(
                id=uuid.uuid4(),
                email="demo@artha.local",
                password_hash="demo-password-hash",
                full_name="Artha Demo User",
                currency="INR",
                timezone="Asia/Kolkata",
            )

            db.add(user)
            db.flush()

        # Create demo account if it doesn't exist.
        account = db.query(Account).filter(
            Account.user_id == user.id,
            Account.name == "HDFC Salary Account",
        ).first()

        if account is None:
            account = Account(
                id=uuid.uuid4(),
                user_id=user.id,
                name="HDFC Salary Account",
                account_type="BANK",
                institution_name="HDFC Bank",
                account_number_last4="1234",
                opening_balance=Decimal("155000.00"),
                current_balance=Decimal("155000.00"),
                currency="INR",
            )

            db.add(account)

        # Create demo category if it doesn't exist.
        category = db.query(Category).filter(
            Category.name == "Groceries",
            Category.user_id == user.id,
        ).first()

        if category is None:
            category = Category(
                id=uuid.uuid4(),
                user_id=user.id,
                name="Groceries",
                category_type="EXPENSE",
                icon="shopping-cart",
                is_system=False,
                is_active=True,
            )

            db.add(category)

        db.commit()

        print("Seed completed successfully.")
        print(f"User ID:     {user.id}")
        print(f"Account ID:  {account.id}")
        print(f"Category ID: {category.id}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed()