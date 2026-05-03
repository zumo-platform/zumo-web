"use client";

import type { FormEvent } from "react";

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

export type AuthTabValue = "signin" | "signup";

export function AuthForms({
  defaultTab,
}: Readonly<{
  defaultTab: AuthTabValue;
}>) {
  return (
    <Tabs className="w-full gap-4" defaultValue={defaultTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign in</TabsTrigger>
        <TabsTrigger value="signup">Sign up</TabsTrigger>
      </TabsList>

      <TabsContent value="signin">
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to your distributor workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handlePlaceholderSubmit}>
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  autoComplete="email"
                  id="signin-email"
                  name="email"
                  placeholder="you@company.com"
                  required
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <button
                    className="text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
                    type="button"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  autoComplete="current-password"
                  id="signin-password"
                  name="password"
                  required
                  type="password"
                />
              </div>
              <Button className="w-full" type="submit">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="signup">
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle>Create your workspace</CardTitle>
            <CardDescription>
              Tell us about your business to request early access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handlePlaceholderSubmit}>
              <div className="space-y-2">
                <Label htmlFor="signup-company">Company name</Label>
                <Input id="signup-company" name="company" placeholder="Distribuidora Central S.A." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Work email</Label>
                <Input
                  autoComplete="email"
                  id="signup-email"
                  name="email"
                  placeholder="you@company.com"
                  required
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  autoComplete="new-password"
                  id="signup-password"
                  name="password"
                  required
                  type="password"
                />
              </div>
              <Button className="w-full" type="submit">
                Create account
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function handlePlaceholderSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  toast.message("Authentication is not wired yet — this is a UI preview.");
}
