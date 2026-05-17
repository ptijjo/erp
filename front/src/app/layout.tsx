import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { QueryProvider } from "~/providers/query-provider";

export const metadata: Metadata = {
  title: "VIFAA ERP",
  description: "Plateforme de gestion VIFAA — maison mère et filiales",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${geist.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
