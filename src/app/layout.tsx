import type { Metadata } from "next";
import "@fontsource/plus-jakarta-sans/latin-400.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "./globals.css";
import "@/games/last-guest/last-guest.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "MindBop — Multiplayer games for friends",
    template: "%s | MindBop",
  },
  description:
    "Create a private room and play browser multiplayer games with friends. No downloads or accounts required.",
  applicationName: "MindBop",
  keywords: [
    "multiplayer browser games",
    "games to play with friends",
    "online party games",
    "cooperative games",
    "social deduction games",
  ],
  openGraph: {
    type: "website",
    title: "MindBop — Multiplayer games for friends",
    description:
      "Private rooms, one invite link, and browser games built for groups.",
    images: ["/images/games/last-guest.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "MindBop — Multiplayer games for friends",
    description:
      "Private rooms, one invite link, and browser games built for groups.",
    images: ["/images/games/last-guest.svg"],
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
