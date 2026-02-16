import "./globals.css";
import TopNav from "./components/TopNav";
import GoogleAnalytics from "./components/GoogleAnalytics";

export const metadata = {
  title: "AlphaPanel",
  description: "Market Intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-zinc-100">
        <GoogleAnalytics />
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}