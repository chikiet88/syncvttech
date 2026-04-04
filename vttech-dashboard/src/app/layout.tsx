import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/client-layout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VTTech Studio | Dashboard",
  description: "Giải pháp đồng bộ và phân tích dữ liệu tiên tiến",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
