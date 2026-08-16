import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  LinearProgress,
  Alert,
} from "@mui/material";
import {
  UploadFile,
  Close,
  CheckCircle,
  ErrorOutline,
  Replay,
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
  const items = Array.isArray(value) ? value : [];

  // Kept in sync with `value` so async upload callbacks always merge
  // against the latest list instead of a stale closure.
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
      if (wasCancelled) return; // item was already removed by removeFile

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
      apiService.delete(`/files/${encodeURIComponent(item.path)}`).catch(() => {
        // best-effort cleanup; nothing actionable if this fails
      });
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

  return (
    <Box>
      {label && (
        <Typography variant="body2" sx={{ mb: 1, textAlign: "left", color: "#000" }}>
          {label}
        </Typography>
      )}

      <Paper
        variant="outlined"
        onClick={openPicker}
        sx={{
          px: 2,
          py: 1.75,
          borderRadius: 1,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderColor: "#D0D5DD",
          backgroundColor: "#FFF",
          transition: "border-color 0.15s",
          "&:hover": { borderColor: "#000" },
        }}
      >
        <UploadFile sx={{ color: "#000" }} />
        <Box>
          <Typography variant="body2" sx={{ color: "#000", fontWeight: 500 }}>
            {items.length
              ? `${items.length} file${items.length > 1 ? "s" : ""} attached`
              : "Click to upload files"}
          </Typography>
          <Typography variant="caption" sx={{ color: "#667085" }}>
            {multiple ? "Files upload immediately" : "Single file only"}
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

      {items.length > 0 && (
        <>
          <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "#667085" }}>
            Total: {formatFileSize(totalSize)}
          </Typography>

          <Stack
            spacing={0}
            sx={{
              mt: 1,
              border: "1px solid #E4E7EC",
              borderRadius: 1,
              backgroundColor: "#FFF",
              overflow: "hidden",
            }}
          >
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  px: 1.5,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  "&:hover": { backgroundColor: "#F9FAFB" },
                  "&:not(:last-child)": { borderBottom: "1px solid #E4E7EC" },
                }}
              >
                {item.status === "done" && (
                  <CheckCircle sx={{ fontSize: 20, color: "#16A34A", flexShrink: 0 }} />
                )}
                {item.status === "error" && (
                  <ErrorOutline sx={{ fontSize: 20, color: "#DC2626", flexShrink: 0 }} />
                )}
                {item.status === "uploading" && (
                  <UploadFile sx={{ fontSize: 20, color: "#667085", flexShrink: 0 }} />
                )}

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#000",
                      fontWeight: 500,
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
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "#E4E7EC",
                        }}
                      />
                      <Typography variant="caption" sx={{ color: "#667085", minWidth: 32 }}>
                        {Math.round(item.progress)}%
                      </Typography>
                    </Box>
                  )}

                  {item.status === "done" && (
                    <Typography variant="caption" sx={{ color: "#667085" }}>
                      {formatFileSize(item.size)} · Uploaded
                    </Typography>
                  )}

                  {item.status === "error" && (
                    <Typography variant="caption" sx={{ color: "#DC2626" }}>
                      {item.errorMessage || "Upload failed"}
                    </Typography>
                  )}
                </Box>

                {item.status === "error" && (
                  <IconButton
                    size="small"
                    onClick={() => retryItem(item.id)}
                    sx={{ color: "#667085", "&:hover": { color: "#000" } }}
                  >
                    <Replay fontSize="small" />
                  </IconButton>
                )}

                <IconButton
                  size="small"
                  onClick={() => removeItem(item.id)}
                  sx={{
                    color: "#98A2B3",
                    "&:hover": { color: "#D92D20", backgroundColor: "rgba(217,45,32,0.08)" },
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </>
      )}

      {error && (
        <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "#DC3545" }}>
          {error}
        </Typography>
      )}

      {helperText && !error && (
        <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "#667085" }}>
          {helperText}
        </Typography>
      )}

      {items.some((it) => it.status === "error") && (
        <Alert severity="error" sx={{ mt: 1 }}>
          Some files failed to upload. Retry or remove them before submitting.
        </Alert>
      )}
    </Box>
  );
};

export default GmailFileUploader;
