export function withActor(href: string, actor: string | null, tone: string | null): string {
  if (!actor || /^(?:[a-z]+:|\/\/)/i.test(href)) return href;
  const hashAt = href.indexOf("#");
  const hash = hashAt >= 0 ? href.slice(hashAt) : "";
  const bare = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const splitAt = bare.indexOf("?");
  const path = splitAt >= 0 ? bare.slice(0, splitAt) : bare;
  const params = new URLSearchParams(splitAt >= 0 ? bare.slice(splitAt + 1) : "");
  if (!params.get("as")) params.set("as", actor);
  if (tone && !params.get("tone")) params.set("tone", tone);
  const search = params.toString();
  return `${path}${search ? `?${search}` : ""}${hash}`;
}
