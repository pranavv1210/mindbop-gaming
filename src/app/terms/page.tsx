import Link from "next/link";
import { Brand } from "@/components/brand";
export default function Terms() {
  return (
    <main id="main" className="container legal-page">
      <Brand />
      <h1 style={{ marginTop: 40 }}>A little housekeeping.</h1>
      <p className="legal-notice">
        MindBop is a development preview. Final terms of service have not been
        published. This is a product-status notice, not a legal agreement.
      </p>
      <p>
        This preview is for trying the game with your friends. Features may
        change, and rooms and scores can disappear when the server restarts.
        There are no purchases, paid prizes, or account requirements.
      </p>
      <p>
        Play kindly, choose appropriate nicknames, and don’t share sensitive
        information. Before a public launch, we’ll publish reviewed terms and a
        complete privacy policy.
      </p>
      <Link className="button button-primary" href="/">
        Back to MindBop
      </Link>
    </main>
  );
}
