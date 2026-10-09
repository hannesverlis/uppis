import Link from "next/link";

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

export default function HomePage() {
  return (
    <main>
      <h1 className="text-4xl font-extrabold">Vali osa</h1>
      <div className="mt-6 flex flex-col gap-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block min-h-24 rounded-2xl bg-white px-5 py-4"
          >
            <span className="block text-2xl font-extrabold">{card.title}</span>
            <span className="mt-1 block text-xl leading-snug">{card.text}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
