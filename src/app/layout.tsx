import "~/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { Provider } from "jotai";
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: "Waifu.AI",
  description: "Your AI companion with personality",
  icons: {
    icon: "./static/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider>
      <html lang="en" className={`${GeistSans.variable} antialiased`}>
        <body className="min-h-screen bg-background font-sans">{children}</body>
      </html>
    </Provider>
  );
}
