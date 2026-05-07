import { NextResponse } from "next/server";

import { mapCognitoError } from "@/lib/cognito-errors";
import { signUp } from "@/lib/cognito-server";

export async function POST(request: Request) {
  try {
    const { fullName, businessName, email, password, phone } = await request.json();

    if (!email || !password || !fullName || !businessName || !phone) {
      return NextResponse.json(
        {
          error: "ValidationError",
          message:
            "fullName, businessName, email, password, and phone (E.164) are required.",
        },
        { status: 400 },
      );
    }

    await signUp({ fullName, businessName, email, password, phone });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapCognitoError(err);
    return NextResponse.json(mapped, { status: 400 });
  }
}
