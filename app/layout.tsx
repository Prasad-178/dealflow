import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "DealFlow AI - Autonomous Business Development Agent",
  description:
    "Multi-agent AI system for autonomous business development with HITL approval workflows",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased selection:bg-primary/30">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
