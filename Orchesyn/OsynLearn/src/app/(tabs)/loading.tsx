/** Route-change skeleton — every tab page gets an instant, calm loading state. */
export default function TabsLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-3 w-40 animate-pulse rounded-full bg-surface2" />
        <div className="h-7 w-64 animate-pulse rounded-full bg-surface2" />
      </div>
      <div className="h-28 animate-pulse rounded-2xl border border-line/50 bg-surface2/50" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-20 animate-pulse rounded-2xl border border-line/50 bg-surface2/50" />
        <div className="h-20 animate-pulse rounded-2xl border border-line/50 bg-surface2/50" />
      </div>
    </div>
  );
}
