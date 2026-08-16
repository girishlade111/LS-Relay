import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ls-ship",
  description: "GitHub to Notion/Jira/Slack sync tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: [],
        variables: {
          colorBackground: "#0d0d0d",
          colorPrimary: "#e07856",
          colorText: "#e8e8e8",
        },
      }}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
