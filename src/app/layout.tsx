import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talk To Me — AI Language Tutor",
  description: "Practice English, Swedish, Farsi, or Spanish with a conversational AI tutor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
