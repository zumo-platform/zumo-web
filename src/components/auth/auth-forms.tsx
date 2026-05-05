"use client";

import { type FormEvent, useId, useState } from "react";

import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

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

export type AuthTabValue = "signin" | "signup";

function PasswordField({
  ariaHidePassword,
  ariaShowPassword,
  autoComplete,
  id,
  name,
}: Readonly<{
  ariaHidePassword: string;
  ariaShowPassword: string;
  autoComplete: string;
  id: string;
  name: string;
}>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        autoComplete={autoComplete}
        className="pr-10"
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
        type="button"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
      </button>
    </div>
  );
}

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
  const signinPwdId = `${uid}-signin-password`;
  const signupPwdId = `${uid}-signup-password`;

  return (
    <div lang={locale}>
      <Tabs className="w-full gap-4" defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">{messages.tabSignIn}</TabsTrigger>
          <TabsTrigger value="signup">{messages.tabSignUp}</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>{messages.signInTitle}</CardTitle>
              <CardDescription>{messages.signInDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => handlePlaceholderSubmit(e, messages.toastPreview)}
              >
                <div className="space-y-2">
                  <Label htmlFor={`${uid}-signin-email`}>{messages.emailLabel}</Label>
                  <Input
                    autoComplete="email"
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
                    <Label htmlFor={signinPwdId}>{messages.passwordLabel}</Label>
                    <button
                      className="text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
                      type="button"
                    >
                      {messages.forgotPassword}
                    </button>
                  </div>
                  <PasswordField
                    ariaHidePassword={messages.hidePassword}
                    ariaShowPassword={messages.showPassword}
                    autoComplete="current-password"
                    id={signinPwdId}
                    name="password"
                  />
                </div>
                <Button className="w-full" type="submit">
                  {messages.submitSignIn}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signup">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>{messages.signUpTitle}</CardTitle>
              <CardDescription>{messages.signUpDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => handlePlaceholderSubmit(e, messages.toastPreview)}
              >
                <div className="space-y-2">
                  <Label htmlFor={`${uid}-signup-company`}>{messages.companyLabel}</Label>
                  <Input
                    autoComplete="organization"
                    id={`${uid}-signup-company`}
                    name="company"
                    placeholder={messages.companyPlaceholder}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${uid}-signup-email`}>{messages.emailLabel}</Label>
                  <Input
                    autoComplete="email"
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
                  <Label htmlFor={signupPwdId}>{messages.passwordLabel}</Label>
                  <PasswordField
                    ariaHidePassword={messages.hidePassword}
                    ariaShowPassword={messages.showPassword}
                    autoComplete="new-password"
                    id={signupPwdId}
                    name="password"
                  />
                </div>
                <Button className="w-full" type="submit">
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

function handlePlaceholderSubmit(event: FormEvent<HTMLFormElement>, toastPreview: string) {
  event.preventDefault();
  toast.message(toastPreview);
}
