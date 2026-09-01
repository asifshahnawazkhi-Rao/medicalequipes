import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.medicalequipes.com"),
  title: {
    default: "MedicalEquipes | Medical Equipment Marketplace Pakistan",
    template: "%s | MedicalEquipes",
  },
  description: "Buy and sell new and used medical, surgical and laboratory equipment from sellers across Pakistan.",
  applicationName: "MedicalEquipes",
  alternates: { canonical: "/" },
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

