"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, CheckCircle2, MessageCircle } from "lucide-react";
export function Feedback() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/feedback", { signal: AbortSignal.timeout(8000) })
      .then((r) => r.json())
      .then((d) => setAvailable(d.available === true))
      .catch(() => setAvailable(false));
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        signal: AbortSignal.timeout(12000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus("success");
      form.reset();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not send feedback. Try again.",
      );
      setStatus("error");
    }
  }
  return (
    <section id="feedback" className="feedback-section container">
      <div className="feedback-copy">
        <span className="section-icon">
          <MessageCircle size={25} />
        </span>
        <h2>
          Good games start
          <br />
          with your ideas.
        </h2>
        <p>
          Got a wild game idea? Found something weird? We’re building MindBop
          for your kind of fun. Help shape what comes next.
        </p>
        <span className="handwritten">The suggestion box is all yours. ↗</span>
      </div>
      <form className="feedback-form" onSubmit={submit}>
        <div className="form-row">
          <label>
            What’s on your mind?
            <select name="category">
              <option>New game</option>
              <option>Bug report</option>
              <option>Improvement</option>
              <option>Just saying hi</option>
            </select>
          </label>
        </div>
        <label>
          Your idea
          <textarea
            name="message"
            placeholder="Okay, hear me out…"
            required
            minLength={10}
            maxLength={2000}
            rows={4}
          />
        </label>
        <div className="form-row">
          <label>
            Name <span>(optional)</span>
            <input name="name" placeholder="Your nickname" maxLength={24} />
          </label>
          <label>
            Email <span>(optional)</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              maxLength={254}
            />
          </label>
        </div>
        <input
          name="website"
          className="honeypot"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <div aria-live="polite">
          {available === false && (
            <p className="form-note">
              Our feedback inbox isn’t connected yet. Sending is unavailable for
              now.
            </p>
          )}
          {status === "success" && (
            <p className="success-message">
              <CheckCircle2 size={17} /> Your idea landed. Thanks for helping
              shape MindBop!
            </p>
          )}
          {status === "error" && (
            <p className="error-message" role="alert">
              {message}
            </p>
          )}
        </div>
        <button
          className="button button-primary"
          disabled={!available || status === "sending"}
        >
          {status === "sending"
            ? "Sending…"
            : available === null
              ? "Checking inbox…"
              : "Send your idea"}
          <ArrowUpRight size={17} />
        </button>
      </form>
    </section>
  );
}
