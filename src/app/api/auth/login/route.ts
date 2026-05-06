import { NextResponse } from "next/server";

import { mapCognitoError } from "@/lib/cognito-errors";
import { signIn } from "@/lib/cognito-server";
import { setAuthSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "ValidationError", message: "email and password are required." },
        { status: 400 },
      );
    }

    const tokens = await signIn({ email, password });
    await setAuthSession(tokens);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapCognitoError(err);
    const status = mapped.error === "UserNotConfirmedException" ? 403 : 401;
    return NextResponse.json(mapped, { status });
  }
}
