import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const region = process.env.AWS_REGION ?? "us-east-2";
const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID ?? "";

const cognito = new CognitoIdentityProviderClient({ region });

export async function signUp(input: {
  fullName: string;
  businessName: string;
  email: string;
  password: string;
}): Promise<void> {
  await cognito.send(
    new SignUpCommand({
      ClientId: clientId,
      Username: input.email,
      Password: input.password,
      UserAttributes: [
        { Name: "email", Value: input.email },
        { Name: "name", Value: input.fullName },
        { Name: "custom:businessName", Value: input.businessName },
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
      ClientId: clientId,
      Username: input.email,
      ConfirmationCode: input.code,
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
      ClientId: clientId,
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
