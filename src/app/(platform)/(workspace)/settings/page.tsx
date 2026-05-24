import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Opciones",
};

export default function SettingsIndexPage() {
  redirect("/settings/business");
}
