import { useRef, useState } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { UploadFileRounded } from "@mui/icons-material";
import { useProjectStore } from "../../store/useProjectStore";
import FilePreviewDialog from "../../ui/FilePreviewDialog";
import FileChip from "./files/FileChip";
import ManageFilesDialog from "./files/ManageFilesDialog";
import { storagePath, toPreviewFile } from "./files/projectFile";
import { useProjectFileTransfers } from "./files/useProjectFileTransfers";

// Keeps the accordion row itself at a fixed, predictable size no matter how many
// files a project has (the Manage dialog is what scales to however many there
// are) - a handful of chips plus an overflow "+N" chip is O(1) to render.
const MAX_VISIBLE_CHIPS = 4;

/**
 * Gmail-style compact attachment strip for the project row accordion - a few
 * small chips, an overflow "+N" chip past MAX_VISIBLE_CHIPS, and a "view all"
 * dialog with the full list. No persistent preview or search; clicking a chip
 * opens a lightbox on demand.
 */
const ProjectFilesList = () => {
  const selectedProject = useProjectStore((state) => state.selectedProject);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const files = selectedProject?.file_paths ?? [];
  const total = files.length;
  const hiddenCount = Math.max(0, total - MAX_VISIBLE_CHIPS);
  const { download, upload, uploadProgress, uploadError } = useProjectFileTransfers(files);
  const uploading = uploadProgress !== null;

  const openLightbox = (index: number) => {
    setManageOpen(false);
    setLightboxIndex(index);
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = "";
        }}
      />

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: "var(--slate-500)", fontSize: "var(--fs-2xs)", textTransform: "uppercase", letterSpacing: "0.03em" }}
          >
            {total} {total === 1 ? "File" : "Files"}
          </Typography>

          {total > 0 && (
            <Typography
              onClick={(e) => {
                e.stopPropagation();
                setManageOpen(true);
              }}
              sx={{ fontSize: "var(--fs-2xs)", fontWeight: 600, color: "var(--blue-600)", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
            >
              Manage
            </Typography>
          )}
        </Box>

        <Box
          onClick={(e) => {
            e.stopPropagation();
            if (!uploading) fileInputRef.current?.click();
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.375,
            borderRadius: "6px",
            cursor: uploading ? "default" : "pointer",
            color: "var(--blue-600)",
            transition: "background-color 150ms ease-in-out",
            "&:hover": uploading ? {} : { backgroundColor: "var(--blue-50)" },
          }}
        >
          {uploading ? (
            <>
              <CircularProgress size={13} thickness={5} sx={{ color: "var(--blue-600)" }} />
              <Typography sx={{ fontSize: "var(--fs-2xs)", fontWeight: 600 }}>Uploading {uploadProgress}%</Typography>
            </>
          ) : (
            <>
              <UploadFileRounded sx={{ fontSize: 15 }} />
              <Typography sx={{ fontSize: "var(--fs-2xs)", fontWeight: 600 }}>Add files</Typography>
            </>
          )}
        </Box>
      </Box>

      {uploadError && <Typography sx={{ fontSize: "var(--fs-2xs)", color: "var(--red-500)", mb: 0.75 }}>{uploadError}</Typography>}

      {total === 0 ? (
        <Typography variant="body2" sx={{ color: "var(--slate-400)", fontSize: "var(--fs-sm)" }}>
          No files available in this project
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {files.slice(0, MAX_VISIBLE_CHIPS).map((file, index) => (
            <FileChip key={storagePath(file)} file={file} onClick={() => openLightbox(index)} />
          ))}

          {hiddenCount > 0 && (
            <Box
              onClick={() => setManageOpen(true)}
              sx={{
                display: "flex",
                alignItems: "center",
                px: 1.25,
                py: 0.625,
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor: "var(--blue-50)",
                border: "1px solid var(--blue-200)",
                transition: "all 150ms ease-in-out",
                "&:hover": { backgroundColor: "var(--blue-100)", borderColor: "var(--blue-300)" },
              }}
            >
              <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--blue-600)" }}>+{hiddenCount} more</Typography>
            </Box>
          )}
        </Stack>
      )}

      <ManageFilesDialog open={manageOpen} files={files} onClose={() => setManageOpen(false)} onOpenFile={openLightbox} onDownload={download} />

      <FilePreviewDialog
        files={files.map(toPreviewFile)}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onDownload={(f) => download(f.path, f.name)}
      />
    </Box>
  );
};

export default ProjectFilesList;
