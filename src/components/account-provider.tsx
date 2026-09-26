"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase-browser";
import { readGuest, type Guest } from "@/lib/storage";

type Profile = Guest & {
  id: string;
  is_ranked: boolean;
  xp: number;
  rank_score: number;
};
type Account = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  accessToken: string;
  saveProfile: (guest: Guest) => Promise<void>;
  connectGoogle: () => Promise<void>;
  connectEmail: (email: string) => Promise<string>;
  markTutorial: (gameId: string, skipped: boolean) => Promise<void>;
};
const AccountContext = createContext<Account | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const [loading, setLoading] = useState(Boolean(supabase));
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accessToken, setAccessToken] = useState("");
  useEffect(() => {
    if (!supabase) return;
    const db = supabase;
    let live = true;
    async function boot() {
      let { data } = await db.auth.getSession();
      if (!data.session) {
        const signed = await db.auth.signInAnonymously();
        data = { session: signed.data.session };
      }
      const current = data.session?.user ?? null;
      if (!live) return;
      setUser(current);
      setAccessToken(data.session?.access_token ?? "");
      if (current) {
        const guest = readGuest();
        await db
          .from("profiles")
          .upsert(
            { id: current.id, display_name: guest.name, avatar: guest.avatar },
            { onConflict: "id", ignoreDuplicates: true },
          );
        const result = await db
          .from("profiles")
          .select("id,display_name,avatar,is_ranked,xp,rank_score")
          .eq("id", current.id)
          .single();
        if (result.data && live)
          setProfile({
            id: result.data.id,
            name: result.data.display_name,
            avatar: result.data.avatar,
            is_ranked: result.data.is_ranked,
            xp: result.data.xp,
            rank_score: result.data.rank_score,
          });
      }
      if (live) setLoading(false);
    }
    void boot();
    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAccessToken(session?.access_token ?? "");
    });
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);
  async function saveProfile(guest: Guest) {
    if (!supabase || !user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: guest.name, avatar: guest.avatar })
      .eq("id", user.id);
    if (error) throw error;
    setProfile((p) => (p ? { ...p, ...guest } : null));
  }
  async function connectGoogle() {
    if (!supabase) return;
    const callback = `${window.location.origin}/play`;
    if (user?.is_anonymous)
      await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: callback },
      });
    else
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback },
      });
  }
  async function connectEmail(email: string) {
    if (!supabase) return "Supabase is not connected.";
    const { error } = user?.is_anonymous
      ? await supabase.auth.updateUser({ email })
      : await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/play` },
        });
    if (error) throw error;
    return "Check your email to secure this profile.";
  }
  async function markTutorial(gameId: string, skipped: boolean) {
    localStorage.setItem(`mindbop_tutorial_${gameId}`, "seen");
    if (supabase && user)
      await supabase.from("tutorial_progress").upsert({
        profile_id: user.id,
        game_id: gameId,
        completed: !skipped,
        skipped,
      });
  }
  return (
    <AccountContext.Provider
      value={{
        configured: Boolean(supabase),
        loading,
        user,
        profile,
        accessToken,
        saveProfile,
        connectGoogle,
        connectEmail,
        markTutorial,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("AccountProvider is missing");
  return value;
}
