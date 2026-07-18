import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ApolloWrapper } from "@/lib/apollo/ApolloWrapper";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Shopi Admin",
    template: "%s · Shopi Admin",
  },
  description: "Admin dashboard for the Shopi social commerce platform",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Apply the persisted theme before first paint to avoid a light flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=JSON.parse(localStorage.getItem("shopi-admin-theme"));if(t&&t.state&&t.state.theme==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
        <ApolloWrapper>
          {children}
          <Toaster richColors position="top-right" />
        </ApolloWrapper>
      </body>
    </html>
  );
}
