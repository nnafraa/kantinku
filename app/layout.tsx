import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import Navbar from "@/components/Navbar";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "KantinKu",
  description: "Pesan makanan kantin, ambil tanpa antre",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <RegisterSW />
        <CartProvider>
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
