import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/progress-bar";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


// All pages require auth/env vars at runtime — skip static prerendering
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OfekTech Portal",
  description: "פורטל מאיץ עופקטק",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <ProgressBar />
        {children}
      </body>
    </html>
  );
}
