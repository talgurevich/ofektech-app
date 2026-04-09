import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/progress-bar";
import { SidebarWrapper } from "@/components/sidebar-wrapper";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// All pages require auth/env vars at runtime — skip static prerendering
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OfekTech Portal",
  description: "פורטל מאיץ אופקטק — יזמות, חדשנות וטכנולוגיה",
  openGraph: {
    title: "OfekTech Portal",
    description: "פורטל מאיץ אופקטק — יזמות, חדשנות וטכנולוגיה",
    siteName: "אופקטק — OfekTech",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-[#f4f6f9] text-gray-900 antialiased">
        <ProgressBar />
        <SidebarWrapper>{children}</SidebarWrapper>
      </body>
    </html>
  );
}
