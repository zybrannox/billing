import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { messages } from "../messages";

// Compact previous / "1–10 of 37" / next control for short server-paginated
// lists (the invoice and quotation drawers). Renders nothing when everything
// fits on one page, so a short list isn't cluttered with disabled arrows.
export default function ListPager({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Tooltip title={messages.common.previousPage}>
        <span>
          <IconButton size="small" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeftRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Typography variant="caption" color="text.secondary">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </Typography>
      <Tooltip title={messages.common.nextPage}>
        <span>
          <IconButton size="small" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRightRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
