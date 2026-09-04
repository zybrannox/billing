import { useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Chip } from "@mui/material";
import CrudActions from "../../ui/Actions";
import Button from "../../ui/Button";
import Table from "../../common/components/Table";
import { GenericDialog } from "../../ui/Dialog";
import AddListOption from "../../common/pages/AddListOption";
import { useListOptionsStore, type ListOption } from "../../store/useListOptionsStore";

// Project Type and Item Type are the categories wired up so far. Both the
// backend (app/list_options) and this page's plumbing are already generic
// per-category, so onboarding another dropdown later is just adding
// another entry here, not new backend work. `hasRate` categories (just
// Item Type today - the invoice line-item catalog, see
// GenerateInvoice.tsx) get an extra Rate column/field; others don't.
const CATEGORIES: { category: string; label: string; hasRate?: boolean }[] = [
  { category: "project_type", label: "Project Type" },
  { category: "item_type", label: "Item Type", hasRate: true },
];

const statusColumn: GridColDef<ListOption & { isActive: boolean }> = {
  field: "is_active",
  headerName: "Status",
  width: 130,
  renderCell: (params) => (
    <Chip
      label={params.value ? "Active" : "Inactive"}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: "0.75rem",
        color: params.value ? "#059669" : "#64748B",
        backgroundColor: params.value
          ? "rgba(5, 150, 105, 0.1)"
          : "rgba(100, 116, 139, 0.1)",
      }}
    />
  ),
};

const baseColumns: GridColDef<ListOption & { isActive: boolean }>[] = [
  { field: "value", headerName: "Value", flex: 1 },
  { field: "sort_order", headerName: "Order", width: 90 },
];

const rateColumn: GridColDef<ListOption & { isActive: boolean }> = {
  field: "rate",
  headerName: "Rate (₹/sq ft)",
  width: 140,
  renderCell: ({ value }) => (value != null ? `₹${Number(value).toLocaleString()}` : "—"),
};

function CategorySection({
  category,
  label,
  hasRate = false,
}: {
  category: string;
  label: string;
  hasRate?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const options = useListOptionsStore((s) => s.allByCategory[category]);
  const loading = useListOptionsStore((s) => s.loading);
  const fetchAllOptions = useListOptionsStore((s) => s.fetchAllOptions);
  const setOptionActive = useListOptionsStore((s) => s.setOptionActive);

  useEffect(() => {
    fetchAllOptions(category);
  }, [category, fetchAllOptions]);

  // Every project (past and present) that used a since-deactivated option
  // still needs it to display correctly - so this list intentionally shows
  // inactive rows too (with a toggle to reactivate), not just the active
  // ones a new project's dropdown offers.
  const rows = useMemo(
    () => (options ?? []).map((o) => ({ ...o, isActive: o.is_active })),
    [options],
  );

  const columns = useMemo(
    () => (hasRate ? [...baseColumns, rateColumn, statusColumn] : [...baseColumns, statusColumn]),
    [hasRate],
  );

  return (
    <section className="mb-8">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-2xl font-semibold text-slate-800">{label}</h2>
        <Button onClick={() => setAddOpen(true)}>+ Add {label}</Button>
      </div>
      <Table<ListOption & { isActive: boolean }>
        rows={rows}
        columns={columns}
        renderActions={(params, handlers) => [
          <CrudActions
            key="toggle"
            toggle
            isActive={params.row.isActive}
            onToggle={handlers.toggle}
          />,
        ]}
        onToggle={(id, value) => setOptionActive(Number(id), category, value)}
        loading={loading && !options}
        actionsWidth={110}
      />
      <GenericDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`New ${label}`}
        maxWidth="xs"
      >
        <AddListOption
          category={category}
          label={label}
          hasRate={hasRate}
          onSuccess={() => setAddOpen(false)}
        />
      </GenericDialog>
    </section>
  );
}

export default function SystemSetup() {
  return (
    <main className="h-full p-4 m-4 md:p-10 min-w-0 rounded-3xl bg-blue-50 shadow">
      <h1 className="text-4xl sm:text-5xl lg:text-4xl leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent mb-6">
        System Setup
      </h1>
      {CATEGORIES.map((c) => (
        <CategorySection key={c.category} {...c} />
      ))}
    </main>
  );
}
