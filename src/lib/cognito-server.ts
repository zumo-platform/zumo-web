import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

/** App client ID for USER_PASSWORD_SIGNUP / initiate auth — same ID whether read server-only or NEXT_PUBLIC_* (parity with SST `NEXT_PUBLIC_COGNITO_CLIENT_ID`). */
export function cognitoAppClientId(): string {
  return (
    process.env.COGNITO_USER_POOL_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID?.trim() ||
    ""
  );
}

const region = process.env.AWS_REGION ?? "us-east-2";

const cognito = new CognitoIdentityProviderClient({ region });

export async function signUp(input: {
  fullName: string;
  businessName: string;
  email: string;
  password: string;
  /** E.164 — stored as Cognito standard `phone_number` and copied to seller.phone in post-confirmation. */
  phone: string;
  /** ISO 3166-1 alpha-2 from onboarding country selector (e.g. CR). */
  country: string;
}): Promise<void> {
  const ClientId = cognitoAppClientId();
  await cognito.send(
    new SignUpCommand({
      ClientId,
      Username: input.email.trim().toLowerCase(),
      Password: input.password,
      UserAttributes: [
        { Name: "email", Value: input.email.trim().toLowerCase() },
        { Name: "name", Value: input.fullName },
        { Name: "custom:businessName", Value: input.businessName },
        { Name: "custom:country", Value: input.country.trim().toUpperCase() },
        { Name: "phone_number", Value: input.phone },
      ],
    }),
  );
}

export async function confirmSignUp(input: {
  email: string;
  code: string;
}): Promise<void> {
  await cognito.send(
    new ConfirmSignUpCommand({
      ClientId: cognitoAppClientId(),
      Username: input.email,
      ConfirmationCode: input.code,
    }),
  );
}

export async function resendConfirmationCode(input: { email: string }): Promise<void> {
  const ClientId = cognitoAppClientId();
  await cognito.send(
    new ResendConfirmationCodeCommand({
      ClientId,
      Username: input.email.trim().toLowerCase(),
    }),
  );
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthTokens> {
  const res = await cognito.send(
    new InitiateAuthCommand({
      ClientId: cognitoAppClientId(),
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: input.email,
        PASSWORD: input.password,
      },
    }),
  );

  const result = res.AuthenticationResult;
  if (!result?.IdToken || !result.AccessToken || !result.RefreshToken) {
    throw new Error("Incomplete authentication result from Cognito");
  }

  return {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
    expiresIn: result.ExpiresIn ?? 3600,
  };
}

/** New id/access tokens when the refresh cookie is still valid but id/access cookies expired. */
export async function refreshAuthSession(refreshToken: string): Promise<AuthTokens> {
  const res = await cognito.send(
    new InitiateAuthCommand({
      ClientId: cognitoAppClientId(),
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    }),
  );

  const result = res.AuthenticationResult;
  if (!result?.IdToken || !result?.AccessToken) {
    throw new Error("Incomplete refresh result from Cognito");
  }

  return {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken ?? refreshToken,
    expiresIn: result.ExpiresIn ?? 3600,
  };
}
