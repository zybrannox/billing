import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import PageHeader from "./PageHeader";

export interface SettingsNavItem<T extends string> {
  value: T;
  label: string;
  description: string;
  icon: ReactNode;
  // Items sharing a group sit together under its heading.
  group?: string;
  // A small count on the right, e.g. how many things are in the bin.
  badge?: number;
}

// The standard shape of a settings area: a page header, a grouped navigation
// card on the left (a scrolling row of pills on a phone) and the selected section
// on the right, under its own title. Each entry says in a few words what it
// holds, so nobody has to open every section to find a setting.
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
  const groups = [...new Set(items.map((item) => item.group ?? ""))];
  const current = items.find((item) => item.value === value);

  return (
    <Box component="main" sx={{ p: { xs: 1.5, md: 3 }, minWidth: 0 }}>
      <PageHeader title={title} description={description} />

      <Box sx={{ display: "grid", gap: { xs: 1.5, md: 3 }, gridTemplateColumns: { xs: "1fr", md: "268px minmax(0, 1fr)" }, alignItems: "start" }}>
        <Box
          component="nav"
          aria-label={`${title} sections`}
          sx={{
            display: "flex",
            flexDirection: { xs: "row", md: "column" },
            gap: { xs: 0.5, md: 1.5 },
            p: { xs: 0, md: 1 },
            overflowX: { xs: "auto", md: "visible" },
            position: { md: "sticky" },
            top: { md: 16 },
            bgcolor: { md: "var(--white)" },
            border: { md: "1px solid var(--slate-200)" },
            borderRadius: { md: "12px" },
            boxShadow: { md: "0 1px 2px rgba(15, 23, 42, 0.04)" },
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {groups.map((group) => (
            <Box key={group} sx={{ display: "flex", flexDirection: { xs: "row", md: "column" }, gap: 0.25, flexShrink: 0 }}>
              {group && (
                <Typography
                  sx={{
                    display: { xs: "none", md: "block" },
                    px: 1,
                    pt: 0.5,
                    pb: 0.5,
                    fontSize: "var(--fs-2xs)",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--slate-400)",
                  }}
                >
                  {group}
                </Typography>
              )}
              {items
                .filter((item) => (item.group ?? "") === group)
                .map((item) => {
                  const active = item.value === value;
                  return (
                    <Box
                      key={item.value}
                      component="button"
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => onChange(item.value)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        width: { md: "100%" },
                        textAlign: "left",
                        px: 1,
                        py: { xs: 0.75, md: 0.875 },
                        flexShrink: 0,
                        border: { xs: "1px solid", md: "none" },
                        borderColor: { xs: active ? "var(--blue-200)" : "var(--slate-200)" },
                        borderRadius: "9px",
                        bgcolor: active ? "var(--blue-50)" : { xs: "var(--white)", md: "transparent" },
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "background-color 0.15s ease",
                        "&:hover": { bgcolor: active ? "var(--blue-50)" : "var(--slate-50)" },
                        "&:focus-visible": { outline: "2px solid var(--blue-500)", outlineOffset: 1 },
                      }}
                    >
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "8px",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          bgcolor: active ? "var(--white)" : "var(--slate-100)",
                          color: active ? "var(--blue-600)" : "var(--slate-500)",
                          boxShadow: active ? "0 1px 2px rgba(15, 23, 42, 0.08)" : "none",
                          "& svg": { fontSize: 17 },
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          sx={{
                            fontSize: "var(--fs-sm)",
                            fontWeight: 600,
                            lineHeight: 1.3,
                            whiteSpace: "nowrap",
                            color: active ? "var(--blue-700)" : "var(--slate-800)",
                          }}
                        >
                          {item.label}
                        </Typography>
                        <Typography
                          noWrap
                          sx={{
                            display: { xs: "none", md: "block" },
                            fontSize: "var(--fs-2xs)",
                            lineHeight: 1.35,
                            color: "var(--slate-500)",
                          }}
                        >
                          {item.description}
                        </Typography>
                      </Box>
                      {!!item.badge && (
                        <Box
                          sx={{
                            flexShrink: 0,
                            minWidth: 20,
                            px: 0.625,
                            py: 0.125,
                            borderRadius: "999px",
                            textAlign: "center",
                            fontSize: "var(--fs-2xs)",
                            fontWeight: 700,
                            color: active ? "var(--blue-700)" : "var(--slate-600)",
                            bgcolor: active ? "var(--blue-100)" : "var(--slate-100)",
                          }}
                        >
                          {item.badge}
                        </Box>
                      )}
                    </Box>
                  );
                })}
            </Box>
          ))}
        </Box>

        <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {current && (
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h2" sx={{ fontSize: "var(--fs-2xl)", fontWeight: 700, color: "var(--slate-900)", lineHeight: 1.25 }}>
                {current.label}
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: "var(--fs-sm)", color: "var(--slate-500)" }}>{current.description}</Typography>
            </Box>
          )}
          {children}
        </Box>
      </Box>
    </Box>
  );
}
