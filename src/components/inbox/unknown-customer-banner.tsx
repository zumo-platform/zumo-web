import Link from "next/link";

import { Button } from "@/components/ui/button";

export function UnknownCustomerBanner({
  phone,
}: Readonly<{
  phone: string;
}>) {
  const q = `/clients/creation?phone=${encodeURIComponent(phone)}&from=inbox`;

  return (
    <div className="rounded-lg border border-amber-500/35 bg-amber-500/5 p-4">
      <p className="font-semibold text-foreground text-sm">Contacto sin registrar</p>
      <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
        Este número escribió por WhatsApp pero no está vinculado a un cliente. Creá el cliente para gestionar el
        pedido.
      </p>
      {phone.trim() ? (
        <Button asChild className="mt-3 w-full sm:w-auto" size="sm" type="button" variant="secondary">
          <Link href={q}>Crear cliente</Link>
        </Button>
      ) : (
        <Button className="mt-3 w-full sm:w-auto" disabled size="sm" type="button" variant="secondary">
          Crear cliente
        </Button>
      )}
    </div>
  );
}
