import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserSynced } from "@/lib/db/queries";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

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

  const navLinks = [
    { href: "/", label: "Overview" },
    { href: "/repos", label: "Repos" },
    { href: "/integrations", label: "Integrations" },
    { href: "/logs", label: "Logs" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Left Sidebar */}
      <aside className="flex shrink-0 w-[260px] flex-col border-r border-border">
        <div className="flex flex-col h-full px-4 py-6">
          {/* App Wordmark */}
          <h1 className="text-[22px] font-semibold text-text mb-8">LS Ship</h1>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1 flex-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[6px] px-3 py-1.5 text-[12.5px] text-text-muted hover:bg-panel-hover hover:text-text transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Clerk UserButton pinned at bottom */}
          <div className="mt-auto pt-4">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col px-8 md:px-12 py-10">
        {children}
      </main>
    </div>
  );
}
