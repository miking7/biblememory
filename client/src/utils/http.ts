// Fetch with a timeout that covers the WHOLE request, body included.
//
// fetch() resolves as soon as response HEADERS arrive, so the obvious
// clearTimeout-after-fetch pattern leaves response.json()/text() unbounded —
// a body that stalls mid-stream then hangs the caller forever (this wedged
// the sync scheduler behind a never-settling shared promise; see
// previous-work/074). The body is therefore read here, while the abort
// timer is still armed, and returned as text for the caller to parse.

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs / 1000}s`);
    this.name = 'TimeoutError';
  }
}

export interface FetchedText {
  ok: boolean;
  status: number;
  text: string;
}

export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<FetchedText> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new TimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
