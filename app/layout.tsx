import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI社团匹配平台",
  description: "智能分析你的兴趣与性格，为你推荐最适合的社团",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
