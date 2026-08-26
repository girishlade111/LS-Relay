import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import {
  getUserDefaultBaseBranch,
  updateUserDefaultBaseBranch,
} from "@/lib/db/queries";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Row } from "@/components/ui/Row";

// Git ref names forbid whitespace and the characters ~ ^ : ? * [ \; anything
// else would only surface later as a cryptic GitHub API error at PR creation.
const BRANCH_NAME_PATTERN = /^(?!-)(?!.*\.\.|@\{)[^~^:?*[\s\\]{1,200}(?<!\.)(?<!\/)$/;

async function saveDefaultBaseBranch(formData: FormData): Promise<void> {
  "use server";

  const { userId } = await auth();
  if (!userId) {
    return;
  }

  const raw = formData.get("defaultBaseBranch");
  const branch = typeof raw === "string" ? raw.trim() : "";

  if (branch && !BRANCH_NAME_PATTERN.test(branch)) {
    redirect("/settings?error=invalid_branch");
  }

  await updateUserDefaultBaseBranch(userId, branch || null);
  revalidatePath("/settings");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const defaultBaseBranch = await getUserDefaultBaseBranch(userId);
  const hasError =
    typeof searchParams.error === "string" && searchParams.error.length > 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1">Settings</h1>
        {hasError ? (
          <Badge variant="danger">
            That doesn&apos;t look like a valid Git branch name — avoid spaces
            and characters like ~ ^ : ? * [ \
          </Badge>
        ) : null}
      </div>

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
