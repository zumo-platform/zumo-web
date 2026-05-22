import { WhatsappClient } from "@/components/whatsapp/whatsapp-client";

export default function WhatsappPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <WhatsappClient />
    </div>
  );
}
