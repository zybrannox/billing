import React from "react";
import { Box, IconButton, LinearProgress, Typography } from "@mui/material";
import { CheckCircle, Close, ErrorOutline, Replay, UploadFile } from "@mui/icons-material";
import { formatFileSize } from "../../utils/appSupport";
import type { UploadItem } from "./uploadTypes";

// Memoized and given only stable props (see useUploadQueue's stable patch, remove and
// retry callbacks) so that during an active upload, a progress
// tick on one file only re-renders that file's row - not the whole list.
// Without this, every row re-rendered on every tick regardless of whether
// its own data changed, which is what made the list unscrollable once
// several files were uploading at once.
const UploadFileRow = React.memo(function UploadFileRow({
  item,
  onRemove,
  onRetry,
}: {
  item: UploadItem;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.25,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        "&:hover": { backgroundColor: "var(--slate-50)" },
        "&:not(:last-child)": { borderBottom: "1px solid var(--slate-100)" },
      }}
    >
      {item.status === "done" && (
        <CheckCircle sx={{ fontSize: 18, color: "var(--emerald-500)", flexShrink: 0 }} />
      )}
      {item.status === "error" && (
        <ErrorOutline sx={{ fontSize: 18, color: "var(--red-500)", flexShrink: 0 }} />
      )}
      {item.status === "uploading" && (
        <UploadFile sx={{ fontSize: 18, color: "var(--slate-500)", flexShrink: 0 }} />
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            color: "var(--slate-900)",
            fontWeight: 500,
            fontSize: "var(--fs-sm)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.name}
        </Typography>

        {item.status === "uploading" && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={item.progress}
                sx={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: "var(--slate-200)",
                  "& .MuiLinearProgress-bar": { backgroundColor: "var(--slate-700)" },
                }}
              />
              <Typography variant="caption" sx={{ color: "var(--slate-500)", minWidth: 28, fontSize: "var(--fs-2xs)" }}>
                {Math.round(item.progress)}%
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "var(--slate-400)", fontSize: "var(--fs-2xs)" }}>
              {formatFileSize((item.progress / 100) * item.size)} of {formatFileSize(item.size)}
            </Typography>
          </>
        )}

        {item.status === "done" && (
          <Typography variant="caption" sx={{ color: "var(--slate-500)", fontSize: "var(--fs-xs)" }}>
            {formatFileSize(item.size)} · Uploaded
          </Typography>
        )}

        {item.status === "error" && (
          <Typography variant="caption" sx={{ color: "var(--red-500)", fontSize: "var(--fs-xs)" }}>
            {item.errorMessage || "Upload failed"}
          </Typography>
        )}
      </Box>

      {item.status === "error" && (
        <IconButton
          size="small"
          onClick={() => onRetry(item.id)}
          sx={{ color: "var(--slate-500)", "&:hover": { color: "var(--slate-900)" } }}
        >
          <Replay sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      <IconButton
        size="small"
        onClick={() => onRemove(item.id)}
        sx={{
          color: "var(--slate-400)",
          "&:hover": { color: "var(--red-500)", backgroundColor: "rgba(239, 68, 68, 0.06)" },
        }}
      >
        <Close sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
});

export default UploadFileRow;
