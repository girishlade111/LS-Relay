import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import {
  getUserDefaultBaseBranch,
  updateUserDefaultBaseBranch,
} from "@/lib/db/queries";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Row } from "@/components/ui/Row";

async function saveDefaultBaseBranch(formData: FormData): Promise<void> {
  "use server";

  const { userId } = await auth();
  if (!userId) {
    return;
  }

  const raw = formData.get("defaultBaseBranch");
  const branch = typeof raw === "string" ? raw.trim() : "";

  await updateUserDefaultBaseBranch(userId, branch || null);
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const defaultBaseBranch = await getUserDefaultBaseBranch(userId);

  return (
    <>
      <h1 className="text-h1">Settings</h1>

      <Card className="mt-6">
        <Row
          title="Default base branch"
          description="Used as the PR target when a commit requests auto-pr without naming a base branch and the repo has no override of its own."
          action={
            <form
              action={saveDefaultBaseBranch}
              className="flex items-center gap-2"
            >
              <Input
                name="defaultBaseBranch"
                defaultValue={defaultBaseBranch ?? ""}
                placeholder="main"
                aria-label="Default base branch"
                className="w-40"
              />
              <Button type="submit">Save</Button>
            </form>
          }
          last
        />
      </Card>

      <h2 className="mt-8 text-sm font-medium text-danger">Danger Zone</h2>
      <Card className="mt-2">
        <Row
          title="Regenerate a repo webhook secret"
          description="Rotating a secret invalidates the webhook GitHub currently signs with. Manage per-repo secrets from the Repos page."
          action={
            <Button href="/repos" variant="danger">
              Go to Repos
            </Button>
          }
          last
        />
      </Card>
    </>
  );
}
