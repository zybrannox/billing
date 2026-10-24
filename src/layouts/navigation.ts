import { Assignment, Badge, People, Settings, Dashboard, Business, Inbox, History } from "@mui/icons-material";
import type { NavItem } from "../types/adminTypes";

export const adminNavigations: NavItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: Dashboard },
  { name: "Projects", href: "/admin/projects", icon: Assignment },
  { name: "Project History", href: "/admin/project-history", icon: History },
  { name: "Customers", href: "/admin/customers", icon: People },
  { name: "Companies", href: "/admin/companies", icon: Business },
  { name: "Job Requests", href: "/admin/job-requests", icon: Inbox },
  { name: "Employees", href: "/admin/employees", icon: Badge },
  { name: "System Setup", href: "/admin/system-setup", icon: Settings },
];

export const employeeNavigations: NavItem[] = [
  { name: "Projects", href: "/", icon: Assignment },
];
