import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button as MuiButton, CircularProgress, Typography } from "@mui/material";
import BackupRoundedIcon from "@mui/icons-material/BackupRounded";
import { apiService } from "../../api/service";
import type { BackupStatus } from "../../api/types";
import { formatDateTime } from "../../format/date";
import ListState from "../../ui/ListState";
import Panel from "../../ui/Panel";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatFileSize } from "../../utils/appSupport";
import { backupWarnings, restoreCheckText } from "./backupFormat";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "200px minmax(0, 1fr)" },
        columnGap: 2,
        rowGap: 0.25,
        px: 2,
        py: 1.25,
        borderTop: "1px solid var(--slate-100)",
        "&:first-of-type": { borderTop: "none" },
      }}
    >
      <Typography sx={{ fontSize: 13, color: "var(--slate-500)" }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: "var(--black)", overflowWrap: "anywhere" }}>{value}</Typography>
    </Box>
  );
}

// Whether the data is safely copied, and a way to copy it now. Restoring isn't
// here on purpose: it overwrites live data, so it stays a job for the server.
export default function BackupsPanel() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const query = useQuery({
    queryKey: ["backups"],
    queryFn: () => apiService.get<BackupStatus>("/backups"),
  });
  const status = query.data;

  const backUpNow = async () => {
    setRunning(true);
    setNotice(null);
    try {
      const next = await apiService.post<BackupStatus>("/backups/run");
      queryClient.setQueryData(["backups"], next);
      setNotice({ tone: "success", text: "Backup finished." });
    } catch (err) {
      setNotice({ tone: "error", text: getApiErrorMessage(err, "The backup failed. Please try again.") });
    } finally {
      setRunning(false);
    }
  };

  const warnings = status ? backupWarnings(status) : [];

  return (
    <>
      {notice && (
        <Alert severity={notice.tone} onClose={() => setNotice(null)} sx={{ borderRadius: "10px" }}>
          {notice.text}
        </Alert>
      )}

      {warnings.map((warning) => (
        <Alert key={warning} severity="warning" sx={{ borderRadius: "10px" }}>
          {warning}
        </Alert>
      ))}

      <Panel
        flush
        title="Backups"
        description="Copies of your database, kept for 14 days."
        action={
          <MuiButton
            size="small"
            startIcon={running ? <CircularProgress size={14} /> : <BackupRoundedIcon />}
            disabled={running || query.isLoading}
            onClick={backUpNow}
          >
            {running ? "Backing up..." : "Back up now"}
          </MuiButton>
        }
      >
        {status ? (
          <Box>
            <Fact label="Last backup" value={status.last_backup_at ? formatDateTime(status.last_backup_at) : "Never"} />
            <Fact label="Size of last backup" value={status.last_backup_size_bytes != null ? formatFileSize(status.last_backup_size_bytes) : "-"} />
            <Fact label="Backups kept" value={`${status.backup_count} · ${formatFileSize(status.total_size_bytes)} in total`} />
            <Fact label="Automatic backups" value={status.scheduled ? "On" : "Off"} />
            <Fact label="Stored on" value={status.on_separate_disk ? "A separate drive" : "The same drive as the live data"} />
            <Fact
              label="Last restore check"
              value={status.last_restore_check_at ? `${formatDateTime(status.last_restore_check_at)} · ${restoreCheckText(status)}` : restoreCheckText(status)}
            />
            <Fact label="Uploaded files last copied" value={status.uploads_last_copied_at ? formatDateTime(status.uploads_last_copied_at) : "Never"} />
          </Box>
        ) : (
          <ListState
            loading={query.isLoading}
            error={query.isError}
            empty={false}
            errorText={getApiErrorMessage(query.error, "Couldn't load the backup status.")}
            emptyText=""
          />
        )}
      </Panel>
    </>
  );
}
