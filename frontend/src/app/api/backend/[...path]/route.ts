import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8001";

const ACCESS_TOKEN_COOKIE =
  "artha_access_token";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxyRequest(
  request: NextRequest,
  path: string[]
) {
  const token = request.cookies.get(
    ACCESS_TOKEN_COOKIE
  )?.value;

  if (!token) {
    return NextResponse.json(
      {
        detail: "Authentication required.",
      },
      {
        status: 401,
      }
    );
  }

  const targetPath = path.join("/");

  const targetUrl = new URL(
    `${API_BASE_URL}/${targetPath}`
  );

  request.nextUrl.searchParams.forEach(
    (value, key) => {
      targetUrl.searchParams.append(
        key,
        value
      );
    }
  );

  const headers = new Headers();

  const contentType =
    request.headers.get("content-type");

  if (contentType) {
    headers.set(
      "content-type",
      contentType
    );
  }

  headers.set(
    "Authorization",
    `Bearer ${token}`
  );

  const body =
    request.method === "GET" ||
    request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  try {
    const response = await fetch(
      targetUrl.toString(),
      {
        method: request.method,
        headers,
        body,
        cache: "no-store",
      }
    );

    /*
     * IMPORTANT:
     *
     * A DELETE endpoint can legitimately return
     * 204 No Content.
     *
     * Do not try to forward an ArrayBuffer body
     * for a 204 response.
     */
    if (response.status === 204) {
      return new NextResponse(null, {
        status: 204,
      });
    }

    const responseBody =
      await response.arrayBuffer();

    const responseHeaders =
      new Headers();

    const responseContentType =
      response.headers.get(
        "content-type"
      );

    if (responseContentType) {
      responseHeaders.set(
        "content-type",
        responseContentType
      );
    }

    return new NextResponse(
      responseBody,
      {
        status: response.status,
        headers: responseHeaders,
      }
    );
  } catch {
    return NextResponse.json(
      {
        detail:
          "Unable to connect to the Artha API.",
      },
      {
        status: 502,
      }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params;

  return proxyRequest(
    request,
    path
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params;

  return proxyRequest(
    request,
    path
  );
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params;

  return proxyRequest(
    request,
    path
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params;

  return proxyRequest(
    request,
    path
  );
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params;

  return proxyRequest(
    request,
    path
  );
}