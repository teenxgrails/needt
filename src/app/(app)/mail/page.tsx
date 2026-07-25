import { redirect } from "next/navigation";

export default function MailRoute() {
  redirect("/tasks?view=mail");
}
