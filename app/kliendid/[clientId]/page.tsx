import { ClientProfile } from "@/components/client-profile";

export default async function ClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <ClientProfile clientId={clientId} />;
}
