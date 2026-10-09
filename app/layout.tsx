import type { Metadata } from "next";
import { headers } from "next/headers";
import { AppShell, type ShellTone } from "@/components/app-shell";
import "./globals.css";

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
    <html lang="et">
      <body>
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
