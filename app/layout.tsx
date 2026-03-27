import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Life Manager",
  description: "Personal Tuya/Smart Life home automation manager",
};

const navItems = [
  { href: "/devices", label: "Devices", icon: "💡" },
  { href: "/scenes", label: "Scenes", icon: "🎬" },
  { href: "/automations", label: "Automations", icon: "⚡" },
  { href: "/timers", label: "Timers", icon: "⏰" },
  { href: "/mirrors", label: "Mirrors", icon: "🪞" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <QueryProvider>
          <nav className="w-56 shrink-0 border-r border-card-border bg-card p-4 flex flex-col gap-1 min-h-screen">
            <Link
              href="/"
              className="text-lg font-bold mb-4 px-3 py-2 text-foreground"
            >
              Smart Life
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:bg-background hover:text-foreground transition-colors"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
