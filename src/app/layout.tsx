import type { Metadata } from "next";
import "./globals.css";
import StoreProvider from "./providers/StoreProvider";
import { Header } from "@/widgets/header";

export const metadata: Metadata = {
  title: "Guild Master",
  description: "Guild management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="bg-blob" />
        <div className="bg-blob bg-blob-secondary" />
        <StoreProvider>
          <Header />
          <div style={{ padding: '0 2rem' }}>
            {children}
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
