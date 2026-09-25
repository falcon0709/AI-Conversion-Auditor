import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display-loaded",
});

const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body-loaded",
});

export const metadata: Metadata = {
  title: "Leakline — Free AI Website Conversion Auditor",
  description:
    "Enter your website URL and get a free AI audit of where your site loses customers — plus improved copy you can use today.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <div className="shell">
          {children}
          <footer className="site-footer">
            Leakline · Free conversion audits for small businesses
          </footer>
        </div>
      </body>
    </html>
  );
}
