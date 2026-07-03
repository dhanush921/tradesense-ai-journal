export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#030712] p-4 md:p-6 animate-pulse">
      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-800/40" />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="h-72 rounded-2xl bg-gray-800/40 mb-6" />
      {/* Row skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 h-64 rounded-2xl bg-gray-800/40" />
        <div className="h-64 rounded-2xl bg-gray-800/40" />
      </div>
    </div>
  );
}
