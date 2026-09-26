"use client";
import Image from "next/image";
import { useState } from "react";
export function GameCover({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="cover-fallback">
      {title}
      <small>Cover unavailable · the game is still accessible</small>
    </div>
  ) : (
    <Image
      src={src}
      alt={`${title} game cover`}
      fill
      sizes="(max-width: 600px) 100vw, 480px"
      onError={() => setFailed(true)}
    />
  );
}
