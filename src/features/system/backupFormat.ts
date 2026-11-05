import type { BackupStatus } from "../../api/types";

// What's wrong right now, worst first. Empty means nothing needs doing.
export const backupWarnings = (status: BackupStatus): string[] => [
  ...(status.backup_count === 0
    ? ["No database backup exists yet."]
    : status.overdue
      ? ["The newest database backup is more than a day old, so last night's run may have failed."]
      : []),
  ...(status.scheduled ? [] : ["Automatic backups aren't scheduled, so nothing runs unless someone clicks Back up now."]),
  ...(status.on_separate_disk ? [] : ["Every backup is on the same drive as the live data, so a drive failure would lose both."]),
  ...(status.uploads_last_copied_at ? [] : ["Uploaded files aren't being backed up. Database backups don't include them."]),
];

export const restoreCheckText = (status: BackupStatus) => {
  if (status.last_restore_check_matched === null || status.last_restore_check_matched === undefined) return "Not checked yet";
  return status.last_restore_check_matched ? "Restored fine, all rows matched" : "Restored fine; row counts differed because data changed after the backup";
};
