export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-44 rounded-control bg-panel" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-card border border-border bg-panel" />
        ))}
      </div>
      <div className="h-72 rounded-card border border-border bg-panel" />
    </div>
  );
}
