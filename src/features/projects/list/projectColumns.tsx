import { Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import { formatDateTime } from "../../../format/date";
import { messages } from "../../../messages";
import Chip from "../../../ui/Chip";
import { semanticChipSx } from "../../../ui/chipStyles";
import type { FilterFieldDefinition } from "../../../ui/FilterMenu";
import { SemanticSelectEditCell } from "../../../ui/Select";
import { getSemanticColor } from "../../../utils/colors";

const printStatusOrder: Record<string, number> = {
  Pending: 1,
  "In Progress": 2,
  Completed: 3,
};

export const projectFilterFields: FilterFieldDefinition[] = [
  {
    type: "select",
    key: "printStatus",
    label: messages.fields.printStatus,
    placeholder: "All",
    options: ["Pending", "In Progress", "Completed"],
  },
  {
    type: "async_select",
    key: "customer",
    label: "Customer",
    endpoint: "/customers",
    extraParams: { limit: 20 },
    getOptionLabel: (c: { first_name: string; last_name: string }) => `${c.first_name} ${c.last_name}`,
    getOptionValue: (c: { id: number }) => c.id,
  },
];

export const buildProjectColumns = (isAdmin: boolean): GridColDef[] => [
           {
        field: "customer_name",
        headerName: "Customer",
        flex: 1,
        editable: false,
        // Editing which customer a project belongs to needs the same
        // search-driven picker as the create form, not a plain text edit -
        // out of scope here, this column is display-only.
        renderCell: ({ value }) => (
          <span style={{ fontWeight: 600 }}>{value || "—"}</span>
        ),
      },
      {
        field: "assigned_to",
        headerName: "Assignee",
        flex: 1,
        editable: isAdmin,
      },
      {
        field: "project_type",
        headerName: messages.fields.projectType,
        flex: 1,
        editable: true,
      },
      {
        field: "description",
        headerName: "Description",
        flex: 1.5,
        editable: true,
        // Already fetched on every project row (see `rows` above) and
        // already handled by processRowUpdate - this column only needed
        // adding here, no new data or requests involved.
        renderCell: ({ value }) => (
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
              fontWeight: 600,
            }}
            title={value || undefined}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        field: "delivery_date",
        headerName: "Delivery / Start Date",
        flex: 1.5,
        minWidth: 200,
        editable: true,
        valueFormatter: (value) => formatDateTime(value),
        renderCell: ({ value, row }) => (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              overflow: "hidden",
              width: "100%",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {formatDateTime(value)}
            </span>
            {row.start_date && (
              <Tooltip title={`Started ${formatDateTime(row.start_date)}`} arrow placement="top">
                <CalendarTodayRoundedIcon
                  sx={{ fontSize: 14, color: "var(--slate-400)", flexShrink: 0, cursor: "default" }}
                />
              </Tooltip>
            )}
          </div>
        ),
      },
      {
        field: "client_status",
        headerName: messages.fields.clientStatus,
        flex: 1,
        editable: true,
        type: "singleSelect",
        valueOptions: ["Confirmed", "Correction"],
        renderCell: ({ value }) => (
          <Chip
            label={value}
            sx={semanticChipSx(getSemanticColor("clientStatus", value))}
          />
        ),
        renderEditCell: (params) => (
          <SemanticSelectEditCell {...params} semantic="clientStatus" />
        ),
      },
      {
        field: "print_status",
        headerName: messages.fields.printStatus,
        flex: 1,
        editable: true,
        type: "singleSelect",
        valueOptions: ({ row }) =>
          row?.design_completed_at
            ? ["Pending", "In Progress", "Completed"]
            : ["Pending", "In Progress"],
        sortComparator: (v1, v2) => {
          const order1 = printStatusOrder[v1 as string] || 4;
          const order2 = printStatusOrder[v2 as string] || 4;
          return order1 - order2;
        },
        renderCell: ({ value }) => (
          <Chip
            label={value}
            sx={semanticChipSx(getSemanticColor("printStatus", value))}
          />
        ),
        renderEditCell: (params) => (
          <SemanticSelectEditCell {...params} semantic="printStatus" />
        ),
      },
    ];
