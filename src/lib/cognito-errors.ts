export type CognitoErrorCode =
  | "UserNotConfirmedException"
  | "UsernameExistsException"
  | "CodeMismatchException"
  | "ExpiredCodeException"
  | "NotAuthorizedException"
  | "UserNotFoundException"
  | "InvalidPasswordException"
  | "TooManyRequestsException"
  | "LimitExceededException"
  | "UnknownError";

const messages: Record<CognitoErrorCode, string> = {
  UserNotConfirmedException:
    "Your account is not confirmed. Enter the code sent to your email.",
  UsernameExistsException:
    "An account with this email already exists.",
  CodeMismatchException:
    "The confirmation code is incorrect.",
  ExpiredCodeException:
    "The confirmation code expired. Request a new code later.",
  NotAuthorizedException:
    "Invalid email or password.",
  UserNotFoundException:
    "Invalid email or password.",
  InvalidPasswordException:
    "Password does not meet requirements (min 8 chars, upper, lower, number).",
  TooManyRequestsException:
    "Too many attempts. Please wait a moment and try again.",
  LimitExceededException:
    "Too many attempts. Please wait a moment and try again.",
  UnknownError:
    "An unexpected error occurred. Please try again.",
};

export function mapCognitoError(err: unknown): {
  error: CognitoErrorCode;
  message: string;
} {
  if (err && typeof err === "object" && "name" in err) {
    const name = (err as { name: string }).name as CognitoErrorCode;
    if (name in messages) {
      return { error: name, message: messages[name] };
    }
  }
  return { error: "UnknownError", message: messages.UnknownError };
}
