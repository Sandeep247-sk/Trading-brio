import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuditLogClient } from "@/components/settings/audit-log-client";

export const metadata: Metadata = {
  title: "Audit Log | Trader Brio",
};

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <AuditLogClient />;
}
