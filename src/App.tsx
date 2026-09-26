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
import { useClientAppStore, type ClientUser } from "./store/useClientAppStore";
import { apiService } from "./api/service";
import { portalApiService } from "./api/portalService";
import { API } from "./api/endpoints";
import Projects from "./common/pages/Projects";
import Customers from "./admin/pages/Customers";
import CustomerProfile from "./admin/pages/CustomerProfile";
import Companies from "./admin/pages/Companies";
import CompanyProfile from "./admin/pages/CompanyProfile";
import JobRequests from "./admin/pages/JobRequests";
import InvoiceView from "./admin/pages/InvoiceView";
import EditInvoice from "./admin/pages/EditInvoice";
import QuotationView from "./admin/pages/QuotationView";
import GenerateInvoice from "./common/pages/GenerateInvoice";
import GenerateQuotation from "./common/pages/GenerateQuotation";
import SystemSetup from "./admin/pages/SystemSetup";
import Dashboard from "./admin/pages/Dashboard";
import ProtectedRoute from "./common/components/auth/ProtectedRoute";
import ClientProtectedRoute from "./common/components/auth/ClientProtectedRoute";
import Login from "./common/components/auth/Login";
import ForgotPassword from "./common/components/auth/ForgotPassword";
import ErrorBoundary from "./common/components/ErrorBoundary";
import PortalLayout from "./portal/Layout";
import ClientLogin from "./portal/pages/ClientLogin";
import PortalForgotPassword from "./portal/pages/ForgotPassword";
import ActivateAccount from "./portal/pages/ActivateAccount";
import PortalOrders from "./portal/pages/PortalOrders";
import PortalOrderDetail from "./portal/pages/PortalOrderDetail";
import PortalBilling from "./portal/pages/PortalBilling";
import PortalInvoiceDetail from "./portal/pages/PortalInvoiceDetail";
import SubmitJobRequest from "./portal/pages/SubmitJobRequest";
import PortalJobRequests from "./portal/pages/PortalJobRequests";

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

  const setClientUser = useClientAppStore((s) => s.setClientUser);
  const clearClientUser = useClientAppStore((s) => s.clearClientUser);
  const [clientSessionChecked, setClientSessionChecked] = useState(false);

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

  // A second, independent session check for the client portal (see
  // app/client_auth) - its own cookie/axios instance, so a staff session
  // (or the lack of one) never affects this and vice versa.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await portalApiService.get<{
          customer_id: number;
          email: string | null;
          first_name: string;
          last_name: string;
          company_id: number | null;
          company_name: string | null;
        }>("/client-auth/me");
        if (!cancelled && me) {
          setClientUser({
            customerId: me.customer_id,
            email: me.email,
            firstName: me.first_name,
            lastName: me.last_name,
            companyId: me.company_id,
            companyName: me.company_name,
          } as ClientUser);
        } else if (!cancelled) clearClientUser();
      } catch {
        if (!cancelled) clearClientUser();
      } finally {
        if (!cancelled) setClientSessionChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!sessionChecked || !clientSessionChecked) {
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
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* ADMIN ROUTES */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerProfile />} />
                <Route path="companies" element={<Companies />} />
                <Route path="companies/:id" element={<CompanyProfile />} />
                <Route path="job-requests" element={<JobRequests />} />
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

            {/* CLIENT PORTAL ROUTES - a fully separate auth boundary from
                staff (see app/client_auth); /portal/login and /activate
                are public, everything else needs a client session. */}
            <Route path="/portal/login" element={<ClientLogin />} />
            <Route path="/portal/forgot-password" element={<PortalForgotPassword />} />
            <Route path="/portal/activate" element={<ActivateAccount />} />
            <Route element={<ClientProtectedRoute />}>
              <Route path="/portal" element={<PortalLayout />}>
                <Route index element={<Navigate to="orders" replace />} />
                <Route path="orders" element={<PortalOrders />} />
                <Route path="orders/:id" element={<PortalOrderDetail />} />
                <Route path="billing" element={<PortalBilling />} />
                <Route path="billing/:id" element={<PortalInvoiceDetail />} />
                <Route path="submit-job" element={<SubmitJobRequest />} />
                <Route path="job-requests" element={<PortalJobRequests />} />
              </Route>
            </Route>

            {/* Catch-all: send any unmatched path back to the app instead of
                rendering a blank page. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Global dialogs - mounted inside Router/ErrorBoundary (not as
              siblings after </Router>, which is what this used to be): any
              of these can use router hooks (GenerateQuotation navigates to
              the new quotation on success), and a crash inside one should
              be caught by ErrorBoundary instead of blanking the whole app -
              neither was true when they lived outside it. */}

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
        </ErrorBoundary>
      </Router>
    </>
  );
}

export default App;
