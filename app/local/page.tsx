import { cookies, headers } from "next/headers";
import { ChessGame } from "@/components/chess/ChessGame";
import { COOKIE_NAME, parseGameCookie } from "@/lib/game-cookie";
import { hostFromHeaders, titleFromHost } from "@/lib/site-title";

export default async function LocalGamePage() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const initialMoves = parseGameCookie(cookieStore.get(COOKIE_NAME)?.value);
  const title = titleFromHost(hostFromHeaders(headerStore));

  return <ChessGame initialMoves={initialMoves} title={title} />;
}
