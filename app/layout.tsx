import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uppis",
  description: "Mitte-meditsiiniline abi kukkumise järel. Terviseohu korral helista 112.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="et">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
