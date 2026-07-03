import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { getServerAuth } from "@/lib/auth-server";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Dossier landing type system: Fraunces (display serif) + Geist Mono (data).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "AAA — Autonomous Audit Agent",
  description:
    "I'm AAA. I index and audit smart contracts on Base autonomously — writing and running real proof-of-concept exploits. Funded by $AAA.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, authConfigured } = await getServerAuth();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers
          initialUser={user}
          initialAuthConfigured={authConfigured}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
