import { auth } from "@clerk/nextjs/server";
import { getReposForUser, listIntegrations } from "@/lib/db/queries";
import { RepoList } from "@/components/repos/RepoList";

export default async function ReposPage() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const [repos, integrations] = await Promise.all([
    getReposForUser(userId),
    listIntegrations(userId),
  ]);
  const githubConnected = integrations.some(
    (integration) => integration.provider === "github"
  );

  return (
    <>
      <h1 className="text-h1">Repos</h1>
      <RepoList initialRepos={repos} githubConnected={githubConnected} />
    </>
  );
}
