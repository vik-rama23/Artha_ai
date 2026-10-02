import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8001";

type RegisterResponse = {
  id: string;
  email: string;
  full_name: string | null;
  currency: string;
  timezone: string;
};

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/api/v1/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          detail:
            data?.detail ??
            "Registration failed.",
        },
        {
          status: response.status,
        }
      );
    }

    const registerData =
      data as RegisterResponse;

    return NextResponse.json(
      {
        user: registerData,
      },
      {
        status: 201,
      }
    );
  } catch {
    return NextResponse.json(
      {
        detail:
          "Unable to connect to the authentication service.",
      },
      {
        status: 500,
      }
    );
  }
}