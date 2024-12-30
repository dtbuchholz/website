import "./global.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { headers } from "next/headers";

import Footer from "./components/footer";
import { Navbar } from "./components/nav";
import { baseUrl } from "./sitemap";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Dan Buchholz",
    template: "%s | Dan Buchholz",
  },
  description: "Website and blog of Dan Buchholz",
  openGraph: {
    title: "Dan Buchholz",
    description: "Website and blog of Dan Buchholz",
    url: baseUrl,
    siteName: "Dan Buchholz",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: `${baseUrl}/og`,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const cx = (...classes: string[]) => classes.filter(Boolean).join(" ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get("x-nonce");
  return (
    <html
      lang="en"
      className={cx(
        "h-full w-full dark:text-white dark:bg-black",
        GeistSans.variable,
        GeistMono.variable
      )}
    >
      <head>
        <script nonce={nonce || ""} />
      </head>
      <body className="h-full w-full flex flex-col">
        <main className="flex flex-col flex-1 w-full max-w-3xl mt-8 mx-auto px-4 md:px-0">
          <Navbar />
          {children}
          <Footer />
          <Analytics />
          <SpeedInsights />
        </main>
      </body>
    </html>
  );
}
