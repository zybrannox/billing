import { useState } from "react";
import { Alert, Box, Typography } from "@mui/material";
import { apiService } from "../../api/service";
import type { Permission } from "../../store/useAppStore";
import Panel from "../../ui/Panel";
import { SwitchRow } from "../../ui/SettingRow";
import { getApiErrorMessage } from "../../utils/apiError";
import { ACCESS_OPTIONS, accessSummary } from "./accessOptions";

// An admin's switches for what one employee may do. Each one saves straight away.
export default function EmployeeAccessPanel({
  userId,
  role,
  permissions,
}: {
  userId: number;
  role: string;
  permissions: string[];
}) {
  const [granted, setGranted] = useState<string[]>(permissions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = role === "admin";

  const toggle = async (permission: Permission, on: boolean) => {
    const before = granted;
    const next = on ? [...granted, permission] : granted.filter((p) => p !== permission);
    setGranted(next);
    setSaving(true);
    setError(null);
    try {
      const saved = await apiService.put<{ permissions: string[] }>(`/users/${userId}/permissions`, { permissions: next });
      setGranted(saved.permissions);
    } catch (err) {
      setGranted(before);
      setError(getApiErrorMessage(err, "Couldn't save that change. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="Access"
      description={isAdmin ? "Admins can always do everything." : "Extra things this employee can do."}
      action={
        !isAdmin && (
          <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--slate-500)" }}>
            {accessSummary(granted)}
          </Typography>
        )
      }
    >
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1, borderRadius: "10px" }}>
          {error}
        </Alert>
      )}
      {!isAdmin && (
        <>
          <Box>
            {ACCESS_OPTIONS.map((option) => (
              <SwitchRow
                key={option.permission}
                label={option.label}
                description={option.description}
                checked={granted.includes(option.permission)}
                disabled={saving}
                onChange={(on) => toggle(option.permission, on)}
              />
            ))}
          </Box>
          <Typography sx={{ mt: 0.75, pt: 1, borderTop: "1px solid var(--slate-100)", fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
            Changes save straight away and reach their screen the next time they load the app.
          </Typography>
        </>
      )}
    </Panel>
  );
}
