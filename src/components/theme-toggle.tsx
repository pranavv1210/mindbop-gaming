"use client";
import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
export function ThemeToggle(){
 useEffect(()=>{const saved=localStorage.getItem("mindbop.theme");document.documentElement.dataset.theme=saved==="light"?"light":"dark"},[]);
 function toggle(){const next=document.documentElement.dataset.theme==="light"?"dark":"light";document.documentElement.dataset.theme=next;localStorage.setItem("mindbop.theme",next)}
 return <button className="theme-toggle" onClick={toggle} aria-label="Toggle color theme" title="Switch color theme"><Moon className="theme-moon"/><Sun className="theme-sun"/><span className="theme-dark-label">Dark</span><span className="theme-light-label">Light</span></button>
}
