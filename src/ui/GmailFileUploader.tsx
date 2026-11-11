import { notify } from "../store/useNoticeStore";
import React, { useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { FolderZipOutlined, UploadFile } from "@mui/icons-material";
import { apiService } from "../api/service";
import { formatFileSize } from "../utils/appSupport";
import AttachmentsDialog from "./uploader/AttachmentsDialog";
import { useUploadQueue } from "./uploader/useUploadQueue";
import type { UploadApiClient, UploadItem } from "./uploader/uploadTypes";

export type { UploadItem };

interface GmailFileUploaderProps {
  label?: React.ReactNode;
  accept?: string;
  multiple?: boolean;
  value?: UploadItem[];
  onChange?: (items: UploadItem[]) => void;
  error?: string;
  helperText?: string;
  // Defaults below all match this component's original, staff-only
  // behavior - every existing caller (AddProject.tsx, etc.) is unaffected.
  apiClient?: UploadApiClient;
  uploadEndpoint?: string;
  deleteEndpointBase?: string;
  // Caps a single file's size client-side, separately from MAX_FILE_SIZE
  // (the hard 1GB ceiling). A caller with no chunked-upload endpoint of its
  // own (see the portal's job-request uploads, which only ever hit the
  // plain /job-requests/upload route) must pass CHUNK_UPLOAD_THRESHOLD
  // here - otherwise a file just over that line would silently be routed
  // into uploadFileChunked's staff-only /files/upload/init|chunk|complete
  // endpoints, which a client-portal session can never authenticate to,
  // and fail with a confusing 401 instead of a clear "too large" message.
  maxFileSize?: number;
}

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

const GmailFileUploader = ({
  label = "Attachments",
  accept,
  multiple = true,
  value = [],
  onChange,
  error,
  helperText,
  apiClient = apiService,
  uploadEndpoint = "/files/upload",
  deleteEndpointBase = "/files",
  maxFileSize = MAX_FILE_SIZE,
}: GmailFileUploaderProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const items = React.useMemo(() => (Array.isArray(value) ? value : []), [value]);

  const { addFiles, removeItem, retryItem } = useUploadQueue({ items, onChange, multiple, apiClient, uploadEndpoint, deleteEndpointBase });

  const openPicker = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selected = Array.from(e.target.files);
    e.target.value = "";

    const oversized = selected.filter((file) => file.size > maxFileSize);
    if (oversized.length > 0) {
      notify.error(`${oversized.length === 1 ? "File is" : `${oversized.length} files are`} too large`, {
        message: `The limit is ${formatFileSize(maxFileSize)}: ${oversized.map((f) => f.name).join(", ")}. Nothing was uploaded for ${oversized.length === 1 ? "it" : "them"}.`,
      });
      return;
    }

    addFiles(selected);
  };

  const hasErrors = items.some((it) => it.status === "error");

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents opening the file picker
    setModalOpen(true);
  };

  return (
    <Box>
      {label && (
        <label className="text-xs font-medium text-gray-700 mb-1.5 block text-left">
          {label}
        </label>
      )}

      {/* Unified Input Container */}
      <Paper
        elevation={0}
        onClick={openPicker}
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: "8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          border: "1px dashed",
          borderColor: error ? "var(--red-500)" : "var(--slate-200)",
          backgroundColor: "var(--slate-50)",
          transition: "all 0.15s ease-in-out",
          "&:hover": {
            borderColor: error ? "var(--red-500)" : "var(--slate-300)",
            backgroundColor: "var(--slate-100)",
          },
        }}
      >
        <UploadFile sx={{ color: "var(--slate-500)", fontSize: 20, flexShrink: 0 }} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color: "var(--slate-900)",
              fontWeight: 500,
              fontSize: "var(--fs-md)",
              lineHeight: 1.2,
            }}
          >
            Click to upload files
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "var(--slate-500)",
              fontSize: "var(--fs-2xs)",
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {multiple ? "Multiple attachments allowed" : "Single file limit"}
          </Typography>
        </Box>

        {/* View All Trigger - Rendered Always */}
        <Box
          onClick={handleOpenDialog}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.25,
            py: 0.5,
            borderRadius: "6px",
            backgroundColor: "var(--white)",
            border: "1px solid var(--slate-200)",
            transition: "all 0.15s ease-in-out",
            flexShrink: 0,
            opacity: items.length === 0 ? 0.75 : 1,
            "&:hover": {
              borderColor: "var(--slate-400)",
              backgroundColor: "var(--slate-50)",
              opacity: 1,
            },
          }}
        >
          <FolderZipOutlined
            sx={{
              fontSize: 16,
              color: hasErrors ? "var(--red-500)" : items.length === 0 ? "var(--slate-400)" : "var(--slate-600)",
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: items.length === 0 ? "var(--slate-500)" : "var(--slate-700)",
              fontWeight: 600,
              fontSize: "var(--fs-xs)",
              whiteSpace: "nowrap",
            }}
          >
            {items.length} file{items.length === 1 ? "" : "s"}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: "var(--slate-500)",
              fontSize: "var(--fs-2xs)",
              fontWeight: 500,
              borderLeft: "1px solid var(--slate-300)",
              pl: 1,
              ml: 0.25,
            }}
          >
            View all
          </Typography>
        </Box>
      </Paper>

      <input
        ref={inputRef}
        hidden
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
      />

      {error && (
        <Typography variant="caption" sx={{ mt: 0.75, display: "block", color: "var(--red-500)", fontSize: "var(--fs-xs)" }}>
          {error}
        </Typography>
      )}

      {helperText && !error && (
        <Typography variant="caption" sx={{ mt: 0.75, display: "block", color: "var(--slate-500)", fontSize: "var(--fs-xs)" }}>
          {helperText}
        </Typography>
      )}

      <AttachmentsDialog
        open={modalOpen}
        items={items}
        onClose={() => setModalOpen(false)}
        onAddFiles={openPicker}
        onRemove={removeItem}
        onRetry={retryItem}
      />
    </Box>
  );
};

export default GmailFileUploader;
