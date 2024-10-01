import "~/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { Provider } from "jotai";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Waifu.AI",
  icons: {
    icon: "./static/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider>
      <html className={GeistSans.variable}>
        <body>{children}</body>
      </html>
    </Provider>
  );
}