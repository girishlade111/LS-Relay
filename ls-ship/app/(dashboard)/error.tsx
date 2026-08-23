"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mt-6 px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-h1">Something went wrong</h2>
        <p className="max-w-md text-sm text-text-muted">
          An unexpected error occurred while loading this page.
          {error.digest ? ` Reference: ${error.digest}.` : ""}
        </p>
        <Button onClick={reset} variant="accent">
          Try again
        </Button>
      </div>
    </Card>
  );
}
