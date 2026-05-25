import { NextResponse } from "next/server";

import { localeFromRequest } from "@/lib/auth-locale";
import { mapCognitoError } from "@/lib/cognito-errors";
import { cognitoAppClientId, signUp } from "@/lib/cognito-server";

export async function POST(request: Request) {
  const locale = localeFromRequest(request);

  try {
    const { fullName, businessName, email, password, phone, country } = await request.json();

    if (!cognitoAppClientId()) {
      return NextResponse.json(
        {
          error: "ConfigurationError",
          message:
            locale === "es"
              ? "Falta el ID del cliente de Cognito. Añade COGNITO_USER_POOL_CLIENT_ID o NEXT_PUBLIC_COGNITO_CLIENT_ID en .env.local (mismo valor que en el dashboard SST)."
              : "Missing Cognito app client id. Set COGNITO_USER_POOL_CLIENT_ID or NEXT_PUBLIC_COGNITO_CLIENT_ID in .env.local (same value SST uses for NEXT_PUBLIC_COGNITO_CLIENT_ID).",
        },
        { status: 503 },
      );
    }

    if (!email || !password || !fullName || !businessName || !phone || !country) {
      return NextResponse.json(
        {
          error: "ValidationError",
          message:
            locale === "es"
              ? "Nombre, empresa, correo, contraseña, país y teléfono son obligatorios."
              : "fullName, businessName, email, password, country, and phone (E.164) are required.",
        },
        { status: 400 },
      );
    }

    await signUp({ fullName, businessName, email, password, phone, country });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapCognitoError(err, locale);
    return NextResponse.json(mapped, { status: 400 });
  }
}
