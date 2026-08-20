import { useState } from "react";
import { useApiRequest } from "../../../hooks/useApiRequest";
import { useNavigate } from "react-router-dom";
import { useAppStore, type User } from "../../../store/useAppStore";

const API_URL = import.meta.env.VITE_API_URL;

function Login() {
  const { sendRequest, loading } = useApiRequest();
  const { setUser } = useAppStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1. Login
      await sendRequest({
        endpoint: "/auth/login",
        method: "post",
        data: { email, password },
        redirectTo: "/",
      });

      // 2. Fetch user AFTER successful login
      // /auth/me actually returns {username, role} (see
      // app/auth/dependencies.py's get_current_user) - typing this as just
      // {role} let `username` silently go missing from the User type
      // without TypeScript catching it, since the field really is present
      // at runtime; this pins the request to the real shape instead.
      const me = await sendRequest<User>({
        endpoint: "/auth/me",
        method: "get",
      });

      if (!me) throw new Error("User not found");
      setUser(me);
      // 3. Role-based navigation
      switch (me.role) {
        case "admin":
          navigate("/admin/projects");
          break;
        case "moderator":
          navigate("/");
          break;
        default:
          navigate("/");
      }
    } catch (err: any) {
      alert(err?.detail || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-12">
            <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center">
              <div className="w-10 h-10 bg-white rounded-full relative overflow-hidden">
                <div
                  className="absolute inset-0 bg-black"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)" }}
                ></div>
              </div>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome Back!
            </h1>
            <p className="text-gray-500">Please enter log in details below</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Zahra.uix@gmail.com"
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                />
              </div>
            </div>

            {/* Forget Password */}
            <div className="text-right">
              <a
                href="#"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Forget password?
              </a>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full bg-black text-white py-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 rounded-2xl my-2 mr-2 bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 relative overflow-hidden">
        {/* Main Content Container */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center">
          {/* Illustration Container with Hexagonal Frame */}
          <div className="relative mb-12">
            <div className="relative w-96 h-96 flex items-center justify-center">
              {/* Hexagonal Frame */}
              <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-[3rem] transform rotate-6"></div>

              {/* Character Illustration Area */}
              <div className="relative z-10 w-80 h-80 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center overflow-hidden">
                {/* Placeholder for character - using a gradient circle */}
                <div className="relative">
                  <div className="w-48 h-48 bg-gradient-to-br from-blue-300 to-purple-400 rounded-full opacity-60 blur-3xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  <img
                    src="https://images.pexels.com/photos/3184431/pexels-photo-3184431.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Professional"
                    className="w-64 h-64 object-cover rounded-2xl relative z-10"
                  />
                </div>
              </div>

              {/* Floating geometric decorations around illustration */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                <div
                  className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 opacity-70"
                  style={{
                    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white mb-4">
              Monotor Your Work Effectively
            </h2>
            <p className="text-gray-400 text-lg">
              Monitor your work effectively to stay organized, track progress,
              and achieve your goals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
