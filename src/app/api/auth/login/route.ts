import { NextResponse } from "next/server";

import { localeFromRequest } from "@/lib/auth-locale";
import { mapCognitoError } from "@/lib/cognito-errors";
import { signIn } from "@/lib/cognito-server";
import { setAuthSession } from "@/lib/session";

export async function POST(request: Request) {
  const locale = localeFromRequest(request);

  try {
    const { email, password } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        {
          error: "ValidationError",
          message:
            locale === "es" ? "Introduce correo y contraseña." : "Email and password are required.",
        },
        { status: 400 },
      );
    }

    const tokens = await signIn({ email: normalizedEmail, password });
    await setAuthSession(tokens);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapCognitoError(err, locale);
    const loginMapped =
      mapped.error === "InvalidParameterException"
        ? {
            error: "NotAuthorizedException",
            message:
              locale === "es" ? "Correo o contraseña incorrectos." : "Invalid email or password.",
          }
        : mapped;
    const status = loginMapped.error === "UserNotConfirmedException" ? 403 : 401;
    return NextResponse.json(loginMapped, { status });
  }
}
