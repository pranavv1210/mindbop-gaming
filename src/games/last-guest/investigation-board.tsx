"use client";
import { useState } from "react";
import type { LastGuestView, LastGuestAction } from "./types";
import { suspects, methods, motives } from "./types";
import type { Player } from "@/lib/protocol";
export type Act = (action: LastGuestAction) => Promise<boolean>;
export function EvidenceBoard({
  game,
  act,
  busy,
}: {
  game: LastGuestView;
  act: Act;
  busy: boolean;
}) {
  return (
    <div className="investigation-content">
      <div className="panel-heading">
        <h2>Shared evidence</h2>
        <span>{game.evidence.length}/9 found</span>
      </div>
      <p>
        Every discovery is shared with your group. Compare the records, not just
        the stories.
      </p>
      {!game.evidence.length && (
        <div className="case-empty">
          Your board is empty. Walk to a gold marker and inspect an object.
        </div>
      )}
      {game.evidence.map((e) => (
        <details
          className="evidence-card"
          key={e.id}
          data-testid={`evidence-${e.id}`}
        >
          <summary>
            <span>{e.name}</span>
            <small>
              {e.location} · {e.type}
            </small>
          </summary>
          <p>{e.description}</p>
        </details>
      ))}
      <h3>Connect two clues</h3>
      <p>
        Look for records that corroborate each other: time with time, access
        with motive.
      </p>
      <form
        className="case-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          await act({
            type: "connect",
            first: String(data.get("first")),
            second: String(data.get("second")),
          });
        }}
      >
        <label>
          First clue
          <select name="first" required defaultValue="">
            <option value="" disabled>
              Choose evidence
            </option>
            {game.evidence.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Second clue
          <select name="second" required defaultValue="">
            <option value="" disabled>
              Compare with…
            </option>
            {game.evidence.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button-primary"
          disabled={busy || game.evidence.length < 2}
        >
          Connect evidence
        </button>
      </form>
      {game.connections.map((c) => (
        <article className="deduction-card" key={c.id}>
          <strong>✓ {c.name}</strong>
          <p>{c.description}</p>
        </article>
      ))}
      <h3>Interview notes</h3>
      {!game.interviews.length && (
        <p>Talk to the three suspects. Their statements will appear here.</p>
      )}
      {game.interviews.map((i) => (
        <details className="evidence-card" key={i.id}>
          <summary>
            {suspects.find((s) => s.id === i.suspect)?.name}
            <small>{i.topic}</small>
          </summary>
          <p>{i.text}</p>
        </details>
      ))}
    </div>
  );
}
export function AccusationPanel({
  game,
  act,
  busy,
  players,
  id,
}: {
  game: LastGuestView;
  act: Act;
  busy: boolean;
  players: Player[];
  id: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const proposal = game.proposal;
  return (
    <div className="investigation-content">
      <h2>Build your case</h2>
      <p>
        {game.readyToAccuse
          ? "Your group has enough evidence to make a supported accusation. Everyone connected must agree."
          : "Keep investigating. The key evidence, two connections, and three follow-up interviews are required before accusing anyone."}
      </p>
      <div className="case-checklist">
        <span>
          {
            game.evidence.filter((e) =>
              ["body", "ledger", "clock", "breaker", "key"].includes(e.id),
            ).length
          }
          /5 key clues
        </span>
        <span>{game.connections.length}/2 connections</span>
        <span>
          {
            game.interviews.filter((i) =>
              ["mara:accounts", "june:witness", "eli:timing"].includes(i.id),
            ).length
          }
          /3 follow-up interviews
        </span>
      </div>
      {proposal ? (
        <div className="proposal" data-testid="case-proposal">
          <h3>A theory is on the table</h3>
          <dl>
            <dt>Accused</dt>
            <dd>
              {suspects.find((s) => s.id === proposal.theory.suspect)?.name}
            </dd>
            <dt>Method</dt>
            <dd>
              {methods.find((m) => m.id === proposal.theory.method)?.name}
            </dd>
            <dt>Motive</dt>
            <dd>
              {motives.find((m) => m.id === proposal.theory.motive)?.name}
            </dd>
          </dl>
          <p>
            Supported by{" "}
            {proposal.theory.evidence
              .map((id) => game.evidence.find((e) => e.id === id)?.name)
              .join(", ")}
            .
          </p>
          <p>
            {
              proposal.votes.filter((id) =>
                players.some((p) => p.id === id && p.connected),
              ).length
            }
            /{players.filter((p) => p.connected).length} connected investigators
            agree.
          </p>
          <button
            className="button button-primary"
            disabled={busy || players.filter((p) => p.connected).length < 2}
            onClick={() =>
              void act({ type: "vote", proposalId: proposal.id, agree: true })
            }
          >
            {proposal.votes.includes(id)
              ? "Confirm agreement"
              : "Agree and submit case"}
          </button>
          <button
            className="button button-outline"
            disabled={busy}
            onClick={() =>
              void act({ type: "vote", proposalId: proposal.id, agree: false })
            }
          >
            Reopen discussion
          </button>
        </div>
      ) : (
        <form
          className="case-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            await act({
              type: "propose",
              theory: {
                suspect: String(data.get("suspect")),
                method: String(data.get("method")),
                motive: String(data.get("motive")),
                evidence: selected,
              },
            });
          }}
        >
          <label>
            Who killed Adrian?
            <select name="suspect" required defaultValue="">
              <option value="" disabled>
                Choose a suspect
              </option>
              {suspects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            How was he killed?
            <select name="method" required defaultValue="">
              <option value="" disabled>
                Choose the method
              </option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Why?
            <select name="motive" required defaultValue="">
              <option value="" disabled>
                Choose the motive
              </option>
              {motives.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Cite at least three clues</legend>
            <p>Support the method, motive, and opportunity.</p>
            {game.evidence.map((e) => (
              <label className="evidence-check" key={e.id}>
                <input
                  type="checkbox"
                  value={e.id}
                  checked={selected.includes(e.id)}
                  onChange={(event) =>
                    setSelected((old) =>
                      event.target.checked
                        ? [...old, e.id]
                        : old.filter((id) => id !== e.id),
                    )
                  }
                />
                {e.name}
              </label>
            ))}
          </fieldset>
          <button
            className="button button-primary"
            disabled={busy || !game.readyToAccuse || selected.length < 3}
          >
            Propose accusation
          </button>
          <p className="case-caption">
            This is a group decision. A proposal alone does not end the case.
          </p>
        </form>
      )}
    </div>
  );
}
export function TeamNotes({
  game,
  players,
  act,
  busy,
}: {
  game: LastGuestView;
  players: Player[];
  act: Act;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <div className="investigation-content">
      <h2>Compare notes</h2>
      <p>
        Use this shared notebook to coordinate with your group. Voice chat is
        not included in this milestone.
      </p>
      <ul className="team-roster">
        {players.map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong>
            <span>{p.connected ? "Connected" : "Reconnecting"}</span>
          </li>
        ))}
      </ul>
      <div className="team-notes" aria-live="polite">
        {game.notes.length ? (
          game.notes.map((n) => (
            <article key={n.id}>
              <strong>
                {players.find((p) => p.id === n.by)?.name ??
                  "Departed investigator"}
              </strong>
              <p>{n.text}</p>
            </article>
          ))
        ) : (
          <p>No notes yet. Tell your group where you’re investigating.</p>
        )}
      </div>
      <form
        className="case-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act({ type: "note", text })) setText("");
        }}
      >
        <label>
          Message to your group
          <textarea
            required
            minLength={1}
            maxLength={180}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="I’ll check the study. Can someone inspect the clock?"
          />
        </label>
        <button
          className="button button-primary"
          disabled={busy || !text.trim()}
        >
          Share note
        </button>
      </form>
    </div>
  );
}
