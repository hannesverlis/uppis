export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function actorHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const id = new URLSearchParams(window.location.search).get("as");
  if (!id) return {};
  return { "x-uppis-user": id };
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...actorHeaders(),
      ...init?.headers,
    },
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new ApiRequestError(data.error || "Päring ebaõnnestus", response.status);
  }
  return data as T;
}
