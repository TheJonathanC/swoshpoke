import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Texas Hold 'em Poker",
  description: "3D Texas Hold 'em Poker game built with Next.js and Three.js",
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
