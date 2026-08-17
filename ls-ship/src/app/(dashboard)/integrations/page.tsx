"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateSlackChannelId } from "@/app/actions/update-slack-channel";
import { useState } from "react";

type Integration = {
  id: string;
  provider: "github" | "jira" | "slack" | "notion";
  connected: boolean;
  metadata?: {
    channelId?: string;
    cloudId?: string;
  };
};

async function getIntegrations(): Promise<Integration[]> {
  // In a real app, this would fetch from an API endpoint
  // For MVP, we return empty array - actual integration status is determined by DB lookup
  const res = await fetch("/api/integrations");
  if (!res.ok) {
    throw new Error("Failed to fetch integrations");
  }
  return res.json();
}

export default function IntegrationsPage() {
  const { data: integrations, isLoading, refetch } = useQuery({
    queryKey: ["integrations"],
    queryFn: getIntegrations,
    initialData: [],
  });

  const slackIntegration = integrations?.find((i) => i.provider === "slack");
  const isConnected = !!slackIntegration;
  const channelId = slackIntegration?.metadata?.channelId;

  const [channelInput, setChannelInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveChannelId = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateSlackChannelId(channelInput);
      setSaveSuccess(true);
      setChannelInput("");
      refetch();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save channel ID");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* GitHub Card */}
        <Card>
          <CardHeader>
            <CardTitle>GitHub</CardTitle>
            <CardDescription>Connect your GitHub account for PR notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="accent" 
              onClick={() => window.location.href = "/api/integrations/github/connect"}
            >
              Connect GitHub
            </Button>
          </CardContent>
        </Card>

        {/* Jira Card */}
        <Card>
          <CardHeader>
            <CardTitle>Jira</CardTitle>
            <CardDescription>Connect Jira for task completion tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="accent" 
              onClick={() => window.location.href = "/api/integrations/jira/connect"}
            >
              Connect Jira
            </Button>
          </CardContent>
        </Card>

        {/* Slack Card */}
        <Card>
          <CardHeader>
            <CardTitle>Slack</CardTitle>
            <CardDescription>Connect Slack to receive notifications when a PR is created or a Jira task is marked done</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <Button 
                variant="accent" 
                onClick={() => window.location.href = "/api/integrations/slack/connect"}
              >
                Connect Slack
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-green-500">✓ Connected</div>
                
                {/* 
                  MVP: Simple inline form for pasting channel ID.
                  Users can get the channel ID by right-clicking a channel in Slack 
                  and selecting "Copy link" - the ID is the part after /Cxxxxxxx.
                  
                  V2 improvement: Build a proper channel picker UI using Slack's 
                  conversations.list API to show a dropdown of available channels.
                */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">
                    Target Channel ID
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., C0123456789"
                      value={channelInput}
                      onChange={(e) => setChannelInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="default" 
                      onClick={handleSaveChannelId}
                      disabled={isSaving || !channelInput}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                  {saveError && (
                    <p className="text-xs text-red-500">{saveError}</p>
                  )}
                  {saveSuccess && (
                    <p className="text-xs text-green-500">Channel ID saved!</p>
                  )}
                  {channelId && (
                    <p className="text-xs text-gray-500">
                      Current: {channelId}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
