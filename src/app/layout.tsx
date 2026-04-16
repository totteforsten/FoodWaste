import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Ferry Food Waste Tracker",
  description:
    "Food & beverage waste tracking and KPI platform for ferry operators — kitchen, buffet, plate, and crew waste, per voyage, per outlet, per vessel.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
