import type { Metadata } from "next";
import "./globals.css";

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
