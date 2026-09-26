import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useClientAppStore, type ClientUser } from "../../store/useClientAppStore";
import { portalApiService } from "../../api/portalService";
import { getApiErrorMessage } from "../../utils/apiError";
import Button from "../../ui/Button";
import TextField from "../../ui/TextField";

// Mirrors common/components/auth/Login.tsx, posting to /client-auth/*
// instead of /auth/* and landing on the portal, never the staff app.
interface MeResponse {
  customer_id: number;
  email: string | null;
  first_name: string;
  last_name: string;
  company_id: number | null;
  company_name: string | null;
}

const toClientUser = (me: MeResponse): ClientUser => ({
  customerId: me.customer_id,
  email: me.email,
  firstName: me.first_name,
  lastName: me.last_name,
  companyId: me.company_id,
  companyName: me.company_name,
});

function ClientLogin() {
  const { clientUser, setClientUser } = useClientAppStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (clientUser) {
    return <Navigate to="/portal/orders" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      await portalApiService.post("/client-auth/login", { email, password });
      const me = await portalApiService.get<MeResponse>("/client-auth/me");
      setClientUser(toClientUser(me));
      navigate("/portal/orders");
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, "Invalid email or password."));
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

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Client Portal</h1>
          <p className="text-slate-500">Sign in to view your orders and billing</p>
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
            autoComplete="current-password"
            required
            disabled={loading}
          />

          <div className="text-right">
            <Link to="/portal/forgot-password" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" disabled={loading} fullWidth size="large" variantColor="gradient">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have portal access yet? Ask us for an invite.
        </p>
      </div>
    </div>
  );
}

export default ClientLogin;
