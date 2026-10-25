"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Link2, Gamepad2, Check, Play } from "lucide-react";
import { useGame } from "@/components/game-provider";
import { RoomPlayers } from "@/components/room-players";
import { LastGuestGame } from "@/games/last-guest/last-guest-game";
import { FourRowGame } from "@/games/four-row/four-row-game";
import { WordChainGame } from "@/games/word-chain/word-chain-game";
import { QuizRushGame } from "@/games/quiz-rush/quiz-rush-game";
import { DrawGame } from "@/games/draw/draw-game";
import { MafiaGame } from "@/games/mafia/mafia-game";
import { TwoTruthsGame } from "@/games/two-truths/two-truths-game";
import { SkyScrambleGame } from "@/games/sky-scramble/sky-game";
import { ComedyGame } from "@/games/comedy-chaos/comedy-game";
import type { ComedySettings } from "@/games/comedy-chaos/types";
import type { DrawSettings } from "@/games/draw/types";
import { games } from "@/lib/games";
import { Modal } from "@/components/modal";
import type { Command } from "@/lib/protocol";
import { GameTutorial } from "@/components/game-tutorial";
import { PostGameFeedback } from "@/components/post-game-feedback";
import { GameFullscreen } from "@/components/game-fullscreen";
import { ArenaGame } from "@/games/arena/arena-game";
export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const {
    room,
    id,
    guest,
    connected,
    initialized,
    connectionError,
    retry,
    send,
  } = useGame();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  async function act(command: Command) {
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await send(command);
    setBusy(false);
    if (!result.ok) setError(result.error);
    else if (command.type === "leave") router.push("/play");
  }
  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast(message);
    } catch {
      setToast("Copy is unavailable. Select and copy the room code above.");
    }
  }
  if (!initialized)
    return (
      <main id="main" className="loading-page">
        <span className="loader" />
        Getting the room ready…
      </main>
    );
  if (!room || room.code !== code.toUpperCase())
    return (
      <main id="main" className="container app-main">
        <div className="room-panel">
          <h1>
            {room
              ? "You’re already in another room."
              : "Your crew is one click away."}
          </h1>
          <p>
            {room
              ? "Return to your current room and leave it before joining another."
              : `Join room ${code.toUpperCase()} as ${guest?.name ?? "a guest"}.`}
          </p>
          {connectionError && (
            <p className="notice">
              {connectionError} <button onClick={retry}>Reconnect</button>
            </p>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="room-actions">
            {room ? (
              <Link
                className="button button-primary"
                href={`/play/room/${room.code}`}
              >
                Return to room
              </Link>
            ) : (
              <button
                className="button button-primary"
                disabled={!guest || !connected || busy}
                onClick={() =>
                  guest &&
                  void act({ type: "join", code: code.toUpperCase(), ...guest })
                }
              >
                {busy ? "Joining…" : "Join this room"}
              </button>
            )}
            <Link className="button button-outline" href="/play">
              Go to game hub
            </Link>
          </div>
        </div>
      </main>
    );
  const player = room.players.find((p) => p.id === id);
  const host = room.hostId === id;
  const canStart =
    room.players.length >=
      (games.find((game) => game.id === room.gameId)?.min ?? 2) &&
    room.players.every((p) => p.ready && p.connected);
  const gameInfo = games.find((game) => game.id === room.gameId);
  const rules =
    room.gameId === "comedy-chaos"
      ? [
          "Read the prompt and secretly write one funny answer.",
          "Answers are shuffled and anonymous; perform one aloud if enabled.",
          "Vote for the funniest answer and optionally spend your one Double Down.",
          "Guess who wrote an answer, then watch the authors and points reveal.",
        ]
      : room.gameId === "sky-scramble"
        ? [
            "Reach the glowing finish arch before qualification fills.",
            "Use WASD or arrows to move and Space to jump; touch controls appear on mobile.",
            "Falling returns you to your latest checkpoint.",
            "Qualify through each shrinking round to become the final winner.",
          ]
        : room.gameId === "mafia"
          ? [
              "Your secret role is visible only to you.",
              "At night, special roles choose private actions.",
              "By day, discuss and vote to eliminate a suspect.",
              "Town wins by removing every Mafia member; Mafia wins at parity.",
            ]
          : room.gameId === "two-truths"
            ? [
                "On your turn, write three different statements and secretly mark the lie.",
                "Everyone discusses the stories without seeing the answer.",
                "Lock one vote for the statement you think is false.",
                "Correct guesses and convincing bluffs earn points.",
              ]
            : room.gameId === "mindbop-arena"
              ? [
                  "Click the arena to lock the pointer; press Esc whenever you want to release it.",
                  "Use WASD to move, Shift to sprint, Space to jump, and the mouse to look.",
                  "Click to fire the Phase 1 pulse-rifle feedback at the training dummy.",
                  "Movement is owned by the server and synchronized with every player in this room.",
                ]
            : room.gameId === "mindbop-draw"
              ? [
                  "The artist picks one of three fresh words.",
                  "Draw with color, brush, or eraser—no letters or clues.",
                  "Guess in chat; faster correct answers earn more points.",
                  "Everyone draws once per round. Highest score wins.",
                ]
              : room.gameId === "word-chain"
                ? [
                    "Use one real word with letters only.",
                    "Start with the final letter of the previous word.",
                    "Never repeat a word in the same round.",
                    "The first player to five valid words wins.",
                  ]
                : room.gameId === "quiz-rush"
                  ? [
                      "Every match has five surprise questions.",
                      "Choose one answer and lock it in.",
                      "The round moves on when everyone has answered.",
                      "The highest score after five questions wins.",
                    ]
                  : [
                      "Drop one disc into any open column on your turn.",
                      "Discs fall to the lowest available space.",
                      "Connect four horizontally, vertically, or diagonally.",
                      "Block threats early—one missed move can end the round.",
                    ];
  return (
    <main id="main" className="container app-main room-viewport">
      <div className="room-topline">
        <button
          className="text-link plain-button"
          onClick={() => setConfirmLeave(true)}
        >
          <ArrowLeft size={16} />
          Leave room
        </button>
        <span className={`connection ${connected ? "" : "offline"}`}>
          <i />
          {connected ? "You’re connected" : "Reconnecting…"}
        </span>
      </div>
      {connectionError && (
        <div className="notice" role="status">
          {connectionError}{" "}
          <button className="plain-button text-link" onClick={retry}>
            Reconnect
          </button>
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div id="active-game" className={room.phase === "waiting" ? "room-layout" : "active-game-slot"}>
        {room.phase !== "waiting" && <GameFullscreen targetId="active-game" />}
        {room.phase === "waiting" ? (
          <section className="room-panel">
            <span className="room-eyebrow">
              <Gamepad2 size={16} />
              {gameInfo?.name} lobby
            </span>
            <h1>Your game room is ready.</h1>
            <p>
              Invite your people, share the code, and start when everyone is
              ready.
            </p>
            <div className="invite-box">
              <div>
                <small>Your private room code</small>
                <div className="room-code" data-testid="room-code">
                  {room.code}
                </div>
              </div>
              <div className="invite-actions">
                <button
                  className="icon-button"
                  aria-label="Copy room code"
                  onClick={() => void copy(room.code, "Room code copied!")}
                >
                  <Copy size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Copy invite link"
                  onClick={() =>
                    void copy(
                      `${window.location.origin}/play?join=${room.code}`,
                      "Invite link copied. Send it to your crew!",
                    )
                  }
                >
                  <Link2 size={18} />
                </button>
              </div>
            </div>
            <p className="toast" role="status">
              {toast}
            </p>
            <div className="rules">
              <div className="rules-heading">
                <h3>How to play {gameInfo?.name}</h3>
                <GameTutorial
                  gameId={room.gameId}
                  gameName={gameInfo?.name ?? "this game"}
                  steps={rules}
                />
              </div>
              <ol>
                {rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ol>
              <p className="players-note">
                Live multiplayer match. Turns and scores are verified by the
                server, and short disconnects keep your seat reserved.
              </p>
            </div>
            {host &&
              room.gameId === "mindbop-draw" &&
              room.settings &&
              (() => {
                const drawSettings = room.settings as DrawSettings;
                return (
                  <div className="draw-settings">
                    <h3>Game settings</h3>
                    <label>
                      Rounds
                      <select
                        value={drawSettings.rounds}
                        onChange={(e) =>
                          void act({
                            type: "configure",
                            settings: {
                              ...drawSettings,
                              rounds: +e.target.value,
                            },
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Drawing time
                      <select
                        value={drawSettings.drawTime}
                        onChange={(e) =>
                          void act({
                            type: "configure",
                            settings: {
                              ...drawSettings,
                              drawTime: +e.target.value,
                            },
                          })
                        }
                      >
                        {[30, 45, 60, 80, 90, 120].map((v) => (
                          <option key={v} value={v}>
                            {v} sec
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Word choice
                      <select
                        value={drawSettings.chooseTime}
                        onChange={(e) =>
                          void act({
                            type: "configure",
                            settings: {
                              ...drawSettings,
                              chooseTime: +e.target.value,
                            },
                          })
                        }
                      >
                        {[10, 15, 20, 30].map((v) => (
                          <option key={v} value={v}>
                            {v} sec
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Word difficulty
                      <select
                        aria-label="Word difficulty"
                        value={drawSettings.difficulty}
                        onChange={(e) =>
                          void act({
                            type: "configure",
                            settings: {
                              ...drawSettings,
                              difficulty: e.target
                                .value as DrawSettings["difficulty"],
                            },
                          })
                        }
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </label>
                    <label>
                      Players
                      <select
                        value={drawSettings.maxPlayers}
                        onChange={(e) =>
                          void act({
                            type: "configure",
                            settings: {
                              ...drawSettings,
                              maxPlayers: +e.target.value,
                            },
                          })
                        }
                      >
                        {[2, 3, 4, 5, 6, 7, 8].map((v) => (
                          <option key={v} value={v}>
                            Up to {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })()}
            {host &&
              room.gameId === "comedy-chaos" &&
              room.settings &&
              (() => {
                const settings = room.settings as ComedySettings;
                const update = (next: Partial<ComedySettings>) =>
                  void act({
                    type: "configure",
                    settings: { ...settings, ...next },
                  });
                return (
                  <div className="comedy-settings">
                    <h3>Game settings</h3>
                    <label>
                      Rounds
                      <select
                        value={settings.rounds}
                        onChange={(event) =>
                          update({
                            rounds: +event.target
                              .value as ComedySettings["rounds"],
                          })
                        }
                      >
                        {[3, 5, 7, 10].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Answer time
                      <select
                        value={settings.answerTime}
                        onChange={(event) =>
                          update({
                            answerTime: +event.target
                              .value as ComedySettings["answerTime"],
                          })
                        }
                      >
                        {[20, 30, 45, 60].map((value) => (
                          <option key={value} value={value}>
                            {value} sec
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Voting time
                      <select
                        value={settings.votingTime}
                        onChange={(event) =>
                          update({
                            votingTime: +event.target
                              .value as ComedySettings["votingTime"],
                          })
                        }
                      >
                        {[10, 15, 20, 30].map((value) => (
                          <option key={value} value={value}>
                            {value} sec
                          </option>
                        ))}
                      </select>
                    </label>
                    {[
                      ["Double Down", "doubleDown"],
                      ["Author guessing", "authorGuessing"],
                      ["Performance mode", "performanceMode"],
                    ].map(([label, key]) => (
                      <label className="setting-switch" key={key}>
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(
                            settings[key as keyof ComedySettings],
                          )}
                          onChange={(event) =>
                            update({ [key]: event.target.checked })
                          }
                        />
                      </label>
                    ))}
                  </div>
                );
              })()}
            <div className="room-actions">
              <button
                className={`button ready-toggle ${player?.ready ? "is-ready" : "button-primary"}`}
                aria-pressed={Boolean(player?.ready)}
                disabled={busy || !connected}
                onClick={() =>
                  void act({ type: "ready", ready: !player?.ready })
                }
              >
                <Check size={17} />
                {player?.ready ? "Ready — you’re in!" : "I’m ready"}
              </button>
              {host && (
                <button
                  className="button button-dark"
                  disabled={busy || !connected || !canStart}
                  onClick={() => void act({ type: "start" })}
                >
                  <Play size={16} />
                  {busy ? "Starting…" : "Start game"}
                </button>
              )}
            </div>
            <p className="players-note">
              {room.players.length < (gameInfo?.min ?? 2)
                ? `${gameInfo?.name ?? "This game"} needs at least ${gameInfo?.min ?? 2} players. Invite ${(gameInfo?.min ?? 2) - room.players.length} more to start.`
                : !canStart
                  ? "Waiting for everyone to get ready…"
                  : host
                    ? "Everyone’s ready. Let’s do this."
                    : "Everyone’s ready. Your host can start the game."}
            </p>
          </section>
        ) : room.game?.kind === "mindbop-arena" ? (
          <ArenaGame room={room} leave={() => void act({ type: "leave" })} />
        ) : room.game?.kind === "comedy-chaos" ? (
          <ComedyGame
            key={room.game.runId}
            room={room}
            leave={() => void act({ type: "leave" })}
            rematch={() => void act({ type: "rematch" })}
          />
        ) : room.game?.kind === "sky-scramble" ? (
          <SkyScrambleGame
            key={room.game.runId}
            room={room}
            leave={() => void act({ type: "leave" })}
            rematch={() => void act({ type: "rematch" })}
          />
        ) : room.game?.kind === "mafia" ? (
          <MafiaGame
            key={room.game.runId}
            room={room}
            leave={() => void act({ type: "leave" })}
            rematch={() => void act({ type: "rematch" })}
          />
        ) : room.game?.kind === "two-truths" ? (
          <TwoTruthsGame
            key={room.game.runId}
            room={room}
            leave={() => void act({ type: "leave" })}
            rematch={() => void act({ type: "rematch" })}
          />
        ) : room.game?.kind === "mindbop-draw" ? (
          <DrawGame
            key={room.game.runId}
            room={
              room as import("@/lib/protocol").RoomView<
                import("@/games/draw/types").DrawView
              >
            }
            leave={() => void act({ type: "leave" })}
            rematch={() => void act({ type: "rematch" })}
          />
        ) : room.game?.kind === "four-row" ? (
          <FourRowGame
            key={room.game.runId}
            room={room}
            leave={() => void act({ type: "leave" })}
            rematch={() => void act({ type: "rematch" })}
          />
        ) : room.game?.kind === "word-chain" ? (
          <WordChainGame
            key={room.game.runId}
            room={room}
            leave={() => void act({ type: "leave" })}
            rematch={() => void act({ type: "rematch" })}
          />
        ) : room.game?.kind === "quiz-rush" ? (
          <QuizRushGame
            key={room.game.runId}
            room={room}
            leave={() => void act({ type: "leave" })}
            rematch={() => void act({ type: "rematch" })}
          />
        ) : (
          <LastGuestGame
            key={room.game!.runId}
            room={room}
            leave={() => void act({ type: "leave" })}
            rematch={() => void act({ type: "rematch" })}
          />
        )}
        {room.phase === "waiting" && <RoomPlayers room={room} id={id} />}
      </div>
      {confirmLeave && (
        <Modal
          title="Heading out?"
          description="You’ll leave this room. If you’re hosting, a connected player takes over. You can rejoin while the room is waiting."
          close={() => setConfirmLeave(false)}
        >
          <div className="room-actions">
            <button
              className="button button-outline"
              onClick={() => setConfirmLeave(false)}
            >
              Keep playing
            </button>
            <button
              className="button button-primary"
              disabled={busy || !connected}
              onClick={() => {
                setConfirmLeave(false);
                void act({ type: "leave" });
              }}
            >
              Leave room
            </button>
          </div>
        </Modal>
      )}
      {room.phase === "completed" && room.game && player && (
        <PostGameFeedback
          matchId={room.game.runId}
          gameName={gameInfo?.name ?? "MindBop"}
          playerName={player.name}
        />
      )}
    </main>
  );
}
