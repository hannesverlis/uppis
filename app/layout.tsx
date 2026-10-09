import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { AppShell, type ShellTone } from "@/components/app-shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Uppis",
  description: "Mitte-meditsiiniline abi kukkumise järel. Terviseohu korral helista 112.",
};

function toneOf(value: string | null): ShellTone | null {
  if (value === "client" || value === "helper" || value === "admin") return value;
  return null;
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const path = requestHeaders.get("x-uppis-path");
  const stage = path === "/" || path === "/demo";
  return (
    <html lang="et" className={inter.variable}>
      <body className={inter.className}>
        {stage ? (
          children
        ) : (
          <AppShell actor={requestHeaders.get("x-uppis-actor")} tone={toneOf(requestHeaders.get("x-uppis-tone"))}>
            {children}
          </AppShell>
        )}
      </body>
    </html>
  );
}
