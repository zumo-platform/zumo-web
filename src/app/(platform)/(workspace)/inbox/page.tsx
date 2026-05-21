import { InboxClient } from "@/components/inbox/inbox-client";

export default function InboxPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <InboxClient />
    </div>
  );
}
