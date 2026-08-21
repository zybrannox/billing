import { Paper, Typography, LinearProgress, Box } from "@mui/material";
import { FileDownloadRounded } from "@mui/icons-material";
import { useDownloadProgressStore } from "../store/useDownloadProgressStore";
import { formatFileSize } from "../utils/appSupport";

export default function DownloadProgressIndicator() {
  const { active, label, percent, loaded } = useDownloadProgressStore();

  if (!active) return null;

  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 280,
        p: 2,
        borderRadius: 2,
        zIndex: (theme) => theme.zIndex.snackbar,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <FileDownloadRounded fontSize="small" sx={{color: "var(--blue-600)"}} />
        <Typography variant="body2" fontWeight={600} noWrap>
          {label}
        </Typography>
      </Box>

      <LinearProgress
        variant={percent !== null ? "determinate" : "indeterminate"}
        value={percent ?? undefined}
        sx={{
          borderRadius: 1, height: 6, mb: 0.75, backgroundColor: "var(--blue-100)", // Track background color
          "& .MuiLinearProgress-bar": {
            background: "var(--blue-500)", // Progress bar fill color
          },
        }}
      />

      <Typography variant="caption" color="text.secondary">
        {percent !== null
          ? `${percent}% • ${formatFileSize(loaded)}`
          : `${formatFileSize(loaded)} downloaded`}
      </Typography>
    </Paper>
  );
}
