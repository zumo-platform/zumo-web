"use client";

import { useCallback, useState, type KeyboardEvent } from "react";

import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { backendPost } from "@/components/whatsapp/whatsapp-helpers";
import type { Message } from "@/lib/dashboard-types";

type MessageComposerProps = {
  conversationId: string | null;
  disabled?: boolean;
  onSent?: (message: Message) => void;
};

export function MessageComposer({
  conversationId,
  disabled = false,
  onSent,
}: Readonly<MessageComposerProps>) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const canSend =
    Boolean(conversationId) &&
    !disabled &&
    !sending &&
    text.trim().length > 0;

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!conversationId || !trimmed || sending) return;

    setSending(true);
    try {
      const res = await backendPost<{ success?: boolean; message?: Message }>(
        `dashboard/conversations/${encodeURIComponent(conversationId)}/send`,
        { message: trimmed },
      );
      setText("");
      if (res.message) {
        onSent?.(res.message);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo enviar el mensaje.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }, [conversationId, onSent, sending, text]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) void send();
    }
  };

  const inactive = !conversationId || disabled;

  return (
    <div className="relative shrink-0 border-t bg-background px-4 py-3">
      <div className="relative">
        <Textarea
          className="min-h-22 resize-none border-0 bg-muted/40 pr-12 shadow-none focus-visible:border-0 focus-visible:ring-0"
          disabled={inactive || sending}
          placeholder={
            inactive
              ? "Seleccioná una conversación para escribir."
              : "Escribe tu mensaje aquí."
          }
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button
          type="button"
          size="icon-sm"
          className="absolute right-2 bottom-2"
          disabled={!canSend}
          aria-label="Enviar mensaje"
          onClick={() => void send()}
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
