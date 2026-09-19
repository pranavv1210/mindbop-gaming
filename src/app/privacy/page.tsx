import Link from "next/link";
import { Brand } from "@/components/brand";
export default function Privacy() {
  return (
    <main id="main" className="container legal-page">
      <Brand />
      <h1 style={{ marginTop: 40 }}>Privacy, in progress.</h1>
      <p className="legal-notice">
        MindBop is a development preview. A final privacy policy has not been
        published. This page describes the current implementation; it is not a
        final legal policy.
      </p>
      <h2>What this preview stores</h2>
      <p>
        Your browser stores your nickname, avatar preference, and recent
        completed games locally. An HTTP-only session cookie identifies your
        connection to the game server. Rooms, player names, positions, shared
        notes, and investigation progress stay in server memory and are lost
        when it restarts.
      </p>
      <p>
        Inactive rooms expire after an hour. Disconnected players are removed
        after two minutes. Unused sessions expire after a day. If feedback
        delivery is enabled, submitted messages and optional contact details are
        stored in the configured database.
      </p>
      <h2>Your controls</h2>
      <p>
        You can leave a room at any time. Clear this site’s browser data to
        remove local preferences, history, and the session cookie. Avoid sharing
        personal or sensitive information in nicknames or feedback.
      </p>
      <Link className="button button-primary" href="/">
        Back to MindBop
      </Link>
    </main>
  );
}
