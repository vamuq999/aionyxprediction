export const metadata = {
  title: "AIONYX Prediction",
  description: "AI-assisted crypto market outlook",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
