import { useState } from "react";
import { useApiRequest } from "../../../hooks/useApiRequest";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAppStore, type User } from "../../../store/useAppStore";
import { API } from "../../../api/endpoints";
import Button from "../../../ui/Button";
import TextField from "../../../ui/TextField";

function Login() {
  const { sendRequest, loading } = useApiRequest();
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (user) {
    return <Navigate to={user.role === "admin" ? "/admin/projects" : "/"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let loginError: any = null;
    const loginResult = await sendRequest({
      endpoint: API.auth.login,
      method: "post",
      data: { email, password },
      onError: (err) => {
        loginError = err;
      },
    });

    if (!loginResult) {
      setErrorMessage(loginError?.detail || "Invalid email or password.");
      return;
    }

    let meError: any = null;
    const me = await sendRequest<User>({
      endpoint: API.auth.me,
      method: "get",
      onError: (err) => {
        meError = err;
      },
    });

    if (!me) {
      setErrorMessage(
        meError?.detail || "Could not load your account. Please try again.",
      );
      return;
    }

    setUser(me);
    navigate(me.role === "admin" ? "/admin/projects" : "/");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo - the real app mark, same asset the sidebar uses (see
              common/components/Drawer.tsx's DrawerLogo), not a generic
              placeholder shape. */}
          <div className="mb-12 flex items-center gap-2">
            <img src="/images/logo.webp" alt="" className="h-9 w-auto" />
            <img src="/images/logo_text.webp" alt="Zybrannox" className="h-6 w-auto" />
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Welcome back
            </h1>
            <p className="text-slate-500">Sign in to manage orders, printing and billing</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Email/Password - the same TextField every other form in the
                app uses (ui/TextField.tsx), not one-off styled <input>s,
                so focus states, sizing and the password show/hide toggle
                all match the rest of the app for free. */}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@zybrannox.com"
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

            {/* Forget Password */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button - the same gradient Button used for every
                other primary action in the app (Add Customer, Add Project,
                etc. - see ui/Button.tsx), not a one-off styled element. */}
            <Button type="submit" disabled={loading} fullWidth size="large" variantColor="gradient">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>

      {/* Right Side - same dark navy hero gradient the admin Dashboard's
          own header/hero card uses (see admin/pages/Dashboard.tsx's
          DarkStatCard, bg-linear-to-br from-blue-900 via-blue-800 to-
          slate-900), so the login screen reads as the same product
          instead of a generic template. The mark itself, softly glowing,
          replaces an unrelated stock photo of a stranger. */}
      <div className="hidden lg:flex lg:w-1/2 rounded-2xl my-2 mr-2 bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center">
          <div className="relative mb-12 flex items-center justify-center">
            <div className="w-72 h-72 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full opacity-30 blur-3xl absolute" />
            {/* Same mark as the left side, forced white via filter (the
                source asset is a dark indigo gradient - fine on the light
                left panel, but low-contrast against this dark hero) rather
                than maintaining a second logo file just for color. */}
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

export default Login;
