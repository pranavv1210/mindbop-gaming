"use client";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Avatar } from "./art";
import { getSupabase } from "@/lib/supabase-browser";
type Row = {
  id: string;
  display_name: string;
  avatar: number;
  xp: number;
  rank_score: number;
  global_rank: number;
};
export function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const configured = Boolean(getSupabase());
  useEffect(() => {
    const db = getSupabase();
    if (!db) return;
    void db
      .from("global_leaderboard")
      .select("*")
      .limit(10)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);
  return (
    <section className="leaderboard" aria-labelledby="leaderboard-title">
      <div className="section-title">
        <div>
          <span className="room-eyebrow">
            <Trophy size={15} /> GLOBAL RANKING
          </span>
          <h2 id="leaderboard-title">The MindBop top ten</h2>
        </div>
        <p>Guests can watch. Secure profiles earn a rank.</p>
      </div>
      {rows.length ? (
        <div className="leaderboard-list">
          {rows.map((row) => (
            <div key={row.id} className="leader-row">
              <strong>#{row.global_rank}</strong>
              <Avatar index={row.avatar} />
              <span>{row.display_name}</span>
              <small>
                {row.rank_score} rating · {row.xp} XP
              </small>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>
            {configured
              ? "The first champion could be you."
              : "Global rankings activate with Supabase."}
          </strong>
          {configured
            ? "Complete a match after securing your profile to enter the board."
            : "Local games still work while the database is disconnected."}
        </div>
      )}
    </section>
  );
}
