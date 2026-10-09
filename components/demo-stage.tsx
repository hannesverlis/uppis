import Link from "next/link";
import { ID } from "@/backend/ids";

const PHONES = [
  {
    title: "Kliendid",
    person: "Helgi Tamm",
    role: "Abisaaja",
    src: `/kliendid/${ID.clientHelgi}/abi?as=${ID.helgi}&tone=client`,
    bezel: "#143d32",
    label: "#b7e4cf",
    radius: "2.6rem",
    inner: "1.9rem",
    width: "22rem",
    padding: "1.45rem 0.7rem 0.85rem",
  },
  {
    title: "Täitjad",
    person: "Jüri Mets",
    role: "Naaber",
    src: `/taitjad?as=${ID.juri}&tone=helper`,
    bezel: "#16324f",
    label: "#c5ddf5",
    radius: "1.7rem",
    inner: "1.15rem",
    width: "23rem",
    padding: "1.25rem 0.45rem 0.7rem",
  },
  {
    title: "Admin",
    person: "Anna Admin",
    role: "Süsteemi admin",
    src: `/admin?as=${ID.anna}&tone=admin`,
    bezel: "#4a3424",
    label: "#f0d7bf",
    radius: "1.15rem",
    inner: "0.7rem",
    width: "24rem",
    padding: "1.05rem 0.4rem 0.55rem",
  },
] as const;

export function DemoStage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#1c1915] px-6 py-3 text-white">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Uppis</h1>
          <p className="text-sm text-white/80">Kolm vaadet korraga. Vasakul kutsub abi, keskel võtab vastu.</p>
        </div>
        <Link className="text-sm font-bold text-white underline" href="/valik">
          Valik
        </Link>
      </header>
      <div className="mt-2 grid flex-1 grid-cols-3 items-start gap-6">
        {PHONES.map((phone) => (
          <section key={phone.title} className="flex min-w-0 flex-col items-center">
            <h2 className="text-lg font-extrabold leading-tight" style={{ color: phone.label }}>
              {phone.title}
            </h2>
            <p className="text-sm leading-tight">{phone.person}</p>
            <p className="text-xs text-white/70">{phone.role}</p>
            <div
              className="relative mt-2 w-full shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
              style={{
                maxWidth: phone.width,
                height: "min(72dvh, 760px)",
                background: phone.bezel,
                borderRadius: phone.radius,
                padding: phone.padding,
              }}
            >
              <div className="absolute left-1/2 top-2 h-3 w-16 -translate-x-1/2 rounded-full bg-black/75" />
              <iframe
                title={`${phone.title}, ${phone.person}`}
                src={phone.src}
                className="h-full w-full border-0 bg-[#f3efe6]"
                style={{ borderRadius: phone.inner }}
              />
              <div className="absolute bottom-2 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/35" />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
