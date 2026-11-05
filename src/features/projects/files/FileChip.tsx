import { Box, Tooltip, Typography } from "@mui/material";
import { BlockRounded, CheckCircleRounded } from "@mui/icons-material";
import FileSizeTooltip from "../../../ui/FileSizeTooltip";
import FileTypeIcon from "../../../ui/FileTypeIcon";
import { getFileKind } from "../../../utils/fileKind";
import { displayName, isDownloaded, isPurged, sizeOf, storagePath, thumbnailUrl, type ProjectFile } from "./projectFile";

// A small attachment chip for the project row, Gmail style.
export default function FileChip({ file, onClick }: { file: ProjectFile; onClick: () => void }) {
  const name = displayName(file);
  const kind = getFileKind(name);
  const downloaded = isDownloaded(file);
  const purged = isPurged(file);

  return (
    <FileSizeTooltip name={name} sizeBytes={sizeOf(file)}>
      <Box
        onClick={onClick}
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
          backgroundColor: purged ? "var(--slate-50)" : downloaded ? "var(--green-50)" : "var(--slate-50)",
          border: "1px solid",
          borderColor: purged ? "var(--slate-200)" : downloaded ? "var(--emerald-200)" : "var(--slate-200)",
          opacity: purged ? 0.7 : 1,
          transition: "all 150ms ease-in-out",
          "&:hover": {
            borderColor: purged ? "var(--slate-300)" : downloaded ? "var(--emerald-400)" : "var(--slate-300)",
            backgroundColor: purged ? "var(--slate-100)" : downloaded ? "var(--green-100)" : "var(--slate-100)",
          },
        }}
      >
        {kind === "image" ? (
          <Box
            component="img"
            src={thumbnailUrl(storagePath(file))}
            loading="lazy"
            sx={{ width: 20, height: 20, borderRadius: "4px", objectFit: "cover", flexShrink: 0 }}
            alt=""
          />
        ) : (
          <FileTypeIcon kind={kind} size={18} />
        )}
        <Typography
          noWrap
          sx={{
            fontSize: "var(--fs-xs)",
            fontWeight: downloaded ? 600 : 500,
            color: downloaded ? "var(--emerald-800)" : "var(--slate-700)",
          }}
        >
          {name}
        </Typography>
        {purged ? (
          <Tooltip title="Original removed after 7 days - thumbnail only">
            <BlockRounded sx={{ color: "var(--slate-400)", fontSize: 13, flexShrink: 0 }} />
          </Tooltip>
        ) : (
          downloaded && <CheckCircleRounded sx={{ color: "var(--emerald-500)", fontSize: 13, flexShrink: 0 }} />
        )}
      </Box>
    </FileSizeTooltip>
  );
}
