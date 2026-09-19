"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "./brand";
export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav
          className={open ? "nav open" : "nav"}
          aria-label="Main navigation"
          id="main-nav"
        >
          {[
            ["Games", "#games"],
            ["How it works", "#how-it-works"],
            ["About", "#about"],
            ["Feedback", "#feedback"],
          ].map(([label, href]) => (
            <a href={href} key={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
        <Link className="button button-dark header-cta" href="/play">
          Let’s play <ArrowUpRight size={17} />
        </Link>
        <button
          className="icon-button menu-button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
