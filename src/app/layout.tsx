import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flora - Garden Design",
  description: "A beautiful garden design application",
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
