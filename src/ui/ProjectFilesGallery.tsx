import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, IconButton, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PhotoLibraryRoundedIcon from "@mui/icons-material/PhotoLibraryRounded";
import { apiService } from "../api/service";
import type { ProjectFile } from "../api/types";
import { formatFileSize } from "../utils/appSupport";
import EmptyState from "./EmptyState";
import { GenericDialog } from "./Dialog";
import ListState from "./ListState";
import { bestImageUrl, originalUrl, thumbnailUrl } from "./projectFileUrls";

// Originals above this size are shown as their (small, cached) thumbnail in
// the grid so opening the gallery doesn't download a wall of large artwork
// files; the full original is still what opens when a tile is clicked.
const GRID_ORIGINAL_MAX_BYTES = 4 * 1024 * 1024;

function Picture({ file, preferOriginalUpTo, fit, alt }: { file: ProjectFile; preferOriginalUpTo?: number; fit: "cover" | "contain"; alt: string }) {
  // If the chosen source fails to load, fall back to the thumbnail, then to a
  // plain placeholder - never a broken-image icon.
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const src = stage === 0 ? bestImageUrl(file, preferOriginalUpTo) : stage === 1 ? thumbnailUrl(file.path) : "";
  if (stage === 2) {
    return (
      <Box sx={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--slate-400)" }}>
        <InsertDriveFileRoundedIcon />
      </Box>
    );
  }
  return (
    <Box
      component="img"
      key={src}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setStage((s) => (s === 0 && src !== thumbnailUrl(file.path) ? 1 : 2))}
      sx={{ width: "100%", height: "100%", objectFit: fit, display: "block" }}
    />
  );
}

const nameOf = (file: ProjectFile) => file.original_name || file.path;

// The files an invoice billed for, as a gallery: the actual image where it still
// exists, its thumbnail otherwise, a file icon for anything that isn't an
// image. Click a tile for a large view with previous / next.
export default function ProjectFilesGallery({
  open,
  onClose,
  invoiceId,
  title = "Invoiced files",
  subtitle,
}: {
  open: boolean;
  onClose: () => void;
  invoiceId: number;
  title?: string;
  subtitle?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["invoice-files", invoiceId],
    queryFn: () => apiService.get<ProjectFile[]>(`/files/invoice/${invoiceId}`),
    enabled: open,
  });
  const files = query.data ?? [];
  const images = files.filter((f) => f.is_image);
  const current = selected !== null ? images[selected] : undefined;

  const close = () => {
    setSelected(null);
    onClose();
  };

  return (
    <GenericDialog open={open} onClose={close} title={title} subtitle={subtitle} maxWidth="md" fullWidth>
      {query.isPending || query.isError ? (
        <ListState loading={query.isPending} error={query.isError} empty={false} errorText="Couldn't load the files." emptyText="" />
      ) : files.length === 0 ? (
        <EmptyState icon={<PhotoLibraryRoundedIcon />} title="No files linked" description="None of this invoice's lines are linked to an uploaded file." />
      ) : current ? (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <IconButton size="small" onClick={() => setSelected(null)} aria-label="Back to all files">
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontWeight: 600, fontSize: "var(--fs-md)" }}>{nameOf(current)}</Typography>
              <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
                {[
                  current.pixel_width && current.pixel_height ? `${current.pixel_width} × ${current.pixel_height} px` : null,
                  current.size_bytes != null ? formatFileSize(current.size_bytes) : null,
                  current.original_available ? "Original" : "Original removed - showing preview",
                ].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
            {current.original_available && (
              <IconButton component="a" href={originalUrl(current.path)} target="_blank" rel="noreferrer" size="small" aria-label="Open original in a new tab">
                <OpenInNewRoundedIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          <Box sx={{ position: "relative", bgcolor: "var(--slate-100)", borderRadius: "10px", height: { xs: 320, sm: 440 }, overflow: "hidden" }}>
            <Picture key={current.path} file={current} fit="contain" alt={nameOf(current)} />
            {selected! > 0 && (
              <IconButton onClick={() => setSelected(selected! - 1)} aria-label="Previous image" sx={navButton("left")}>
                <ChevronLeftRoundedIcon />
              </IconButton>
            )}
            {selected! < images.length - 1 && (
              <IconButton onClick={() => setSelected(selected! + 1)} aria-label="Next image" sx={navButton("right")}>
                <ChevronRightRoundedIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          {files.map((file) => {
            const imageIndex = images.indexOf(file);
            return (
              <Box key={file.path}>
                <Box
                  component={file.is_image ? "button" : "div"}
                  type={file.is_image ? "button" : undefined}
                  onClick={file.is_image ? () => setSelected(imageIndex) : undefined}
                  aria-label={file.is_image ? `View ${nameOf(file)}` : undefined}
                  sx={{
                    position: "relative",
                    display: "block",
                    width: "100%",
                    aspectRatio: "1 / 1",
                    p: 0,
                    overflow: "hidden",
                    borderRadius: "10px",
                    border: "1px solid var(--slate-200)",
                    bgcolor: "var(--slate-100)",
                    cursor: file.is_image ? "pointer" : "default",
                    "&:hover": file.is_image ? { borderColor: "var(--blue-400)" } : undefined,
                  }}
                >
                  {file.is_image ? (
                    <Picture file={file} preferOriginalUpTo={GRID_ORIGINAL_MAX_BYTES} fit="cover" alt={nameOf(file)} />
                  ) : (
                    <Box sx={{ height: "100%", display: "grid", placeItems: "center", color: "var(--slate-400)" }}>
                      <InsertDriveFileRoundedIcon sx={{ fontSize: 36 }} />
                    </Box>
                  )}
                  {file.is_image && (
                    <Box
                      sx={{
                        position: "absolute", left: 6, bottom: 6, px: 0.75, py: 0.1, borderRadius: "6px",
                        fontSize: "var(--fs-2xs)", fontWeight: 700, color: "var(--white)",
                        bgcolor: bestImageUrl(file, GRID_ORIGINAL_MAX_BYTES) === thumbnailUrl(file.path) ? "rgba(15, 23, 42, 0.65)" : "rgba(5, 150, 105, 0.9)",
                      }}
                    >
                      {bestImageUrl(file, GRID_ORIGINAL_MAX_BYTES) === thumbnailUrl(file.path) ? "Preview" : "Original"}
                    </Box>
                  )}
                </Box>
                <Typography noWrap title={nameOf(file)} sx={{ mt: 0.5, fontSize: "var(--fs-xs)", color: "var(--slate-600)" }}>
                  {nameOf(file)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </GenericDialog>
  );
}

const navButton = (side: "left" | "right") => ({
  position: "absolute" as const,
  top: "50%",
  transform: "translateY(-50%)",
  [side]: 8,
  bgcolor: "rgba(255, 255, 255, 0.9)",
  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.2)",
  "&:hover": { bgcolor: "var(--white)" },
});
