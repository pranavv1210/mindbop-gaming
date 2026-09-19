import type { LastGuestView } from "./types";
export function CaseReveal({
  game,
  host,
  busy,
  rematch,
  leave,
}: {
  game: LastGuestView;
  host: boolean;
  busy: boolean;
  rematch: () => void;
  leave: () => void;
}) {
  const result = game.result!;
  return (
    <section className="case-reveal">
      <span className="case-overline">The Last Guest · Case file 01</span>
      <h1>
        {result.solved ? "The alibi falls apart." : "The case wasn’t proven."}
      </h1>
      <p className="reveal-lead">
        {result.solved
          ? "Your group identified the killer, method, motive, and supporting evidence."
          : "Your accusation did not establish every requirement: culprit, method, motive, and evidence of the weapon, financial motive, and access."}
      </p>
      <div className="reveal-facts">
        <div>
          <small>The killer</small>
          <strong>{result.suspect}</strong>
        </div>
        <div>
          <small>The method</small>
          <strong>{result.method}</strong>
        </div>
        <div>
          <small>The motive</small>
          <strong>{result.motive}</strong>
        </div>
      </div>
      <h2>What happened at the Halcyon</h2>
      <p>{result.explanation}</p>
      <ol className="reveal-timeline">
        {result.timeline.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      <h2>What you missed</h2>
      <p>
        {result.missed.length
          ? result.missed.join(" · ")
          : "You discovered every clue in the hotel."}
      </p>
      <p className="case-caption">
        This milestone contains one authored case. Replaying resets the
        investigation; it does not change the killer or evidence.
      </p>
      <div className="room-actions">
        {host ? (
          <button
            className="button button-primary"
            disabled={busy}
            onClick={rematch}
          >
            Return everyone to lobby
          </button>
        ) : (
          <p>Your host can restart the case.</p>
        )}
        <button
          className="button button-outline"
          disabled={busy}
          onClick={leave}
        >
          Return to game hub
        </button>
      </div>
    </section>
  );
}
