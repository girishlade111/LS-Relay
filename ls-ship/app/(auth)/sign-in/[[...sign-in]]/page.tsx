import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Sign in - LS-Ship",
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <SignIn />
    </main>
  );
}
