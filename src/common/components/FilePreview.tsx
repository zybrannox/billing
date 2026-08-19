import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Box,
  CircularProgress,
  Dialog as MuiDialog,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SearchInput from "../../ui/SearchInput";
import {
  FileDownloadRounded,
  ZoomInRounded,
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
import Skeleton from "../../ui/Skeleton";
import { apiService } from "../../api/service";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const PREVIEW_HEIGHT = 260;

/* ------------------------ helpers ------------------------ */

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

const FileIcon = ({ type, size = 64 }: { type: FileType; size?: number }) => {
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

/* ------------------ fixed preview wrapper ------------------ */

const PreviewContainer = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      height: PREVIEW_HEIGHT,
      width: "100%",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F8FAFC",
      borderBottom: "1px solid #E2E8F0",
    }}
  >
    {children}
  </Box>
);

/* ------------------------------ component ------------------------------ */

const FilePreview = () => {
  const { selectedProject, refreshProject } = useProjectStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, number>
  >({});
  const [searchTerm, setSearchTerm] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const files = selectedProject?.file_paths ?? [];
  const totalFiles = files.length;

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const fileName = typeof f === "string" ? f : f.path;
      return fileName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [files, searchTerm]);

  const currentFile = useMemo(
    () => files[currentIndex] ?? null,
    [files, currentIndex],
  );

  const allFilesDownloaded = useMemo(() => {
    if (totalFiles === 0) return false;
    return files.every((f) => typeof f !== "string" && !!f.downloaded);
  }, [files, totalFiles]);

  const currentFileType = currentFile ? getFileType(currentFile) : null;

  /* ------------------ image preload ------------------ */

  const currentFileName = useMemo(() => {
    if (!currentFile) return "";
    return typeof currentFile === "string" ? currentFile : currentFile.path;
  }, [currentFile]);

  useEffect(() => {
    if (!currentFileName || currentFileType !== "image") {
      setIsImageLoading(false);
      return;
    }

    setIsImageLoading(true);

    const img = new Image();
    img.src = `${API_BASE_URL}/files/view/${encodeURIComponent(currentFileName)}`;

    img.onload = () => setIsImageLoading(false);
    img.onerror = () => setIsImageLoading(false);
  }, [currentFileName, currentFileType]);

  /* ------------------ navigation ------------------ */

  const handlePrev = useCallback(() => {
    setIsImageLoading(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNext = useCallback(() => {
    setIsImageLoading(false);
    setCurrentIndex((prev) => (prev < totalFiles - 1 ? prev + 1 : prev));
  }, [totalFiles]);

  const handleDownload = useCallback(
    async (filename: string) => {
      setDownloadProgress((prev) => ({ ...prev, [filename]: 0 }));

      try {
        const blob = await apiService.getWithProgress<Blob>(
          `/files/download/${encodeURIComponent(filename)}`,
          ({ percent }) => {
            if (percent === null) return;
            setDownloadProgress((prev) => ({ ...prev, [filename]: percent }));
          },
          { responseType: "blob" },
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
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
          delete next[filename];
          return next;
        });
      }
    },
    [selectedProject, refreshProject],
  );

  /* ------------------ keyboard navigation ------------------ */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedProject) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          handlePrev();
          break;
        case "ArrowDown":
          e.preventDefault();
          handleNext();
          break;
        case "Enter":
          if (currentFileName) {
            e.preventDefault();
            handleDownload(currentFileName);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedProject,
    handlePrev,
    handleNext,
    currentFileName,
    handleDownload,
  ]);

  /* ------------------ empty state ------------------ */

  if (!selectedProject) {
    return (
      <Box
        sx={{
          height: "100%",
          minHeight: 360,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          p: 4,
        }}
      >
        <InsertDriveFileIcon sx={{ fontSize: 72, color: "#94A3B8", mb: 1.5 }} />
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, color: "#0F172A" }}
        >
          No Project Selected
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5 }}>
          Select a project from the grid to preview its files.
        </Typography>
      </Box>
    );
  }

  /* ------------------ render ------------------ */

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      {/* ================= FILE PREVIEW CARD ================= */}
      <Card
        elevation={0}
        sx={{
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
          mb: 2,
        }}
      >
        {!currentFile && (
          <Box
            sx={{
              height: PREVIEW_HEIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F8FAFC",
            }}
          >
            <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 500 }}>
              No files available in this project
            </Typography>
          </Box>
        )}

        {/* Preview */}
        {currentFile && (
          <PreviewContainer>
            {/* Image loading */}
            {currentFileType === "image" && isImageLoading && (
              <Skeleton variant="image" height={PREVIEW_HEIGHT} />
            )}

            {/* Image */}
            {currentFileType === "image" && !isImageLoading && (
              <Box
                onClick={() => setLightboxOpen(true)}
                sx={{
                  position: "relative",
                  height: "100%",
                  width: "100%",
                  cursor: "zoom-in",
                  "&:hover .preview-zoom-hint": { opacity: 1 },
                }}
              >
                <CardMedia
                  component="img"
                  image={`${API_BASE_URL}/files/view/${encodeURIComponent(
                    currentFileName,
                  )}`}
                  alt={currentFileName}
                  sx={{
                    height: "100%",
                    width: "100%",
                    objectFit: "contain",
                    p: 1.5,
                  }}
                  loading="lazy"
                />
                <Box
                  className="preview-zoom-hint"
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(15, 23, 42, 0.4)",
                    backdropFilter: "blur(2px)",
                    opacity: 0,
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: "50%",
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                    }}
                  >
                    <ZoomInRounded sx={{ color: "#FFFFFF", fontSize: 28 }} />
                  </Box>
                </Box>
              </Box>
            )}

            {/* Non-image */}
            {currentFileType && currentFileType !== "image" && (
              <Stack spacing={1.5} alignItems="center" sx={{ width: "100%", px: 2 }}>
                <FileIcon type={currentFileType} size={56} />
                <Tooltip title={currentFileName}>
                  <Typography
                    variant="subtitle2"
                    align="center"
                    sx={{
                      maxWidth: "90%",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontWeight: 600,
                      color: "#0F172A",
                    }}
                  >
                    {currentFileName}
                  </Typography>
                </Tooltip>

                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 500 }}>
                  Preview non-supported format
                </Typography>
              </Stack>
            )}
          </PreviewContainer>
        )}

        {/* Navigation Bar inside card */}
        {totalFiles > 1 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1,
              backgroundColor: "#FFFFFF",
              borderBottom: "1px solid #F1F5F9",
            }}
          >
            <IconButton
              onClick={handlePrev}
              disabled={currentIndex === 0}
              size="small"
              sx={{
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                color: "#475569",
                "&:hover": { backgroundColor: "#F8FAFC" },
                "&.Mui-disabled": { borderColor: "#F1F5F9", color: "#CBD5E1" },
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>

            <Typography
              variant="caption"
              sx={{ color: "#475569", fontWeight: 600, fontSize: "0.75rem" }}
            >
              {currentIndex + 1} of {totalFiles}
            </Typography>

            <IconButton
              onClick={handleNext}
              disabled={currentIndex === totalFiles - 1}
              size="small"
              sx={{
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                color: "#475569",
                "&:hover": { backgroundColor: "#F8FAFC" },
                "&.Mui-disabled": { borderColor: "#F1F5F9", color: "#CBD5E1" },
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Card>

      {/* ================= VERTICAL FILE LIST SECTION ================= */}
      <Box
        sx={{
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          backgroundColor: "#FFFFFF",
          p: 2,
        }}
      >
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: "#334155",
              fontSize: "0.75rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              minWidth: "fit-content",
            }}
          >
            Files
          </Typography>

          {allFilesDownloaded && (
            <Tooltip title="All files downloaded">
              <CheckCircleRounded sx={{ color: "#10B981", fontSize: 18 }} />
            </Tooltip>
          )}

          <SearchInput
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </Box>

        {/* Vertical Stack Container */}
        <Stack
          spacing={1}
          sx={{
            maxHeight: 320,
            overflowY: "auto",
            pr: 0.5,
            "::-webkit-scrollbar": { width: "6px" },
            "::-webkit-scrollbar-thumb": {
              backgroundColor: "#CBD5E1",
              borderRadius: "10px",
            },
            "::-webkit-scrollbar-track": {
              backgroundColor: "#F1F5F9",
            },
          }}
        >
          {filteredFiles.map((file) => {
            const fileName = typeof file === "string" ? file : file.path;
            const originalIndex = files.indexOf(file);
            const isCurrent = originalIndex === currentIndex;
            const type = getFileType(file);
            const isDownloaded = typeof file !== "string" && !!file.downloaded;

            return (
              <Box
                key={originalIndex}
                onClick={() => {
                  setCurrentIndex(originalIndex);
                  if (type === "image") setLightboxOpen(true);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  p: 1.25,
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: isDownloaded
                    ? "#F0FDF4"
                    : isCurrent
                      ? "#EFF6FF"
                      : "#FFFFFF",
                  border: "1px solid",
                  borderColor: isDownloaded
                    ? "#A7F3D0"
                    : isCurrent
                      ? "#93C5FD"
                      : "#E2E8F0",
                  transition: "all 150ms ease-in-out",
                  "&:hover": {
                    borderColor: isDownloaded
                      ? "#34D399"
                      : isCurrent
                        ? "#3B82F6"
                        : "#CBD5E1",
                    backgroundColor: isDownloaded
                      ? "#DCFCE7"
                      : isCurrent
                        ? "#DBEAFE"
                        : "#F8FAFC",
                  },
                }}
              >
                {/* Left Side: Thumbnail/Icon + File Details */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    minWidth: 0,
                    flexGrow: 1,
                  }}
                >
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
                        src={`${API_BASE_URL}/files/thumbnail/${encodeURIComponent(fileName)}`}
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
                      <FileIcon type={type} size={28} />
                    )}
                  </Box>

                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        fontSize: "0.8125rem",
                        color: isDownloaded
                          ? "#065F46"
                          : isCurrent
                            ? "#1E40AF"
                            : "#0F172A",
                        fontWeight: isCurrent || isDownloaded ? 600 : 500,
                      }}
                    >
                      {fileName}
                    </Typography>

                    {typeof file === "object" &&
                      (file.width || file.height) && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            color: "#64748B",
                            fontSize: "0.7rem",
                          }}
                        >
                          {file.width || "?"}" × {file.height || "?"}"
                        </Typography>
                      )}
                  </Box>
                </Box>

                {/* Right Side: Download Progress / Action Button */}
                <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  {fileName in downloadProgress ? (
                    <Box sx={{ display: "flex", alignItems: "center", px: 0.5 }}>
                      <CircularProgress
                        variant="determinate"
                        value={downloadProgress[fileName]}
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
                          handleDownload(fileName);
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
      </Box>

      {/* ================= LIGHTBOX DIALOG ================= */}
      <MuiDialog
        open={lightboxOpen && currentFileType === "image"}
        onClose={() => setLightboxOpen(false)}
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
            onClick={() => setLightboxOpen(false)}
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

          {totalFiles > 1 && (
            <IconButton
              onClick={handlePrev}
              disabled={currentIndex === 0}
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

          {currentFile && currentFileType === "image" && (
            <Box
              component="img"
              src={`${API_BASE_URL}/files/view/${encodeURIComponent(currentFileName)}`}
              alt={currentFileName}
              sx={{
                maxHeight: "90%",
                maxWidth: "90%",
                objectFit: "contain",
              }}
            />
          )}

          {totalFiles > 1 && (
            <IconButton
              onClick={handleNext}
              disabled={currentIndex === totalFiles - 1}
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
              {currentFileName}
              {totalFiles > 1 && ` • ${currentIndex + 1} of ${totalFiles}`}
            </Typography>

            <IconButton
              size="small"
              onClick={() => handleDownload(currentFileName)}
              aria-label="Download"
              disabled={currentFileName in downloadProgress}
              sx={{ color: "#F8FAFC" }}
            >
              {currentFileName in downloadProgress ? (
                <CircularProgress
                  variant="determinate"
                  value={downloadProgress[currentFileName]}
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

export default FilePreview;