import { Box, Divider, Stack, Typography } from "@mui/material";
import { formatDateTime } from "../format/date";
import { messages } from "../messages";

// The hover card behind a project row's "info" action.
export default function ProjectDetailsTooltip({ data }: { data: any }) {
  return (
  <Box sx={{ p: 2, width: 260 }}>
    <Typography
      sx={{
        fontWeight: 600,
        mb: 1.25,
        color: "var(--slate-900)",
        fontSize: "var(--fs-sm)",
      }}
    >
      Project Details
    </Typography>

    <Stack spacing={0.75}>
      {[
        { label: "Type", value: data?.project_type },
        { label: "Assignee", value: data?.assigned_to },
        { label: messages.fields.startDate, value: formatDateTime(data?.start_date) },
        { label: "Delivery", value: formatDateTime(data?.delivery_date) },
        { label: "Priority", value: data?.priority },
        { label: messages.fields.clientStatus, value: data?.client_status },
        { label: messages.fields.printStatus, value: data?.print_status },
        {
          label: "Design Completed",
          value: data?.design_completed_at
            ? `${formatDateTime(data.design_completed_at)} by ${data.design_completed_by}`
            : "Not yet",
        },
        {
          label: "Delivered",
          value: data?.delivered_at
            ? `${formatDateTime(data.delivered_at)} by ${data.delivered_by}`
            : "Not yet",
        },
      ].map((item, idx) => (
        <Box
          key={idx}
          sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 500, color: "var(--slate-500)", fontSize: "var(--fs-xs)" }}
          >
            {item.label}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              color: "var(--slate-900)",
              fontSize: "var(--fs-xs)",
              textAlign: "right",
            }}
          >
            {item.value || "N/A"}
          </Typography>
        </Box>
      ))}
    </Stack>

    <Divider sx={{ borderColor: "var(--slate-200)", my: 1.25 }} />

    <Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 500,
          color: "var(--slate-500)",
          fontSize: "var(--fs-xs)",
          display: "block",
          mb: 0.375,
        }}
      >
        Description
      </Typography>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          lineHeight: 1.5,
          color: "var(--slate-700)",
          fontSize: "var(--fs-xs)",
          wordBreak: "break-word",
        }}
      >
        {data?.description || "No description provided."}
      </Typography>
    </Box>
  </Box>
);
}
