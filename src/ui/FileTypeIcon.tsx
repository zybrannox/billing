import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ArchiveIcon from "@mui/icons-material/Archive";
import DescriptionIcon from "@mui/icons-material/Description";
import TableChartIcon from "@mui/icons-material/TableChart";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import type { FileKind } from "../utils/fileKind";

export default function FileTypeIcon({ kind, size = 28 }: { kind: FileKind; size?: number }) {
  const iconSx = { fontSize: size };
  switch (kind) {
    case "image":
      return <ImageRoundedIcon sx={{ ...iconSx, color: "var(--blue-500)" }} />;
    case "pdf":
      return <PictureAsPdfIcon sx={{ ...iconSx, color: "var(--red-500)" }} />;
    case "archive":
      return <ArchiveIcon sx={{ ...iconSx, color: "var(--violet-500)" }} />;
    case "doc":
      return <DescriptionIcon sx={{ ...iconSx, color: "var(--blue-600)" }} />;
    case "sheet":
      return <TableChartIcon sx={{ ...iconSx, color: "var(--emerald-500)" }} />;
    default:
      return <InsertDriveFileIcon sx={{ ...iconSx, color: "var(--slate-500)" }} />;
  }
}
