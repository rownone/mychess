import { headers } from "next/headers";
import { MultiplayerChessGame } from "@/components/chess/MultiplayerChessGame";
import { hostFromHeaders, titleFromHost } from "@/lib/site-title";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlayGamePage({ params }: PageProps) {
  const { id } = await params;
  const headerStore = await headers();
  const title = titleFromHost(hostFromHeaders(headerStore));

  return <MultiplayerChessGame gameId={id} title={`${title} — Online`} />;
}
