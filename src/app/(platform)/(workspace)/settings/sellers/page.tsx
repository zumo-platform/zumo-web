import { redirect } from "next/navigation";

/** Legacy route — team management lives at /vendedores (not under Opciones). */
export default function SettingsSellersRedirectPage() {
  redirect("/vendedores");
}
