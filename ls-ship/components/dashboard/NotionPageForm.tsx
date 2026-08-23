"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveBlockId } from "@/app/(dashboard)/integrations/actions";

export function NotionPageForm({ current }: { current: string }) {
  const [pages, setPages] = useState<{ id: string; title: string }[] | null>(
    null
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState(current);

  useEffect(() => {
    let alive = true;
    fetch("/api/integrations/notion/pages")
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("failed"))
      )
      .then((data) => {
        if (!alive) return;
        setPages(data.pages ?? []);
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const options = pages ?? [];
  const showDropdown = !loadFailed && options.length > 0;
  const effective =
    selected && !options.some((page) => page.id === selected)
      ? [{ id: selected, title: `current (${selected.slice(0, 8)}…)` }, ...options]
      : options;

  return (
    <form action={saveBlockId} className="mt-4 flex items-center gap-2 border-t border-border pt-4">
      {showDropdown ? (
        <select
          name="value"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          aria-label="Notion page"
          className="max-w-xs rounded-control border border-border bg-panel-2 px-3 py-1.5 text-sm text-text"
        >
          {!selected ? <option value="">Pick a page…</option> : null}
          {effective.map((page) => (
            <option key={page.id} value={page.id}>
              {page.title}
            </option>
          ))}
        </select>
      ) : (
        <Input
          name="value"
          placeholder="Paste the Notion page URL or its ID"
          defaultValue={current}
          aria-label="Notion page URL or ID"
          className="max-w-xs"
        />
      )}
      <Button type="submit">Save page</Button>
      <span className="text-xs text-faint">
        {showDropdown
          ? `${options.length} shared pages found`
          : loadFailed
            ? "Couldn't load pages — share one with the integration, or paste its URL"
            : "Loading pages…"}
      </span>
    </form>
  );
}
