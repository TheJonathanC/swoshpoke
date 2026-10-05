import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swoshpoke",
  description: "Swoshpoke - 3D Texas Hold 'em Poker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#05070a] text-white overflow-hidden m-0 p-0 w-screen h-screen">
        {children}
      </body>
    </html>
  );
}
