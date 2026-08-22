import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserSynced } from "@/lib/db/queries";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // We mirror Clerk's user into our own `users` table because `integrations`,
  // `repos`, and `webhookEvents` all carry a foreign key to it. Webhook
  // processing happens on GitHub's request — outside any Clerk session — and
  // must resolve ownership with a local DB lookup instead of calling Clerk's
  // API per webhook event.
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress;

  if (email) {
    await ensureUserSynced(userId, email);
  }

  return <div>{children}</div>;
}
