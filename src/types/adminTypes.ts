import type { SvgIconComponent } from "@mui/icons-material";


export type NavItem = {
  name: string;
  href: string;
  icon: SvgIconComponent;
  // A count shown on the icon, for something waiting on someone.
  badge?: number;
};