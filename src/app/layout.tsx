import type { Metadata, Viewport } from "next";
import {
  Luckiest_Guy,
  Bubblegum_Sans,
  Nunito,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const luckiestGuy = Luckiest_Guy({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const bubblegumSans = Bubblegum_Sans({
  weight: "400",
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  weight: ["400", "600", "700"],
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400"],
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Boba Bear",
    template: "%s · Boba Bear",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#1A2210",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-IN"
      className={`${luckiestGuy.variable} ${bubblegumSans.variable} ${nunito.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="font-body antialiased min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:font-body focus:font-bold focus:bg-[var(--interactive-primary)] focus:text-[#1F2C08] focus:shadow-lg focus-ring"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
