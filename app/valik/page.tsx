import Link from "next/link";
import { Card } from "@/components/ui/card";

const CARDS = [
  {
    href: "/kliendid",
    title: "Kliendid",
    text: "Abisaaja kutsub abi. Lähedane ja esindaja haldavad profiili.",
  },
  {
    href: "/taitjad",
    title: "Täitjad",
    text: "Naaber, lähedane või sotsiaalvalve läheb appi.",
  },
  {
    href: "/admin",
    title: "Admin",
    text: "Kasutajad, rollid ja omavalitsuse ülevaade.",
  },
] as const;

export default function ChoicePage() {
  return (
    <main>
      <div className="flex flex-col gap-3">
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="block">
            <Card>
              <span className="block text-xl font-bold">{card.title}</span>
              <span className="mt-1 block text-base leading-snug text-ink-muted">{card.text}</span>
            </Card>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-base">
        <Link href="/" className="font-semibold text-brand underline">
          Suure ekraani demo
        </Link>
      </p>
    </main>
  );
}
