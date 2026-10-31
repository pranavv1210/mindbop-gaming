"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { RotateCw, Smartphone } from "lucide-react";

// Phones only: touch device, narrow, held upright. Desktops/laptops/tablets-in-landscape never match.
const QUERY = "(pointer: coarse) and (orientation: portrait) and (max-width: 820px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const snapshot = () => window.matchMedia(QUERY).matches;
const server = () => false;

/** True while a phone is held in portrait. */
export function useNeedsRotate() {
  return useSyncExternalStore(subscribe, snapshot, server);
}

/**
 * Wrap a landscape-only game. On a phone held upright it shows a "rotate your phone"
 * screen over the game; as soon as the phone is turned the screen disappears and play starts.
 */
export function RotateGate({ game, children }: { game: string; children: ReactNode }) {
  const blocked = useNeedsRotate();
  return (
    <>
      {children}
      {blocked && (
        <div className="rotate-gate" role="alertdialog" aria-live="assertive" aria-label="Rotate your phone to play">
          <div className="rotate-gate-phone" aria-hidden="true">
            <Smartphone size={72} strokeWidth={1.5} />
            <RotateCw size={30} />
          </div>
          <h2>Rotate your phone</h2>
          <p>{game} is played in landscape so the on-screen controls fit. Turn your phone sideways and the game starts automatically.</p>
          <small>Tip: turn off “Portrait orientation lock” if it doesn’t rotate.</small>
        </div>
      )}
    </>
  );
}
