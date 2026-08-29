import type { Metadata } from "next";
import { Fraunces, Outfit, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const ibm = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm",
});

export const metadata: Metadata = {
  title: "Pay Me · 朋友圈货币",
  description: "给朋友用的 Pay Me 货币：命令栏转账、实时兑换、拍卖和客服。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${fraunces.variable} ${outfit.variable} ${ibm.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
