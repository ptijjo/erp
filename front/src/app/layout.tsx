import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { QueryProvider } from "~/providers/query-provider";

export const metadata: Metadata = {
  title: "Vifaa",
  description: "Vifaa est une plateforme de gestion de projet",
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
    <html lang="fr">
      <body className={`${geist.variable} font-sans antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
