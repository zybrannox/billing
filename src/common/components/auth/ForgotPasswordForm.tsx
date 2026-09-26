import { useState } from "react";
import Button from "../../../ui/Button";
import TextField from "../../../ui/TextField";
import { getApiErrorMessage } from "../../../utils/apiError";

interface PostClient {
  post: <T>(url: string, data?: unknown) => Promise<T>;
}

interface ForgotPasswordFormProps {
  apiClient: PostClient;
  requestEndpoint: string;
  resetEndpoint: string;
  // Called once the password is actually changed - callers redirect to
  // their own login route (staff vs. portal have different ones).
  onDone: () => void;
}

// Shared by the staff (common/components/auth/ForgotPassword.tsx) and
// client-portal (portal/pages/ForgotPassword.tsx) forgot-password pages -
// same two-step verification-code flow either side, just pointed at a
// different apiClient/endpoint pair (see app/auth vs app/client_auth on the
// backend, which mirror each other for the same reason).
export default function ForgotPasswordForm({
  apiClient,
  requestEndpoint,
  resetEndpoint,
  onDone,
}: ForgotPasswordFormProps) {
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await apiClient.post<{ message: string }>(requestEndpoint, { email });
      setInfoMessage(res.message);
      setStep("reset");
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, "Couldn't send the verification code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(resetEndpoint, { email, code, new_password: newPassword });
      setStep("done");
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, "Invalid or expired verification code."));
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="space-y-5">
        <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          Your password has been updated. You can sign in with your new password now.
        </div>
        <Button type="button" onClick={onDone} fullWidth size="large" variantColor="gradient">
          Back to sign in
        </Button>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <form onSubmit={handleReset} className="space-y-5">
        {infoMessage && (
          <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
            {infoMessage}
          </div>
        )}
        {errorMessage && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <TextField
          label="Verification code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit code"
          required
          disabled={loading}
        />
        <TextField
          label="New password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          disabled={loading}
        />
        <TextField
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          disabled={loading}
        />

        <Button type="submit" disabled={loading} fullWidth size="large" variantColor="gradient">
          {loading ? "Resetting..." : "Reset password"}
        </Button>

        <button
          type="button"
          onClick={() => setStep("email")}
          className="w-full text-center text-sm text-slate-500 hover:text-slate-700 mt-4"
        >
          Didn't get a code? Try again
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestCode} className="space-y-5">
      {errorMessage && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="username"
        required
        disabled={loading}
      />

      <Button type="submit" disabled={loading} fullWidth size="large" variantColor="gradient">
        {loading ? "Sending..." : "Send verification code"}
      </Button>
    </form>
  );
}
