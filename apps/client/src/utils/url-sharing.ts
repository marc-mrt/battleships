const QUERY_PARAM_SESSION_SLUG = "s";

export function getSharedSessionSlug(): string | null {
  return new URLSearchParams(window.location.search).get(
    QUERY_PARAM_SESSION_SLUG,
  );
}

export function buildSharedUrl(slug: string): string {
  const params = new URLSearchParams();
  params.set(QUERY_PARAM_SESSION_SLUG, slug);
  return `${window.location.origin}?${params.toString()}`;
}
