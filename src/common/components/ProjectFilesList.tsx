import { useRef, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Checkbox,
  Dialog as MuiDialog,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  FileDownloadRounded,
  Close as CloseIcon,
  CheckCircleRounded,
  DeleteOutlineRounded,
  UploadFileRounded,
} from "@mui/icons-material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ArchiveIcon from "@mui/icons-material/Archive";
import DescriptionIcon from "@mui/icons-material/Description";
import TableChartIcon from "@mui/icons-material/TableChart";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useProjectStore, type FileObject } from "../../store/useProjectStore";
import { apiService } from "../../api/service";
import { GenericDialog } from "../../ui/Dialog";
import { useDownloadProgressStore } from "../../store/useDownloadProgressStore";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { getImageDimensions } from "../../utils/appSupport";
import { uploadFileChunked, CHUNK_UPLOAD_THRESHOLD } from "../../utils/chunkedUpload";
import BulkDeleteButton from "./BulkDeleteButton";

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB, matches GmailFileUploader

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Keeps the accordion row itself at a fixed, predictable size no matter how
// many files a project has (the full-content view below is what scales to
// however many there are, via its own scroll container) - a handful of
// chips plus an overflow "+N" chip is O(1) to render, not O(files).
const MAX_VISIBLE_CHIPS = 4;

type FileType = "image" | "pdf" | "archive" | "doc" | "sheet" | "file";

const getFileType = (file: string | FileObject): FileType => {
  const path = typeof file === "string" ? file : file.path;
  const ext = path.split(".").pop()?.toLowerCase();

  if (!ext) return "file";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["zip", "rar", "7z"].includes(ext)) return "archive";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx"].includes(ext)) return "sheet";

  return "file";
};

const FileIcon = ({ type, size = 28 }: { type: FileType; size?: number }) => {
  const iconSx = { fontSize: size };
  switch (type) {
    case "pdf":
      return <PictureAsPdfIcon sx={{ ...iconSx, color: "#EF4444" }} />;
    case "archive":
      return <ArchiveIcon sx={{ ...iconSx, color: "#8B5CF6" }} />;
    case "doc":
      return <DescriptionIcon sx={{ ...iconSx, color: "#2563EB" }} />;
    case "sheet":
      return <TableChartIcon sx={{ ...iconSx, color: "#10B981" }} />;
    default:
      return <InsertDriveFileIcon sx={{ ...iconSx, color: "#64748B" }} />;
  }
};

// The stored, UUID-based on-disk name - required as-is for every
// /files/* API call (thumbnail/download/view/delete are all keyed by it).
const storagePath = (f: string | FileObject) => (typeof f === "string" ? f : f.path);

// What the user actually named the file - what should ever be shown on
// screen or saved-as on download. Falls back to the storage path only for
// files uploaded before original_name was tracked.
const displayName = (f: string | FileObject) =>
  typeof f === "string" ? f : f.original_name || f.path;

/**
 * Gmail-style compact attachment strip for the project row accordion - a
 * few small chips, an overflow "+N" chip past MAX_VISIBLE_CHIPS, and a
 * "view all" dialog with the full list. No persistent preview or search;
 * clicking a chip opens a lightbox on demand.
 */
const ProjectFilesList = () => {
  const { selectedProject, refreshProject } = useProjectStore();
  const { showDialog } = useConfirmDialogStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removingPath, setRemovingPath] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const files = selectedProject?.file_paths ?? [];
  const totalFiles = files.length;
  const visibleFiles = files.slice(0, MAX_VISIBLE_CHIPS);
  const hiddenCount = totalFiles - visibleFiles.length;

  const lightboxFile = lightboxIndex !== null ? files[lightboxIndex] : null;
  const lightboxStoragePath = lightboxFile ? storagePath(lightboxFile) : "";
  const lightboxDisplayName = lightboxFile ? displayName(lightboxFile) : "";
  const lightboxFileType = lightboxFile ? getFileType(lightboxFile) : null;

  // `path` addresses the file on the server (must be the real stored
  // name); `saveAsName` is what the browser names the downloaded file -
  // keeping these separate is the whole fix, conflating them is what made
  // every download save as the UUID-based storage name instead.
  const handleDownload = async (path: string, saveAsName: string) => {
    setDownloadProgress((prev) => ({ ...prev, [path]: 0 }));
    // Reflected in the shared bottom-right indicator too (not just the
    // inline ring on the row/lightbox icon) - that indicator previously
    // only ever showed for the "download all as zip" flow, so a single-file
    // download here never appeared there at all.
    const { start, update, finish, remove } = useDownloadProgressStore.getState();
    start(path, saveAsName);
    try {
      const blob = await apiService.getWithProgress<Blob>(
        `/files/download/${encodeURIComponent(path)}`,
        ({ percent, loaded, total }) => {
          update(path, { percent, loaded, total });
          if (percent === null) return;
          setDownloadProgress((prev) => ({ ...prev, [path]: percent }));
        },
        { responseType: "blob" },
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = saveAsName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      if (selectedProject) await refreshProject(selectedProject.id);
      finish(path);
    } catch (err) {
      console.error("Download error:", err);
      remove(path);
    } finally {
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
    }
  };

  const openFilePicker = () => fileInputRef.current?.click();

  // Uploads straight to this (already-existing) project - unlike
  // AddProject's flow, there's no "attach after creation" step needed for
  // the common case, since the project id already exists here. Large files
  // still go through the same chunked path (then a single attach call) so
  // this doesn't quietly regress the >60MB support that already exists
  // elsewhere - see utils/chunkedUpload.ts for why that split exists.
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !selectedProject) return;
    const selected = Array.from(fileList);

    const oversized = selected.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setUploadError(
        `File limit exceeded: ${oversized.map((f) => f.name).join(", ")} must be under 1GB.`,
      );
      return;
    }

    setUploadError(null);
    setUploadProgress(0);

    try {
      const large = selected.filter((f) => f.size > CHUNK_UPLOAD_THRESHOLD);
      const small = selected.filter((f) => f.size <= CHUNK_UPLOAD_THRESHOLD);

      if (small.length > 0) {
        const form = new FormData();
        const metadata: Array<{
          filename: string;
          width: number | null;
          height: number | null;
          pixel_width: number | null;
          pixel_height: number | null;
        }> = [];
        for (const file of small) {
          form.append("files", file);
          const dims = await getImageDimensions(file);
          metadata.push({
            filename: file.name,
            width: dims?.width ?? null,
            height: dims?.height ?? null,
            pixel_width: dims?.pixelWidth ?? null,
            pixel_height: dims?.pixelHeight ?? null,
          });
        }
        form.append("metadata", JSON.stringify(metadata));
        await apiService.postWithProgress(
          `/files/upload/${selectedProject.id}`,
          form,
          (percent) => setUploadProgress(percent),
        );
      }

      // Uploaded one at a time (not in parallel) - CHUNK_CONCURRENCY inside
      // uploadFileChunked already saturates the connection per file, so
      // running several of these concurrently would just contend for the
      // same bandwidth and backend thread pool for no real gain.
      for (const file of large) {
        const dims = await getImageDimensions(file);
        const controller = new AbortController();
        const uploaded = await uploadFileChunked(
          file,
          {
            width: dims?.width ?? null,
            height: dims?.height ?? null,
            pixelWidth: dims?.pixelWidth ?? null,
            pixelHeight: dims?.pixelHeight ?? null,
          },
          (percent) => setUploadProgress(percent),
          controller.signal,
        );
        await apiService.post(`/files/attach/${selectedProject.id}`, {
          files: [
            {
              path: uploaded.path,
              original_name: uploaded.original_name,
              width: uploaded.width,
              height: uploaded.height,
              pixel_width: uploaded.pixel_width,
              pixel_height: uploaded.pixel_height,
            },
          ],
        });
      }

      await refreshProject(selectedProject.id);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError("Failed to upload one or more files. Please try again.");
    } finally {
      setUploadProgress(null);
    }
  };

  const handleRemoveFile = (path: string, name: string) => {
    if (!selectedProject) return;
    showDialog({
      title: "Remove file?",
      description: `"${name}" will be permanently deleted. This can't be undone.`,
      confirmText: "Remove",
      isDestructive: true,
      onConfirm: async () => {
        setRemovingPath(path);
        try {
          await apiService.delete(`/files/${encodeURIComponent(path)}`);
          await refreshProject(selectedProject.id);
        } catch (err) {
          console.error("Remove file error:", err);
        } finally {
          setRemovingPath(null);
        }
      },
    });
  };

  const toggleSelected = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedPaths((prev) =>
      prev.size === files.length
        ? new Set()
        : new Set(files.map((f) => storagePath(f))),
    );
  };

  // One request for the whole selection (see POST /files/bulk-delete) -
  // deliberately not N parallel single-file DELETE calls, which would be
  // N round trips and N separate DB statements for what's really one
  // "remove these" operation from the user's point of view.
  const handleBulkRemove = () => {
    if (!selectedProject || selectedPaths.size === 0) return;
    const paths = Array.from(selectedPaths);
    showDialog({
      title: `Remove ${paths.length} ${paths.length === 1 ? "file" : "files"}?`,
      description: "These files will be permanently deleted. This can't be undone.",
      confirmText: "Remove",
      isDestructive: true,
      onConfirm: async () => {
        setBulkRemoving(true);
        try {
          await apiService.post("/files/bulk-delete", { paths });
          setSelectedPaths(new Set());
          await refreshProject(selectedProject.id);
        } catch (err) {
          console.error("Bulk remove error:", err);
        } finally {
          setBulkRemoving(false);
        }
      },
    });
  };

  const openLightbox = (index: number) => {
    setViewAllOpen(false);
    setLightboxIndex(index);
  };

  // Scoped to "while the lightbox is open" (not the whole page) - Left/Right
  // change files, Enter downloads whichever one is currently showing.
  useKeyboardShortcuts(
    {
      ArrowLeft: () =>
        setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i)),
      ArrowRight: () =>
        setLightboxIndex((i) =>
          i !== null && i < totalFiles - 1 ? i + 1 : i,
        ),
      Enter: () => {
        if (lightboxFile) handleDownload(lightboxStoragePath, lightboxDisplayName);
      },
    },
    lightboxIndex !== null,
  );

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: "#64748B",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            {totalFiles} {totalFiles === 1 ? "File" : "Files"}
          </Typography>

          {/* Only the "+N more" overflow chip used to reach this dialog,
              which meant selecting/removing multiple files was impossible
              on any project with 4 or fewer - this is always here instead,
              regardless of count. */}
          {totalFiles > 0 && (
            <Typography
              onClick={(e) => {
                e.stopPropagation();
                setViewAllOpen(true);
              }}
              sx={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "#2563EB",
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Manage
            </Typography>
          )}
        </Box>

        <Box
          onClick={(e) => {
            e.stopPropagation();
            if (uploadProgress === null) openFilePicker();
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.375,
            borderRadius: "6px",
            cursor: uploadProgress === null ? "pointer" : "default",
            color: "#2563EB",
            transition: "background-color 150ms ease-in-out",
            "&:hover": uploadProgress === null ? { backgroundColor: "#EFF6FF" } : {},
          }}
        >
          {uploadProgress !== null ? (
            <>
              <CircularProgress size={13} thickness={5} sx={{ color: "#2563EB" }} />
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 600 }}>
                Uploading {uploadProgress}%
              </Typography>
            </>
          ) : (
            <>
              <UploadFileRounded sx={{ fontSize: 15 }} />
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Add files</Typography>
            </>
          )}
        </Box>
      </Box>

      {uploadError && (
        <Typography sx={{ fontSize: "0.7rem", color: "#EF4444", mb: 0.75 }}>
          {uploadError}
        </Typography>
      )}

      {totalFiles === 0 ? (
        <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "0.8125rem" }}>
          No files available in this project
        </Typography>
      ) : (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {visibleFiles.map((file) => {
          const path = storagePath(file);
          const name = displayName(file);
          const originalIndex = files.indexOf(file);
          const type = getFileType(file);
          const isDownloaded = typeof file !== "string" && !!file.downloaded;

          return (
            <Box
              key={originalIndex}
              onClick={() => openLightbox(originalIndex)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                pl: 0.625,
                pr: 1.25,
                py: 0.625,
                maxWidth: 200,
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor: isDownloaded ? "#F0FDF4" : "#F8FAFC",
                border: "1px solid",
                borderColor: isDownloaded ? "#A7F3D0" : "#E2E8F0",
                transition: "all 150ms ease-in-out",
                "&:hover": {
                  borderColor: isDownloaded ? "#34D399" : "#CBD5E1",
                  backgroundColor: isDownloaded ? "#DCFCE7" : "#F1F5F9",
                },
              }}
            >
              {type === "image" ? (
                <Box
                  component="img"
                  src={`${API_BASE_URL}/files/thumbnail/${encodeURIComponent(path)}`}
                  loading="lazy"
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "4px",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                  alt=""
                />
              ) : (
                <FileIcon type={type} size={18} />
              )}
              <Typography
                noWrap
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: isDownloaded ? 600 : 500,
                  color: isDownloaded ? "#065F46" : "#334155",
                }}
              >
                {name}
              </Typography>
              {isDownloaded && (
                <CheckCircleRounded sx={{ color: "#10B981", fontSize: 13, flexShrink: 0 }} />
              )}
            </Box>
          );
        })}

        {hiddenCount > 0 && (
          <Box
            onClick={() => setViewAllOpen(true)}
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1.25,
              py: 0.625,
              borderRadius: "8px",
              cursor: "pointer",
              backgroundColor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              transition: "all 150ms ease-in-out",
              "&:hover": { backgroundColor: "#DBEAFE", borderColor: "#93C5FD" },
            }}
          >
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#2563EB" }}>
              +{hiddenCount} more
            </Typography>
          </Box>
        )}
      </Stack>
      )}

      {/* Full list - only rendered on demand, scoped to a scroll container
          so it stays cheap regardless of how many files the project has. */}
      <GenericDialog
        open={viewAllOpen}
        onClose={() => {
          setViewAllOpen(false);
          setSelectedPaths(new Set());
        }}
        title={`${totalFiles} ${totalFiles === 1 ? "File" : "Files"}`}
        maxWidth="xs"
        width="26rem"
      >
        {totalFiles > 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
              px: 0.5,
            }}
          >
            <Box
              onClick={toggleSelectAll}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <Checkbox
                size="small"
                checked={selectedPaths.size === files.length}
                indeterminate={selectedPaths.size > 0 && selectedPaths.size < files.length}
                sx={{ p: 0.5 }}
              />
              <Typography sx={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 500 }}>
                Select all
              </Typography>
            </Box>

            {selectedPaths.size > 0 && (
              <BulkDeleteButton
                selectedCount={bulkRemoving ? 0 : selectedPaths.size}
                onDelete={handleBulkRemove}
                tooltipTitle={bulkRemoving ? "Removing…" : "Remove selected files"}
                sx={{ height: 30, width: 30, minWidth: 30 }}
              />
            )}
          </Box>
        )}

        <Stack
          spacing={0.75}
          sx={{
            maxHeight: 420,
            overflowY: "auto",
            mx: -1,
            px: 1,
            "::-webkit-scrollbar": { width: "6px" },
            "::-webkit-scrollbar-thumb": { backgroundColor: "#CBD5E1", borderRadius: "10px" },
            "::-webkit-scrollbar-track": { backgroundColor: "#F1F5F9" },
          }}
        >
          {files.map((file, index) => {
            const path = storagePath(file);
            const name = displayName(file);
            const type = getFileType(file);
            const isDownloaded = typeof file !== "string" && !!file.downloaded;

            return (
              <Box
                key={index}
                onClick={() => openLightbox(index)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  p: 1,
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: isDownloaded ? "#F0FDF4" : "#FFFFFF",
                  border: "1px solid",
                  borderColor: isDownloaded ? "#A7F3D0" : "#E2E8F0",
                  transition: "all 150ms ease-in-out",
                  "&:hover": {
                    borderColor: isDownloaded ? "#34D399" : "#CBD5E1",
                    backgroundColor: isDownloaded ? "#DCFCE7" : "#F8FAFC",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flexGrow: 1 }}>
                  <Checkbox
                    size="small"
                    checked={selectedPaths.has(path)}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelected(path);
                    }}
                    sx={{ p: 0.5, flexShrink: 0 }}
                  />
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {type === "image" ? (
                      <Box
                        component="img"
                        src={`${API_BASE_URL}/files/thumbnail/${encodeURIComponent(path)}`}
                        loading="lazy"
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "4px",
                          objectFit: "cover",
                          border: "1px solid #E2E8F0",
                        }}
                        alt=""
                      />
                    ) : (
                      <FileIcon type={type} />
                    )}
                  </Box>

                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        fontSize: "0.8125rem",
                        color: isDownloaded ? "#065F46" : "#0F172A",
                        fontWeight: isDownloaded ? 600 : 500,
                      }}
                    >
                      {name}
                    </Typography>

                    {typeof file === "object" && (file.width || file.height) && (
                      <Typography
                        variant="caption"
                        sx={{ display: "block", color: "#64748B", fontSize: "0.7rem" }}
                      >
                        {file.width || "?"}" × {file.height || "?"}"
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  {path in downloadProgress ? (
                    <Box sx={{ display: "flex", alignItems: "center", px: 0.5 }}>
                      <CircularProgress
                        variant="determinate"
                        value={downloadProgress[path]}
                        size={20}
                        thickness={5}
                        sx={{ color: "#2563EB" }}
                      />
                    </Box>
                  ) : (
                    <Tooltip title={isDownloaded ? "Downloaded again" : "Download"}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(path, name);
                        }}
                        sx={{
                          width: 28,
                          height: 28,
                          padding: 0,
                          backgroundColor: isDownloaded ? "#10B981" : "#F1F5F9",
                          color: isDownloaded ? "#FFFFFF" : "#475569",
                          border: "1px solid",
                          borderColor: isDownloaded ? "#059669" : "#E2E8F0",
                          transition: "all 150ms ease-in-out",
                          "&:hover": {
                            backgroundColor: isDownloaded ? "#059669" : "#2563EB",
                            color: "#FFFFFF",
                            borderColor: isDownloaded ? "#047857" : "#1D4ED8",
                          },
                        }}
                      >
                        {isDownloaded ? (
                          <CheckCircleRounded sx={{ fontSize: 16 }} />
                        ) : (
                          <FileDownloadRounded sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}

                  <Tooltip title="Remove">
                    <span>
                      <IconButton
                        size="small"
                        disabled={removingPath === path}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(path, name);
                        }}
                        sx={{
                          width: 28,
                          height: 28,
                          padding: 0,
                          ml: 0.5,
                          backgroundColor: "#F1F5F9",
                          color: "#94A3B8",
                          border: "1px solid #E2E8F0",
                          transition: "all 150ms ease-in-out",
                          "&:hover": {
                            backgroundColor: "#FEF2F2",
                            color: "#EF4444",
                            borderColor: "#FECACA",
                          },
                        }}
                      >
                        {removingPath === path ? (
                          <CircularProgress size={14} thickness={5} sx={{ color: "#94A3B8" }} />
                        ) : (
                          <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </GenericDialog>

      {/* On-demand lightbox - opened per file rather than a persistent
          top preview. */}
      <MuiDialog
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        sx={{
          "& .MuiPaper-root": {
            backgroundColor: "rgba(15, 23, 42, 0.98)",
            boxShadow: "none",
            borderRadius: isMobile ? 0 : "12px",
            border: isMobile ? "none" : "1px solid #334155",
            backgroundImage: "none",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: isMobile ? "100vh" : "85vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconButton
            onClick={() => setLightboxIndex(null)}
            aria-label="Close preview"
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              color: "#F8FAFC",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
            }}
          >
            <CloseIcon />
          </IconButton>

          {totalFiles > 1 && lightboxIndex !== null && (
            <IconButton
              onClick={() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
              disabled={lightboxIndex === 0}
              aria-label="Previous file"
              sx={{
                position: "absolute",
                left: 16,
                color: "#F8FAFC",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                "&.Mui-disabled": { opacity: 0.3, borderColor: "transparent" },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
          )}

          {lightboxFile && lightboxFileType === "image" && (
            <Box
              component="img"
              src={`${API_BASE_URL}/files/view/${encodeURIComponent(lightboxStoragePath)}`}
              alt={lightboxDisplayName}
              sx={{ maxHeight: "90%", maxWidth: "90%", objectFit: "contain" }}
            />
          )}

          {lightboxFile && lightboxFileType !== "image" && (
            <Stack spacing={1.5} alignItems="center">
              <FileIcon type={lightboxFileType!} size={64} />
              <Typography sx={{ color: "#F8FAFC", fontWeight: 600 }}>{lightboxDisplayName}</Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                Preview not supported for this format
              </Typography>
            </Stack>
          )}

          {totalFiles > 1 && lightboxIndex !== null && (
            <IconButton
              onClick={() =>
                setLightboxIndex((i) => (i !== null && i < totalFiles - 1 ? i + 1 : i))
              }
              disabled={lightboxIndex === totalFiles - 1}
              aria-label="Next file"
              sx={{
                position: "absolute",
                right: 16,
                color: "#F8FAFC",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                "&.Mui-disabled": { opacity: 0.3, borderColor: "transparent" },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          )}

          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              px: 2.5,
              py: 0.75,
              borderRadius: "9999px",
              backgroundColor: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Typography variant="caption" sx={{ color: "#F8FAFC", fontWeight: 500 }}>
              {lightboxDisplayName}
              {totalFiles > 1 && ` • ${(lightboxIndex ?? 0) + 1} of ${totalFiles}`}
            </Typography>

            <IconButton
              size="small"
              onClick={() => handleDownload(lightboxStoragePath, lightboxDisplayName)}
              aria-label="Download"
              disabled={lightboxStoragePath in downloadProgress}
              sx={{ color: "#F8FAFC" }}
            >
              {lightboxStoragePath in downloadProgress ? (
                <CircularProgress
                  variant="determinate"
                  value={downloadProgress[lightboxStoragePath]}
                  size={16}
                  thickness={5}
                  sx={{ color: "#3B82F6" }}
                />
              ) : (
                <FileDownloadRounded fontSize="small" />
              )}
            </IconButton>
          </Stack>
        </Box>
      </MuiDialog>
    </Box>
  );
};

export default ProjectFilesList;
