import Link from "next/link";
import { redirect } from "next/navigation";

export default function ConnectRedirectPage() {
  redirect("/system#connect");
}
