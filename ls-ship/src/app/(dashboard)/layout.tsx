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

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (email) {
    await ensureUserSynced(userId, email);
  }

  return <div className="min-h-screen bg-bg">{children}</div>;
}
