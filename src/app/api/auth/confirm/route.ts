import { NextResponse } from "next/server";

import { mapCognitoError } from "@/lib/cognito-errors";
import { confirmSignUp } from "@/lib/cognito-server";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "ValidationError", message: "email and code are required." },
        { status: 400 },
      );
    }

    await confirmSignUp({ email, code });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapCognitoError(err);
    return NextResponse.json(mapped, { status: 400 });
  }
}
