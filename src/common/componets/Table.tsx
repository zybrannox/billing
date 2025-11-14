import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import { useProjectStore } from "../../store/useProjectStore";
import { useModalStore } from "../../store/useModalStore";

export default function Table() {
  const projects = useProjectStore((state) => state.projects);

  const rows = projects.map((p) => ({
    id: p.id,
    projectName: p.name,
    assignedTo: p.assignee,
    deliveryDate: p.delivery,
    priority: p.priority,
    clientStatus: p.clientStatus,
    description: p.description,
    workStartedOn: p.started,
    status: p.status,
  }));

  return (
    <Paper sx={{ height: 500, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={[
          { field: "id", headerName: "ID", width: 100 },
          { field: "projectName", headerName: "Project Name", width: 200 },
          { field: "assignedTo", headerName: "Assigned To", width: 200 },
          { field: "deliveryDate", headerName: "Delivery Date", width: 200 },
          { field: "priority", headerName: "Priority", width: 150 },
          { field: "clientStatus", headerName: "Client Status", width: 150 },
          { field: "description", headerName: "Description", width: 200 },
          { field: "workStartedOn", headerName: "Work Started On", width: 200 },
          { field: "status", headerName: "Status", width: 150 },
          {
            field: "actions",
            headerName: "Actions",
            width: 150,
            renderCell: (params) => {
              const projectId = params.row.id;
              const { projects } = useProjectStore.getState();
              const { showImages } = useModalStore.getState();
              console.log(showImages);
              
              const project = projects.find((p) => p.id === projectId);
        
              return (
                <button
                  // variant="contained"
                  onClick={() => {
                    if (project?.images) {
                      showImages(project.images);
                    }
                  }}
                >
                  View
                </button>
              );
            },
          },
        ]}
        pageSizeOptions={[5, 10]}
      />
    </Paper>
  );
}
