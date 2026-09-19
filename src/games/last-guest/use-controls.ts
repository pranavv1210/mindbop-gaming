"use client";
import { useCallback, useEffect, useRef } from "react";
export function useControls(
  enabled: boolean,
  move: (x: number, z: number) => void,
  interact: () => void,
) {
  const held = useRef(new Set<string>());
  const callback = useRef({ move, interact });
  useEffect(() => {
    callback.current = { move, interact };
  }, [move, interact]);
  const send = useCallback(() => {
    const keys = held.current;
    const x = Number(keys.has("right")) - Number(keys.has("left"));
    const z = Number(keys.has("down")) - Number(keys.has("up"));
    callback.current.move(x, z);
  }, []);
  const stop = useCallback(() => {
    held.current.clear();
    callback.current.move(0, 0);
  }, []);
  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    const directions: Record<string, string> = {
      w: "up",
      arrowup: "up",
      s: "down",
      arrowdown: "down",
      a: "left",
      arrowleft: "left",
      d: "right",
      arrowright: "right",
    };
    const editable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(
        target.closest(
          'input,textarea,select,[role="dialog"],[contenteditable="true"]',
        ),
      );
    const down = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      const key = e.key.toLowerCase();
      if (directions[key]) {
        e.preventDefault();
        held.current.add(directions[key]);
        send();
      }
      if (key === "e" && !e.repeat) callback.current.interact();
    };
    const up = (e: KeyboardEvent) => {
      const direction = directions[e.key.toLowerCase()];
      if (direction) {
        held.current.delete(direction);
        send();
      }
    };
    const hidden = () => {
      if (document.hidden) stop();
    };
    const focus = (e: FocusEvent) => {
      if (editable(e.target)) stop();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("focusin", focus);
    const timer = setInterval(() => {
      if (held.current.size) send();
    }, 100);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("focusin", focus);
      stop();
    };
  }, [enabled, send, stop]);
  return {
    press: (direction: string) => {
      if (enabled) {
        held.current.add(direction);
        send();
      }
    },
    release: (direction: string) => {
      held.current.delete(direction);
      send();
    },
    stop,
  };
}
