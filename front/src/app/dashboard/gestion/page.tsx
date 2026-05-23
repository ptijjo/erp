import { redirect } from "next/navigation";

/** Ancienne route placeholder → module RH. */
export default function GestionPage() {
  redirect("/dashboard/rh");
}
