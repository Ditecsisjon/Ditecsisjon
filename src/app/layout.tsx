import type { Metadata } from "next";
import "./globals.css";
import { LeadsProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Ditec Inkorg – Sisjön",
  description:
    "Överblick över inkommande mejl, offertförfrågningar och bokningar med smart uppföljning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <LeadsProvider>
          <div className="flex h-screen overflow-hidden">
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </LeadsProvider>
      </body>
    </html>
  );
}
