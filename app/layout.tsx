import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import { Link } from "@nextui-org/link";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { housesList, spreadSheedId } from '@/app/lib/data';
import { cookies } from 'next/headers'

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const house = cookieStore.get('house')?.value;
  let houseLabel = "";
  let link = "https://docs.google.com/spreadsheets/d/" + spreadSheedId + "/edit";
  if (house != null && house != "") {
    const houseNumber = parseInt(house.substring(1));
    houseLabel = "Pilotvej " + houseNumber;
    link = "https://docs.google.com/spreadsheets/d/" + spreadSheedId + "/edit?gid=" + housesList().find(h => h[0] == houseNumber)?.[1];
  }

  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <div className="relative flex flex-col h-screen">
            <main className="container mx-auto max-w-7xl pt-2 px-2 flex-grow">
              {children}
            </main>
            <footer className="w-full flex items-center justify-between p-2">
              <span>{houseLabel}</span>
              <Link isExternal className="flex items-center gap-1 text-current" href={link}>
                <span>Link til Mad ark</span>
              </Link>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}