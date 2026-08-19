import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  Alert,
} from "@mui/material";
import { UploadFile, Close } from "@mui/icons-material";

export interface FileUploadFieldProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  value?: File[];
  onChange?: (files: File[]) => void;
  name?: string;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const MAX_TOTAL_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

const FileUploadField = forwardRef<HTMLInputElement, FileUploadFieldProps>(
  (
    {
      label = "Attachments",
      accept,
      multiple = true,
      value = [],
      onChange,
      name,
      onBlur,
      error,
      helperText,
      disabled = false,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const files = Array.isArray(value) ? value : [];
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    const processFiles = (selectedFiles: File[]) => {
      setLocalError(null);

      const oversized = selectedFiles.filter((file) => file.size > MAX_FILE_SIZE);
      if (oversized.length > 0) {
        setLocalError(
          `File limit exceeded: ${oversized.map((f) => f.name).join(", ")} must be under 1GB.`
        );
        return;
      }

      const newFiles = multiple ? [...files, ...selectedFiles] : selectedFiles;
      const newTotalSize = newFiles.reduce((sum, file) => sum + file.size, 0);

      if (newTotalSize > MAX_TOTAL_SIZE) {
        setLocalError(
          `Total upload size exceeds 2GB limit (Attempted: ${formatFileSize(newTotalSize)}).`
        );
        return;
      }

      onChange?.(newFiles);
    };

    const openPicker = () => {
      if (!disabled) {
        inputRef.current?.click();
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      processFiles(Array.from(e.target.files));
      e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files));
        e.dataTransfer.clearData();
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
    };

    const removeFile = (index: number) => {
      if (disabled) return;
      const newFiles = files.filter((_, i) => i !== index);
      setLocalError(null);
      onChange?.(newFiles);
    };

    const displayError = error || localError;

    return (
      <Box>
        {label && (
          <Typography
            variant="body2"
            sx={{
              mb: 1,
              textAlign: "left",
              color: disabled ? "#98A2B3" : "#000",
              fontWeight: 500,
            }}
          >
            {label}
          </Typography>
        )}

        {/* Upload Field Dropzone */}
        <Paper
          variant="outlined"
          onClick={openPicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-disabled={disabled}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !disabled) {
              e.preventDefault();
              openPicker();
            }
          }}
          sx={{
            px: 2,
            py: 2,
            borderRadius: 1,
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderColor: displayError
              ? "#DC3545"
              : isDragOver
              ? "#2563EB"
              : "#D0D5DD",
            backgroundColor: disabled
              ? "#F2F4F7"
              : isDragOver
              ? "#EFF6FF"
              : "#FFF",
            transition: "all 0.15s ease-in-out",
            "&:hover": {
              borderColor: disabled ? "#D0D5DD" : displayError ? "#DC3545" : "#000",
            },
            "&:focus-visible": {
              outline: "2px solid #2563EB",
              outlineOffset: "2px",
            },
          }}
        >
          <UploadFile sx={{ color: disabled ? "#98A2B3" : "#000" }} />

          <Box>
            <Typography
              variant="body2"
              sx={{
                color: disabled ? "#98A2B3" : "#000",
                fontWeight: 500,
              }}
            >
              {files.length
                ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
                : "Click or drag & drop files here"}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: disabled ? "#98A2B3" : "#667085",
              }}
            >
              {multiple ? "Multiple files allowed (Up to 1GB per file)" : "Single file allowed"}
            </Typography>
          </Box>
        </Paper>

        {displayError && (
          <Alert severity="error" sx={{ mt: 1, py: 0.25, px: 1.5, fontSize: "0.8125rem" }}>
            {displayError}
          </Alert>
        )}

        {files.length > 0 && !displayError && (
          <Typography
            variant="caption"
            sx={{ mt: 0.5, display: "block", color: "#667085" }}
          >
            Total Size: {formatFileSize(totalSize)} / 2GB
          </Typography>
        )}

        {helperText && !displayError && (
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
          name={name}
          multiple={multiple}
          accept={accept}
          onChange={handleFileChange}
          onBlur={onBlur}
          disabled={disabled}
        />

        {/* Selected Files List */}
        {files.length > 0 && (
          <Stack
            spacing={0}
            sx={{
              mt: 1.5,
              border: "1px solid #E4E7EC",
              borderRadius: 1,
              backgroundColor: "#FFF",
              overflow: "hidden",
            }}
          >
            {files.map((file, index) => (
              <Box
                key={`${file.name}-${index}`}
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
                <UploadFile
                  sx={{
                    fontSize: 20,
                    color: "#667085",
                    flexShrink: 0,
                  }}
                />

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

                {!disabled && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
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
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    );
  }
);

FileUploadField.displayName = "FileUploadField";

export default FileUploadField;