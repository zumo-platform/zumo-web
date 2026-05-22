"use client";

import { useEffect, useId, useState } from "react";

import type { CountryCode } from "libphonenumber-js";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PhoneNumberField } from "@/components/auth/phone-number-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthMessages } from "@/content/auth/types";
import type { MarketingLocale } from "@/lib/marketing-locale";
import { nationalToE164 } from "@/lib/phone-e164";

export type AuthTabValue = "signin" | "signup";
type AuthState = "signin" | "signup" | "confirm";

function PasswordField({
  ariaHidePassword,
  ariaShowPassword,
  autoComplete,
  disabled,
  id,
  name,
}: Readonly<{
  ariaHidePassword: string;
  ariaShowPassword: string;
  autoComplete: string;
  disabled?: boolean;
  id: string;
  name: string;
}>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        autoComplete={autoComplete}
        className="pr-10"
        disabled={disabled}
        id={id}
        name={name}
        required
        type={visible ? "text" : "password"}
      />
      <button
        aria-controls={id}
        aria-label={visible ? ariaHidePassword : ariaShowPassword}
        aria-pressed={visible}
        className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={disabled}
        type="button"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? (
          <EyeOff aria-hidden className="size-4" />
        ) : (
          <Eye aria-hidden className="size-4" />
        )}
      </button>
    </div>
  );
}

async function apiFetch(path: string, body: Record<string, string>, authLocale: MarketingLocale) {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Locale": authLocale,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, data: {} as ApiAuthPayload };
  }

  try {
    const raw = (await res.json()) as Record<string, unknown>;
    const data: ApiAuthPayload = {
      error: typeof raw.error === "string" ? raw.error : undefined,
      message: typeof raw.message === "string" ? raw.message : undefined,
    };
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: res.status, data: {} };
  }
}

type ApiAuthPayload = Readonly<{
  error?: string;
  message?: string;
}>;

const RESEND_COOLDOWN_SECONDS = 60;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForms({
  defaultTab,
  locale,
  messages,
}: Readonly<{
  defaultTab: AuthTabValue;
  locale: MarketingLocale;
  messages: AuthMessages;
}>) {
  const uid = useId();
  const router = useRouter();
  const [state, setState] = useState<AuthState>(defaultTab);
  const [loading, setLoading] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Remember email/password across signup → confirm → auto-login
  const [savedEmail, setSavedEmail] = useState("");
  const [savedPassword, setSavedPassword] = useState("");
  /** Editable draft when confirming without a signup hidden email (e.g. from sign-in). */
  const [confirmEmailDraft, setConfirmEmailDraft] = useState("");

  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("CR");
  const [phoneNational, setPhoneNational] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    const { ok, status, data } = await apiFetch("/api/auth/login", { email, password }, locale);

    if (ok) {
      const verify = await fetch("/api/backend/sellers/me", { credentials: "include" });
      if (!verify.ok) {
        toast.error("Sesión iniciada pero no se pudo verificar tu perfil.");
      }
      router.push("/whatsapp");
    } else if (status === 403 && data.error === "UserNotConfirmedException") {
      setSavedEmail(email.trim().toLowerCase());
      setSavedPassword(password);
      setConfirmEmailDraft("");
      toast.warning(data.message ?? "");
      setState("confirm");
    } else {
      toast.error(data.message ?? messages.authNetworkError);
    }
    setLoading(false);
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "");
    const businessName = String(fd.get("businessName") ?? "");
    const rawEmail = String(fd.get("email") ?? "").trim().toLowerCase();
    const password = String(fd.get("password") ?? "");

    const phone = nationalToE164(phoneNational, phoneCountry);
    if (!phone) {
      toast.error(messages.phoneInvalid);
      setLoading(false);
      return;
    }

    const { ok, data } = await apiFetch(
      "/api/auth/signup",
      {
        fullName,
        businessName,
        email: rawEmail,
        password,
        phone,
      },
      locale,
    );

    if (ok) {
      setSavedEmail(rawEmail);
      setSavedPassword(password);
      setConfirmEmailDraft("");
      toast.success(messages.signupCreatedCheckEmail);
      setState("confirm");
    } else {
      toast.error(data.message ?? messages.authNetworkError);
    }
    setLoading(false);
  }

  async function handleResend() {
    const emailRaw = savedEmail.trim() || confirmEmailDraft.trim();
    if (!EMAIL_REGEX.test(emailRaw)) {
      toast.error(messages.resendEmailRequired);
      return;
    }
    setResendBusy(true);
    const { ok, data } = await apiFetch(
      "/api/auth/resend",
      { email: emailRaw.toLowerCase() },
      locale,
    );
    setResendBusy(false);
    if (ok) {
      toast.success(messages.confirmResendToast);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      return;
    }
    toast.error(data.message ?? messages.authNetworkError);
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") ?? "");
    const emailRaw = savedEmail.trim() || confirmEmailDraft.trim();
    if (!EMAIL_REGEX.test(emailRaw)) {
      toast.error(messages.confirmEmailInvalid);
      setLoading(false);
      return;
    }
    const email = emailRaw.toLowerCase();

    const { ok, data } = await apiFetch("/api/auth/confirm", { email, code }, locale);

    if (!ok) {
      toast.error(data.message ?? messages.authNetworkError);
      setLoading(false);
      return;
    }

    // Auto sign-in after confirmation if we saved the password
    if (savedPassword) {
      const { ok: loginOk, data: loginData } = await apiFetch(
        "/api/auth/login",
        { email, password: savedPassword },
        locale,
      );
      if (loginOk) {
        router.push("/whatsapp");
      } else {
        toast.success("¡Cuenta confirmada! Inicia sesión.");
        toast.error(loginData?.message ?? messages.authNetworkError);
        setState("signin");
      }
    } else {
      toast.success("¡Cuenta confirmada! Inicia sesión.");
      setState("signin");
    }
    setLoading(false);
  }

  if (state === "confirm") {
    return (
      <div lang={locale}>
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle>{messages.confirmTitle}</CardTitle>
            <CardDescription className="space-y-2">
              <span className="block">{messages.confirmDescription}</span>
              <span className="block text-muted-foreground text-xs leading-relaxed">
                {messages.confirmCodeDeliveryHint}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleConfirm}>
              {savedEmail ? (
                <input name="email" type="hidden" value={savedEmail} />
              ) : null}
              {!savedEmail ? (
                <div className="space-y-2">
                  <Label htmlFor={`${uid}-confirm-email`}>{messages.emailLabel}</Label>
                  <Input
                    autoComplete="email"
                    disabled={loading}
                    id={`${uid}-confirm-email`}
                    inputMode="email"
                    name="email"
                    placeholder={messages.emailPlaceholder}
                    required
                    type="email"
                    value={confirmEmailDraft}
                    onChange={(ev) => setConfirmEmailDraft(ev.target.value)}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor={`${uid}-confirm-code`}>{messages.confirmCodeLabel}</Label>
                <Input
                  autoComplete="one-time-code"
                  disabled={loading}
                  id={`${uid}-confirm-code`}
                  inputMode="numeric"
                  name="code"
                  pattern="[0-9]*"
                  placeholder={messages.confirmCodePlaceholder}
                  required
                />
              </div>
              <Button className="w-full" disabled={loading} type="submit">
                {loading && <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />}
                {messages.submitConfirm}
              </Button>
              <Button
                aria-label={
                  resendBusy
                    ? `${messages.confirmResending} (${messages.confirmResendCode})`
                    : messages.confirmResendCode
                }
                className="w-full"
                disabled={loading || resendBusy || resendCooldown > 0}
                type="button"
                variant="outline"
                onClick={handleResend}
              >
                {resendBusy && <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />}
                {resendCooldown > 0
                  ? messages.confirmResendWait.replace("{seconds}", String(resendCooldown))
                  : messages.confirmResendCode}
              </Button>
              <button
                className="w-full text-center text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
                disabled={loading}
                type="button"
                onClick={() => setState("signin")}
              >
                {messages.backToSignIn}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div lang={locale}>
      <Tabs
        className="w-full gap-4"
        value={state === "signin" ? "signin" : "signup"}
        onValueChange={(value) =>
          setState(value === "signin" || value === "signup" ? value : "signin")
        }
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">{messages.tabSignIn}</TabsTrigger>
          <TabsTrigger value="signup">{messages.tabSignUp}</TabsTrigger>
        </TabsList>

        {/* Sign In */}
        <TabsContent value="signin">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>{messages.signInTitle}</CardTitle>
              <CardDescription>{messages.signInDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <Label htmlFor={`${uid}-signin-email`}>{messages.emailLabel}</Label>
                  <Input
                    autoComplete="email"
                    disabled={loading}
                    id={`${uid}-signin-email`}
                    inputMode="email"
                    name="email"
                    placeholder={messages.emailPlaceholder}
                    required
                    type="email"
                  />
                  <p className="text-muted-foreground text-xs">{messages.emailHint}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`${uid}-signin-password`}>{messages.passwordLabel}</Label>
                    <button
                      className="text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
                      disabled={loading}
                      type="button"
                    >
                      {messages.forgotPassword}
                    </button>
                  </div>
                  <PasswordField
                    ariaHidePassword={messages.hidePassword}
                    ariaShowPassword={messages.showPassword}
                    autoComplete="current-password"
                    disabled={loading}
                    id={`${uid}-signin-password`}
                    name="password"
                  />
                </div>
                <Button className="w-full" disabled={loading} type="submit">
                  {loading && <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />}
                  {messages.submitSignIn}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sign Up */}
        <TabsContent value="signup">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>{messages.signUpTitle}</CardTitle>
              <CardDescription>{messages.signUpDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <Label htmlFor={`${uid}-signup-fullname`}>{messages.fullNameLabel}</Label>
                  <Input
                    autoComplete="name"
                    disabled={loading}
                    id={`${uid}-signup-fullname`}
                    name="fullName"
                    placeholder={messages.fullNamePlaceholder}
                    required
                  />
                </div>
                <PhoneNumberField
                  country={phoneCountry}
                  disabled={loading}
                  hint={messages.phoneHint}
                  id={`${uid}-signup-phone`}
                  label={messages.phoneLabel}
                  locale={locale}
                  national={phoneNational}
                  placeholder="89479486"
                  onCountryChange={setPhoneCountry}
                  onNationalChange={setPhoneNational}
                />
                <div className="space-y-2">
                  <Label htmlFor={`${uid}-signup-company`}>{messages.companyLabel}</Label>
                  <Input
                    autoComplete="organization"
                    disabled={loading}
                    id={`${uid}-signup-company`}
                    name="businessName"
                    placeholder={messages.companyPlaceholder}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${uid}-signup-email`}>{messages.emailLabel}</Label>
                  <Input
                    autoComplete="email"
                    disabled={loading}
                    id={`${uid}-signup-email`}
                    inputMode="email"
                    name="email"
                    placeholder={messages.emailPlaceholder}
                    required
                    type="email"
                  />
                  <p className="text-muted-foreground text-xs">{messages.emailHint}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${uid}-signup-password`}>{messages.passwordLabel}</Label>
                  <PasswordField
                    ariaHidePassword={messages.hidePassword}
                    ariaShowPassword={messages.showPassword}
                    autoComplete="new-password"
                    disabled={loading}
                    id={`${uid}-signup-password`}
                    name="password"
                  />
                </div>
                <Button className="w-full" disabled={loading} type="submit">
                  {loading && <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />}
                  {messages.submitSignUp}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
