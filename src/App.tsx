import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import AdminLayout from "./admin/Layout";
import Employee from "./admin/pages/Employee";
import AddEmployee from "./admin/pages/AddEmployee";

import EmployeeLayout from "./employee/Layout";
import EmployeeProjects from "./employee/pages/Projects";

import ConfirmDialog from "./ui/ConfirmDialog";
import DownloadProgressIndicator from "./ui/DownloadProgressIndicator";
import { useConfirmDialogStore } from "./hooks/useconfirmDialogStore";
import AdminProjects from "./admin/pages/Projects";
import Customers from "./admin/pages/Customers";
import Billing from "./admin/pages/Billing";
import InvoiceView from "./admin/pages/InvoiceView";
import ProtectedRoute from "./common/components/auth/ProtectedRoute";
import Login from "./common/components/auth/Login";
import ErrorBoundary from "./common/components/ErrorBoundary";

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
        <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* ADMIN ROUTES */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="projects" element={<AdminProjects />} />
                <Route path="customers" element={<Customers />} />
                <Route path="employees" element={<Employee />} />
                <Route path="employees/new" element={<AddEmployee />} />
                <Route path="billing" element={<Billing />} />
              </Route>
              {/* Rendered outside AdminLayout - a full-page printable
                  document shouldn't include the sidebar/app chrome. */}
              <Route path="/admin/invoices/:id" element={<InvoiceView />} />
            </Route>

            {/* USER ROUTES */}
            <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
              <Route path="/" element={<EmployeeLayout />}>
                <Route index element={<EmployeeProjects />} />
              </Route>
            </Route>

            {/* "+ Add Project" now opens a dialog on "/" instead of navigating,
                but this route is kept as a redirect in case it's bookmarked
                or was shared from before that change. */}
            <Route path="/add-project" element={<Navigate to="/" replace />} />

            {/* Catch-all: send any unmatched path back to the app instead of
                rendering a blank page. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
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

      <DownloadProgressIndicator />
    </>
  );
}

export default App;
