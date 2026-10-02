import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8001";

type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    currency: string;
    timezone: string;
  };
};

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/api/v1/auth/login`,
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
            "Login failed.",
        },
        {
          status: response.status,
        }
      );
    }

    const loginData =
      data as LoginResponse;

    const nextResponse =
      NextResponse.json({
        user: loginData.user,
        expires_in:
          loginData.expires_in,
      });

    nextResponse.cookies.set(
      "artha_access_token",
      loginData.access_token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: loginData.expires_in,
      }
    );

    return nextResponse;
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