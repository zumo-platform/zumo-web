import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/es/login?tab=signup");
}
