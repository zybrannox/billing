import { useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { checkSession, type SessionIdentity } from "./sessionCheck";

/**
 * Stops a tab from silently working as the wrong account.
 *
 * A login is a cookie, and a browser has one cookie shared by all its tabs: sign
 * in as someone else in one tab and every other tab becomes that account too,
 * while still showing the old name. Anything done there would be recorded under
 * the other person's name. So whenever a tab regains attention it asks the server
 * who it now is, and says so if that has changed.
 */
export default function SessionWatcher({
  current,
  appliesHere,
  fetchIdentity,
  logout,
  homePath,
  loginPath,
}: {
  // Who this tab believes it is; null when it isn't signed in.
  current: SessionIdentity | null;
  // Staff and client sessions are independent, so each only matters in its own
  // part of the app.
  appliesHere: () => boolean;
  fetchIdentity: () => Promise<SessionIdentity>;
  logout: () => Promise<unknown>;
  homePath: string;
  loginPath: string;
}) {
  const [switchedTo, setSwitchedTo] = useState<SessionIdentity | null>(null);
  const checking = useRef(false);

  // Latest props without restarting the listeners on every render.
  const latest = useRef({ appliesHere, fetchIdentity, loginPath });
  latest.current = { appliesHere, fetchIdentity, loginPath };

  const currentId = current?.id ?? null;

  useEffect(() => {
    if (currentId === null) return;

    const check = async () => {
      if (checking.current || document.visibilityState !== "visible" || !latest.current.appliesHere()) return;
      checking.current = true;
      const result = await checkSession(currentId, latest.current.fetchIdentity);
      checking.current = false;

      if (result.kind === "changed") setSwitchedTo(result.now);
      // Signed out elsewhere: a full reload also drops this account's data
      // still held in memory.
      else if (result.kind === "signedOut") window.location.assign(latest.current.loginPath);
    };

    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [currentId]);

  if (!switchedTo || !current) return null;

  const signOut = async () => {
    try {
      await logout();
    } finally {
      window.location.assign(loginPath);
    }
  };

  // No onClose: carrying on behind this would be working as the wrong account.
  return (
    <Dialog open maxWidth="xs" fullWidth aria-labelledby="session-switched-title">
      <DialogTitle id="session-switched-title" sx={{ fontWeight: 700 }}>
        You're now signed in as someone else
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: "var(--slate-700)", mb: 1.5 }}>
          This tab was signed in as <strong>{current.label}</strong>, but another tab in this browser has signed in as{" "}
          <strong>{switchedTo.label}</strong>.
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--slate-500)" }}>
          A browser can only hold one account at a time. To use two accounts together, open the second in a private
          window or a different browser.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={signOut} sx={{ textTransform: "none", color: "var(--slate-600)" }}>
          Sign out
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={() => window.location.assign(homePath)}
          sx={{ textTransform: "none" }}
        >
          Continue as {switchedTo.label}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
