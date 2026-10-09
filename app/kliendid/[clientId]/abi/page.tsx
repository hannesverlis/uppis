import { HelpPanel } from "@/components/help-panel";

export default async function HelpPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <HelpPanel clientId={clientId} />;
}