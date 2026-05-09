import { NextResponse } from "next/server";

import { localeFromRequest } from "@/lib/auth-locale";
import { mapCognitoError } from "@/lib/cognito-errors";
import { cognitoAppClientId, resendConfirmationCode } from "@/lib/cognito-server";

export async function POST(request: Request) {
  const locale = localeFromRequest(request);

  try {
    const { email } = await request.json();

    if (!cognitoAppClientId()) {
      return NextResponse.json(
        {
          error: "ConfigurationError",
          message:
            locale === "es"
              ? "Falta el ID del cliente de Cognito. Revisa COGNITO_USER_POOL_CLIENT_ID / NEXT_PUBLIC_COGNITO_CLIENT_ID en .env.local."
              : "Missing Cognito app client id. Set COGNITO_USER_POOL_CLIENT_ID or NEXT_PUBLIC_COGNITO_CLIENT_ID in .env.local.",
        },
        { status: 503 },
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        {
          error: "ValidationError",
          message:
            locale === "es"
              ? "Introduce tu correo para reenviar el código."
              : "Enter your email to resend the code.",
        },
        { status: 400 },
      );
    }

    await resendConfirmationCode({ email: email.trim().toLowerCase() });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapCognitoError(err, locale);

    /** Resend for an already-verified email often arrives as NotAuthorized — suggest sign-in instead. */
    if (mapped.error === "NotAuthorizedException") {
      return NextResponse.json(
        {
          error: "NotAuthorizedException",
          message:
            locale === "es"
              ? "No pudimos enviar otro código. Si ya confirmaste tu cuenta, inicia sesión; si acabas de registrarte, espera un minuto antes de intentar de nuevo."
              : "Could not send another code. If you already confirmed, sign in; otherwise wait a minute and try again.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(mapped, { status: 400 });
  }
}
