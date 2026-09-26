"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, ChevronDown, MessageCircle } from "lucide-react";
export function Feedback() {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setStatus("");
    const form = e.currentTarget;
    const data = new FormData(form);
    const category = String(data.get("category") ?? "New game"),
      message = String(data.get("message") ?? ""),
      name = String(data.get("name") ?? ""),
      email = String(data.get("email") ?? "");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, name, email, website: "" }),
      });
      if (!response.ok) throw new Error("fallback");
      setStatus("Thanks — your idea is safely in our inbox.");
      form.reset();
    } catch {
      const subject = encodeURIComponent(`[MindBop feedback] ${category}`);
      const body = encodeURIComponent(
        `Category: ${category}\nFrom: ${name || "Anonymous"}\nReply email: ${email || "Not provided"}\n\n${message}`,
      );
      window.location.href = `mailto:pranavv736@gmail.com?subject=${subject}&body=${body}`;
      setStatus("Your email app is opening with the message filled in.");
    } finally {
      setSending(false);
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
        <label>
          What’s on your mind?
          <span className="select-shell">
            <select name="category">
              <option>New game</option>
              <option>Bug report</option>
              <option>Improvement</option>
              <option>Just saying hi</option>
            </select>
            <ChevronDown size={17} />
          </span>
        </label>
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
        <p className="form-note" role="status">
          {status ||
            "Delivered privately to Pranav. Email fallback is used until Supabase is connected."}
        </p>
        <button className="button button-primary" disabled={sending}>
          {sending ? "Sending…" : "Send your idea"}
          <ArrowUpRight size={17} />
        </button>
      </form>
    </section>
  );
}
