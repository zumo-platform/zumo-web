import type { MarketingLocale } from "@/lib/marketing-locale";

import type { AuthMessages } from "./types";

const authMessagesEs: AuthMessages = {
  metaTitle: "Iniciar sesión",
  metaDescription: "Accede al panel de distribuidor Zumo.",
  subtitle: "Inicia sesión o crea una cuenta para tu espacio de trabajo.",
  langSwitcherAria: "Idioma",
  langEs: "ES",
  langEn: "EN",
  tabSignIn: "Iniciar sesión",
  tabSignUp: "Registrarse",
  signInTitle: "Bienvenido de nuevo",
  signInDescription: "Entra con tu correo y contraseña.",
  emailLabel: "Correo electrónico",
  emailPlaceholder: "tu@gmail.com",
  emailHint: "Puedes usar Gmail, Outlook u otro proveedor.",
  passwordLabel: "Contraseña",
  forgotPassword: "¿Olvidaste tu contraseña?",
  submitSignIn: "Iniciar sesión",
  signUpTitle: "Crea tu espacio",
  signUpDescription: "Indica los datos de tu negocio. Usa un correo que puedas verificar.",
  fullNameLabel: "Tu nombre completo",
  fullNamePlaceholder: "Ricardo Murillo",
  companyLabel: "Nombre del negocio",
  companyPlaceholder: "Distribuidora Central S.A.",
  phoneLabel: "Teléfono personal",
  phoneHint:
    "No escribas el código del país: lo aplicamos según el país que elijas.",
  phoneInvalid: "Introduce un número válido para el país seleccionado.",
  submitSignUp: "Crear cuenta",
  confirmTitle: "Verifica tu correo",
  confirmDescription:
    "Introduce el código de verificación que te enviamos (normalmente varios dígitos).",
  confirmCodeDeliveryHint:
    "El correo lo envía AWS (Amazon Cognito), no Zumo directamente. Suele llegar en 1–3 minutos. Revisa spam, Promociones y la pestaña “Actualización”. Si sigue sin aparecer, pulsa «Enviar otro código».",
  confirmCodeLabel: "Código de confirmación",
  confirmCodePlaceholder: "123456",
  confirmResendCode: "Enviar otro código",
  confirmResending: "Enviando código…",
  confirmResendToast: "Pedimos otro código. Busca el correo más reciente y usa ese número.",
  confirmResendWait: "Espera {seconds} s antes de otro envío",
  submitConfirm: "Confirmar cuenta",
  backToSignIn: "Volver al inicio de sesión",
  backToLanding: "Volver al inicio",
  showPassword: "Mostrar contraseña",
  hidePassword: "Ocultar contraseña",
  authNetworkError: "No se pudo conectar con el servidor. Revisa la red o reinicia Next.",
  signupCreatedCheckEmail:
    "Cuenta creada: el código puede tardar hasta unos minutos. Revisa spam y Promociones; si no llega, podés pedir otro código abajo.",
  resendEmailRequired: "Escribe tu correo arriba para poder reenviar el código.",
  confirmEmailInvalid: "Introduce un correo válido para confirmar la cuenta.",
  toastPreview: "",
};

const authMessagesEn: AuthMessages = {
  metaTitle: "Sign in",
  metaDescription: "Access your Zumo distributor workspace.",
  subtitle: "Sign in or create an account for the distributor workspace.",
  langSwitcherAria: "Language",
  langEs: "ES",
  langEn: "EN",
  tabSignIn: "Sign in",
  tabSignUp: "Sign up",
  signInTitle: "Welcome back",
  signInDescription: "Sign in with your email and password.",
  emailLabel: "Email",
  emailPlaceholder: "you@gmail.com",
  emailHint: "Gmail, Outlook, or any email provider works.",
  passwordLabel: "Password",
  forgotPassword: "Forgot password?",
  submitSignIn: "Sign in",
  signUpTitle: "Create your workspace",
  signUpDescription: "Tell us about your business. Use an email you can verify.",
  fullNameLabel: "Your full name",
  fullNamePlaceholder: "Ricardo Murillo",
  companyLabel: "Company name",
  companyPlaceholder: "Central Foods LLC",
  phoneLabel: "Personal phone number",
  phoneHint: "Do not type the country code — we add it from your country selection.",
  phoneInvalid: "Enter a valid phone number for the selected country.",
  submitSignUp: "Create account",
  confirmTitle: "Verify your email",
  confirmDescription: "Enter the verification code from the email we sent (typically several digits).",
  confirmCodeDeliveryHint:
    "AWS (Amazon Cognito) sends this message, not Zumo itself. Delivery often takes 1–3 minutes. Check spam/promotions. If nothing arrives, use “Send another code” below.",
  confirmCodeLabel: "Confirmation code",
  confirmCodePlaceholder: "123456",
  confirmResendCode: "Send another code",
  confirmResending: "Sending code…",
  confirmResendToast: "Another code has been requested. Use the newest email.",
  confirmResendWait: "Wait {seconds}s before resending",
  submitConfirm: "Confirm account",
  backToSignIn: "Back to sign in",
  backToLanding: "Back to home",
  showPassword: "Show password",
  hidePassword: "Hide password",
  authNetworkError: "Could not reach the server. Check network or restart Next.",
  signupCreatedCheckEmail:
    "Account created: the verification email can take a few minutes. Check spam/promotions, or tap “Send another code” below if needed.",
  resendEmailRequired: "Enter your email above so we can resend the code.",
  confirmEmailInvalid: "Enter a valid email address to confirm your account.",
  toastPreview: "",
};

const catalog: Record<MarketingLocale, AuthMessages> = {
  es: authMessagesEs,
  en: authMessagesEn,
};

export function getAuthMessages(locale: MarketingLocale): AuthMessages {
  return catalog[locale];
}
