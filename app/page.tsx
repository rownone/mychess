import { headers } from "next/headers";
import { PlayLobby } from "@/components/chess/PlayLobby";
import { hostFromHeaders, titleFromHost } from "@/lib/site-title";

export default async function Home() {
  const headerStore = await headers();
  const title = titleFromHost(hostFromHeaders(headerStore));

  return <PlayLobby title={title} />;
}
