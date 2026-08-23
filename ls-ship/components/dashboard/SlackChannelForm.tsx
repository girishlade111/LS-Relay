"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveChannelId } from "@/app/(dashboard)/integrations/actions";

export function SlackChannelForm({ current }: { current: string }) {
  const [channels, setChannels] = useState<{ id: string; name: string }[] | null>(
    null
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState(current);

  useEffect(() => {
    let alive = true;
    fetch("/api/integrations/slack/channels")
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("failed"))
      )
      .then((data) => {
        if (!alive) return;
        setChannels(data.channels ?? []);
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const options = channels ?? [];
  const showDropdown = !loadFailed && options.length > 0;
  const effective =
    selected && !options.some((channel) => channel.id === selected)
      ? [{ id: selected, name: `current (${selected})` }, ...options]
      : options;

  return (
    <form action={saveChannelId} className="mt-4 flex items-center gap-2 border-t border-border pt-4">
      {showDropdown ? (
        <select
          name="value"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          aria-label="Slack channel"
          className="max-w-xs rounded-control border border-border bg-panel-2 px-3 py-1.5 text-sm text-text"
        >
          {!selected ? <option value="">Pick a channel…</option> : null}
          {effective.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </select>
      ) : (
        <Input
          name="value"
          placeholder="Paste channel link or ID (e.g. C0123456789)"
          defaultValue={current}
          aria-label="Slack channel link or ID"
          className="max-w-xs"
        />
      )}
      <Button type="submit">Save channel</Button>
      <span className="text-xs text-faint">
        {showDropdown
          ? `${options.length} channels found`
          : loadFailed
            ? "Couldn't load channel list — paste the ID manually"
            : "Loading channels…"}
      </span>
    </form>
  );
}
