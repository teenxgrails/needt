type PublicUrlRequest = {
  nextUrl: {
    pathname: string;
    search: string;
  };
  url: string;
};

function configuredPublicOrigin(): string | null {
  const value = process.env.NEXTAUTH_URL?.trim();
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Builds redirects from the configured public application origin while
 * preserving only the request path. Reverse proxies may expose an internal
 * container hostname through request.url, which must never reach callbacks.
 */
export function publicRequestUrl(request: PublicUrlRequest): URL {
  const origin = configuredPublicOrigin() ?? new URL(request.url).origin;
  return new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, origin);
}

export function publicAppUrl(pathname: string, request: PublicUrlRequest): URL {
  return new URL(pathname, publicRequestUrl(request).origin);
}
