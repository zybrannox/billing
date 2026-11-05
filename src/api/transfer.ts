// How long a file transfer may go without moving a single byte before it's
// treated as dead. Longer than Cloudflare's own 100s origin timeout, so a slow
// server response surfaces as Cloudflare's error rather than being cut off here.
const STALL_TIMEOUT_MS = 120_000;

export class TransferStalledError extends Error {
  constructor() {
    super("The transfer stopped making progress.");
    this.name = "TransferStalledError";
  }
}

// A failure whose message was written for the person using the app.
export class TransferMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransferMessageError";
  }
}

/**
 * Runs an upload or download with no limit on its total duration - axios'
 * default 2 minute `timeout` covers the whole request, which aborted any large
 * file on an ordinary connection part-way through, however well it was going.
 *
 * What's limited instead is silence: `run` calls `touch` on every progress
 * event, and the transfer is aborted (as TransferStalledError) if those stop.
 * Without that, a dead connection could leave a progress bar frozen forever.
 */
export async function runGuardedTransfer<T>(
  outerSignal: AbortSignal | undefined,
  run: (signal: AbortSignal, touch: () => void) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let stalled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const touch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      stalled = true;
      controller.abort();
    }, STALL_TIMEOUT_MS);
  };

  const forwardAbort = () => controller.abort();
  if (outerSignal?.aborted) controller.abort();
  outerSignal?.addEventListener("abort", forwardAbort);
  touch();

  try {
    return await run(controller.signal, touch);
  } catch (err) {
    throw stalled ? new TransferStalledError() : err;
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener("abort", forwardAbort);
  }
}
