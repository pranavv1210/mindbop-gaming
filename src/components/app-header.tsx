"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Brand } from "./brand";
import { Avatar } from "./art";
import { Modal } from "./modal";
import { useGame } from "./game-provider";
export function AppHeader() {
  const { guest, updateGuest } = useGame();
  const [edit, setEdit] = useState(false);
  const [avatar, setAvatar] = useState(0);
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
              Changes apply the next time you enter a room.
            </p>
            <button className="button button-primary">Save profile</button>
          </form>
        </Modal>
      )}
    </>
  );
}
