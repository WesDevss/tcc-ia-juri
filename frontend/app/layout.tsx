import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-app",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "JurisCheck — Confiabilidade de jurisprudência",
  description:
    "Análise de confiabilidade de trechos jurídicos frente a padrões de referência do STJ (projeto acadêmico).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} font-sans`}>{children}</body>
    </html>
  );
}
