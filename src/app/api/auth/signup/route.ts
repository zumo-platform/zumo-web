import { NextResponse } from "next/server";

import { mapCognitoError } from "@/lib/cognito-errors";
import { signUp } from "@/lib/cognito-server";

export async function POST(request: Request) {
  try {
    const { fullName, businessName, email, password } = await request.json();

    if (!email || !password || !fullName || !businessName) {
      return NextResponse.json(
        { error: "ValidationError", message: "fullName, businessName, email, and password are required." },
        { status: 400 },
      );
    }

    await signUp({ fullName, businessName, email, password });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapCognitoError(err);
    return NextResponse.json(mapped, { status: 400 });
  }
}
