"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Search,
  Plus,
  DoorOpen,
  Gamepad2,
  History,
  X,
  ChevronDown,
} from "lucide-react";
import { useGame } from "@/components/game-provider";
import { GameCard } from "@/components/game-card";
import { Modal } from "@/components/modal";
import { games, categories } from "@/lib/games";
import { readRecent, type Recent } from "@/lib/storage";
import { Leaderboard } from "@/components/leaderboard";
import { useAccount } from "@/components/account-provider";
import { getSupabase } from "@/lib/supabase-browser";
export default function Hub() {
  const account = useAccount();
  const { guest, room, connected, initialized, connectionError, retry, send } =
    useGame();
  const router = useRouter();
  const [modal, setModal] = useState<"create" | "join" | null>(null);
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All games");
  const [sort, setSort] = useState("featured");
  const [selectedGame, setSelectedGame] = useState("four-row");
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
    } else if (
      games.some(
        (game) => game.id === params.get("game") && game.status === "playable",
      )
    ) {
      setSelectedGame(params.get("game")!);
      setModal("create");
    }
  }, []);
  useEffect(() => {
    const db = getSupabase();
    if (!db || !account.user) return;
    void db
      .from("match_players")
      .select("match_id,result,matches(game_id,completed_at)")
      .eq("profile_id", account.user.id)
      .order("match_id", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (!data?.length) return;
        const cloud = data.map((row) => {
          const match = (
            Array.isArray(row.matches) ? row.matches[0] : row.matches
          ) as { game_id: string; completed_at: string };
          return {
            gameId: match.game_id,
            outcome: row.result[0].toUpperCase() + row.result.slice(1),
            playedAt: new Date(match.completed_at).getTime(),
            matchId: row.match_id,
          };
        });
        setRecent(cloud);
      });
  }, [account.user]);
  useEffect(() => {
    if (room) router.replace(`/play/room/${room.code}`);
  }, [room, router]);
  function open(kind: "create" | "join") {
    setError("");
    setModal(kind);
  }
  function openGame(gameId: string) {
    setSelectedGame(gameId);
    open("create");
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!guest || busy) return;
    setBusy(true);
    setError("");
    const result = await send(
      modal === "create"
        ? {
            type: "create",
            ...guest,
            gameId: selectedGame,
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
              ? `What are we playing, ${guest.name}?`
              : "Pick a game. Bring your people."}
          </h1>
          <p>Private multiplayer rooms for friends, wherever they are.</p>
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
          <h2>Your group is the main event.</h2>
          <p>Create a private room or enter the code a friend sent you.</p>
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
          <h2 id="library-title">Browse the game shelf.</h2>
          <label className="search-field">
            <span className="search-icon">
              <Search size={18} />
            </span>
            <span className="search-copy">
              <small>Search the game shelf</small>
              <input
                aria-label="Search games"
                placeholder="Find a game…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </span>
            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
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
          <label className="sort-shell">
            <span>Sort by</span>
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
            <ChevronDown size={16} />
          </label>
        </div>
        {filtered.length ? (
          <div className="game-grid hub-grid catalog-grid">
            {filtered.map((g) => (
              <GameCard key={g.id} game={g} onPlay={() => openGame(g.id)} />
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
        <h2>Recently played</h2>
        {recent.length ? (
          recent.map((r) => (
            <div className="recent-row" key={r.matchId}>
              <History size={21} />
              <div>
                <strong>
                  {games.find((g) => g.id === r.gameId)?.name ?? "Game"}
                </strong>
                <p>
                  {r.outcome} · {new Date(r.playedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                className="button button-outline"
                onClick={() => openGame(r.gameId)}
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
      <Leaderboard />
      {modal && (
        <Modal
          title={
            modal === "create" ? "Your room. Your people." : "Got an invite?"
          }
          description={
            modal === "create"
              ? "Create a private match and invite a friend with the room code."
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
                  <Gamepad2 size={32} />
                  <div>
                    <strong>
                      {games.find((game) => game.id === selectedGame)?.name}
                    </strong>
                    <p>2 players · Live private match</p>
                  </div>
                </div>
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
