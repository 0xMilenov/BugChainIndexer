import { redirect } from "next/navigation";

export default function AuthSetupPage() {
  redirect("/auth/signup");
}
