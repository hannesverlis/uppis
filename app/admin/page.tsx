import { AdminReset } from "@/components/admin-reset";
import { KovPanel } from "@/components/kov-panel";

export default function AdminPage() {
  return (
    <main>
      <p className="text-base leading-relaxed">
        Siin hallatakse kasutajaid ja vaadatakse omavalitsuse juhtumeid.
      </p>
      <KovPanel />
      <AdminReset />
    </main>
  );
}
