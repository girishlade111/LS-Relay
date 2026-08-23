"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Keeps server-rendered data fresh by re-fetching the current route on an
// interval — new webhook events show up without a manual page reload.
export function AutoRefresh({ intervalSeconds = 30 }: { intervalSeconds?: number }) {
  const router = useRouter();
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
      setLastRefreshedAt(new Date());
    }, intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [router, intervalSeconds]);

  return (
    <span className="text-xs text-faint" title="Auto-refreshes every 30s">
      auto-refreshes every {intervalSeconds}s
      {lastRefreshedAt
        ? ` · last ${lastRefreshedAt.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
          })}`
        : ""}
    </span>
  );
}
