import { useEffect } from "react";
import { Paper, Typography, LinearProgress, Box, Stack } from "@mui/material";
import { FileDownloadRounded, CheckCircleRounded } from "@mui/icons-material";
import {
  useDownloadProgressStore,
  type DownloadEntry,
} from "../store/useDownloadProgressStore";
import { formatFileSize } from "../utils/appSupport";

function DownloadCard({ id, label, percent, loaded, total, fileCount, done }: DownloadEntry) {
  useEffect(() => {
    if (!done) return;
    // Remove this card ~1.2s after it's marked done - long enough to
    // register as "finished", short enough not to linger and clutter the
    // corner once several downloads have completed.
    const timer = setTimeout(() => {
      useDownloadProgressStore.getState().remove(id);
    }, 1200);
    return () => clearTimeout(timer);
  }, [done, id]);

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
          <CheckCircleRounded fontSize="small" sx={{ color: "var(--green-600, #059669)" }} />
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
            background: done ? "var(--green-600, #059669)" : "var(--blue-500)",
          },
        }}
      />

      <Typography variant="caption" color="text.secondary">
        {done
          ? fileCount
            ? `Done • ${fileCount} file${fileCount === 1 ? "" : "s"}`
            : "Done"
          : [
              percent !== null && total !== null
                ? `${percent}% • ${formatFileSize(loaded)} of ${formatFileSize(total)}`
                : percent !== null
                  ? `${percent}% • ${formatFileSize(loaded)}`
                  : `${formatFileSize(loaded)} downloaded`,
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
