import { Link } from "react-router-dom";

export function ButtonLink({ to, children }: any) {
  return (
    <Link
      to={to}
      className="inline-flex items-center px-4 py-2 rounded-lg bg-linear-to-br from-blue-900 to-blue-800 text-white font-medium hover:brightness-110 transition"
    >
      {children}
    </Link>
  );
}
