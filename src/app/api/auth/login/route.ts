import { NextResponse } from "next/server";

import { localeFromRequest } from "@/lib/auth-locale";
import { mapCognitoError } from "@/lib/cognito-errors";
import { signIn } from "@/lib/cognito-server";
import { setAuthSession } from "@/lib/session";

export async function POST(request: Request) {
  const locale = localeFromRequest(request);

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "ValidationError",
          message:
            locale === "es" ? "Introduce correo y contraseña." : "Email and password are required.",
        },
        { status: 400 },
      );
    }

    const tokens = await signIn({ email, password });
    await setAuthSession(tokens);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapCognitoError(err, locale);
    const status = mapped.error === "UserNotConfirmedException" ? 403 : 401;
    return NextResponse.json(mapped, { status });
  }
}
