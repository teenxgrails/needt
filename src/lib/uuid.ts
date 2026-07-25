// crypto.randomUUID() is only available in secure contexts (https:// or the
// localhost exemption) — accessing the app over a plain-HTTP LAN IP throws.
// Fall back to a non-cryptographic id in that case; these ids are only ever
// used as local React/editor keys, never as security tokens.
export function randomId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
