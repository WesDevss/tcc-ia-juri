import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IA Juri — Verificação de jurisprudência",
  description:
    "Dashboard acadêmico: classificação supervisionada e similaridade semântica com base STJ (TCC).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} min-h-screen font-sans`}>{children}</body>
    </html>
  );
}
