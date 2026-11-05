import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { apiService } from "../api/service";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { formatFileSize, formatTransferred } from "../utils/appSupport";
import { useDownloadProgressStore } from "../store/useDownloadProgressStore";
import { LARGE_DOWNLOAD_BYTES } from "../utils/fileDownload";
import { fileTypeLabel, getFileKind } from "../utils/fileKind";
import FileTypeIcon from "./FileTypeIcon";
import { originalUrl, thumbnailUrl } from "./projectFileUrls";

export interface PreviewFile {
  // The stored name every /files/* call addresses it by.
  path: string;
  // What the user named it; never `path`, and what `kind` is judged from.
  name: string;
  sizeBytes?: number | null;
  pixelWidth?: number | null;
  pixelHeight?: number | null;
  // The retention job removed the original; only a thumbnail may be left.
  originalRemoved?: boolean;
}

// A browser can take a long time to decode a huge image, so past this the small
// thumbnail is shown instead, and the card says the full file is a download away.
const IMAGE_ORIGINAL_MAX_BYTES = 60 * 1024 * 1024;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.5;
const STAGE_PADDING = 24;

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(1, zoom));

const stageSx = { position: "absolute", inset: 0 } as const;

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ ...stageSx, display: "flex", alignItems: "center", justifyContent: "center", p: 3, textAlign: "center" }}>
      {children}
    </Box>
  );
}

// Fits the whole image in the stage whatever its shape (never enlarging past its
// real size), then zooms from there with the stage scrolling around it.
function ImageStage({
  src,
  alt,
  zoom,
  onZoomChange,
  onPercentChange,
  onFail,
}: {
  src: string;
  alt: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onPercentChange: (percent: number | null) => void;
  onFail: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [room, setRoom] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () =>
      setRoom({
        width: Math.max(0, stage.clientWidth - STAGE_PADDING * 2),
        height: Math.max(0, stage.clientHeight - STAGE_PADDING * 2),
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const fit = natural ? Math.min(room.width / natural.width, room.height / natural.height, 1) : 1;
  const scale = fit * zoom;

  useEffect(() => {
    onPercentChange(natural ? Math.round(scale * 100) : null);
  }, [natural, scale, onPercentChange]);

  return (
    <>
      {!natural && (
        <Centered>
          <CircularProgress size={32} sx={{ color: "var(--slate-400)" }} />
        </Centered>
      )}
      <Box ref={stageRef} sx={{ ...stageSx, overflow: "auto", display: "flex", p: `${STAGE_PADDING}px` }}>
        <Box
          component="img"
          src={src}
          alt={alt}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            setNatural({ width: img.naturalWidth, height: img.naturalHeight });
          }}
          onError={onFail}
          onClick={() => onZoomChange(zoom > 1 ? 1 : 2)}
          sx={{
            m: "auto",
            flexShrink: 0,
            display: "block",
            visibility: natural ? "visible" : "hidden",
            width: natural ? natural.width * scale : 0,
            height: natural ? natural.height * scale : 0,
            bgcolor: "var(--white)",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.15), 0 8px 24px rgba(15, 23, 42, 0.12)",
            cursor: zoom > 1 ? "zoom-out" : "zoom-in",
          }}
        />
      </Box>
    </>
  );
}

// A PDF is fetched and shown from a local blob rather than by pointing a frame at
// the API, which refuses to be framed (X-Frame-Options: DENY). Viewing doesn't
// mark the file downloaded: that only happens through the download's own confirm.
function PdfStage({ path, name, onFail }: { path: string; name: string; onFail: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [percent, setPercent] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    apiService
      .getWithProgress<Blob>(`/files/download/${encodeURIComponent(path)}`, ({ percent: p }) => setPercent(p), {
        responseType: "blob",
        signal: controller.signal,
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setUrl(objectUrl);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error("PDF preview failed:", err);
          onFail();
        }
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, onFail]);

  if (!url) {
    return (
      <Centered>
        <Box>
          <CircularProgress size={32} sx={{ color: "var(--slate-400)" }} />
          <Typography sx={{ mt: 1.5, fontSize: "var(--fs-sm)", color: "var(--slate-500)" }}>
            Loading PDF{percent ? ` ${percent}%` : "…"}
          </Typography>
        </Box>
      </Centered>
    );
  }
  // The viewer's own bar would only add a meaningless blob id as its title; the
  // dialog's header already has the real name and Download.
  return <Box component="iframe" title={name} src={`${url}#toolbar=0&navpanes=0&view=FitH`} sx={{ ...stageSx, width: "100%", height: "100%", border: 0 }} />;
}

// For anything with nothing to show: says what the file is, why, and what to do.
function FileCard({ file, message, action }: { file: PreviewFile; message: string; action?: ReactNode }) {
  return (
    <Centered>
      <Box
        sx={{
          width: "100%",
          maxWidth: 400,
          p: 4,
          borderRadius: "16px",
          bgcolor: "var(--white)",
          border: "1px solid var(--slate-200)",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
        }}
      >
        <FileTypeIcon kind={getFileKind(file.name)} size={56} />
        <Typography sx={{ mt: 1.5, fontWeight: 600, color: "var(--slate-900)", overflowWrap: "anywhere" }}>{file.name}</Typography>
        <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)", mt: 0.25 }}>
          {[fileTypeLabel(file.name), file.sizeBytes != null ? formatFileSize(file.sizeBytes) : null].filter(Boolean).join(" · ")}
        </Typography>
        <Typography sx={{ mt: 1.5, fontSize: "var(--fs-sm)", color: "var(--slate-600)" }}>{message}</Typography>
        {action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
      </Box>
    </Centered>
  );
}

function NavButton({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  return (
    <Tooltip title={label}>
      <IconButton
        onClick={onClick}
        aria-label={label}
        sx={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          [side]: 12,
          zIndex: 1,
          bgcolor: "var(--white)",
          color: "var(--slate-700)",
          border: "1px solid var(--slate-200)",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.15)",
          "&:hover": { bgcolor: "var(--slate-50)" },
        }}
      >
        {side === "left" ? <ChevronLeftRoundedIcon /> : <ChevronRightRoundedIcon />}
      </IconButton>
    </Tooltip>
  );
}

/**
 * Full-size preview of a list of files, with previous/next. Images fit the screen
 * and zoom, PDFs open in the browser's viewer, and anything a browser can't show
 * gets a card with its details and a download button.
 */
export default function FilePreviewDialog({
  files,
  index,
  onIndexChange,
  onClose,
  onDownload,
}: {
  files: PreviewFile[];
  // The file being shown; null keeps the dialog closed.
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onDownload: (file: PreviewFile) => void;
}) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));

  // Remembered with the file it was set for, so each new file starts at "fit".
  const [zoomed, setZoomed] = useState<{ path: string; zoom: number } | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  // The path that failed rather than a flag, so moving to another file clears it.
  const [failedPath, setFailedPath] = useState<string | null>(null);

  const file = index !== null ? files[index] : undefined;
  const path = file?.path;

  const zoom = zoomed && zoomed.path === path ? zoomed.zoom : 1;
  const setZoom = (next: number) => path && setZoomed({ path, zoom: clampZoom(next) });

  const hasPrevious = index !== null && index > 0;
  const hasNext = index !== null && index < files.length - 1;
  const previous = () => hasPrevious && onIndexChange(index - 1);
  const next = () => hasNext && onIndexChange(index + 1);

  const kind = file ? getFileKind(file.name) : "file";
  const failed = !!path && failedPath === path;
  const canDownload = !!file && !file.originalRemoved;
  const tooLargeForImage = kind === "image" && (file?.sizeBytes ?? 0) > IMAGE_ORIGINAL_MAX_BYTES;
  const showsThumbnail = kind === "image" && (!!file?.originalRemoved || tooLargeForImage);
  const isImage = kind === "image" && !failed;
  const canZoom = isImage && percent !== null;
  // Phones and some browsers have no built-in viewer, so a frame would be empty.
  const browserShowsPdf = navigator.pdfViewerEnabled !== false;

  // Downloads are tracked by file path; see useDownloadProgressStore.
  const download = useDownloadProgressStore((s) => s.downloads.find((d) => d.id === path && !d.done && !d.error));
  const isDownloading = !!download;

  const markFailed = useCallback(() => setFailedPath(path ?? null), [path]);

  useKeyboardShortcuts(
    {
      ArrowLeft: previous,
      ArrowRight: next,
      Enter: () => {
        if (file && canDownload && !isDownloading) onDownload(file);
      },
      "+": () => canZoom && setZoom(zoom * ZOOM_STEP),
      "=": () => canZoom && setZoom(zoom * ZOOM_STEP),
      "-": () => canZoom && setZoom(zoom / ZOOM_STEP),
      "0": () => setZoom(1),
    },
    index !== null,
  );

  const downloadButton = (
    <Button
      variant="contained"
      disableElevation
      disabled={isDownloading}
      startIcon={
        isDownloading ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : <FileDownloadRoundedIcon sx={{ fontSize: 18 }} />
      }
      onClick={() => file && onDownload(file)}
      sx={{ textTransform: "none", fontWeight: 600, whiteSpace: "nowrap", borderRadius: "8px" }}
    >
      {download ? formatTransferred(download.loaded, download.total) : "Download"}
    </Button>
  );

  const details = file
    ? [
        file.pixelWidth && file.pixelHeight ? `${file.pixelWidth} × ${file.pixelHeight} px` : null,
        file.sizeBytes != null ? formatFileSize(file.sizeBytes) : null,
        files.length > 1 && index !== null ? `${index + 1} of ${files.length}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <Dialog
      open={!!file}
      onClose={onClose}
      fullScreen={isPhone}
      maxWidth={false}
      aria-label={file ? `Preview of ${file.name}` : "File preview"}
      slotProps={{
        paper: {
          sx: {
            width: isPhone ? "100%" : "min(1400px, calc(100vw - 48px))",
            height: isPhone ? "100%" : "calc(100vh - 48px)",
            maxHeight: "none",
            maxWidth: "none",
            m: isPhone ? 0 : 3,
            borderRadius: isPhone ? 0 : "14px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            backgroundImage: "none",
          },
        },
      }}
    >
      {file && (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: { xs: "wrap", sm: "nowrap" },
              gap: 1.5,
              px: 2,
              py: 1.25,
              bgcolor: "var(--white)",
              borderBottom: "1px solid var(--slate-200)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, flex: { xs: "1 1 100%", sm: 1 } }}>
              <Box sx={{ display: "flex", flexShrink: 0 }}>
                <FileTypeIcon kind={kind} size={22} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Tooltip title={file.name}>
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: "var(--fs-md)", color: "var(--slate-900)" }}>
                    {file.name}
                  </Typography>
                </Tooltip>
                {details && (
                  <Typography noWrap sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
                    {details}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, ml: { xs: "auto", sm: 0 } }}>
              {canZoom && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--slate-200)",
                    borderRadius: "8px",
                    height: 36,
                  }}
                >
                  <Tooltip title="Zoom out">
                    <span>
                      <IconButton size="small" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(zoom / ZOOM_STEP)}>
                        <RemoveRoundedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={zoom > 1 ? "Fit to screen" : "Actual zoom level"}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setZoom(1)}
                      sx={{
                        minWidth: 46,
                        border: 0,
                        bgcolor: "transparent",
                        fontFamily: "inherit",
                        fontSize: "var(--fs-xs)",
                        fontWeight: 600,
                        color: "var(--slate-700)",
                        cursor: zoom > 1 ? "pointer" : "default",
                      }}
                    >
                      {percent}%
                    </Box>
                  </Tooltip>
                  <Tooltip title="Zoom in">
                    <span>
                      <IconButton size="small" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom(zoom * ZOOM_STEP)}>
                        <AddRoundedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              )}
              {canDownload && downloadButton}
              <Tooltip title="Close">
                <IconButton onClick={onClose} aria-label="Close preview" sx={{ color: "var(--slate-600)" }}>
                  <CloseRoundedIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {(file.originalRemoved || tooLargeForImage) && !failed && kind === "image" && (
            <Box
              sx={{
                px: 2,
                py: 0.75,
                fontSize: "var(--fs-xs)",
                textAlign: "center",
                color: "var(--amber-800)",
                bgcolor: "var(--amber-100)",
              }}
            >
              {file.originalRemoved
                ? "The original was removed after 7 days on this completed project. This is a small preview."
                : "This image is too large to open here, so this is a small preview. Download it to see the full file."}
            </Box>
          )}

          <Box sx={{ position: "relative", flex: 1, minHeight: 0, bgcolor: "var(--slate-100)" }}>
            {isImage ? (
              <ImageStage
                key={file.path}
                src={showsThumbnail ? thumbnailUrl(file.path) : originalUrl(file.path)}
                alt={file.name}
                zoom={zoom}
                onZoomChange={setZoom}
                onPercentChange={setPercent}
                onFail={markFailed}
              />
            ) : kind === "pdf" && !failed && !file.originalRemoved && browserShowsPdf && (file.sizeBytes ?? 0) <= LARGE_DOWNLOAD_BYTES ? (
              <PdfStage key={file.path} path={file.path} name={file.name} onFail={markFailed} />
            ) : (
              <FileCard
                file={file}
                message={
                  file.originalRemoved
                    ? "The original was automatically removed after 7 days on this completed project."
                    : kind === "pdf" && !failed
                      ? browserShowsPdf
                        ? "This PDF is too large to open here. Download it to view it."
                        : "This browser can't show PDFs inside the app. Download it to view it."
                      : failed
                        ? "This file couldn't be displayed. It may be damaged, or in a format your browser can't show. Download it to open it in another app."
                        : "This type of file can't be shown in the browser. Download it to open it in the right app."
                }
                action={canDownload ? downloadButton : undefined}
              />
            )}

            {hasPrevious && <NavButton side="left" label="Previous file" onClick={previous} />}
            {hasNext && <NavButton side="right" label="Next file" onClick={next} />}
          </Box>
        </>
      )}
    </Dialog>
  );
}
