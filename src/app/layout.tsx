import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
