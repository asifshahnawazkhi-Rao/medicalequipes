import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedicalEquipes | Medical & Surgical Equipment Marketplace",
  description: "Buy and sell medical and surgical equipment from verified sellers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
