import { AdminReset } from "@/components/admin-reset";

export default function AdminPage() {
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Admin</h1>
      <p className="mt-3 text-xl leading-relaxed">
        Siin hallatakse kasutajaid ja vaadatakse omavalitsuse juhtumeid.
      </p>
      <AdminReset />
    </main>
  );
}
