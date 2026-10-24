import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import PageHeader from "./PageHeader";

export interface SettingsNavItem<T extends string> {
  value: T;
  label: string;
  description: string;
  icon: ReactNode;
}

// The standard shape of a settings area: a page header, a short navigation
// list on the left (a scrolling row of pills on a phone) and the selected
// section on the right. Each entry says in a few words what it holds, so
// nobody has to open every tab to find a setting.
export default function SettingsLayout<T extends string>({
  title,
  description,
  items,
  value,
  onChange,
  children,
}: {
  title: string;
  description?: string;
  items: SettingsNavItem<T>[];
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
}) {
  return (
    <Box component="main" sx={{ p: { xs: 1.5, md: 3 }, minWidth: 0 }}>
      <PageHeader title={title} description={description} />

      <Box sx={{ display: "grid", gap: { xs: 1.5, md: 3 }, gridTemplateColumns: { xs: "1fr", md: "176px minmax(0, 1fr)" }, alignItems: "start" }}>
        <Box
          component="nav"
          aria-label={`${title} sections`}
          sx={{
            display: "flex",
            flexDirection: { xs: "row", md: "column" },
            gap: 0.5,
            overflowX: { xs: "auto", md: "visible" },
            position: { md: "sticky" },
            top: { md: 16 },
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {items.map((item) => {
            const active = item.value === value;
            return (
              <Box
                key={item.value}
                component="button"
                type="button"
                aria-current={active ? "page" : undefined}
                title={item.description}
                onClick={() => onChange(item.value)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  textAlign: "left",
                  p: 0.75,
                  flexShrink: 0,
                  border: "1px solid",
                  borderColor: active ? "var(--slate-200)" : "transparent",
                  borderRadius: "8px",
                  bgcolor: active ? "var(--white)" : "transparent",
                  boxShadow: active ? "0 1px 2px rgba(15, 23, 42, 0.05)" : "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background-color 0.15s ease",
                  "&:hover": { bgcolor: active ? "var(--white)" : "var(--slate-100)" },
                }}
              >
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: "7px",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    bgcolor: active ? "var(--blue-50)" : "var(--slate-100)",
                    color: active ? "var(--blue-600)" : "var(--slate-500)",
                    "& svg": { fontSize: 16 },
                  }}
                >
                  {item.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: active ? 700 : 600, color: active ? "var(--slate-900)" : "var(--slate-700)", whiteSpace: "nowrap" }}>
                    {item.label}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>{children}</Box>
      </Box>
    </Box>
  );
}
