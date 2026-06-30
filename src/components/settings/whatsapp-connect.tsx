"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  appId: string;
  configId: string;
  /** Called with the data needed for the backend connect call. */
  onComplete: (payload: { code: string; wabaId: string; phoneNumberId: string }) => void;
  disabled?: boolean;
};

declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, unknown>) => void;
      login: (
        cb: (resp: { authResponse?: { code?: string } }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export function WhatsAppConnect({ appId, configId, onComplete, disabled }: Props) {
  const [sdkReady, setSdkReady] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [wa, setWa] = useState<{ wabaId: string; phoneNumberId: string } | null>(null);

  useEffect(() => {
    if (window.FB) {
      setSdkReady(true);
      return;
    }
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, autoLogAppEvents: true, xfbml: false, version: "v21.0" });
      setSdkReady(true);
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, [appId]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!event.origin.endsWith("facebook.com")) return;
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.event === "FINISH") {
          setWa({
            wabaId: String(data.data.waba_id),
            phoneNumberId: String(data.data.phone_number_id),
          });
        }
      } catch {
        /* non-JSON messages from FB are expected; ignore */
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (code && wa) {
      onComplete({ code, wabaId: wa.wabaId, phoneNumberId: wa.phoneNumberId });
      setCode(null);
      setWa(null);
    }
  }, [code, wa, onComplete]);

  const launch = useCallback(() => {
    if (!window.FB) return;
    window.FB.login(
      (resp) => {
        if (resp.authResponse?.code) setCode(resp.authResponse.code);
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { feature: "whatsapp_embedded_signup", version: 3 },
      },
    );
  }, [configId]);

  return (
    <Button onClick={launch} disabled={disabled || !sdkReady || !configId}>
      Conectar WhatsApp
    </Button>
  );
}
