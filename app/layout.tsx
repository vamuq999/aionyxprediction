import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIONYX · Living Predictive NFT",
  description: "A living interface for predictive NFTs and evolving intelligence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
