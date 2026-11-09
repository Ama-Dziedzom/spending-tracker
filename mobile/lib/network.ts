/** True when a failure is the connection, not the data: show "Offline", keep the last numbers. */
export function isNetworkError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
    return /network request failed|failed to fetch|fetch failed|network ?error|timed? ?out|offline|ENOTFOUND|ECONNREFUSED/i.test(msg);
}
