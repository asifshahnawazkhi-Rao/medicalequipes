import type { Metadata, Viewport } from "next";
import "./globals.css";
import OfflineIndicator from "./components/OfflineIndicator";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

export const viewport: Viewport = {
  themeColor: "#087f8c",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.medicalequipes.com"),
  title: {
    default: "MedicalEquipes | Medical Equipment Marketplace Pakistan",
    template: "%s | MedicalEquipes",
  },
  description:
    "Buy and sell new and used medical, surgical and laboratory equipment from sellers across Pakistan.",
  applicationName: "MedicalEquipes",
  alternates: { canonical: "/" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MedEquipes",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "MedicalEquipes",
    title: "MedicalEquipes | Medical Equipment Marketplace Pakistan",
    description: "Buy and sell medical and surgical equipment across Pakistan.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "MedicalEquipes | Medical Equipment Marketplace Pakistan",
    description: "Buy and sell medical and surgical equipment across Pakistan.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        {children}
        <OfflineIndicator />
      </body>
    </html>
  );
}
