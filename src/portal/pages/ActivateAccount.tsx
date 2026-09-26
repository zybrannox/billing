import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useClientAppStore } from "../../store/useClientAppStore";
import { portalApiService } from "../../api/portalService";
import { getApiErrorMessage } from "../../utils/apiError";
import Button from "../../ui/Button";
import TextField from "../../ui/TextField";

interface InviteLookup {
  valid: boolean;
  customer_name?: string | null;
  company_name?: string | null;
}

interface MeResponse {
  customer_id: number;
  email: string | null;
  first_name: string;
  last_name: string;
  company_id: number | null;
  company_name: string | null;
}

// Reached from the link staff sends via WhatsApp (see the "Send Portal
// Invite" action on Customers.tsx) - ?token=... identifies the invite.
// Public/unauthenticated, same trust model as /public/documents/{token}:
// the token's own entropy is the security, not a login wall.
function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { clientUser, setClientUser } = useClientAppStore();

  const [checking, setChecking] = useState(true);
  const [invite, setInvite] = useState<InviteLookup | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    portalApiService
      .get<InviteLookup>(`/client-auth/invite/${encodeURIComponent(token)}`)
      .then(setInvite)
      .catch(() => setInvite({ valid: false }))
      .finally(() => setChecking(false));
  }, [token]);

  if (clientUser) {
    return <Navigate to="/portal/orders" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await portalApiService.post("/client-auth/activate", { token, email, password });
      const me = await portalApiService.get<MeResponse>("/client-auth/me");
      setClientUser({
        customerId: me.customer_id,
        email: me.email,
        firstName: me.first_name,
        lastName: me.last_name,
        companyId: me.company_id,
        companyName: me.company_name,
      });
      navigate("/portal/orders");
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, "Couldn't activate your account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-8 flex items-center gap-2">
          <img src="/images/logo.webp" alt="" className="h-9 w-auto" />
          <img src="/images/logo_text.webp" alt="Zybrannox" className="h-6 w-auto" />
        </div>

        {checking ? (
          <p className="text-slate-500">Checking your invite link...</p>
        ) : !invite?.valid ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Invite link invalid</h1>
            <p className="text-slate-500">
              This invite link is invalid or has expired. Please ask us for a new one.
            </p>
          </>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Welcome, {invite.customer_name}
              </h1>
              <p className="text-slate-500">
                {invite.company_name
                  ? `Set up your portal login for ${invite.company_name}.`
                  : "Set up your portal login."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                disabled={loading}
              />
              <TextField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                disabled={loading}
              />

              <Button type="submit" disabled={loading} fullWidth size="large" variantColor="gradient">
                {loading ? "Activating..." : "Activate account"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ActivateAccount;
