import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Study Buddy",
  description: "From getting into university, to succeeding in it, to participating as a citizen.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
