import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getWebhookEndpoint } from "@/lib/api";

const mockThreads = [
  {
    id: "thread-1",
    clientName: "Restaurante La Huerta",
    lastMessage: "Necesito 2 cajas de tomate y 1 de cebolla",
    status: "new",
  },
  {
    id: "thread-2",
    clientName: "Tacos Don Pepe",
    lastMessage: "El pedido de ayer llego incompleto",
    status: "issue",
  },
  {
    id: "thread-3",
    clientName: "Cafe Amanecer",
    lastMessage: "Confirmame stock de leche deslactosada",
    status: "question",
  },
];

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "issue") return "destructive";
  if (status === "question") return "secondary";
  return "default";
}

export default function InboxPage() {
  const webhookEndpoint = getWebhookEndpoint();

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Inbox MVP</CardTitle>
          <CardDescription>
            First workspace screen for WhatsApp conversations and AI-assisted
            order triage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Backend webhook endpoint:
          </p>
          <code className="block rounded-md bg-muted px-3 py-2 text-xs">
            {webhookEndpoint || "Set NEXT_PUBLIC_API_URL in .env.local"}
          </code>
        </CardContent>
      </Card>

      <section className="space-y-3">
        {mockThreads.map((thread) => (
          <Card key={thread.id}>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">{thread.clientName}</CardTitle>
                <CardDescription>{thread.lastMessage}</CardDescription>
              </div>
              <Badge variant={statusVariant(thread.status)}>{thread.status}</Badge>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Open conversation
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
