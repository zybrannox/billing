import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  UploadFile,
  Close,
  CheckCircle,
  ErrorOutline,
  Replay,
  FolderZipOutlined,
} from "@mui/icons-material";
import { apiService } from "../api/service";
import { compressImage } from "../utils/imageCompression";
import { getImageDimensions } from "../utils/appSupport";

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  progress: number;
  path?: string;
  width?: number | null;
  height?: number | null;
  errorMessage?: string;
}

interface UploadResponse {
  files: Array<{
    path: string;
    original_name: string;
    width: number | null;
    height: number | null;
  }>;
}

interface GmailFileUploaderProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  value?: UploadItem[];
  onChange?: (items: UploadItem[]) => void;
  error?: string;
  helperText?: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

const GmailFileUploader = ({
  label = "Attachments",
  accept,
  multiple = true,
  value = [],
  onChange,
  error,
  helperText,
}: GmailFileUploaderProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const items = Array.isArray(value) ? value : [];

  const itemsRef = React.useRef(items);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const controllersRef = React.useRef<Record<string, AbortController>>({});

  const patchItem = (id: string, patch: Partial<UploadItem>) => {
    const next = itemsRef.current.map((it) =>
      it.id === id ? { ...it, ...patch } : it,
    );
    itemsRef.current = next;
    onChange?.(next);
  };

  const uploadItem = async (item: UploadItem) => {
    const controller = new AbortController();
    controllersRef.current[item.id] = controller;

    try {
      const compressed = await compressImage(item.file);
      const dimensions = await getImageDimensions(item.file);

      const form = new FormData();
      form.append("files", compressed);
      form.append(
        "metadata",
        JSON.stringify([
          {
            filename: item.file.name,
            width: dimensions?.width ?? null,
            height: dimensions?.height ?? null,
          },
        ]),
      );

      const res = await apiService.postWithProgress<UploadResponse>(
        "/files/upload",
        form,
        (percent) => patchItem(item.id, { progress: percent }),
        controller.signal,
      );

      const saved = res.files[0];
      patchItem(item.id, {
        status: "done",
        progress: 100,
        path: saved.path,
        width: saved.width,
        height: saved.height,
      });
    } catch (err: any) {
      const wasCancelled =
        err?.code === "ERR_CANCELED" || err?.name === "CanceledError";
      if (wasCancelled) return;

      patchItem(item.id, {
        status: "error",
        errorMessage:
          err?.response?.data?.detail || "Upload failed. Please retry.",
      });
    } finally {
      delete controllersRef.current[item.id];
    }
  };

  const openPicker = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selected = Array.from(e.target.files);

    const oversized = selected.filter((file) => file.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      alert(
        `The following files exceed 1GB limit:\n${oversized.map((f) => f.name).join("\n")}`,
      );
      e.target.value = "";
      return;
    }

    const newItems: UploadItem[] = selected.map((file) => ({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      status: "uploading",
      progress: 0,
    }));

    const merged = multiple ? [...itemsRef.current, ...newItems] : newItems;
    itemsRef.current = merged;
    onChange?.(merged);

    newItems.forEach((item) => uploadItem(item));

    e.target.value = "";
  };

  const removeItem = (id: string) => {
    const item = itemsRef.current.find((it) => it.id === id);

    if (item?.status === "uploading") {
      controllersRef.current[id]?.abort();
      delete controllersRef.current[id];
    } else if (item?.status === "done" && item.path) {
      apiService.delete(`/files/${encodeURIComponent(item.path)}`).catch(() => {});
    }

    const next = itemsRef.current.filter((it) => it.id !== id);
    itemsRef.current = next;
    onChange?.(next);
  };

  const retryItem = (id: string) => {
    const item = itemsRef.current.find((it) => it.id === id);
    if (!item) return;
    patchItem(id, { status: "uploading", progress: 0, errorMessage: undefined });
    uploadItem({ ...item, status: "uploading", progress: 0 });
  };

  const totalSize = items.reduce((sum, it) => sum + it.size, 0);
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
          borderColor: error ? "#EF4444" : "#E2E8F0",
          backgroundColor: "#F8FAFC",
          transition: "all 0.15s ease-in-out",
          "&:hover": {
            borderColor: error ? "#EF4444" : "#CBD5E1",
            backgroundColor: "#F1F5F9",
          },
        }}
      >
        <UploadFile sx={{ color: "#64748B", fontSize: 20, flexShrink: 0 }} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color: "#0F172A",
              fontWeight: 500,
              fontSize: "0.85rem",
              lineHeight: 1.2,
            }}
          >
            Click to upload files
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "#64748B",
              fontSize: "0.725rem",
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
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            transition: "all 0.15s ease-in-out",
            flexShrink: 0,
            opacity: items.length === 0 ? 0.75 : 1,
            "&:hover": {
              borderColor: "#94A3B8",
              backgroundColor: "#F8FAFC",
              opacity: 1,
            },
          }}
        >
          <FolderZipOutlined
            sx={{
              fontSize: 16,
              color: hasErrors ? "#EF4444" : items.length === 0 ? "#94A3B8" : "#475569",
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: items.length === 0 ? "#64748B" : "#334155",
              fontWeight: 600,
              fontSize: "0.75rem",
              whiteSpace: "nowrap",
            }}
          >
            {items.length} file{items.length === 1 ? "" : "s"}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: "#64748B",
              fontSize: "0.725rem",
              fontWeight: 500,
              borderLeft: "1px solid #CBD5E1",
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
        <Typography variant="caption" sx={{ mt: 0.75, display: "block", color: "#EF4444", fontSize: "0.75rem" }}>
          {error}
        </Typography>
      )}

      {helperText && !error && (
        <Typography variant="caption" sx={{ mt: 0.75, display: "block", color: "#64748B", fontSize: "0.75rem" }}>
          {helperText}
        </Typography>
      )}

      {/* Attachments Popup Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          elevation: 4,
          sx: {
            borderRadius: "10px",
            border: "1px solid #E2E8F0",
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
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F172A", fontSize: "0.9rem" }}>
            Attached Files ({items.length})
          </Typography>
          <IconButton size="small" onClick={() => setModalOpen(false)} sx={{ color: "#94A3B8" }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, maxHeight: "360px" }}>
          {items.length === 0 ? (
            <Box sx={{ py: 5, px: 2, textAlign: "center" }}>
              <FolderZipOutlined sx={{ fontSize: 36, color: "#CBD5E1", mb: 1 }} />
              <Typography variant="body2" sx={{ color: "#475569", fontWeight: 500, fontSize: "0.85rem" }}>
                No files attached yet
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.75rem", display: "block", mt: 0.5 }}>
                Click below to select and upload files.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={0}>
              {items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    px: 2,
                    py: 1.25,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    "&:hover": { backgroundColor: "#F8FAFC" },
                    "&:not(:last-child)": { borderBottom: "1px solid #F1F5F9" },
                  }}
                >
                  {item.status === "done" && (
                    <CheckCircle sx={{ fontSize: 18, color: "#10B981", flexShrink: 0 }} />
                  )}
                  {item.status === "error" && (
                    <ErrorOutline sx={{ fontSize: 18, color: "#EF4444", flexShrink: 0 }} />
                  )}
                  {item.status === "uploading" && (
                    <UploadFile sx={{ fontSize: 18, color: "#64748B", flexShrink: 0 }} />
                  )}

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#0F172A",
                        fontWeight: 500,
                        fontSize: "0.825rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </Typography>

                    {item.status === "uploading" && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={item.progress}
                          sx={{
                            flex: 1,
                            height: 3,
                            borderRadius: 2,
                            backgroundColor: "#E2E8F0",
                            "& .MuiLinearProgress-bar": { backgroundColor: "#334155" },
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "#64748B", minWidth: 28, fontSize: "0.7rem" }}>
                          {Math.round(item.progress)}%
                        </Typography>
                      </Box>
                    )}

                    {item.status === "done" && (
                      <Typography variant="caption" sx={{ color: "#64748B", fontSize: "0.75rem" }}>
                        {formatFileSize(item.size)} · Uploaded
                      </Typography>
                    )}

                    {item.status === "error" && (
                      <Typography variant="caption" sx={{ color: "#EF4444", fontSize: "0.75rem" }}>
                        {item.errorMessage || "Upload failed"}
                      </Typography>
                    )}
                  </Box>

                  {item.status === "error" && (
                    <IconButton
                      size="small"
                      onClick={() => retryItem(item.id)}
                      sx={{ color: "#64748B", "&:hover": { color: "#0F172A" } }}
                    >
                      <Replay sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}

                  <IconButton
                    size="small"
                    onClick={() => removeItem(item.id)}
                    sx={{
                      color: "#94A3B8",
                      "&:hover": { color: "#EF4444", backgroundColor: "rgba(239, 68, 68, 0.06)" },
                    }}
                  >
                    <Close sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.25, borderTop: "1px solid #F1F5F9", justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ color: "#64748B", fontSize: "0.75rem" }}>
            Total: {formatFileSize(totalSize)}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              onClick={openPicker}
              sx={{ textTransform: "none", fontSize: "0.75rem", color: "#334155", fontWeight: 500 }}
            >
              + Add files
            </Button>
            <Button
              size="small"
              onClick={() => setModalOpen(false)}
              sx={{ textTransform: "none", fontSize: "0.75rem", color: "#64748B" }}
            >
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GmailFileUploader;