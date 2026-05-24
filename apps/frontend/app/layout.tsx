import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoneOps",
  description: "Local-first internal developer platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
