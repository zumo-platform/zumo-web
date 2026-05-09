import type { MarketingLocale } from "@/lib/marketing-locale";

export type KnownCognitoErrorCode =
  | "UserNotConfirmedException"
  | "UsernameExistsException"
  | "CodeMismatchException"
  | "ExpiredCodeException"
  | "NotAuthorizedException"
  | "UserNotFoundException"
  | "InvalidPasswordException"
  | "TooManyRequestsException"
  | "LimitExceededException"
  | "InvalidParameterException"
  | "ResourceNotFoundException";

export type MapCognitoErrorResult = Readonly<{
  error: string;
  message: string;
}>;

const BY_CODE: Partial<Record<KnownCognitoErrorCode, Record<MarketingLocale, string>>> = {
  UserNotConfirmedException: {
    es: "Tu cuenta no está confirmada. Introduce el código que enviamos a tu correo.",
    en: "Your account is not confirmed. Enter the code sent to your email.",
  },
  UsernameExistsException: {
    es: "Ya existe una cuenta con ese correo.",
    en: "An account with this email already exists.",
  },
  CodeMismatchException: {
    es: "El código de confirmación no es válido.",
    en: "The confirmation code is incorrect.",
  },
  ExpiredCodeException: {
    es: "El código caducó. Pulsa «Enviar otro código» para recibir uno nuevo.",
    en: "The confirmation code expired. Use “Send another code” to get a new one.",
  },
  NotAuthorizedException: {
    es: "Correo o contraseña incorrectos.",
    en: "Invalid email or password.",
  },
  UserNotFoundException: {
    es: "Correo o contraseña incorrectos.",
    en: "Invalid email or password.",
  },
  InvalidPasswordException: {
    es: "La contraseña debe tener al menos 8 caracteres, con mayúscula, minúscula y un número.",
    en: "Password does not meet requirements (min 8 chars, upper, lower, number).",
  },
  TooManyRequestsException: {
    es: "Demasiados intentos. Espera un momento.",
    en: "Too many attempts. Please wait a moment and try again.",
  },
  LimitExceededException: {
    es: "Demasiados intentos. Espera un momento.",
    en: "Too many attempts. Please wait a moment and try again.",
  },
  InvalidParameterException: {
    es: "Los datos enviados no son válidos. Revisa el teléfono (formato internacional completo si lo pegaste con +) y demás campos.",
    en: "One of the signup fields could not be accepted. Double-check phone (national digits only unless you pasted full +number) and other fields.",
  },
  ResourceNotFoundException: {
    es: "No se encontró Cognito para esta configuración (revisa AWS_REGION y COGNITO / NEXT_PUBLIC_COGNITO client id).",
    en: "Cognito pool or client not found — check AWS_REGION and your Cognito / NEXT_PUBLIC_COGNITO client id env vars.",
  },
};

function fallbackUnknown(locale: MarketingLocale): string {
  return locale === "es"
    ? "No se pudo completar la operación. Inténtalo de nuevo."
    : "Something went wrong. Please try again.";
}

function credentialHint(locale: MarketingLocale): string {
  return locale === "es"
    ? "Next.js no pudo obtener credenciales de AWS para llamar a Cognito. Pon AWS_PROFILE=zumo-dev (o tu perfil) y AWS_REGION=us-east-2 en .env.local, ejecuta `aws sso login --profile zumo-dev` y reinicia `pnpm dev`."
    : "The server cannot call Cognito — missing AWS credentials. Set AWS_PROFILE and AWS_REGION in .env.local (e.g. zumo-dev + us-east-2), run `aws sso login`, then restart `pnpm dev`.";
}

function errName(err: unknown): string | undefined {
  if (err && typeof err === "object" && "name" in err) {
    const n = (err as { name: unknown }).name;
    return typeof n === "string" ? n : undefined;
  }
  return undefined;
}

function errMessage(err: unknown): string | undefined {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    return typeof m === "string" ? m : undefined;
  }
  return undefined;
}

function looksLikeMissingAwsCredentials(message: string, name: string | undefined): boolean {
  const m = message.toLowerCase();
  return (
    name === "CredentialsProviderError" ||
    m.includes("could not load credentials") ||
    m.includes("credentials provider") ||
    m.includes("failed to retrieve credentials") ||
    m.includes("resolved credential object is not valid")
  );
}

export function mapCognitoError(err: unknown, locale: MarketingLocale): MapCognitoErrorResult {
  const name = errName(err);
  const rawMessage = errMessage(err) ?? "";

  if (looksLikeMissingAwsCredentials(rawMessage, name)) {
    return { error: name ?? "CredentialsError", message: credentialHint(locale) };
  }

  if (name && name in BY_CODE) {
    const row = BY_CODE[name as KnownCognitoErrorCode]!;
    return { error: name, message: row[locale] };
  }

  if (typeof name === "string" && /^[A-Za-z]+$/.test(name) && rawMessage.trim()) {
    return { error: name, message: rawMessage.trim() };
  }

  return { error: name ?? "UnknownError", message: fallbackUnknown(locale) };
}
