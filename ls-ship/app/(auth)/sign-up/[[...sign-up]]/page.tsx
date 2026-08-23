import { SignUp } from "@clerk/nextjs";

export const metadata = {
  title: "Sign up - LS-Ship",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <SignUp fallbackRedirectUrl="/dashboard" />
    </main>
  );
}
