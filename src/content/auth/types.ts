export type AuthMessages = {
  metaTitle: string;
  metaDescription: string;
  subtitle: string;
  langSwitcherAria: string;
  langEs: string;
  langEn: string;
  tabSignIn: string;
  tabSignUp: string;
  signInTitle: string;
  signInDescription: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailHint: string;
  passwordLabel: string;
  forgotPassword: string;
  submitSignIn: string;
  signUpTitle: string;
  signUpDescription: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  companyLabel: string;
  companyPlaceholder: string;
  phoneLabel: string;
  phoneHint: string;
  phoneInvalid: string;
  submitSignUp: string;
  confirmTitle: string;
  confirmDescription: string;
  /** Deliverability expectation (spam folder, Cognito delay). */
  confirmCodeDeliveryHint: string;
  confirmCodeLabel: string;
  confirmCodePlaceholder: string;
  confirmResendCode: string;
  /** Shown during resend request. */
  confirmResending: string;
  /** After successful resend. */
  confirmResendToast: string;
  /** Countdown on resend button; must include `{seconds}` placeholder (serializable for RSC → client). */
  confirmResendWait: string;
  submitConfirm: string;
  backToSignIn: string;
  backToLanding: string;
  showPassword: string;
  hidePassword: string;
  /** Shown when auth API fails to respond or returns non‑JSON body */
  authNetworkError: string;
  /** After signup succeeds — explains Cognito mail can be slow */
  signupCreatedCheckEmail: string;
  /** Resend tapped without a valid-looking email */
  resendEmailRequired: string;
  /** Confirm step: invalid email before submit */
  confirmEmailInvalid: string;
  /** @deprecated kept for TS compat with existing callers */
  toastPreview: string;
};
