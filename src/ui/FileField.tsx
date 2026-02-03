import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  Divider,
  Alert,
} from "@mui/material";
import { UploadFile, Close, Warning } from "@mui/icons-material";

interface FileUploadFieldProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  value?: File[];
  onChange?: (files: File[]) => void;
  name?: string;
  onBlur?: () => void;
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

const FileUploadField = ({
  label = "Attachments",
  accept,
  multiple = true,
  value = [],
  onChange,
  error,
  helperText,
}: FileUploadFieldProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const files = Array.isArray(value) ? value : [];

  // File size constants - Updated for large files
  const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
  const MAX_TOTAL_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

  // Calculate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const hasOversizedFile = files.some((file) => file.size > MAX_FILE_SIZE);
  const totalSizeExceeded = totalSize > MAX_TOTAL_SIZE;

  const openPicker = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selected = Array.from(e.target.files);

    // Validate file sizes
    const oversized = selected.filter((file) => file.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      alert(
        `The following files exceed 1GB limit:\n${oversized.map((f) => f.name).join("\n")}`,
      );
      e.target.value = "";
      return;
    }

    const newFiles = multiple ? [...files, ...selected] : selected;

    // Check total size
    const newTotalSize = newFiles.reduce((sum, file) => sum + file.size, 0);
    if (newTotalSize > MAX_TOTAL_SIZE) {
      alert(
        `Total file size would exceed 2GB limit. Current: ${formatFileSize(totalSize)}, Adding: ${formatFileSize(selected.reduce((sum, f) => sum + f.size, 0))}`,
      );
      e.target.value = "";
      return;
    }

    onChange?.(newFiles);

    e.target.value = "";
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange?.(newFiles);
  };

  return (
    <Box>
      {label && (
        <Typography
          variant="body2"
          sx={{
            mb: 1,
            textAlign: "left",
            color: "#000",
          }}
        >
          {label}
        </Typography>
      )}

      {/* Upload Field */}
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
          "&:hover": {
            borderColor: "#000",
          },
        }}
      >
        <UploadFile sx={{ color: "#000" }} />

        <Box>
          <Typography
            variant="body2"
            sx={{
              color: "#000",
              fontWeight: 500,
            }}
          >
            {files.length
              ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
              : "Click to upload files"}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: "#667085",
            }}
          >
            {multiple ? "Multiple files supported" : "Single file only"}
          </Typography>
        </Box>
      </Paper>

      {/* File size warnings */}
      {(hasOversizedFile || totalSizeExceeded) && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {hasOversizedFile && "Some files exceed 1GB limit. "}
          {totalSizeExceeded &&
            `Total size (${formatFileSize(totalSize)}) exceeds 2GB limit.`}
        </Alert>
      )}

      {files.length > 0 && !hasOversizedFile && !totalSizeExceeded && (
        <Typography
          variant="caption"
          sx={{ mt: 0.5, display: "block", color: "#667085" }}
        >
          Total: {formatFileSize(totalSize)} / 2GB
        </Typography>
      )}

      {error && (
        <Typography
          variant="caption"
          sx={{ mt: 0.5, display: "block", color: "#DC3545" }}
        >
          {error}
        </Typography>
      )}

      {helperText && !error && (
        <Typography
          variant="caption"
          sx={{ mt: 0.5, display: "block", color: "#667085" }}
        >
          {helperText}
        </Typography>
      )}

      <input
        ref={inputRef}
        hidden
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
      />

      {/* Selected Files */}
      {files.length > 0 && (
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
          {files.map((file, index) => (
            <Box
              key={index}
              sx={{
                px: 1.5,
                py: 1,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                transition: "background-color 0.15s",
                "&:hover": {
                  backgroundColor: "#F9FAFB",
                },
                "&:not(:last-child)": {
                  borderBottom: "1px solid #E4E7EC",
                },
              }}
            >
              {/* File Icon */}
              <UploadFile
                sx={{
                  fontSize: 20,
                  color: "#667085",
                  flexShrink: 0,
                }}
              />

              {/* File Info */}
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
                  {file.name}
                </Typography>

                <Typography
                  variant="caption"
                  sx={{
                    color: "#667085",
                  }}
                >
                  {formatFileSize(file.size)}
                </Typography>
              </Box>

              {/* Remove */}
              <IconButton
                size="small"
                onClick={() => removeFile(index)}
                sx={{
                  color: "#98A2B3",
                  "&:hover": {
                    color: "#D92D20",
                    backgroundColor: "rgba(217,45,32,0.08)",
                  },
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default FileUploadField;
