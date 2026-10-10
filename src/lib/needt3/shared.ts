/** Which pages count as "shared with me" (places.jsx SharedScreen). */

/**
 * A page counts as shared with the person when they do not own it. The list
 * route reports the owner as FULL_ACCESS, so anything below that is someone
 * else's page. //todo: a FULL_ACCESS grant on someone else's page reads as
 * owned until the list route sends the owner and who shared it.
 */
export function isSharedWithMe(row: { accessRole?: string | null }) {
  return !!row.accessRole && row.accessRole !== "FULL_ACCESS";
}
