import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { ensureUserSynced } from "@/lib/db/queries";
import { SidebarNav } from "@/components/dashboard/SidebarNav";

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

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-border px-4 py-6">
        <p className="px-2 text-h1">LS Ship</p>
        <div className="mt-10">
          <SidebarNav />
        </div>
        <div className="mt-auto pt-4">
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-10 md:px-12">{children}</main>
    </div>
  );
}
