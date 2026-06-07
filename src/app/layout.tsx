import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talk To Me — AI Language Tutor",
  description: "Practice languages with a conversational AI tutor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
