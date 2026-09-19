"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, ChevronDown, MessageCircle } from "lucide-react";

export function Feedback() {
  const [opening, setOpening] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOpening(true);
    const data = new FormData(e.currentTarget);
    const category = String(data.get("category") ?? "Feedback");
    const message = String(data.get("message") ?? "");
    const name = String(data.get("name") ?? "") || "Anonymous";
    const email = String(data.get("email") ?? "") || "Not provided";
    const subject = encodeURIComponent(`[MindBop feedback] ${category}`);
    const body = encodeURIComponent(`Category: ${category}\nFrom: ${name}\nReply email: ${email}\n\n${message}`);
    window.location.href = `mailto:pranavv736@gmail.com?subject=${subject}&body=${body}`;
    window.setTimeout(() => setOpening(false), 800);
  }
  return (
    <section id="feedback" className="feedback-section container">
      <div className="feedback-copy">
        <span className="section-icon"><MessageCircle size={25} /></span>
        <h2>Good games start<br />with your ideas.</h2>
        <p>Got a wild game idea? Found something weird? We’re building MindBop for your kind of fun. Help shape what comes next.</p>
        <span className="handwritten">The suggestion box is all yours. ↗</span>
      </div>
      <form className="feedback-form" onSubmit={submit}>
        <label>What’s on your mind?<span className="select-shell"><select name="category"><option>New game</option><option>Bug report</option><option>Improvement</option><option>Just saying hi</option></select><ChevronDown size={17} /></span></label>
        <label>Your idea<textarea name="message" placeholder="Okay, hear me out…" required minLength={10} maxLength={2000} rows={4} /></label>
        <div className="form-row">
          <label>Name <span>(optional)</span><input name="name" placeholder="Your nickname" maxLength={24} /></label>
          <label>Email <span>(optional)</span><input name="email" type="email" placeholder="you@example.com" maxLength={254} /></label>
        </div>
        <p className="form-note">Opens your email app with everything filled in and addressed to Pranav.</p>
        <button className="button button-primary" disabled={opening}>{opening ? "Opening email…" : "Email your idea"}<ArrowUpRight size={17} /></button>
      </form>
    </section>
  );
}
