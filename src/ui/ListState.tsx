import { Box, CircularProgress, Typography } from "@mui/material";

// The three non-content states every list shows before (or instead of) its
// rows: a spinner while loading, an error line when the request failed, and a
// quiet message when there's nothing to show. One look, one place - the
// invoice and quotation lists all use it. Returns null when there is content,
// so a list can write:
//
//   const state = <ListState loading=... error=... empty=... />
//   if (loading || error || empty) return state;
export default function ListState({
  loading,
  error,
  empty,
  errorText,
  emptyText,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  errorText: string;
  emptyText: string;
}) {
  if (error) {
    return (
      <Typography variant="body2" sx={{ color: "var(--red-600)", py: 1.5, textAlign: "center" }}>
        {errorText}
      </Typography>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={22} thickness={5} />
      </Box>
    );
  }

  if (empty) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1.5, textAlign: "center" }}>
        {emptyText}
      </Typography>
    );
  }

  return null;
}
