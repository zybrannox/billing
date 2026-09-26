import { useNavigate } from "react-router-dom";
import { apiService } from "../../../api/service";
import ForgotPasswordForm from "./ForgotPasswordForm";

// Mirrors Login.tsx's left-panel layout (the "Forgot password?" link there
// now points here instead of being a dead href="#").
export default function ForgotPassword() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-12 flex items-center gap-2">
            <img src="/images/logo.webp" alt="" className="h-9 w-auto" />
            <img src="/images/logo_text.webp" alt="Zybrannox" className="h-6 w-auto" />
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Reset your password</h1>
            <p className="text-slate-500">
              Enter your email and we'll send you a verification code.
            </p>
          </div>

          <ForgotPasswordForm
            apiClient={apiService}
            requestEndpoint="/auth/forgot-password"
            resetEndpoint="/auth/reset-password"
            onDone={() => navigate("/login")}
          />

          <p className="mt-6 text-center text-sm text-slate-500">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-blue-600 hover:underline font-medium"
            >
              Back to sign in
            </button>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 rounded-2xl my-2 mr-2 bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center">
          <div className="relative mb-12 flex items-center justify-center">
            <div className="w-72 h-72 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full opacity-30 blur-3xl absolute" />
            <img
              src="/images/logo.webp"
              alt=""
              className="w-40 h-40 object-contain relative z-10 brightness-0 invert drop-shadow-[0_8px_30px_rgba(37,99,235,0.35)]"
            />
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white mb-4">
              Every order, start to delivery
            </h2>
            <p className="text-slate-400 text-lg">
              Track design, print and delivery status, and keep billing
              accurate - all in one place
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
