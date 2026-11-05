import { useEffect, useState } from "react";
import { Box, IconButton, Switch, Tooltip, Typography } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Button from "../../ui/Button";
import EmptyState from "../../ui/EmptyState";
import { GenericDialog } from "../../ui/Dialog";
import { ItemList, ItemRow } from "../../ui/ItemList";
import ListState from "../../ui/ListState";
import Panel from "../../ui/Panel";
import { messages } from "../../messages";
import { useListOptionsStore, type ListOption } from "../../store/useListOptionsStore";
import ItemPricingDialog from "./ItemPricingDialog";
import { pricingSummary } from "./itemPricing";
import AddListOption from "./AddListOption";

// Project Type and Item Type are the categories wired up so far. Both the
// backend (app/list_options) and this panel are already generic per category,
// so another dropdown later is one more entry here, not new backend work.
// `hasRate` categories (just Item Type today - the invoice line-item catalog,
// see GenerateInvoice.tsx) also show and take a default rate.
const CATEGORIES: { category: string; label: string; description: string; hasRate?: boolean }[] = [
  {
    category: "project_type",
    label: messages.fields.projectType,
    description: "Kinds of job, offered when creating a project.",
  },
  {
    category: "item_type",
    label: "Item Type",
    description: "Billable products and services, with a default rate.",
    hasRate: true,
  },
];

function CategoryPanel({
  category,
  label,
  description,
  hasRate = false,
}: {
  category: string;
  label: string;
  description: string;
  hasRate?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [pricingOption, setPricingOption] = useState<ListOption | null>(null);
  const options = useListOptionsStore((s) => s.allByCategory[category]);
  const loading = useListOptionsStore((s) => s.loading);
  const fetchAllOptions = useListOptionsStore((s) => s.fetchAllOptions);
  const setOptionActive = useListOptionsStore((s) => s.setOptionActive);

  useEffect(() => {
    fetchAllOptions(category);
  }, [category, fetchAllOptions]);

  const addButton = (
    <Button size="small" onClick={() => setAddOpen(true)}>
      <AddRoundedIcon sx={{ fontSize: 18 }} /> Add {label}
    </Button>
  );

  // Every project (past and present) that used a since-deactivated option
  // still needs it to display correctly - so this list intentionally shows
  // inactive rows too (switched off, dimmed), not just the active ones a new
  // project's dropdown offers.
  const activeCount = options?.filter((o) => o.is_active).length ?? 0;
  const hiddenCount = (options?.length ?? 0) - activeCount;
  const summary = options?.length
    ? [`${activeCount} active`, hiddenCount ? `${hiddenCount} hidden` : null].filter(Boolean).join(" · ")
    : description;

  return (
    <Panel flush title={label} description={summary} action={options && options.length > 0 ? addButton : undefined}>
      {!options ? (
        <Box sx={{ p: 2.5 }}>
          <ListState loading={loading} error={false} empty={false} errorText="" emptyText="" />
        </Box>
      ) : options.length === 0 ? (
        <EmptyState
          icon={<ListAltRoundedIcon />}
          title={`No ${label.toLowerCase()}s yet`}
          description="Add the first one and it will appear in the matching dropdown."
          action={addButton}
        />
      ) : (
        <ItemList>
          {options.map((option) => (
            <ItemRow
              key={option.id}
              title={option.value}
              muted={!option.is_active}
              detail={hasRate ? pricingSummary(option.rate, option.min_charges) : undefined}
              trailing={
                <>
                  {hasRate && (
                    <Tooltip title="Edit rate and minimum charges">
                      <IconButton
                        size="small"
                        aria-label={`Edit pricing for ${option.value}`}
                        onClick={() => setPricingOption(option)}
                        sx={{ color: "var(--slate-500)" }}
                      >
                        <EditRoundedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Typography
                    component="span"
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: "999px",
                      fontSize: "var(--fs-2xs)",
                      fontWeight: 700,
                      color: option.is_active ? "var(--emerald-700)" : "var(--slate-500)",
                      bgcolor: option.is_active ? "var(--emerald-50)" : "var(--slate-100)",
                    }}
                  >
                    {option.is_active ? "Active" : "Hidden"}
                  </Typography>
                  <Switch
                    size="small"
                    checked={option.is_active}
                    onChange={(_, value) => setOptionActive(option.id, category, value)}
                    inputProps={{ "aria-label": `${option.value} is ${option.is_active ? "active" : "hidden"}` }}
                  />
                </>
              }
            />
          ))}
        </ItemList>
      )}
      {pricingOption && (
        <ItemPricingDialog key={pricingOption.id} option={pricingOption} onClose={() => setPricingOption(null)} />
      )}
      <GenericDialog open={addOpen} onClose={() => setAddOpen(false)} title={`New ${label}`} maxWidth="xs">
        <AddListOption category={category} label={label} hasRate={hasRate} onSuccess={() => setAddOpen(false)} />
      </GenericDialog>
    </Panel>
  );
}

export default function DropdownOptionsPanel() {
  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "repeat(2, minmax(0, 1fr))" }, alignItems: "start" }}>
      {CATEGORIES.map((c) => (
        <CategoryPanel key={c.category} {...c} />
      ))}
    </Box>
  );
}
