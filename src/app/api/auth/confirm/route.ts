import { NextResponse } from "next/server";

import { localeFromRequest } from "@/lib/auth-locale";
import { mapCognitoError } from "@/lib/cognito-errors";
import { confirmSignUp } from "@/lib/cognito-server";

export async function POST(request: Request) {
  const locale = localeFromRequest(request);

  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        {
          error: "ValidationError",
          message:
            locale === "es" ? "Introduce correo y código." : "Email and confirmation code are required.",
        },
        { status: 400 },
      );
    }

    await confirmSignUp({ email, code });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapCognitoError(err, locale);
    return NextResponse.json(mapped, { status: 400 });
  }
}
