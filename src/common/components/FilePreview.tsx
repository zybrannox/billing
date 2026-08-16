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
import { FileDownloadRounded, ZoomInRounded, Close as CloseIcon } from "@mui/icons-material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ArchiveIcon from "@mui/icons-material/Archive";
import DescriptionIcon from "@mui/icons-material/Description";
import TableChartIcon from "@mui/icons-material/TableChart";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useProjectStore, type FileObject } from "../../store/useProjectStore";
import Skeleton from "../../ui/Skeleton";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const PREVIEW_HEIGHT = 240;

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

const FileIcon = ({ type, size = 80 }: { type: FileType; size?: number }) => {
  const iconSx = { fontSize: size };
  switch (type) {
    case "pdf":
      return <PictureAsPdfIcon sx={{ ...iconSx, color: "#E53935" }} />;
    case "archive":
      return <ArchiveIcon sx={{ ...iconSx, color: "#6D4C41" }} />;
    case "doc":
      return <DescriptionIcon sx={{ ...iconSx, color: "#1E88E5" }} />;
    case "sheet":
      return <TableChartIcon sx={{ ...iconSx, color: "#2E7D32" }} />;
    default:
      return <InsertDriveFileIcon sx={{ ...iconSx, color: "#90caf9" }} />;
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
      bgcolor: "background.default",
    }}
  >
    {children}
  </Box>
);

/* ------------------------------ component ------------------------------ */

const FilePreview = () => {
  const { selectedProject } = useProjectStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(
    new Set(),
  );
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

  const currentFileType = currentFile ? getFileType(currentFile) : null;

  /* ------------------ image preload ------------------ */

  const currentFileName = useMemo(() => {
    if (!currentFile) return "";
    return typeof currentFile === "string" ? currentFile : currentFile.path;
  }, [currentFile]);

  /* ------------------ image preload ------------------ */

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

  const handleDownload = useCallback(async (filename: string) => {
    // Add to downloading set immediately (non-blocking)
    setDownloadingFiles((prev) => new Set(prev).add(filename));

    // Run download in background
    (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/files/download/${encodeURIComponent(filename)}`,
          { credentials: "include" },
        );

        if (!response.ok) throw new Error("Download failed");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        link.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Download error:", err);
      } finally {
        // Remove from downloading set
        setDownloadingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(filename);
          return newSet;
        });
      }
    })();
  }, []);

  /* ------------------ keyboard navigation ------------------ */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard events when FilePreview is visible
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <InsertDriveFileIcon sx={{ fontSize: 200, color: "var(--blue-300)" }} />
        <Typography color="var(--blue-500)">
          Click a project to see its details.
        </Typography>
      </Box>
    );
  }

  /* ------------------ render ------------------ */

  return (
    <>
      {/* ================= FILE PREVIEW ================= */}
      <Card
        sx={{
          maxWidth: 640,
          mx: "auto",
          borderRadius: 3,
          boxShadow: "none",
          position: "relative",
          mb: 2,
        }}
      >
        {!currentFile && (
          <Typography align="center" sx={{ py: 6 }}>
            No files available
          </Typography>
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
                    bgcolor: "rgba(0,0,0,0.25)",
                    opacity: 0,
                    transition: "opacity 0.15s",
                  }}
                >
                  <ZoomInRounded sx={{ color: "#fff", fontSize: 40 }} />
                </Box>
              </Box>
            )}

            {/* Non-image */}
            {currentFileType && currentFileType !== "image" && (
              <Stack spacing={1.5} alignItems="center" sx={{ width: "100%" }}>
                <FileIcon type={currentFileType} />
                <Tooltip title={currentFileName}>
                  <Typography
                    variant="body2"
                    align="center"
                    sx={{
                      maxWidth: "90%",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {currentFileName}
                  </Typography>
                </Tooltip>

                <Typography variant="caption" color="text.secondary">
                  Preview not available
                </Typography>
              </Stack>
            )}
          </PreviewContainer>
        )}
      </Card>

      {/* ================= NAVIGATION ================= */}
      {totalFiles > 1 && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ maxWidth: 640, mx: "auto", mb: 2, px: 1 }}
        >
          <IconButton
            onClick={handlePrev}
            disabled={currentIndex === 0}
            size="small"
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>

          <Typography variant="caption" color="text.secondary">
            {currentIndex + 1} of {totalFiles}
          </Typography>

          <IconButton
            onClick={handleNext}
            disabled={currentIndex === totalFiles - 1}
            size="small"
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}

      {/* ================= FILE LIST ================= */}
      <CardContent sx={{ pt: 0, px: 2, pb: 2 }}>
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: "var(--blue-800)",
              fontSize: "0.85rem",
              textTransform: "uppercase",
              minWidth: "fit-content",
            }}
          >
            Files
          </Typography>
          <SearchInput
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            overflowX: "auto",
            overflowY: "hidden",
            pb: 1,
            "::-webkit-scrollbar": { height: "6px" },
            "::-webkit-scrollbar-thumb": {
              bgcolor: "rgba(0,0,0,0.1)",
              borderRadius: "10px",
            },
          }}
        >
          {filteredFiles.map((file) => {
            const fileName = typeof file === "string" ? file : file.path;
            const originalIndex = files.indexOf(file);
            const isCurrent = originalIndex === currentIndex;
            const type = getFileType(file);

            return (
              <Tooltip
                key={originalIndex}
                title={
                  <Box>
                    <Typography variant="caption" sx={{ display: "block" }}>
                      {fileName}
                    </Typography>
                    {typeof file === "object" &&
                      (file.width || file.height) && (
                        <Typography
                          variant="caption"
                          sx={{ fontStyle: "italic", opacity: 0.8 }}
                        >
                          {file.width || "?"}" x {file.height || "?"}"
                        </Typography>
                      )}
                  </Box>
                }
                arrow
              >
                <Box
                  onClick={() => {
                    setCurrentIndex(originalIndex);
                    if (type === "image") setLightboxOpen(true);
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1,
                    minWidth: 100,
                    borderRadius: 2,
                    cursor: "pointer",
                    bgcolor: isCurrent ? "rgba(13, 110, 253, 0.08)" : "#f8f9fa",
                    border: "2px solid",
                    borderColor: isCurrent ? "primary.main" : "#e0e0e0",
                    transition: "all 0.2s",
                    position: "relative",
                    "&:hover": {
                      borderColor: "primary.light",
                      bgcolor: "rgba(13, 110, 253, 0.04)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {type === "image" ? (
                      <Box
                        component="img"
                        src={`${API_BASE_URL}/files/thumbnail/${encodeURIComponent(fileName)}`}
                        loading="lazy"
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 0.5,
                          objectFit: "cover",
                        }}
                        alt=""
                      />
                    ) : (
                      <FileIcon type={type} size={24} />
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      width: "100%",
                      textAlign: "left",
                      mt: 0.5,
                      fontSize: "0.7rem",
                      color: isCurrent ? "primary.main" : "text.secondary",
                      fontWeight: isCurrent ? 700 : 500,
                      maxWidth: 90,
                    }}
                  >
                    {fileName}
                  </Typography>

                  {downloadingFiles.has(fileName) ? (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CircularProgress size={20} thickness={5} />
                    </Box>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(fileName);
                      }}
                      sx={{
                        ml: "auto",
                        width: 24,
                        height: 24,
                        padding: 0.5,
                        bgcolor: "rgba(255,255,255,0.9)",
                        border: "1px solid rgba(0,0,0,0.1)",
                        opacity: 0.7,
                        transition: "all 0.2s",
                        ".MuiBox-root:hover &": { opacity: 1 },
                        "&:hover": {
                          opacity: "1 !important",
                          bgcolor: "primary.main",
                          color: "white",
                          transform: "scale(1.1)",
                        },
                      }}
                    >
                      <FileDownloadRounded sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </CardContent>

      {/* ================= BIG IMAGE PREVIEW (LIGHTBOX) ================= */}
      <MuiDialog
        open={lightboxOpen && currentFileType === "image"}
        onClose={() => setLightboxOpen(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        sx={{
          "& .MuiPaper-root": {
            backgroundColor: "rgba(15, 15, 20, 0.97)",
            boxShadow: "none",
            borderRadius: isMobile ? 0 : 2,
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
              top: 12,
              right: 12,
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
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
                left: 12,
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.1)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                "&.Mui-disabled": { opacity: 0.3 },
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
                maxHeight: "100%",
                maxWidth: "100%",
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
                right: 12,
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.1)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                "&.Mui-disabled": { opacity: 0.3 },
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
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              px: 2,
              py: 0.5,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.1)",
            }}
          >
            <Typography variant="caption" sx={{ color: "#fff" }}>
              {currentFileName}
              {totalFiles > 1 && ` • ${currentIndex + 1} of ${totalFiles}`}
            </Typography>
            <IconButton
              size="small"
              onClick={() => handleDownload(currentFileName)}
              aria-label="Download"
              sx={{ color: "#fff" }}
            >
              <FileDownloadRounded fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      </MuiDialog>
    </>
  );
};

export default FilePreview;
