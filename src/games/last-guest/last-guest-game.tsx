"use client";
import { useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Search,
  Files,
  Fingerprint,
  MessagesSquare,
  MapPin,
} from "lucide-react";
import type { RoomView } from "@/lib/protocol";
import { useGame } from "@/components/game-provider";
import { HotelViewport } from "./hotel-viewport";
import { useControls } from "./use-controls";
import { hotspots, reachable, distance, areaAt } from "./world";
import {
  EvidenceBoard,
  AccusationPanel,
  TeamNotes,
  type Act,
} from "./investigation-board";
import { CaseReveal } from "./case-reveal";
import type { LastGuestAction } from "./types";
type Panel = "inspect" | "evidence" | "case" | "team";
export function LastGuestGame({
  room,
  leave,
  rematch,
}: {
  room: RoomView;
  leave: () => void;
  rematch: () => void;
}) {
  const { id, connected, send, move } = useGame();
  const game = room.game!;
  const [panel, setPanel] = useState<Panel>("inspect");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const position = game.positions[id] ?? { x: 0, z: 6 };
  const nearby = hotspots
    .filter((h) => reachable(position, h))
    .sort((a, b) => distance(position, a) - distance(position, b));
  const target = hotspots.find((h) => h.id === selected) ?? nearby[0];
  const inRange = target ? reachable(position, target) : false;
  const act: Act = async (action: LastGuestAction) => {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    const result = await send({ type: "game", action });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setNotice(
      action.type === "inspect"
        ? "Discovery shared with your group."
        : action.type === "interview"
          ? "Statement added to the shared board."
          : action.type === "connect"
            ? "Deduction added to the board."
            : action.type === "note"
              ? "Note shared."
              : "Case updated.",
    );
    return true;
  };
  const controls = useControls(
    connected && game.phase !== "briefing" && game.phase !== "reveal",
    move,
    () => {
      if (nearby[0]) {
        setSelected(nearby[0].id);
        setPanel("inspect");
        if (nearby[0].kind !== "suspect")
          void act({ type: "inspect", target: nearby[0].id });
      }
    },
  );
  if (game.phase === "reveal")
    return (
      <CaseReveal
        game={game}
        host={room.hostId === id}
        busy={busy || !connected}
        leave={leave}
        rematch={rematch}
      />
    );
  return (
    <div className="last-guest">
      <header className="case-heading">
        <div>
          <span className="case-overline">
            Halcyon Hotel · A playable early case
          </span>
          <h1>The Last Guest</h1>
        </div>
        <span className="case-phase">
          {game.phase === "briefing"
            ? "Case briefing"
            : game.phase === "deduction"
              ? "Final deduction"
              : "Investigation"}
        </span>
      </header>
      <div className="case-objective">
        <Fingerprint size={19} />
        <p>{game.objective}</p>
      </div>
      {game.phase === "briefing" ? (
        <section className="case-briefing">
          <div className="briefing-number">01</div>
          <div>
            <h2>The storm has locked you in.</h2>
            <p>
              It is 21:20. Hotel owner Adrian Vale has been found dead in his
              study. A power failure stopped the clocks, three people have
              conflicting stories, and someone is relying on you to confuse the
              blackout with the murder.
            </p>
            <p>
              You are a team of investigators. Search five connected areas,
              inspect objects, question Mara, Eli, and June, and connect what
              you find. Then agree on the killer, method, motive, and supporting
              evidence.
            </p>
            <ul>
              <li>
                Move with WASD, arrow keys, or the on-screen direction pad.
              </li>
              <li>
                Gold rings mark evidence. Violet rings mark suspects. Walk
                close, then press E or use the Inspect panel.
              </li>
              <li>The evidence board and team notebook update for everyone.</li>
            </ul>
            <p className="case-caption">
              One compact authored case. Original procedural 3D art. No time
              limit. No voice chat or saved sessions across server restarts yet.
            </p>
            {room.hostId === id ? (
              <button
                className="button button-primary"
                disabled={busy || !connected}
                onClick={() => void act({ type: "begin" })}
              >
                Begin investigation
              </button>
            ) : (
              <p>Waiting for the host to begin the investigation.</p>
            )}
          </div>
        </section>
      ) : null}
      <div className="investigation-layout">
        <div className="world-column">
          <HotelViewport
            room={room}
            id={id}
            active={panel === "inspect"}
            onPick={(target) => {
              setSelected(target);
              setPanel("inspect");
            }}
          />
          <div className="world-footer">
            <div>
              <span
                className="location-chip"
                data-testid="player-position"
                data-x={position.x}
                data-z={position.z}
              >
                <MapPin size={15} />
                {areaAt(position)}
              </span>
              <p>WASD / arrows to move · E to inspect</p>
            </div>
            <div className="direction-pad" aria-label="Movement controls">
              {[
                { key: "up", label: "Move forward", Icon: ArrowUp },
                { key: "left", label: "Move left", Icon: ArrowLeft },
                { key: "down", label: "Move back", Icon: ArrowDown },
                { key: "right", label: "Move right", Icon: ArrowRight },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  className={`direction-${key}`}
                  aria-label={label}
                  disabled={!connected || game.phase === "briefing"}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    controls.press(key);
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      // Movement remains active until pointerup or pointercancel.
                    }
                  }}
                  onPointerUp={() => controls.release(key)}
                  onPointerCancel={() => controls.release(key)}
                  onLostPointerCapture={() => controls.release(key)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      controls.press(key);
                    }
                  }}
                  onKeyUp={() => controls.release(key)}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="investigation-sidebar">
          <nav className="case-tabs" aria-label="Investigation panels">
            {(
              [
                { id: "inspect", Icon: Search, label: "Inspect" },
                { id: "evidence", Icon: Files, label: "Evidence" },
                { id: "case", Icon: Fingerprint, label: "Case" },
                { id: "team", Icon: MessagesSquare, label: "Team" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                aria-pressed={panel === t.id}
                onClick={() => {
                  controls.stop();
                  setPanel(t.id);
                }}
              >
                <t.Icon size={17} />
                {t.label}
                {t.id === "evidence" && <span>{game.evidence.length}</span>}
              </button>
            ))}
          </nav>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="case-notice" role="status">
              {notice}
            </p>
          )}
          {panel === "inspect" ? (
            <div className="investigation-content">
              <h2>Look a little closer.</h2>
              <p>
                Explore the hotel. Only objects within reach can be inspected.
              </p>
              <div className="nearby-objects" aria-label="Nearby objects">
                {nearby.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setSelected(h.id)}
                    aria-pressed={target?.id === h.id}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
              {target ? (
                <article className="inspect-target">
                  <span className="case-overline">
                    {target.kind === "suspect"
                      ? "Suspect interview"
                      : "Object inspection"}
                  </span>
                  <h3>{target.name}</h3>
                  {!inRange && (
                    <p>
                      Walk closer to interact. Find this marker in the{" "}
                      {target.area}.
                    </p>
                  )}
                  {target.kind === "suspect" ? (
                    <>
                      {(game.topics[target.id] ?? []).map((t) => (
                        <button
                          className="interview-topic"
                          key={t.id}
                          disabled={
                            !inRange ||
                            busy ||
                            !connected ||
                            game.phase === "briefing"
                          }
                          onClick={() =>
                            void act({
                              type: "interview",
                              target: target.id,
                              topic: t.id,
                            })
                          }
                        >
                          {t.done ? "✓ " : ""}
                          {t.label}
                        </button>
                      ))}
                      <p className="case-caption">
                        More questions unlock when your group discovers relevant
                        evidence.
                      </p>
                      {game.interviews
                        .filter((i) => i.suspect === target.id)
                        .map((i) => (
                          <blockquote key={i.id}>{i.text}</blockquote>
                        ))}
                    </>
                  ) : (
                    <>
                      <button
                        className="button button-primary"
                        disabled={
                          !inRange ||
                          busy ||
                          !connected ||
                          game.phase === "briefing"
                        }
                        onClick={() =>
                          void act({ type: "inspect", target: target.id })
                        }
                      >
                        {game.evidence.some((e) => e.id === target.id)
                          ? "Review object"
                          : "Inspect object"}
                      </button>
                      {game.evidence
                        .filter((e) => e.id === target.id)
                        .map((e) => (
                          <div className="discovered-object" key={e.id}>
                            <strong>{e.name}</strong>
                            <p>{e.description}</p>
                          </div>
                        ))}
                    </>
                  )}
                </article>
              ) : (
                <div className="case-empty">
                  No objects in reach. Start with the reception desk to the
                  left, or follow the red hallway runner to the study.
                </div>
              )}
            </div>
          ) : panel === "evidence" ? (
            <EvidenceBoard game={game} act={act} busy={busy || !connected} />
          ) : panel === "case" ? (
            <AccusationPanel
              game={game}
              act={act}
              busy={busy || !connected}
              players={room.players}
              id={id}
            />
          ) : (
            <TeamNotes
              game={game}
              act={act}
              busy={busy || !connected}
              players={room.players}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
