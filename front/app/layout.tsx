import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";



export const metadata: Metadata = {
  title: "Vifaa",
  description: "Vifaa est une plateforme de gestion de projet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
