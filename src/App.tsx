import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

import AdminLayout from "./admin/Layout";
import Employee from "./admin/pages/Employee";
import AddEmployee from "./admin/pages/AddEmployee";

import EmployeeLayout from "./employee/Layout";
import EmployeeProjects from "./employee/pages/Projects";

import ConfirmDialog from "./ui/ConfirmDialog";
import { useConfirmDialogStore } from "./hooks/useconfirmDialogStore";
import AdminProjects from "./admin/pages/Projects";
import Billing from "./admin/pages/Billing";
import ProtectedRoute from "./common/components/auth/ProtectedRoute";
import Login from "./common/components/auth/Login";

function App() {
  const {
    openConfirmDialog,
    title,
    description,
    confirmText,
    cancelText,
    loading,
    isDestructive,
    onConfirm,
    onCancel,
  } = useConfirmDialogStore();

  return (
    <>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* ADMIN ROUTES */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="projects" element={<AdminProjects />} />
              <Route path="employees" element={<Employee />} />
              <Route path="employees/new" element={<AddEmployee />} />
              <Route path="billing" element={<Billing />} />
            </Route>
          </Route>

          {/* USER ROUTES */}
          <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
            <Route path="/" element={<EmployeeLayout />}>
              <Route index element={<EmployeeProjects />} />
            </Route>
          </Route>
        </Routes>
      </Router>

      {/* Global Confirm Dialog */}
      <ConfirmDialog
        open={openConfirmDialog}
        title={title}
        description={description}
        confirmText={confirmText}
        cancelText={cancelText}
        loading={loading}
        isDestructive={isDestructive}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </>
  );
}

export default App;
