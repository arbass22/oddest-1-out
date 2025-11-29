import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oddest1Out",
  description: "A new word game challenging you to find the ultimate outlier!",
  openGraph: {
    title: "Oddest1Out",
    description: "A new word game challenging you to find the ultimate outlier!",
    type: "website",
    siteName: "Oddest1Out",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oddest1Out",
    description: "A new word game challenging you to find the ultimate outlier!",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Aleo:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XYRN4PL9QC"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XYRN4PL9QC');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
