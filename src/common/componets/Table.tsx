import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import { useProjectStore } from "../../store/useProjectStore";
import { useModalStore } from "../../store/useModalStore";
import { styled } from "@mui/material/styles";

// Styled container
const StyledPaper = styled(Paper)(({ theme }) => ({
  height: "70vh",
  width: "100%",
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3],
  "& .MuiDataGrid-root": {
    border: "none",
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
  },
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid #f0f0f0",
  },
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#f9f9f9",
    fontWeight: 600,
    borderBottom: "1px solid #e0e0e0",
  },
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid #e0e0e0",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "#f5f5f5",
  },
}));

// Minimal aesthetic button
const ActionButton = styled("button")(({ theme }) => ({
  backgroundColor: "#1976d2",
  color: "#fff",
  border: "none",
  borderRadius: 20,
  padding: "6px 16px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.3s ease",
  outline: "none",
  "&:hover": {
    backgroundColor: "#1565c0",
    transform: "translateY(-1px)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  },
  "&:active": {
    transform: "translateY(0)",
    boxShadow: "none",
  },
}));

export default function Table() {
  const projects = useProjectStore((state) => state.projects);
  const rows = projects.map((p) => ({
    id: p._id,
    projectName: p.name,
    assignedTo: p.assignee,
    deliveryDate: p.delivery,
    priority: p.priority,
    clientStatus: p.client_status,
    description: p.description,
    workStartedOn: p.started,
    status: p.status,
  }));

  return (
    <StyledPaper>
      <DataGrid
        rows={rows}
        getRowId={(row) => row.projectName}
        columns={[
          { field: "projectName", headerName: "Project Name", flex: 1, minWidth: 150 },
          { field: "assignedTo", headerName: "Assigned To", flex: 1, minWidth: 150 },
          { field: "deliveryDate", headerName: "Delivery Date", flex: 1, minWidth: 150 },
          { field: "priority", headerName: "Priority", flex: 0.5, minWidth: 100 },
          { field: "clientStatus", headerName: "Client Status", flex: 0.5, minWidth: 120 },
          { field: "description", headerName: "Description", flex: 1, minWidth: 150 },
          { field: "workStartedOn", headerName: "Work Started On", flex: 1, minWidth: 150 },
          { field: "status", headerName: "Status", flex: 0.7, minWidth: 120 },
          {
            field: "actions",
            headerName: "Actions",
            flex: 0.5,
            minWidth: 100,
            renderCell: (params) => {
              const projectId = params.row.id;
              const { projects } = useProjectStore.getState();
              const { showImages } = useModalStore.getState();
              const project = projects.find((p) => p._id === projectId);

              return (
                <ActionButton
                  onClick={() => {
                    if (project?.images) showImages(project.images);
                  }}
                >
                  View
                </ActionButton>
              );
            },
          },
        ]}
        pageSizeOptions={[5, 10, 20]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
        density="comfortable"
        sx={{
          "& .MuiDataGrid-virtualScroller": {
            overflowY: "auto",
          },
        }}
      />
    </StyledPaper>
  );
}
