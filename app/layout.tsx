import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const googleTagManagerId = "GTM-WFLTH5KN";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MornLark | Robots for home, work and companionship",
  description:
    "Explore robots for your home, workspace and everyday routines. Browse the MornLark collection, compare specifications and find the right fit.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Script id="google-tag-manager-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
          `}
        </Script>
        <Script
          id="google-tag-manager"
          src={`https://www.googletagmanager.com/gtm.js?id=${googleTagManagerId}`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
