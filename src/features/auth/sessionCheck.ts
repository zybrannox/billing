export type SessionIdentity = { id: string; label: string };

export type SessionCheck =
  | { kind: "same" }
  | { kind: "changed"; now: SessionIdentity }
  | { kind: "signedOut" }
  | { kind: "unknown" };

// Compares who this tab believes it is with who the browser's cookie says it
// is. Anything but a clear answer from the server is "unknown": a network blip
// must never sign anyone out or raise an alarm.
export async function checkSession(
  currentId: string,
  fetchIdentity: () => Promise<SessionIdentity>,
): Promise<SessionCheck> {
  try {
    const now = await fetchIdentity();
    return now.id === currentId ? { kind: "same" } : { kind: "changed", now };
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    return status === 401 ? { kind: "signedOut" } : { kind: "unknown" };
  }
}
