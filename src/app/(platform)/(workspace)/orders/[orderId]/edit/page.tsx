import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Editar pedido",
};

export default async function OrderEditPlaceholderPage({
  params,
}: Readonly<{
  params: Promise<{ orderId: string }>;
}>) {
  const { idToken } = await getAuthSession();
  if (!idToken) {
    redirect("/login");
  }

  const { orderId } = await params;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editor de pedido</CardTitle>
            <CardDescription>
              Esta pantalla será el editor del pedido <span className="font-mono text-foreground">{orderId}</span>. Está en
              preparación (próximamente).
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
            <Button asChild type="button" variant="outline">
              <Link href="/orders">Volver a Pedidos</Link>
            </Button>
            <Button asChild type="button" variant="secondary">
              <Link href="/inbox">Ir al inbox</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
