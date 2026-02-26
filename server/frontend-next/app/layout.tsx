import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { getServerAuth } from "@/lib/auth-server";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VISUALISA",
  description: "Discover newly deployed contracts across major EVM networks.",
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
        className={`${geist.variable} antialiased`}
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
