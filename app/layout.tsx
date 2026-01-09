import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIONYX",
  description: "Living Predictive Interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
