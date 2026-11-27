import { useState } from "react";
import { Cloud, CloudOff, KeyRound, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase";
import type { CloudSyncStatus } from "@/lib/supabase-sync";

export function CloudSyncModal({
  open,
  status,
  onClose,
  onAuthSuccess,
  onManualSync,
}: {
  open: boolean;
  status: CloudSyncStatus;
  onClose: () => void;
  onAuthSuccess: () => Promise<void>;
  onManualSync: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (mode === "signup") {
        // If already signed in anonymously, upgrade anonymous account via updateUser
        if (status.state === "synced" && status.isAnonymous) {
          const { error } = await supabase.auth.updateUser({
            email: email.trim(),
            password,
          });
          if (error) throw error;
          setInfoMsg("Check your inbox to confirm email and upgrade your cloud account.");
          await onAuthSuccess();
        } else {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
          });
          if (error) throw error;
          if (data.session) {
            setInfoMsg("Account created & synced to Supabase.");
            await onAuthSuccess();
          } else {
            setInfoMsg("Verification email sent. Confirm your email, then sign in to sync.");
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setInfoMsg("Signed in and synced with Supabase.");
        await onAuthSuccess();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await supabase.auth.signOut();
      await onAuthSuccess();
      setInfoMsg("Signed out from Supabase cloud session.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[390px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status.state === "synced" ? (
              <Cloud className="h-4 w-4 text-emerald-600" />
            ) : (
              <CloudOff className="h-4 w-4 text-muted-foreground" />
            )}
            Supabase Cloud Sync
          </DialogTitle>
          <DialogDescription>
            Stores profiles, plans, GPS runs, gym logs, weight entries, and reports securely with
            Row-Level Security.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          {status.state === "synced" && (
            <div className="badge-emerald rounded-2xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Connected & Synced
                </span>
                <span className="text-[11px] tabular-nums">
                  {status.lastSyncAt.slice(11, 19)} UTC
                </span>
              </div>
              <p className="text-[11px]">
                Account:{" "}
                {status.email ??
                  (status.isAnonymous ? "Anonymous Device Session" : status.userId.slice(0, 8))}
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-h-[36px] rounded-xl text-xs bg-card"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await onManualSync();
                    setBusy(false);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Sync Now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-[36px] rounded-xl text-xs"
                  disabled={busy}
                  onClick={handleSignOut}
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </Button>
              </div>
            </div>
          )}

          {status.state === "auth_required" && (
            <div className="badge-amber rounded-2xl p-3 space-y-1">
              <p className="font-bold">Sign in to sync transactions to Supabase</p>
              <p className="text-[11px] leading-relaxed">{status.message}</p>
            </div>
          )}

          {status.state === "offline" && (
            <div className="badge-rose rounded-2xl p-3 space-y-1">
              <p className="font-bold">Offline mode</p>
              <p className="text-[11px] leading-relaxed">{status.message}</p>
            </div>
          )}

          {/* Email Sign-In / Link Account Form */}
          {(!status || status.state !== "synced" || status.isAnonymous) && (
            <form onSubmit={handleEmailAuth} className="space-y-2.5 border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="font-bold inline-flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  {status.state === "synced" && status.isAnonymous
                    ? "Link Email to Save Across Devices"
                    : mode === "signin"
                      ? "Email Sign In"
                      : "Create Sync Account"}
                </span>
                {!(status.state === "synced" && status.isAnonymous) && (
                  <button
                    type="button"
                    onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {mode === "signin" ? "Need an account?" : "Have an account?"}
                  </button>
                )}
              </div>

              <div>
                <Label htmlFor="sb-email" className="text-[11px]">
                  Email
                </Label>
                <Input
                  id="sb-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  className="mt-1 h-10"
                />
              </div>

              <div>
                <Label htmlFor="sb-password" className="text-[11px]">
                  Password (min 6 chars)
                </Label>
                <Input
                  id="sb-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 h-10"
                />
              </div>

              {errorMsg && <p className="badge-rose rounded-xl p-2.5 text-[11px]">{errorMsg}</p>}
              {infoMsg && <p className="badge-emerald rounded-xl p-2.5 text-[11px]">{infoMsg}</p>}

              <Button
                type="submit"
                disabled={busy}
                className="w-full min-h-[42px] rounded-xl font-semibold"
              >
                {busy
                  ? "Connecting..."
                  : status.state === "synced" && status.isAnonymous
                    ? "Link Email Account"
                    : mode === "signin"
                      ? "Sign In & Sync"
                      : "Create Account & Sync"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
