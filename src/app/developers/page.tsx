import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Code2,
  FileCheck2,
  Gamepad2,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";

export const metadata: Metadata = {
  title: "Publish a game",
  description:
    "Technical and licensing requirements for publishing a multiplayer browser game on MindBop.",
};

const routes = [
  {
    icon: Gamepad2,
    title: "MindBop original",
    text: "A game designed for MindBop rooms, identity, invites, reconnects, and shared results.",
  },
  {
    icon: Code2,
    title: "Licensed web game",
    text: "A browser-ready game supplied by its owner under a written distribution agreement.",
  },
  {
    icon: FileCheck2,
    title: "Open-source game",
    text: "A project whose license allows commercial hosting, modification, attribution, and ad-supported distribution.",
  },
];

export default function Developers() {
  return (
    <main id="main" className="developer-page">
      <header className="developer-nav container">
        <Brand />
        <Link href="/" className="text-link">
          <ArrowLeft size={17} /> Back to MindBop
        </Link>
      </header>

      <section className="developer-hero container">
        <div>
          <span className="section-kicker">
            <ShieldCheck size={17} /> Publish responsibly
          </span>
          <h1>Bring your game to the group chat.</h1>
          <p>
            MindBop is building a curated shelf of browser multiplayer games. We
            can integrate games we create, games submitted by their owners, and
            open-source projects whose licenses allow commercial hosting.
          </p>
          <a
            className="button button-primary button-large"
            href="mailto:pranavv736@gmail.com?subject=Game%20submission%20for%20MindBop"
          >
            Email a game submission <ArrowUpRight size={19} />
          </a>
          <small>
            Include a private build link when the game is not public yet. Never
            email passwords or signing keys.
          </small>
        </div>
        <div className="developer-brief">
          <strong>Start with this information</strong>
          <span>
            <Check size={17} /> Playable URL or private build
          </span>
          <span>
            <Check size={17} /> Source repository and technology
          </span>
          <span>
            <Check size={17} /> Proof that you own or can license it
          </span>
          <span>
            <Check size={17} /> Player count and mobile requirements
          </span>
          <span>
            <Check size={17} /> Hosting, analytics, and revenue expectations
          </span>
        </div>
      </section>

      <section
        className="developer-routes container"
        aria-labelledby="routes-title"
      >
        <div className="section-heading">
          <div>
            <span className="section-kicker">Three valid routes</span>
            <h2 id="routes-title">How a game can join the shelf.</h2>
          </div>
        </div>
        <div>
          {routes.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon size={25} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="developer-requirements container">
        <div>
          <h2>Technical fit</h2>
          <ul>
            <li>Loads over HTTPS in current mobile and desktop browsers.</li>
            <li>Responsive controls and a clear low-performance mode.</li>
            <li>
              No client-trusted scores, positions, purchases, or room access.
            </li>
            <li>
              Documented build, asset origins, data collection, and
              dependencies.
            </li>
            <li>Works as an isolated route or an approved sandboxed embed.</li>
          </ul>
        </div>
        <div>
          <h2>Rights and business fit</h2>
          <ul>
            <li>Written permission for commercial hosting and promotion.</li>
            <li>
              Rights to every image, font, sound, character, and trademark.
            </li>
            <li>
              A revenue-share or fixed-license agreement before ads appear.
            </li>
            <li>
              A privacy review for analytics, accounts, chat, and advertising.
            </li>
            <li>Removal and update terms agreed with the developer.</li>
          </ul>
        </div>
      </section>

      <section className="developer-warning container">
        <strong>Do not send a game copied from another website.</strong>
        <p>
          A public URL or iframe that technically loads is not permission to
          republish it. MindBop needs the source owner’s approval or a
          compatible license before integration.
        </p>
      </section>
    </main>
  );
}
