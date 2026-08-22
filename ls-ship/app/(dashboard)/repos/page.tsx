import { auth } from "@clerk/nextjs/server";
import { getReposForUser } from "@/lib/db/queries";
import { RepoList } from "@/components/repos/RepoList";

export default async function ReposPage() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const repos = await getReposForUser(userId);

  return (
    <>
      <h1 className="text-h1">Repos</h1>
      <RepoList initialRepos={repos} />
    </>
  );
}
