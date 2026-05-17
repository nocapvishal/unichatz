import Script from "next/script";
import "./globals.css";
import { Inter } from "next/font/google";
import MixpanelInit from "@/components/MixpanelInit";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Unichatz",
  description: "The private social layer of Pondicherry University",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.className} flex flex-col min-h-screen antialiased bg-[#F7F5F0] text-[#2C2C2A]`}
      >

        {/* Mixpanel */}
        <MixpanelInit />

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-80LJLPY7JD"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-80LJLPY7JD');
          `}
        </Script>

        {/* page content */}
        <div className="flex-1 relative">
          {children}
        </div>

        {/* Footer */}
        <Footer />

      </body>
    </html>
  );
}