import type { Metadata } from "next";

import AppShell from "@/components/layout/AppShell";

import "./globals.scss";

export const metadata: Metadata = {
  title: {
    default: "Artha — Personal Finance",
    template: "%s | Artha",
  },
  description:
    "Artha is a personal finance and expense management application.",
  applicationName: "Artha",
  keywords: [
    "Artha",
    "personal finance",
    "expense management",
    "money management",
    "budget tracking",
  ],
  icons: {
    icon: "/logo/artha-logo.svg",
    shortcut: "/logo/artha-logo.svg",
    apple: "/logo/artha-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}