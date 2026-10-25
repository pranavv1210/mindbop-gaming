"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { Modal } from "./modal";

export function PostGameFeedback({
  matchId,
  gameName,
  playerName,
}: {
  matchId: string;
  gameName: string;
  playerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  function dismiss() {
    sessionStorage.setItem(`mindbop-rated-${matchId}`, "skipped");
    setOpen(false);
  }
  async function submit() {
    if (!rating) return;
    setSending(true);
    const message = `Post-game rating: ${rating}/5\nGame: ${gameName}\nMatch: ${matchId}\n${note || "No written comment."}`;
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "Improvement",
          message,
          name: playerName,
          email: "",
          website: "",
        }),
      });
      if (!response.ok) throw new Error("fallback");
      sessionStorage.setItem(`mindbop-rated-${matchId}`, String(rating));
      setStatus("Thanks — your rating was sent to Pranav.");
      setTimeout(() => setOpen(false), 900);
    } catch {
      const subject = encodeURIComponent(`[MindBop rating] ${gameName} — ${rating}/5`);
      const body = encodeURIComponent(message);
      window.location.href = `mailto:pranavv736@gmail.com?subject=${subject}&body=${body}`;
      sessionStorage.setItem(`mindbop-rated-${matchId}`, String(rating));
      setStatus("Your mail app is opening with the rating filled in.");
    } finally {
      setSending(false);
    }
  }
  if (!open) return null;
  return (
    <Modal
      title="How was that round?"
      description={`Rate ${gameName}. Your feedback goes privately to Pranav and helps improve the next match.`}
      close={dismiss}
    >
      <div className="rating-stars" role="radiogroup" aria-label="Game rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            className={value <= rating ? "selected" : ""}
            onClick={() => setRating(value)}
          >
            <Star aria-hidden="true" />
          </button>
        ))}
      </div>
      <label>
        Anything we should improve? <span>(optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={800}
          rows={3}
          placeholder="Tell us what felt great or frustrating…"
        />
      </label>
      {status && <p className="form-note" role="status">{status}</p>}
      <div className="room-actions">
        <button className="button button-outline" onClick={dismiss}>Not now</button>
        <button className="button button-primary" disabled={!rating || sending} onClick={() => void submit()}>
          {sending ? "Sending…" : "Send rating"}
        </button>
      </div>
    </Modal>
  );
}
