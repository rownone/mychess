export function hostFromHeaders(headerStore: {
  get(name: string): string | null;
}): string | null {
  const raw =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? null;
  return raw?.split(",")[0]?.trim() || null;
}

export function titleFromHost(host: string | null): string {
  if (!host) return "MyChess";

  const hostname = host.split(":")[0]?.replace(/^www\./i, "") ?? "";
  if (!hostname) return "MyChess";

  const label = hostname.split(".")[0] ?? hostname;
  return prettyLabel(label);
}

function prettyLabel(label: string): string {
  return label
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
