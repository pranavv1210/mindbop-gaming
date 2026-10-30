import { RotateCw, Smartphone } from "lucide-react";

export function MobileLandscapeGate({ game }: { game: string }) {
  return (
    <div className="mobile-landscape-gate" role="status" aria-live="polite">
      <div className="mobile-landscape-phone" aria-hidden="true">
        <Smartphone />
        <RotateCw />
      </div>
      <strong>Rotate your phone</strong>
      <p>{game} uses landscape mode so every control fits on your screen.</p>
      <small>Turn your phone sideways to continue automatically.</small>
    </div>
  );
}
