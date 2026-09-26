"use client";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { Modal } from "./modal";
import { useAccount } from "./account-provider";
export function GameTutorial({
  gameId,
  gameName,
  steps,
}: {
  gameId: string;
  gameName: string;
  steps: string[];
}) {
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!localStorage.getItem(`mindbop_tutorial_${gameId}`)) {
      const timer = window.setTimeout(() => setOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [gameId]);
  async function finish(skipped: boolean) {
    await account.markTutorial(gameId, skipped);
    setOpen(false);
    setStep(0);
  }
  return (
    <>
      <button className="text-link tutorial-link" onClick={() => setOpen(true)}>
        <BookOpen size={16} /> How to play
      </button>
      {open && (
        <Modal
          title={`Learn ${gameName}`}
          description={`A ${steps.length}-step warm-up before your first match.`}
          close={() => void finish(true)}
        >
          <div className="tutorial-progress">
            {steps.map((_, i) => (
              <i key={i} className={i <= step ? "active" : ""} />
            ))}
          </div>
          <div className="tutorial-step">
            <small>
              STEP {step + 1} OF {steps.length}
            </small>
            <h3>{steps[step]}</h3>
            <p>
              You can reopen this guide from the lobby whenever you need a
              refresher.
            </p>
          </div>
          <div className="tutorial-actions">
            <button
              className="button button-outline"
              onClick={() => void finish(true)}
            >
              Skip tutorial
            </button>
            <button
              className="button button-primary"
              onClick={() =>
                step === steps.length - 1
                  ? void finish(false)
                  : setStep(step + 1)
              }
            >
              {step === steps.length - 1 ? "Got it — let’s play" : "Next step"}
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
