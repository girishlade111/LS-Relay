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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
