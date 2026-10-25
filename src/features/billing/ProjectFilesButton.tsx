import { useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import PhotoLibraryRoundedIcon from "@mui/icons-material/PhotoLibraryRounded";
import ProjectFilesGallery from "../../ui/ProjectFilesGallery";

// An icon button for an invoice card's footer that opens the files the
// invoice billed for as a gallery (the real image where it still exists, else the
// thumbnail). The wrapper stops click propagation so using it inside a
// clickable card never also opens the invoice.
export default function ProjectFilesButton({ invoiceId, invoiceNumber }: { invoiceId: number; invoiceNumber: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Box onClick={(e) => e.stopPropagation()} sx={{ display: "flex" }}>
      <Tooltip title="Invoiced files">
        <IconButton
          size="small"
          onClick={() => setOpen(true)}
          aria-label="Invoiced files"
          sx={{
            color: "var(--slate-600)",
            backgroundColor: "rgba(100, 116, 139, 0.08)",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "rgba(100, 116, 139, 0.16)" },
          }}
        >
          <PhotoLibraryRoundedIcon sx={{ fontSize: "var(--fs-3xl)" }} />
        </IconButton>
      </Tooltip>
      <ProjectFilesGallery open={open} onClose={() => setOpen(false)} invoiceId={invoiceId} subtitle={`Invoice ${invoiceNumber}`} />
    </Box>
  );
}
