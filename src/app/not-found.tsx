import Link from "next/link";
import { Brand } from "@/components/brand";
export default function NotFound() {
  return (
    <main id="main" className="container legal-page">
      <Brand />
      <h1 style={{ marginTop: 40 }}>That’s a plot twist.</h1>
      <p>We couldn’t find that page. Your next game is still waiting.</p>
      <Link href="/play" className="button button-primary">
        Go to game hub
      </Link>
    </main>
  );
}
