import { describe, expect, it } from "vitest";
import type { BackupStatus } from "../../api/types";
import { backupWarnings, restoreCheckText } from "./backupFormat";

const healthy: BackupStatus = {
  last_backup_at: "2026-11-05T20:30:00Z",
  last_backup_size_bytes: 400000,
  backup_count: 3,
  total_size_bytes: 1200000,
  overdue: false,
  scheduled: true,
  on_separate_disk: true,
  last_restore_check_at: "2026-11-01T21:00:00Z",
  last_restore_check_matched: true,
  uploads_last_copied_at: "2026-11-05T21:00:00Z",
};

describe("backupWarnings", () => {
  it("has nothing to say when all is well", () => {
    expect(backupWarnings(healthy)).toEqual([]);
  });

  it("says there are no backups rather than calling them old", () => {
    const [first] = backupWarnings({ ...healthy, backup_count: 0, overdue: true, last_backup_at: null });
    expect(first).toBe("No database backup exists yet.");
  });

  it("flags an old backup, no schedule, one drive and no uploads copy", () => {
    const warnings = backupWarnings({ ...healthy, overdue: true, scheduled: false, on_separate_disk: false, uploads_last_copied_at: null });
    expect(warnings).toHaveLength(4);
    expect(warnings[0]).toContain("more than a day old");
  });
});

describe("restoreCheckText", () => {
  it("doesn't claim a check that never ran", () => {
    expect(restoreCheckText({ ...healthy, last_restore_check_matched: null })).toBe("Not checked yet");
  });

  it("treats differing row counts as a working restore", () => {
    expect(restoreCheckText({ ...healthy, last_restore_check_matched: false })).toContain("Restored fine");
  });
});
