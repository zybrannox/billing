import type { ReactElement } from "react";
import { Box, Tooltip } from "@mui/material";
import { formatFileSize } from "../utils/appSupport";

// Shows a file's name (often truncated on screen) and size on hover. No tooltip
// when the size is unknown, i.e. the original no longer exists.
export default function FileSizeTooltip({
  name,
  sizeBytes,
  children,
}: {
  name: string;
  sizeBytes?: number | null;
  children: ReactElement;
}) {
  const title =
    sizeBytes == null ? (
      ""
    ) : (
      <>
        <Box sx={{ overflowWrap: "anywhere" }}>{name}</Box>
        <Box sx={{ fontWeight: 700 }}>{formatFileSize(sizeBytes)}</Box>
      </>
    );

  return <Tooltip title={title}>{children}</Tooltip>;
}
