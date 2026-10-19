// Fallback shown while a lazily-loaded route or dialog chunk downloads (see
// App.tsx). `fill` centres it in the viewport for a whole-page load; the
// default suits a spot inside an already-visible layout or dialog.
export default function PageSpinner({ fill = false }: { fill?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`flex items-center justify-center ${fill ? "min-h-screen bg-gray-50" : "min-h-[40vh]"}`}
    >
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
