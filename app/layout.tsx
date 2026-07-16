import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "./context/AuthContext";

export const metadata: Metadata = {
  title: "Zippy — Pickup & Drop-off Delivery",
  description: "Book a rider to pick up and drop off your package in minutes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
