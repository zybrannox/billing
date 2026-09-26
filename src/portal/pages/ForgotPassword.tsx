import { useNavigate } from "react-router-dom";
import { portalApiService } from "../../api/portalService";
import ForgotPasswordForm from "../../common/components/auth/ForgotPasswordForm";

// Mirrors ClientLogin.tsx's centered-card layout - the client portal had
// no forgot-password capability at all before this.
export default function PortalForgotPassword() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-8 flex items-center gap-2">
          <img src="/images/logo.webp" alt="" className="h-9 w-auto" />
          <img src="/images/logo_text.webp" alt="Zybrannox" className="h-6 w-auto" />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Reset your password</h1>
          <p className="text-slate-500">Enter your email and we'll send you a verification code.</p>
        </div>

        <ForgotPasswordForm
          apiClient={portalApiService}
          requestEndpoint="/client-auth/forgot-password"
          resetEndpoint="/client-auth/reset-password"
          onDone={() => navigate("/portal/login")}
        />

        <p className="mt-6 text-center text-sm text-slate-500">
          <button
            type="button"
            onClick={() => navigate("/portal/login")}
            className="text-blue-600 hover:underline font-medium"
          >
            Back to sign in
          </button>
        </p>
      </div>
    </div>
  );
}
