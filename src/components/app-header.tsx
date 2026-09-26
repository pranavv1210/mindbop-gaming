"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, LockKeyhole, Mail } from "lucide-react";
import { Brand } from "./brand";
import { Avatar } from "./art";
import { Modal } from "./modal";
import { useGame } from "./game-provider";
import { useAccount } from "./account-provider";
export function AppHeader() {
  const { guest, updateGuest } = useGame();
  const account = useAccount();
  const [edit, setEdit] = useState(false);
  const [avatar, setAvatar] = useState(0);
  const [accountMessage, setAccountMessage] = useState("");
  return (
    <>
      <header className="app-header">
        <div className="container header-inner">
          <div className="app-header-left">
            <Brand />
            <Link href="/play" className="hub-nav">
              The game hub
            </Link>
          </div>
          {guest && (
            <button
              className="profile-button"
              onClick={() => {
                setAvatar(guest.avatar);
                setEdit(true);
              }}
              aria-label="Edit your profile"
            >
              <Avatar index={guest.avatar} />
              <span>{guest.name}</span>
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      </header>
      {edit && guest && (
        <Modal
          title="Make yourself at home."
          description="Pick a face and a name your friends will recognize."
          close={() => setEdit(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(
                new FormData(e.currentTarget).get("name"),
              ).trim();
              if (!name) return;
              updateGuest({ name, avatar });
              void account.saveProfile({ name, avatar });
              setEdit(false);
            }}
          >
            <label>
              Display name
              <input
                name="name"
                defaultValue={guest.name}
                required
                maxLength={24}
                pattern=".*\S.*"
                autoComplete="nickname"
              />
            </label>
            <label>Your game face</label>
            <div className="avatar-options">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <button
                  type="button"
                  key={i}
                  className={`avatar-option ${i === avatar ? "selected" : ""}`}
                  aria-label={`Avatar ${i + 1}`}
                  aria-pressed={i === avatar}
                  onClick={() => setAvatar(i)}
                >
                  <Avatar index={i} />
                </button>
              ))}
            </div>
            <p className="form-note">
              {account.configured
                ? account.user?.is_anonymous
                  ? "Playing as a guest. Secure your profile to keep it across devices and join global rankings."
                  : `Profile secured${account.profile?.is_ranked ? " and globally ranked" : ""}.`
                : "Local mode: add Supabase keys to sync this profile across devices."}
            </p>
            <button className="button button-primary">Save profile</button>
          </form>
          {account.configured && account.user?.is_anonymous && (
            <div className="account-connect">
              <div>
                <LockKeyhole size={18} />
                <strong>Keep your progress forever</strong>
              </div>
              <button
                className="button button-outline"
                onClick={() => void account.connectGoogle()}
              >
                Continue with Google
              </button>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    setAccountMessage(
                      await account.connectEmail(
                        String(new FormData(e.currentTarget).get("email")),
                      ),
                    );
                  } catch (error) {
                    setAccountMessage(
                      error instanceof Error
                        ? error.message
                        : "Could not connect email.",
                    );
                  }
                }}
              >
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                  />
                </label>
                <button className="button button-outline">
                  <Mail size={16} /> Secure with email
                </button>
              </form>
              {accountMessage && (
                <p className="form-note" role="status">
                  {accountMessage}
                </p>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
