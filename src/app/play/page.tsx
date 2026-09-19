"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Search,
  Plus,
  DoorOpen,
  Brain,
  History,
} from "lucide-react";
import { useGame } from "@/components/game-provider";
import { GameCard } from "@/components/game-card";
import { Modal } from "@/components/modal";
import { games, categories } from "@/lib/games";
import { readRecent, type Recent } from "@/lib/storage";
export default function Hub() {
  const { guest, room, connected, initialized, connectionError, retry, send } =
    useGame();
  const router = useRouter();
  const [modal, setModal] = useState<"create" | "join" | null>(null);
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All games");
  const [sort, setSort] = useState("featured");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<Recent[]>([]);
  // Browser history and saved games are external state, restored after SSR hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(readRecent());
    const params = new URLSearchParams(window.location.search);
    if (params.has("join")) {
      setCode(
        (params.get("join") ?? "")
          .toUpperCase()
          .replace(/[^A-Z2-9]/g, "")
          .slice(0, 6),
      );
      setModal("join");
    } else if (params.get("game") === "brainwave") setModal("create");
  }, []);
  useEffect(() => {
    if (room) router.replace(`/play/room/${room.code}`);
  }, [room, router]);
  function open(kind: "create" | "join") {
    setError("");
    setModal(kind);
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!guest || busy) return;
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const result = await send(
      modal === "create"
        ? {
            type: "create",
            ...guest,
            gameId: "brainwave",
            rounds: Number(data.get("rounds")),
          }
        : { type: "join", ...guest, code: code.toUpperCase() },
    );
    setBusy(false);
    if (!result.ok) setError(result.error);
    else if (result.code) {
      setModal(null);
      router.push(`/play/room/${result.code}`);
    }
  }
  const filtered = games
    .filter(
      (g) =>
        (category === "All games" || category === g.category) &&
        `${g.name} ${g.description} ${g.category}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "players"
          ? a.min - b.min
          : 0,
    );
  return (
    <main id="main" className="container app-main">
      <section className="hub-welcome">
        <div>
          <h1>
            {guest
              ? `Ready to make some moves, ${guest.name}?`
              : "Your next game night starts here."}
          </h1>
          <p>Pick a game, gather your crew, and see what happens.</p>
        </div>
        <span className={`connection ${connected ? "" : "offline"}`}>
          <i />
          {connected
            ? "Connected & ready"
            : initialized
              ? "Offline"
              : "Connecting…"}
        </span>
      </section>
      {connectionError && (
        <div className="notice" role="status">
          {connectionError}{" "}
          <button className="text-link" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      <section className="hub-banner">
        <div>
          <h2>A room full of possibilities.</h2>
          <p>One link brings everyone together. The rest is up to you.</p>
        </div>
        <div className="banner-actions">
          <button
            className="button button-primary"
            onClick={() => open("create")}
          >
            <Plus size={17} />
            Create room
          </button>
          <button
            className="button button-outline"
            onClick={() => open("join")}
          >
            <DoorOpen size={17} />
            Join room
          </button>
        </div>
      </section>
      <section aria-labelledby="library-title">
        <div className="library-heading">
          <h2 id="library-title">Find your next obsession.</h2>
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search games"
              placeholder="Find a game…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="library-tools">
          <div className="filters" aria-label="Game categories">
            {categories.map((c) => (
              <button
                className={`filter ${category === c ? "active" : ""}`}
                key={c}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <select
            className="sort-control"
            aria-label="Sort games"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="featured">Featured first</option>
            <option value="name">Name: A–Z</option>
            <option value="players">Fewest players</option>
          </select>
        </div>
        {filtered.length ? (
          <div className="game-grid hub-grid">
            {filtered.map((g) => (
              <GameCard key={g.id} game={g} onPlay={() => open("create")} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No games found.</strong>Try another search or explore all
            games.
            <br />
            <button
              className="button button-outline"
              onClick={() => {
                setSearch("");
                setCategory("All games");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      <section className="recent-section">
        <h2>One more round?</h2>
        {recent.length ? (
          recent.map((r) => (
            <div className="recent-row" key={r.matchId}>
              <History size={21} />
              <div>
                <strong>
                  {games.find((g) => g.id === r.gameId)?.name ?? "Game"}
                </strong>
                <p>
                  {r.score} points · {new Date(r.playedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                className="button button-outline"
                onClick={() => open("create")}
              >
                Play again <ArrowUpRight size={15} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <strong>Your game-night memories go here.</strong>Finish your first
            game and we’ll keep a little history in this browser.
          </div>
        )}
      </section>
      {modal && (
        <Modal
          title={
            modal === "create" ? "Your room. Your people." : "Got an invite?"
          }
          description={
            modal === "create"
              ? "Start with Brainwave, our fast-thinking logic game. Invite 1–7 friends to join you."
              : "Enter the 6-character room code from your host."
          }
          close={() => {
            if (!busy) setModal(null);
          }}
        >
          <form onSubmit={submit}>
            {modal === "create" ? (
              <>
                <div className="selected-game">
                  <Brain size={32} />
                  <div>
                    <strong>Brainwave</strong>
                    <p>2–8 players · 20 seconds per question</p>
                  </div>
                </div>
                <label>
                  Number of rounds
                  <select name="rounds" defaultValue="5">
                    <option value="3">3 rounds · a quick warm-up</option>
                    <option value="5">5 rounds · the classic</option>
                    <option value="8">8 rounds · settle the score</option>
                  </select>
                </label>
              </>
            ) : (
              <label>
                Room code
                <input
                  className="code-input"
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z2-9]/g, "")
                        .slice(0, 6),
                    )
                  }
                  required
                  minLength={6}
                  maxLength={6}
                  pattern="[A-Z2-9]{6}"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ABC123"
                />
              </label>
            )}
            <p className="form-note">
              Joining as <strong>{guest?.name ?? "…"}</strong>. You can change
              your name using your profile.
            </p>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {!connected && (
              <p className="form-note">
                Connect to the game server before continuing.
              </p>
            )}
            <button
              className="button button-primary"
              disabled={busy || !connected}
            >
              {busy
                ? "Getting your room…"
                : modal === "create"
                  ? "Create room"
                  : "Join room"}
              <ArrowUpRight size={17} />
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}
