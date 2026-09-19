import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Globe2,
  MousePointer2,
  PartyPopper,
  Link2,
  Sparkles,
  Zap,
} from "lucide-react";
import { Header } from "@/components/header";
import { Brand } from "@/components/brand";
import { Avatar, GameArt } from "@/components/art";
import { GameCard } from "@/components/game-card";
import { Feedback } from "@/components/feedback";
import { games } from "@/lib/games";
export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="hero container">
          <div className="hero-copy">
            <div className="hero-note">
              <span className="tiny-spark">✦</span> A good time, just a link
              away
            </div>
            <h1>
              Your friends.
              <br />
              Your games.
              <br />
              <span className="chaos-word">
                Total chaos.
                <svg viewBox="0 0 420 20" fill="none" aria-hidden="true">
                  <path
                    d="M4 13C110 2 310 2 414 9M46 18c110-8 245-9 331-4"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p>
              Big brain moves. Questionable decisions. Unforgettable party
              moments. Get your people together and let the games begin.
            </p>
            <div className="hero-actions">
              <Link href="/play" className="button button-primary button-large">
                Let’s play <ArrowUpRight size={21} />
              </Link>
              <a href="#games" className="button button-outline button-large">
                Explore games <ArrowRight size={18} />
              </a>
            </div>
            <div className="hero-perks">
              <span>
                <Check />
                No downloads
              </span>
              <span>
                <Check />
                No sign-ups
              </span>
              <span>
                <Check />
                Just good company
              </span>
            </div>
          </div>
          <div
            className="hero-visual"
            aria-label="Illustration of MindBop games"
          >
            <div className="hero-halo" />
            <span className="hero-doodle doodle-one">✳</span>
            <div className="hero-game hero-game-back">
              <GameArt kind="cards" />
              <span>Trust nobody.</span>
              <strong>Bluff Club</strong>
              <small>Coming soon</small>
            </div>
            <div className="hero-game hero-game-main">
              <div className="hero-game-top">
                <span>
                  <Zap size={14} /> Mind games
                </span>
                <span>↗</span>
              </div>
              <GameArt kind="brain" hero />
              <div className="hero-game-bottom">
                <strong>Brainwave</strong>
                <span>Small questions. Big plot twists.</span>
                <div>
                  <span>2–8 players</span>
                  <span>
                    Let’s think fast <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            </div>
            <div className="crew-sticker">
              <div className="avatar-stack">
                <Avatar index={0} small />
                <Avatar index={1} small />
                <Avatar index={2} small />
              </div>
              <div>
                <strong>Better with your people.</strong>
                <span>You bring the crew. We bring the games.</span>
              </div>
            </div>
            <span className="hero-doodle doodle-two">✧</span>
            <div className="wild-sticker">
              a little brainpower.
              <br />
              <strong>a lot of madness.</strong>
            </div>
          </div>
        </section>
        <div className="marquee" aria-hidden="true">
          <div>
            <span>Good friends</span>
            <i>✦</i>
            <span>Great games</span>
            <i>✦</i>
            <span>Unexpected betrayals</span>
            <i>✦</i>
            <span>One more round?</span>
            <i>✦</i>
            <span>Good friends</span>
            <i>✦</i>
          </div>
        </div>
        <section className="games-section container" id="games">
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                <Sparkles size={16} /> Pick your kind of chaos
              </span>
              <h2>Game night starts here.</h2>
            </div>
            <Link href="/play" className="text-link">
              Explore the game hub <ArrowUpRight size={18} />
            </Link>
          </div>
          <p className="section-intro">
            A brain teaser today. A convincing lie tomorrow. There’s more fun on
            the way.
          </p>
          <div className="game-grid">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
        <section className="how-section" id="how-it-works">
          <div className="container">
            <div className="section-heading centered">
              <span className="section-kicker">
                Less setting up. More showing off.
              </span>
              <h2>From “hey” to “one more round.”</h2>
              <p>
                No complicated rules to get started. Just bring your favorite
                humans.
              </p>
            </div>
            <div className="steps">
              {[
                {
                  icon: MousePointer2,
                  title: "Pick your game",
                  text: "A little logic? A little chaos? Find your group’s next obsession.",
                },
                {
                  icon: PartyPopper,
                  title: "Make some room",
                  text: "Create a private room. You’re the host, so set the pace.",
                },
                {
                  icon: Link2,
                  title: "Send the invite",
                  text: "Share your room link. Friends hop in from any browser.",
                },
                {
                  icon: Zap,
                  title: "Let it get competitive",
                  text: "Think fast, laugh a little too loud, and hit rematch.",
                },
              ].map((step, i) => (
                <article className="step" key={step.title}>
                  <div className={`step-icon step-${i}`}>
                    <step.icon size={27} />
                    <span>{i + 1}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="social-section container" id="about">
          <div className="social-visual" aria-hidden="true">
            <div className="social-orbit" />
            <div className="social-center">
              <span>
                your kind
                <br />
                of people.
              </span>
              <Sparkles />
            </div>
            <div className="social-avatar social-a">
              <Avatar index={0} />
            </div>
            <div className="social-avatar social-b">
              <Avatar index={1} />
            </div>
            <div className="social-avatar social-c">
              <Avatar index={3} />
            </div>
            <div className="social-avatar social-d">
              <Avatar index={2} />
            </div>
            <span className="social-chat chat-a">one more round?</span>
            <span className="social-chat chat-b">you’re going down 😏</span>
          </div>
          <div className="social-copy">
            <span className="section-kicker">
              <Globe2 size={17} /> Different places. Same good time.
            </span>
            <h2>
              A little closer.
              <br />A lot more competitive.
            </h2>
            <p>
              For the group chat that never makes plans. The team that needs a
              break. The family with a very competitive aunt.
            </p>
            <p>
              Across the table or across time zones, there’s always room for
              your people.
            </p>
            <div className="audience-tags">
              <span>Friends</span>
              <span>Teammates</span>
              <span>Family</span>
              <span>Your internet crew</span>
            </div>
            <Link href="/play" className="text-link">
              Bring everyone together <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
        <Feedback />
        <section className="final-cta container">
          <span className="cta-spark" aria-hidden="true">
            ✳
          </span>
          <div>
            <h2>
              Your next “one more round”
              <br />
              starts right here.
            </h2>
            <p>No plans needed. Just a few good friends.</p>
          </div>
          <Link className="button button-light button-large" href="/play">
            Enter MindBop <ArrowUpRight size={20} />
          </Link>
        </section>
      </main>
      <footer className="footer container">
        <div className="footer-top">
          <div>
            <Brand />
            <p>A little brainpower. A lot of madness.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="#games">Games</a>
            <a href="#how-it-works">How it works</a>
            <a href="#feedback">Feedback</a>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} MindBop</span>
          <span>
            Think fast. Play wild. <span className="footer-spark">✦</span>
          </span>
        </div>
      </footer>
    </>
  );
}
