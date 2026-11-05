import { Assignment, Badge, People, Settings, Dashboard, Business, Inbox, History, StickyNote2, ReceiptLong } from "@mui/icons-material";
import type { NavItem } from "../types/adminTypes";

export const adminNavigations: NavItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: Dashboard },
  { name: "Projects", href: "/admin/projects", icon: Assignment },
  { name: "Project History", href: "/admin/project-history", icon: History },
  { name: "Invoices", href: "/admin/invoices", icon: ReceiptLong },
  { name: "Notes", href: "/admin/notes", icon: StickyNote2 },
  { name: "Customers", href: "/admin/customers", icon: People },
  { name: "Companies", href: "/admin/companies", icon: Business },
  { name: "Job Requests", href: "/admin/job-requests", icon: Inbox },
  { name: "Employees", href: "/admin/employees", icon: Badge },
  { name: "System Setup", href: "/admin/system-setup", icon: Settings },
];

export const employeeNavigations = ({
  canManageWorkspace,
  canSeeInvoices,
  canSeeNotes,
}: {
  canManageWorkspace: boolean;
  canSeeInvoices: boolean;
  canSeeNotes: boolean;
}): NavItem[] => [
  { name: "Projects", href: "/", icon: Assignment },
  ...(canSeeInvoices ? [{ name: "Invoices", href: "/invoices", icon: ReceiptLong }] : []),
  ...(canSeeNotes ? [{ name: "Notes", href: "/notes", icon: StickyNote2 }] : []),
  ...(canManageWorkspace ? [{ name: "System Setup", href: "/system-setup", icon: Settings }] : []),
];
