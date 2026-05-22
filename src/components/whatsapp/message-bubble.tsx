import type { Message } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

import { formatMessageTime, isRenderableThreadMessage, roleBubbleClass } from "./whatsapp-helpers";

export function MessageBubble({
  message,
}: Readonly<{
  message: Message;
}>) {
  if (!isRenderableThreadMessage(message)) return null;

  return (
    <div
      className={cn(
        "flex max-w-[min(75%,28rem)] flex-col rounded-2xl px-3 py-2 text-sm shadow-sm",
        roleBubbleClass(message.role),
      )}
    >
      <span>{message.content}</span>
      <span className="mt-1 text-right text-xs opacity-70 tabular-nums">
        {formatMessageTime(message.createdAt)}
      </span>
    </div>
  );
}
