export function SectionPage({ title, text }: { title: string; text: string }) {
  return (
    <main>
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-3 text-xl leading-relaxed">{text}</p>
    </main>
  );
}
