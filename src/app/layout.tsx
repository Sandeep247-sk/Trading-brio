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

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Trading OS — Trading Operating System",
    template: "%s | Trading OS",
  },
  description:
    "A personal trading operating system designed to enforce trading discipline, measure strategy adherence, track performance, and improve consistency.",
  keywords: [
    "trading journal",
    "trading os",
    "trade tracker",
    "strategy adherence",
    "trading discipline",
  ],
  authors: [{ name: "Trading OS" }],
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
