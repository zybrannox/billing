import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import { Close, FolderZipOutlined } from "@mui/icons-material";
import { formatFileSize } from "../../utils/appSupport";
import UploadFileRow from "./UploadFileRow";
import type { UploadItem } from "./uploadTypes";

// Everything attached so far, with each file's progress, retry and remove.
export default function AttachmentsDialog({
  open,
  items,
  onClose,
  onAddFiles,
  onRemove,
  onRetry,
}: {
  open: boolean;
  items: UploadItem[];
  onClose: () => void;
  onAddFiles: () => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const totalSize = items.reduce((sum, it) => sum + it.size, 0);
  const uploadingCount = items.filter((it) => it.status === "uploading").length;
  const doneCount = items.filter((it) => it.status === "done").length;

  return (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="xs"
    fullWidth
    PaperProps={{
      elevation: 4,
      sx: {
        borderRadius: "10px",
        border: "1px solid var(--slate-200)",
      },
    }}
  >
    <DialogTitle
      sx={{
        py: 1.5,
        px: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--slate-100)",
      }}
    >
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-900)", fontSize: "var(--fs-lg)" }}>
          Attached Files ({items.length})
        </Typography>
        {uploadingCount > 0 && (
          <Typography variant="caption" sx={{ color: "var(--slate-500)", fontSize: "var(--fs-2xs)" }}>
            {doneCount} of {items.length} uploaded · {formatFileSize(totalSize)} total
          </Typography>
        )}
      </Box>
      <IconButton size="small" onClick={onClose} sx={{ color: "var(--slate-400)" }}>
        <Close sx={{ fontSize: 18 }} />
      </IconButton>
    </DialogTitle>

    <DialogContent sx={{ p: 0, maxHeight: "360px" }}>
      {items.length === 0 ? (
        <Box sx={{ py: 5, px: 2, textAlign: "center" }}>
          <FolderZipOutlined sx={{ fontSize: 36, color: "var(--slate-300)", mb: 1 }} />
          <Typography variant="body2" sx={{ color: "var(--slate-600)", fontWeight: 500, fontSize: "var(--fs-md)" }}>
            No files attached yet
          </Typography>
          <Typography variant="caption" sx={{ color: "var(--slate-400)", fontSize: "var(--fs-xs)", display: "block", mt: 0.5 }}>
            Click below to select and upload files.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={0}>
          {items.map((item) => (
            <UploadFileRow
              key={item.id}
              item={item}
              onRemove={onRemove}
              onRetry={onRetry}
            />
          ))}
        </Stack>
      )}
    </DialogContent>

    <DialogActions sx={{ px: 2, py: 1.25, borderTop: "1px solid var(--slate-100)", justifyContent: "space-between" }}>
      <Typography variant="caption" sx={{ color: "var(--slate-500)", fontSize: "var(--fs-xs)" }}>
        Total: {formatFileSize(totalSize)}
      </Typography>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          size="small"
          onClick={onAddFiles}
          sx={{ textTransform: "none", fontSize: "var(--fs-xs)", color: "var(--slate-700)", fontWeight: 500 }}
        >
          + Add files
        </Button>
        <Button
          size="small"
          onClick={onClose}
          sx={{ textTransform: "none", fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}
        >
          Close
        </Button>
      </Box>
    </DialogActions>
  </Dialog>
  );
}
