import { useState } from "react";
import { IconButton, Popover, Box, Typography, Badge, Tooltip } from "@mui/material";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import Dropdown, { type DropdownOption } from "../../ui/Dropdown";
import AsyncSearchSelect from "../../ui/AsyncSearchSelect";

type StaticFilterField = {
  type: "select";
  key: string;
  label: string;
  options: DropdownOption[];
  placeholder?: string;
};

type AsyncFilterField = {
  type: "async_select";
  key: string;
  label: string;
  endpoint: string;
  searchParam?: string;
  extraParams?: Record<string, string | number>;
  getOptionLabel: (item: any) => string;
  getOptionValue: (item: any) => string | number;
  placeholder?: string;
};

export type FilterFieldDefinition = StaticFilterField | AsyncFilterField;

interface FilterMenuProps {
  fields: FilterFieldDefinition[];
  values: Record<string, string | number | undefined>;
  onChange: (key: string, value: string | number | undefined) => void;
  onClearAll?: () => void;
}

export default function FilterMenu({
  fields,
  values,
  onChange,
  onClearAll,
}: FilterMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const activeCount = fields.filter((f) => {
    const v = values[f.key];
    return v !== undefined && v !== null && v !== "";
  }).length;

  return (
    <>
      <Tooltip title="Filters">
        <IconButton
          type="button"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            width: 36,
            height: 36,
            padding: 0,
            border: "1px solid",
            borderColor:
              open || activeCount > 0
                ? "var(--blue-500, #3b82f6)"
                : "rgba(0, 0, 0, 0.12)",
            borderRadius: "var(--border-radius-md, 6px)",
            bgcolor:
              open || activeCount > 0
                ? "var(--blue-50, #eff6ff)"
                : "#ffffff",
            boxShadow:
              open || activeCount > 0
                ? "0 0 0 3px rgba(59, 130, 246, 0.12)"
                : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            transition:
              "background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
            "&:hover": {
              borderColor:
                open || activeCount > 0
                  ? "var(--blue-500, #3b82f6)"
                  : "var(--blue-300, #93c5fd)",
              bgcolor: "var(--blue-50, #eff6ff)",
            },
          }}
        >
          <Badge
            badgeContent={activeCount}
            color="primary"
            sx={{
              "& .MuiBadge-badge": {
                fontSize: "0.65rem",
                height: 16,
                minWidth: 16,
                padding: "0 4px",
                bgcolor: "var(--blue-500, #3b82f6)",
              },
            }}
          >
            <FilterAltRoundedIcon
              sx={{
                fontSize: 18,
                color:
                  open || activeCount > 0
                    ? "var(--blue-600, #2563eb)"
                    : "text.secondary",
                transition: "color 0.15s ease",
              }}
            />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              borderRadius: "var(--border-radius-lg, 12px)",
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
              maxHeight: "80vh",
              overflowY: "auto",
            },
          },
        }}
      >
        <Box sx={{ p: 2.5, width: 260, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Filters
            </Typography>
            {activeCount > 0 && onClearAll && (
              <Typography
                variant="caption"
                onClick={onClearAll}
                sx={{
                  cursor: "pointer",
                  color: "primary.main",
                  fontWeight: 600,
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Clear all
              </Typography>
            )}
          </Box>

          {fields.map((field) =>
            field.type === "select" ? (
              <Dropdown
                key={field.key}
                label={field.label}
                placeholder={field.placeholder ?? "All"}
                options={field.options}
                value={values[field.key]}
                onChange={(v) => onChange(field.key, Array.isArray(v) ? v[0] : v)}
                sx={{ minWidth: "100%" }}
              />
            ) : (
              <AsyncSearchSelect
                key={field.key}
                label={field.label}
                placeholder={field.placeholder ?? `Search ${field.label.toLowerCase()}...`}
                endpoint={field.endpoint}
                searchParam={field.searchParam}
                extraParams={field.extraParams}
                getOptionLabel={field.getOptionLabel}
                getOptionValue={field.getOptionValue}
                value={values[field.key]}
                onChange={(v) => onChange(field.key, v)}
              />
            ),
          )}
        </Box>
      </Popover>
    </>
  );
}
