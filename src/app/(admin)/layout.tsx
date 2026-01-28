import { auth } from "@clerk/nextjs/server";
import AdminShell from "./AdminShell";
import React from "react";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
