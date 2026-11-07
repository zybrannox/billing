import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Typography } from "@mui/material";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import PhotoLibraryRoundedIcon from "@mui/icons-material/PhotoLibraryRounded";
import { apiService } from "../../../api/service";
import type { ProjectFile } from "../../../api/types";
import ProjectFilesGallery from "../../../ui/ProjectFilesGallery";
import FileSizeTooltip from "../../../ui/FileSizeTooltip";
import { thumbnailUrl } from "../../../ui/projectFileUrls";

const SHOWN = 6;

// The files an invoice billed for, above the open invoice: a row of thumbnails
// that open the full gallery. Same request and cache as the gallery itself.
export default function InvoiceFilesStrip({ invoiceId, invoiceNumber }: { invoiceId: number; invoiceNumber?: string }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["invoice-files", invoiceId],
    queryFn: () => apiService.get<ProjectFile[]>(`/files/invoice/${invoiceId}`),
  });
  const files = query.data ?? [];
  if (query.isPending || query.isError) return null;

  return (
    <Box
      className="invoice-toolbar"
      sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1.5, p: 1.25, bgcolor: "var(--white)", border: "1px solid var(--slate-200)", borderRadius: "10px" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "var(--slate-600)", flexShrink: 0 }}>
        <PhotoLibraryRoundedIcon sx={{ fontSize: 18 }} />
        <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>
          {files.length === 0 ? "No files billed on this invoice" : `Files (${files.length})`}
        </Typography>
      </Box>
      {files.length > 0 && (
        <>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", minWidth: 0 }}>
            {files.slice(0, SHOWN).map((file) => (
              <FileSizeTooltip key={file.path} name={file.original_name || file.path} sizeBytes={file.size_bytes}>
                <Box
                  component="button"
                  type="button"
                  aria-label={`Open ${file.original_name || "file"}`}
                  onClick={() => setOpen(true)}
                  sx={{
                    width: 44,
                    height: 44,
                    p: 0,
                    display: "grid",
                    placeItems: "center",
                    overflow: "hidden",
                    border: "1px solid var(--slate-200)",
                    borderRadius: "8px",
                    bgcolor: "var(--slate-50)",
                    color: "var(--slate-400)",
                    cursor: "pointer",
                    "&:hover": { borderColor: "var(--blue-500)" },
                    "&:focus-visible": { outline: "2px solid var(--blue-500)", outlineOffset: 2 },
                  }}
                >
                  {file.is_image ? (
                    <Box component="img" src={thumbnailUrl(file.path)} alt="" loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <InsertDriveFileRoundedIcon sx={{ fontSize: 20 }} />
                  )}
                </Box>
              </FileSizeTooltip>
            ))}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => setOpen(true)}
            sx={{ ml: "auto", p: 0, border: "none", background: "none", cursor: "pointer", font: "inherit", fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--blue-700)", "&:hover": { textDecoration: "underline" } }}
          >
            {files.length > SHOWN ? `View all ${files.length}` : "View"}
          </Box>
        </>
      )}
      <ProjectFilesGallery open={open} onClose={() => setOpen(false)} invoiceId={invoiceId} subtitle={invoiceNumber ? `Invoice ${invoiceNumber}` : undefined} />
    </Box>
  );
}
