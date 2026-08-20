import { useState } from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog as MuiDialog,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  FileDownloadRounded,
  Close as CloseIcon,
  CheckCircleRounded,
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

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Keeps the accordion row itself at a fixed, predictable size no matter how
// many files a project has (the full-content view below is what scales to
// however many there are, via its own scroll container) - a handful of
// chips plus an overflow "+N" chip is O(1) to render, not O(files).
const MAX_VISIBLE_CHIPS = 4;

type FileType = "image" | "pdf" | "archive" | "doc" | "sheet" | "file";

const getFileType = (file: string | FileObject): FileType => {
  const fileName = typeof file === "string" ? file : file.path;
  const ext = fileName.split(".").pop()?.toLowerCase();

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

const fileName = (f: string | FileObject) => (typeof f === "string" ? f : f.path);

/**
 * Gmail-style compact attachment strip for the project row accordion - a
 * few small chips, an overflow "+N" chip past MAX_VISIBLE_CHIPS, and a
 * "view all" dialog with the full list. No persistent preview or search;
 * clicking a chip opens a lightbox on demand.
 */
const ProjectFilesList = () => {
  const { selectedProject, refreshProject } = useProjectStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [viewAllOpen, setViewAllOpen] = useState(false);

  const files = selectedProject?.file_paths ?? [];
  const totalFiles = files.length;
  const visibleFiles = files.slice(0, MAX_VISIBLE_CHIPS);
  const hiddenCount = totalFiles - visibleFiles.length;

  const lightboxFile = lightboxIndex !== null ? files[lightboxIndex] : null;
  const lightboxFileName = lightboxFile ? fileName(lightboxFile) : "";
  const lightboxFileType = lightboxFile ? getFileType(lightboxFile) : null;

  const handleDownload = async (name: string) => {
    setDownloadProgress((prev) => ({ ...prev, [name]: 0 }));
    try {
      const blob = await apiService.getWithProgress<Blob>(
        `/files/download/${encodeURIComponent(name)}`,
        ({ percent }) => {
          if (percent === null) return;
          setDownloadProgress((prev) => ({ ...prev, [name]: percent }));
        },
        { responseType: "blob" },
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      if (selectedProject) await refreshProject(selectedProject.id);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const openLightbox = (index: number) => {
    setViewAllOpen(false);
    setLightboxIndex(index);
  };

  if (totalFiles === 0) {
    return (
      <Box sx={{ py: 1.5 }}>
        <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "0.8125rem" }}>
          No files available in this project
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {visibleFiles.map((file) => {
          const name = fileName(file);
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
                  src={`${API_BASE_URL}/files/thumbnail/${encodeURIComponent(name)}`}
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

      {/* Full list - only rendered on demand, scoped to a scroll container
          so it stays cheap regardless of how many files the project has. */}
      <GenericDialog
        open={viewAllOpen}
        onClose={() => setViewAllOpen(false)}
        title={`${totalFiles} ${totalFiles === 1 ? "File" : "Files"}`}
        maxWidth="xs"
        width="26rem"
      >
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
            const name = fileName(file);
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
                        src={`${API_BASE_URL}/files/thumbnail/${encodeURIComponent(name)}`}
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
                  {name in downloadProgress ? (
                    <Box sx={{ display: "flex", alignItems: "center", px: 0.5 }}>
                      <CircularProgress
                        variant="determinate"
                        value={downloadProgress[name]}
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
                          handleDownload(name);
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
              src={`${API_BASE_URL}/files/view/${encodeURIComponent(lightboxFileName)}`}
              alt={lightboxFileName}
              sx={{ maxHeight: "90%", maxWidth: "90%", objectFit: "contain" }}
            />
          )}

          {lightboxFile && lightboxFileType !== "image" && (
            <Stack spacing={1.5} alignItems="center">
              <FileIcon type={lightboxFileType!} size={64} />
              <Typography sx={{ color: "#F8FAFC", fontWeight: 600 }}>{lightboxFileName}</Typography>
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
              {lightboxFileName}
              {totalFiles > 1 && ` • ${(lightboxIndex ?? 0) + 1} of ${totalFiles}`}
            </Typography>

            <IconButton
              size="small"
              onClick={() => handleDownload(lightboxFileName)}
              aria-label="Download"
              disabled={lightboxFileName in downloadProgress}
              sx={{ color: "#F8FAFC" }}
            >
              {lightboxFileName in downloadProgress ? (
                <CircularProgress
                  variant="determinate"
                  value={downloadProgress[lightboxFileName]}
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
