import type { Metadata } from "next";

import { InboxExperience } from "@/components/workspace/inbox-experience";

export const metadata: Metadata = {
  title: "Inbox",
};

export default function InboxPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <InboxExperience />
    </div>
  );
}
