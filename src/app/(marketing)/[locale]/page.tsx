import type { ReactNode } from "react";

import {
  CheckCircle2,
  Database,
  Inbox,
  Languages,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HeroMockup } from "@/components/marketing/hero-mockup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMarketingMessages } from "@/content/marketing/index";
import { authLoginPath, isMarketingLocale } from "@/lib/marketing-locale";

type PageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;

  if (!isMarketingLocale(raw)) {
    return {};
  }

  const messages = getMarketingMessages(raw);

  return {
    title: messages.home.metaTitle,
  };
}

export default async function MarketingHomePage({ params }: PageProps) {
  const { locale: raw } = await params;

  if (!isMarketingLocale(raw)) {
    notFound();
  }

  const locale = raw;
  const messages = getMarketingMessages(locale);

  return (
    <div className="contents" suppressHydrationWarning>
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center md:pt-32 md:pb-24">
        <Badge className="gap-1.5 rounded-full px-3 py-1 font-normal" variant="outline">
          <span aria-hidden className="size-1.5 rounded-full bg-foreground/55" />
          {messages.home.badge}
        </Badge>

        <h1 className="mt-8 text-balance text-5xl font-semibold tracking-tight md:text-7xl">
          {messages.home.heroBeforeWhatsApp}{" "}
          <span className="bg-gradient-to-r from-foreground via-foreground/75 to-muted-foreground bg-clip-text text-transparent">
            WhatsApp
          </span>
          {messages.home.heroAfterWhatsAppBeforeZumo}
          <span className="bg-gradient-to-r from-muted-foreground to-foreground/85 bg-clip-text text-transparent">
            Zumo
          </span>{" "}
          {messages.home.heroAfterZumo}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
          {messages.home.subhead}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href={authLoginPath(locale)}>{messages.home.ctaPrimary}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#how-it-works">{messages.home.ctaSecondary}</a>
          </Button>
        </div>

        <div className="mt-16 md:mt-24">
          <HeroMockup mockup={messages.mockup} />
        </div>
      </section>

      <section className="border-border/40 border-t py-24" id="how-it-works">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            {messages.home.howEyebrow}
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            {messages.home.howTitle}
          </h2>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            <StepBlock
              description={messages.home.steps[0][1]}
              icon={<MessageCircle aria-hidden className="size-5" />}
              title={messages.home.steps[0][0]}
            />
            <StepBlock
              description={messages.home.steps[1][1]}
              icon={<Sparkles aria-hidden className="size-5" />}
              title={messages.home.steps[1][0]}
            />
            <StepBlock
              description={messages.home.steps[2][1]}
              icon={<CheckCircle2 aria-hidden className="size-5" />}
              title={messages.home.steps[2][0]}
            />
          </div>
        </div>
      </section>

      <section className="border-border/40 border-t bg-card/30 py-24" id="built-for">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            {messages.home.builtEyebrow}
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            {messages.home.builtTitle}
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <FeatureCard
              description={messages.home.features[0][1]}
              icon={<Inbox aria-hidden className="size-5" />}
              title={messages.home.features[0][0]}
            />
            <FeatureCard
              description={messages.home.features[1][1]}
              icon={<Languages aria-hidden className="size-5" />}
              title={messages.home.features[1][0]}
            />
            <FeatureCard
              description={messages.home.features[2][1]}
              icon={<Database aria-hidden className="size-5" />}
              title={messages.home.features[2][0]}
            />
          </div>
        </div>
      </section>

      <section className="border-border/40 border-t py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            {messages.home.ctaTitle}
          </h2>
          <p className="mt-4 text-muted-foreground">{messages.home.ctaSub}</p>
          <Button asChild className="mt-8" size="lg">
            <Link href={authLoginPath(locale)}>{messages.home.ctaButton}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function StepBlock({
  icon,
  title,
  description,
}: Readonly<{
  icon: ReactNode;
  title: string;
  description: string;
}>) {
  return (
    <div>
      <div className="inline-flex rounded-lg border border-border/60 p-2.5">{icon}</div>
      <p className="mt-4 font-semibold text-lg">{title}</p>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: Readonly<{
  icon: ReactNode;
  title: string;
  description: string;
}>) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-md shadow-black/5">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div className="rounded-lg border border-border/60 p-2">{icon}</div>
        <CardTitle className="text-lg leading-snug">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
