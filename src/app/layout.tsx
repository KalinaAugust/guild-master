import type { Metadata } from "next";
import "./globals.css";
import StoreProvider from "./providers/StoreProvider";

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
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
