import { useQuery } from "@tanstack/react-query";
import { Navigate, useSearchParams } from "react-router-dom";
import BackupRoundedIcon from "@mui/icons-material/BackupRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import ReceiptRoundedIcon from "@mui/icons-material/ReceiptRounded";
import { apiService } from "../../api/service";
import { usePermission } from "../../hooks/usePermission";
import { useAppStore } from "../../store/useAppStore";
import type { BinListResponse } from "../../api/types";
import SettingsLayout, { type SettingsNavItem } from "../../ui/SettingsLayout";
import AuditLogPanel from "./AuditLogPanel";
import BackupsPanel from "./BackupsPanel";
import BinPanel from "./BinPanel";
import DocumentDesignSettings from "./DocumentDesignSettings";
import DropdownOptionsPanel from "./DropdownOptionsPanel";
import ReceiptPrinterPanel from "./ReceiptPrinterPanel";
import SystemHealthPanel from "./SystemHealthPanel";

type Section = "options" | "design" | "printer" | "bin" | "audit" | "health" | "backups";

const WORKSPACE = "Workspace";
const ADMINISTRATION = "Administration";

const SECTIONS: SettingsNavItem<Section>[] = [
  { value: "options", group: WORKSPACE, label: "Dropdown options", description: "Project types and billable items", icon: <ListAltRoundedIcon /> },
  { value: "design", group: WORKSPACE, label: "Invoice design", description: "Logo, colours, layout and wording", icon: <PaletteRoundedIcon /> },
  { value: "printer", group: ADMINISTRATION, label: "Receipt printer", description: "58 / 80 mm bills on this device", icon: <ReceiptRoundedIcon /> },
  { value: "backups", group: ADMINISTRATION, label: "Backups", description: "Is your data safely copied?", icon: <BackupRoundedIcon /> },
  { value: "bin", group: ADMINISTRATION, label: "Bin", description: "Restore what was deleted", icon: <DeleteOutlineRoundedIcon /> },
  { value: "audit", group: ADMINISTRATION, label: "All activity", description: "Who changed what, and when", icon: <HistoryRoundedIcon /> },
  { value: "health", group: ADMINISTRATION, label: "System health", description: "Is everything running OK?", icon: <MonitorHeartRoundedIcon /> },
];

export default function SystemSetup() {
  // In the address, so a refresh or a shared link lands on the same section.
  const [params, setParams] = useSearchParams();
  const isAdmin = useAppStore((s) => s.user?.role === "admin");
  const canManageWorkspace = usePermission("workspace.manage");
  // The rest of System setup is admin-only on the server too.
  const allowed = isAdmin ? SECTIONS : SECTIONS.filter((s) => s.group === WORKSPACE);
  const requested = params.get("section");
  const section: Section = allowed.find((s) => s.value === requested)?.value ?? "options";

  // Just the count, for the badge. Shares the "bin" key with BinPanel, so
  // restoring or erasing something updates it too.
  const binCount = useQuery({
    queryKey: ["bin", "count"],
    queryFn: () => apiService.get<BinListResponse>("/bin/", { params: { page_size: 1 } }),
    enabled: isAdmin,
  }).data?.total;

  if (!canManageWorkspace) return <Navigate to="/" replace />;

  const items = allowed.map((s) => (s.value === "bin" ? { ...s, badge: binCount } : s));

  return (
    <SettingsLayout
      title="System setup"
      description={isAdmin ? "Manage your workspace's lists, document design, backups, deleted items and server." : "Manage your workspace's lists and document design."}
      items={items}
      value={section}
      onChange={(next) => setParams({ section: next }, { replace: true })}
    >
      {section === "options" ? (
        <DropdownOptionsPanel />
      ) : section === "design" ? (
        <DocumentDesignSettings />
      ) : section === "printer" ? (
        <ReceiptPrinterPanel />
      ) : section === "backups" ? (
        <BackupsPanel />
      ) : section === "bin" ? (
        <BinPanel />
      ) : section === "audit" ? (
        <AuditLogPanel />
      ) : (
        <SystemHealthPanel />
      )}
    </SettingsLayout>
  );
}
