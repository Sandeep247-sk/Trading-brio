import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Trader Brio — Trading Operating System",
    template: "%s | Trader Brio",
  },
  description:
    "A personal trading operating system designed to enforce trading discipline, measure strategy adherence, track performance, and improve consistency.",
  keywords: [
    "trading journal",
    "trader brio",
    "trade tracker",
    "strategy adherence",
    "trading discipline",
  ],
  authors: [{ name: "Trader Brio" }],
  robots: "noindex, nofollow", // Private application
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${poppins.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
