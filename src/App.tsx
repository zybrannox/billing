  import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";

import AdminLayout from "./admin/Layout";
import Employee from "./admin/pages/Employee";
import EmployeeProfile from "./admin/pages/EmployeeProfile";
import AddEmployee from "./admin/pages/AddEmployee";

import EmployeeLayout from "./employee/Layout";

import ConfirmDialog from "./ui/ConfirmDialog";
import Dialog from "./ui/Dialog";
import DownloadProgressIndicator from "./ui/DownloadProgressIndicator";
import { useConfirmDialogStore } from "./hooks/useconfirmDialogStore";
import { useAppStore, type User } from "./store/useAppStore";
import { apiService } from "./api/service";
import { API } from "./api/endpoints";
import Projects from "./common/pages/Projects";
import Customers from "./admin/pages/Customers";
import CustomerProfile from "./admin/pages/CustomerProfile";
import InvoiceView from "./admin/pages/InvoiceView";
import EditInvoice from "./admin/pages/EditInvoice";
import QuotationView from "./admin/pages/QuotationView";
import GenerateInvoice from "./common/pages/GenerateInvoice";
import GenerateQuotation from "./common/pages/GenerateQuotation";
import SystemSetup from "./admin/pages/SystemSetup";
import Dashboard from "./admin/pages/Dashboard";
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
    paymentMethodRequired,
    paymentMethod,
    setPaymentMethod,
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
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerProfile />} />
                <Route path="employees" element={<Employee />} />
                <Route path="employees/new" element={<AddEmployee />} />
                <Route path="employees/:id" element={<EmployeeProfile />} />
                <Route path="system-setup" element={<SystemSetup />} />
              </Route>
            </Route>

            {/* Quotations are still their own routed page (unlike invoices -
                see the global <Dialog type="viewInvoice"> below) - outside
                the admin-only guard above and outside AdminLayout, since a
                full-page printable document shouldn't include the sidebar/
                app chrome, and employees can reach one too (converting
                their own project's quotation). */}
            <Route element={<ProtectedRoute allowedRoles={["admin", "user", "moderator"]} />}>
              <Route path="/admin/quotations/:id" element={<QuotationView />} />
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
        paymentMethodRequired={paymentMethodRequired}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />

      {/* Global "View Invoice" dialog - mounted here, outside both
          AdminLayout and EmployeeLayout, so every "View Invoice" action in
          the app (admin or employee) can open it regardless of which
          layout/route triggered it, the same way ConfirmDialog above is
          available everywhere. See admin/pages/InvoiceView.tsx's own
          top comment for why this replaced a standalone routed page. */}
      <Dialog type="viewInvoice" title="Invoice" children={<InvoiceView />} maxWidth="md" />

      {/* Admin-only (see InvoiceView.tsx's "Edit" action, the only place
          this is opened from) - reuses the same xl width as
          invoiceDesignComplete below since it hosts the same line-item
          table. */}
      <Dialog type="editInvoice" title="Edit Invoice" children={<EditInvoice />} maxWidth="xl" />

      {/* Same reasoning as viewInvoice above, moved here from
          admin/Layout.tsx - a project's own "Mark design as completed"
          row action (see common/pages/Projects.tsx, rendered under
          EmployeeLayout too) opens this same "invoiceDesignComplete"
          dialog type for an employee working their own project, not just
          from the admin topbar's "Create Invoice" shortcut. Mounting it
          only in AdminLayout meant that action silently did nothing for
          an employee - openDialog set the store's state, but nothing in
          their tree was listening for it. xl, not md - both forms host a
          full line-item table (see common/components/ItemLineEditor.tsx)
          that wants up to ~1280px to avoid its own internal horizontal
          scrollbar. */}
      <Dialog type="invoiceDesignComplete" title="Invoice" children={<GenerateInvoice />} maxWidth="xl" />
      <Dialog type="quotation" title="Quotation" children={<GenerateQuotation />} maxWidth="xl" />

      <DownloadProgressIndicator />
    </>
  );
}

export default App;
