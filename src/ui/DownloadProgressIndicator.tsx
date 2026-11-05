import { useEffect } from "react";
import { Paper, Typography, LinearProgress, Box, Stack, IconButton } from "@mui/material";
import { FileDownloadRounded, CheckCircleRounded, ErrorOutlineRounded, CloseRounded } from "@mui/icons-material";
import {
  useDownloadProgressStore,
  type DownloadEntry,
} from "../store/useDownloadProgressStore";
import { formatTransferred } from "../utils/appSupport";

function DownloadCard({ id, label, percent, loaded, total, fileCount, done, error, note }: DownloadEntry) {
  useEffect(() => {
    if (!done) return;
    // Remove this card ~1.2s after it's marked done - long enough to
    // register as "finished", short enough not to linger and clutter the
    // corner once several downloads have completed. A note is there to be
    // read, so it stays for longer.
    const timer = setTimeout(() => {
      useDownloadProgressStore.getState().remove(id);
    }, note ? 8000 : 1200);
    return () => clearTimeout(timer);
  }, [done, id, note]);

  if (error) {
    return (
      <Paper elevation={4} role="alert" sx={{ width: 280, p: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <ErrorOutlineRounded fontSize="small" sx={{ color: "var(--red-500)" }} />
          <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
            {label}
          </Typography>
          <IconButton
            size="small"
            aria-label="Dismiss"
            onClick={() => useDownloadProgressStore.getState().remove(id)}
            sx={{ p: 0.25 }}
          >
            <CloseRounded sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Typography variant="caption" sx={{ color: "var(--red-500)" }}>
          {error}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={4}
      sx={{
        width: 280,
        p: 2,
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        {done ? (
          <CheckCircleRounded fontSize="small" sx={{ color: "var(--green-600, var(--emerald-600))" }} />
        ) : (
          <FileDownloadRounded fontSize="small" sx={{ color: "var(--blue-600)" }} />
        )}
        <Typography variant="body2" fontWeight={600} noWrap>
          {label}
        </Typography>
      </Box>

      <LinearProgress
        variant={done || percent !== null ? "determinate" : "indeterminate"}
        value={done ? 100 : (percent ?? undefined)}
        sx={{
          borderRadius: 1,
          height: 6,
          mb: 0.75,
          backgroundColor: "var(--blue-100)",
          "& .MuiLinearProgress-bar": {
            background: done ? "var(--green-600, var(--emerald-600))" : "var(--blue-500)",
          },
        }}
      />

      <Typography variant="caption" color="text.secondary">
        {done
          ? note
            ? note
            : fileCount
            ? `Done • ${fileCount} file${fileCount === 1 ? "" : "s"}`
            : "Done"
          : [
              // Nothing has moved yet, e.g. the server is still building a zip.
              !loaded && !total
                ? "Preparing download…"
                : percent !== null
                  ? `${percent}% • ${formatTransferred(loaded, total)}`
                  : `${formatTransferred(loaded, total)} downloaded`,
              fileCount ? `${fileCount} file${fileCount === 1 ? "" : "s"}` : null,
            ]
              .filter(Boolean)
              .join(" • ")}
      </Typography>
    </Paper>
  );
}

export default function DownloadProgressIndicator() {
  const downloads = useDownloadProgressStore((s) => s.downloads);

  if (downloads.length === 0) return null;

  return (
    <Stack
      spacing={1.5}
      sx={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: (theme) => theme.zIndex.snackbar,
      }}
    >
      {downloads.map((d) => (
        <DownloadCard key={d.id} {...d} />
      ))}
    </Stack>
  );
}
