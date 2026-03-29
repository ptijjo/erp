"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMe } from "~/hooks/use-me";
import Header from "./_components/header/Header";
import NavBar from "./_components/NavBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: me, isPending, isError } = useMe();

  useEffect(() => {
    if (isPending) return;
    if (me === null || isError) {
      router.replace("/");
    }
  }, [isPending, me, isError, router]);

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-500 text-xl text-white">
        Chargement…
      </div>
    );
  }

  if (!me) {
    return null;
  }

  const displayName = me.email?.split("@")[0] ?? "Utilisateur";

  return (
    <div className="flex h-screen w-full flex-col bg-gray-500">
      <Header
        nom={displayName}
        imageUrl="https://vibz.s3.eu-central-1.amazonaws.com/logo/photoProfil.png"
        organization={
          me.organisationName ??
          (me.organisationId == null ? "Maison mère" : "Organisation")
        }
      />
      <div className="flex h-full min-h-0 w-full flex-1">
        <NavBar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
