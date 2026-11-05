import { Box, Checkbox, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import { BlockRounded, CheckCircleRounded, DeleteOutlineRounded, FileDownloadRounded } from "@mui/icons-material";
import { useDownloadProgressStore } from "../../../store/useDownloadProgressStore";
import { formatTransferred } from "../../../utils/appSupport";
import { getFileKind } from "../../../utils/fileKind";
import FileSizeTooltip from "../../../ui/FileSizeTooltip";
import FileTypeIcon from "../../../ui/FileTypeIcon";
import { displayName, isDownloaded, isPurged, sizeOf, storagePath, thumbnailUrl, type ProjectFile } from "./projectFile";

// One file in the Manage dialog: select it, watch or start its download, remove it.
export default function ManageFileRow({
  file,
  selected,
  removing,
  onOpen,
  onToggleSelected,
  onDownload,
  onRemove,
}: {
  file: ProjectFile;
  selected: boolean;
  removing: boolean;
  onOpen: () => void;
  onToggleSelected: () => void;
  onDownload: () => void;
  onRemove: () => void;
}) {
  const path = storagePath(file);
  const name = displayName(file);
  const kind = getFileKind(name);
  const downloaded = isDownloaded(file);
  const purged = isPurged(file);
  const download = useDownloadProgressStore((state) => state.downloads.find((d) => d.id === path && !d.done && !d.error));

  return (
    <Box
      onClick={onOpen}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        p: 1,
        borderRadius: "8px",
        cursor: "pointer",
        backgroundColor: purged ? "var(--slate-50)" : downloaded ? "var(--green-50)" : "var(--white)",
        border: "1px solid",
        borderColor: purged ? "var(--slate-200)" : downloaded ? "var(--emerald-200)" : "var(--slate-200)",
        opacity: purged ? 0.75 : 1,
        transition: "all 150ms ease-in-out",
        "&:hover": {
          borderColor: purged ? "var(--slate-300)" : downloaded ? "var(--emerald-400)" : "var(--slate-300)",
          backgroundColor: purged ? "var(--slate-100)" : downloaded ? "var(--green-100)" : "var(--slate-50)",
        },
      }}
    >
      <FileSizeTooltip name={name} sizeBytes={sizeOf(file)}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flexGrow: 1 }}>
          <Checkbox
            size="small"
            checked={selected}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelected();
            }}
            sx={{ p: 0.5, flexShrink: 0 }}
          />
          <Box sx={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {kind === "image" ? (
              <Box
                component="img"
                src={thumbnailUrl(path)}
                loading="lazy"
                sx={{ width: 32, height: 32, borderRadius: "4px", objectFit: "cover", border: "1px solid var(--slate-200)" }}
                alt=""
              />
            ) : (
              <FileTypeIcon kind={kind} />
            )}
          </Box>

          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontSize: "var(--fs-sm)",
                color: downloaded ? "var(--emerald-800)" : "var(--slate-900)",
                fontWeight: downloaded ? 600 : 500,
              }}
            >
              {name}
            </Typography>

            {download ? (
              <Typography variant="caption" sx={{ display: "block", color: "var(--blue-600)", fontSize: "var(--fs-2xs)", fontWeight: 600 }}>
                {download.loaded || download.total
                  ? `${formatTransferred(download.loaded, download.total)} downloaded`
                  : "Preparing download…"}
              </Typography>
            ) : purged ? (
              <Typography variant="caption" sx={{ display: "block", color: "var(--slate-400)", fontSize: "var(--fs-2xs)", fontStyle: "italic" }}>
                Original removed after 7 days - thumbnail only
              </Typography>
            ) : (
              typeof file === "object" &&
              (file.width || file.height) && (
                <Typography variant="caption" sx={{ display: "block", color: "var(--slate-500)", fontSize: "var(--fs-2xs)" }}>
                  {file.width || "?"}" × {file.height || "?"}"
                </Typography>
              )
            )}
          </Box>
        </Box>
      </FileSizeTooltip>

      <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        {purged ? (
          <Tooltip title="Original file was automatically removed after 7 days on this completed project - only the thumbnail remains, nothing to download">
            <span>
              <IconButton
                size="small"
                disabled
                onClick={(e) => e.stopPropagation()}
                sx={{
                  width: 28,
                  height: 28,
                  padding: 0,
                  color: "var(--slate-300)",
                  border: "1px solid var(--slate-200)",
                  "&.Mui-disabled": { color: "var(--slate-300)" },
                }}
              >
                <BlockRounded sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        ) : download ? (
          <Box sx={{ display: "flex", alignItems: "center", px: 0.5 }}>
            <CircularProgress
              variant={download.percent !== null && download.total ? "determinate" : "indeterminate"}
              value={download.percent ?? 0}
              size={20}
              thickness={5}
              sx={{ color: "var(--blue-600)" }}
            />
          </Box>
        ) : (
          <Tooltip title={downloaded ? "Downloaded again" : "Download"}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              sx={{
                width: 28,
                height: 28,
                padding: 0,
                backgroundColor: downloaded ? "var(--emerald-500)" : "var(--slate-100)",
                color: downloaded ? "var(--white)" : "var(--slate-600)",
                border: "1px solid",
                borderColor: downloaded ? "var(--emerald-600)" : "var(--slate-200)",
                transition: "all 150ms ease-in-out",
                "&:hover": {
                  backgroundColor: downloaded ? "var(--emerald-600)" : "var(--blue-600)",
                  color: "var(--white)",
                  borderColor: downloaded ? "var(--emerald-700)" : "var(--blue-700)",
                },
              }}
            >
              {downloaded ? <CheckCircleRounded sx={{ fontSize: 16 }} /> : <FileDownloadRounded sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Remove">
          <span>
            <IconButton
              size="small"
              disabled={removing}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              sx={{
                width: 28,
                height: 28,
                padding: 0,
                ml: 0.5,
                backgroundColor: "var(--slate-100)",
                color: "var(--slate-400)",
                border: "1px solid var(--slate-200)",
                transition: "all 150ms ease-in-out",
                "&:hover": { backgroundColor: "var(--red-50)", color: "var(--red-500)", borderColor: "var(--red-200)" },
              }}
            >
              {removing ? <CircularProgress size={14} thickness={5} sx={{ color: "var(--slate-400)" }} /> : <DeleteOutlineRounded sx={{ fontSize: 16 }} />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
