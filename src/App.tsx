  import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";

import AdminLayout from "./admin/Layout";
import Employee from "./admin/pages/Employee";
import AddEmployee from "./admin/pages/AddEmployee";

import EmployeeLayout from "./employee/Layout";

import ConfirmDialog from "./ui/ConfirmDialog";
import DownloadProgressIndicator from "./ui/DownloadProgressIndicator";
import { useConfirmDialogStore } from "./hooks/useconfirmDialogStore";
import { useAppStore, type User } from "./store/useAppStore";
import { apiService } from "./api/service";
import { API } from "./api/endpoints";
import Projects from "./common/pages/Projects";
import Customers from "./admin/pages/Customers";
import Billing from "./admin/pages/Billing";
import InvoiceView from "./admin/pages/InvoiceView";
import SystemSetup from "./admin/pages/SystemSetup";
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

  const setUser = useAppStore((s) => s.setUser);
  const clearUser = useAppStore((s) => s.clearUser);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await apiService.get<User>(API.auth.me);
        if (!cancelled && me) setUser(me);
        else if (!cancelled) clearUser();
      } catch {
        if (!cancelled) clearUser();
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
                <Route path="projects" element={<Projects />} />
                <Route path="customers" element={<Customers />} />
                <Route path="employees" element={<Employee />} />
                <Route path="employees/new" element={<AddEmployee />} />
                <Route path="billing" element={<Billing />} />
                <Route path="system-setup" element={<SystemSetup />} />
              </Route>
              {/* Rendered outside AdminLayout - a full-page printable
                  document shouldn't include the sidebar/app chrome. TODO */}
              <Route path="/admin/invoices/:id" element={<InvoiceView />} />
            </Route>

            {/* USER ROUTES */}
            <Route element={<ProtectedRoute allowedRoles={["user", "moderator"]} />}>
              <Route path="/" element={<EmployeeLayout />}>
                <Route index element={<Projects />} />
              </Route>
            </Route>

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
