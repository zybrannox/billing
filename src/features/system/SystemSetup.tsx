import { useState } from "react";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import SettingsLayout, { type SettingsNavItem } from "../../ui/SettingsLayout";
import DropdownOptionsPanel from "./DropdownOptionsPanel";
import DocumentDesignSettings from "./DocumentDesignSettings";
import AuditLogPanel from "./AuditLogPanel";
import SystemHealthPanel from "./SystemHealthPanel";

type Section = "options" | "design" | "audit" | "health";

const SECTIONS: SettingsNavItem<Section>[] = [
  { value: "options", label: "Dropdown options", description: "Project types and billable items", icon: <ListAltRoundedIcon /> },
  { value: "design", label: "Invoice design", description: "Logo, colours, layout and wording", icon: <PaletteRoundedIcon /> },
  { value: "audit", label: "Audit log", description: "Payments, cancellations, deletions", icon: <HistoryRoundedIcon /> },
  { value: "health", label: "System health", description: "Memory, storage and speed", icon: <MonitorHeartRoundedIcon /> },
];

export default function SystemSetup() {
  const [section, setSection] = useState<Section>("options");

  return (
    <SettingsLayout
      title="System setup"
      description="Manage the lists, document design and server for your workspace."
      items={SECTIONS}
      value={section}
      onChange={setSection}
    >
      {section === "options" ? (
        <DropdownOptionsPanel />
      ) : section === "design" ? (
        <DocumentDesignSettings />
      ) : section === "audit" ? (
        <AuditLogPanel />
      ) : (
        <SystemHealthPanel />
      )}
    </SettingsLayout>
  );
}
