"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import AppNavbar from "../../components/AppNavbar";
import { BUDGETS, COMMUTE_MODES, EMPTY, HOUSING_TYPES, label, MOVE_IN, type QuizAnswers } from "../../components/quiz/options";

/* ---------- types & constants ---------- */

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  interests: string[] | null;
  preferences: Record<string, string> | null;
  budget_min: number | null;
  budget_max: number | null;
};

type Connection = {
  id: string;
  otherId: string;
  name: string;
  avatarUrl: string | null;
  shared: number;
  score: number | null;
  status: "pending" | "accepted";
  incoming: boolean;
};

type Tab = "connected" | "requests" | "sent";

const AVATAR_COLORS = ["#6f8fbf", "#c07a45", "#4f6a9a", "#7a6f9a", "#8a6f4f"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/* ---------- small helpers ---------- */

const initials = (first?: string | null, last?: string | null) =>
  `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";

const colorFor = (id: string) =>
  AVATAR_COLORS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  return score; // 0-3
}

const STRENGTH_LABEL = ["Too short", "Okay", "Good", "Strong"];

/* ---------- shared UI ---------- */

const inputCls =
  "h-12 w-full rounded-2xl border border-[#cfd8ea] bg-white px-4 text-sm text-[#1f2a44] outline-none placeholder:text-[#6b7691] focus-visible:ring-2 focus-visible:ring-[#1f2a44]";
const labelCls = "mb-2 block text-[11px] font-bold uppercase tracking-widest text-[#3d4a6b]";
const btnCls =
  "h-11 rounded-full border border-[#cfd8ea] bg-white px-5 text-[13px] font-semibold text-[#1f2a44] transition hover:bg-[#f2f5fb] focus-visible:ring-2 focus-visible:ring-[#1f2a44] disabled:opacity-50";
const btnDark =
  "h-11 rounded-full bg-[#1f2a44] px-5 text-[13px] font-semibold text-white transition hover:bg-[#2b3a5e] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1f2a44] disabled:opacity-50";
const smBtn = "!h-9 !px-4 !text-xs";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] bg-white/70 p-7 shadow-[0_10px_40px_rgba(31,42,68,0.08)] backdrop-blur">
      <h2 className="font-[family-name:var(--font-serif)] text-[28px] font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Avatar({
  id, url, first, last, size = 44,
}: { id: string; url?: string | null; first?: string | null; last?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.32 };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      style={{ ...style, background: colorFor(id) }}
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
    >
      {initials(first, last)}
    </span>
  );
}

/* ---------- page ---------- */

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  // details
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploading, setUploading] = useState(false);

  // password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  // connections
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tab, setTab] = useState<Tab>("connected");

  // saved questionnaire answers, used for the preference tags
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY);

  // log out and delete account
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const flash = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    setToast({ tone, text });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  /* ----- load ----- */

  const loadConnections = useCallback(async (userId: string, mine: string[]) => {
    const { data: rows } = await supabase
      .from("connections")
      .select("id, requester_id, addressee_id, status, score")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (!rows?.length) return setConnections([]);

    const otherIds = rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
    const { data: people } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, interests")
      .in("id", otherIds);
    const byId = new Map((people ?? []).map((p) => [p.id, p]));

    setConnections(
      rows.map((r) => {
        const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
        const p = byId.get(otherId);
        return {
          id: r.id,
          otherId,
          name: p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Subtle user" : "Subtle user",
          avatarUrl: p?.avatar_url ?? null,
          shared: (p?.interests ?? []).filter((i: string) => mine.includes(i)).length,
          score: r.score,
          status: r.status,
          incoming: r.addressee_id === userId,
        };
      }),
    );
  }, []);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.replace("/login");
      const user = auth.user;
      setUid(user.id);
      setEmail(user.email ?? "");
      setSavedEmail(user.email ?? "");

      try {
        // answers saved in this browser only count if they belong to this account
        const owner = localStorage.getItem("subtle-quiz-owner");
        const raw = localStorage.getItem("subtle-quiz-v1");
        if (raw && (!owner || owner === (user.email ?? "").toLowerCase())) setAnswers({ ...EMPTY, ...JSON.parse(raw) });
      } catch {}

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setFirst(p.first_name ?? "");
        setLast(p.last_name ?? "");
        await loadConnections(user.id, p.interests ?? []);
      }
      setLoading(false);
    })();
  }, [router, loadConnections]);

  useEffect(() => {
    if (!confirmDelete) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !deleting && setConfirmDelete(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDelete, deleting]);

  /* ----- details ----- */

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail.endsWith(".edu")) return flash("Use a .edu email address.", "err");

    setSavingDetails(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: first.trim(), last_name: last.trim() })
      .eq("id", uid);
    if (error) {
      setSavingDetails(false);
      return flash("Couldn't save your name. Try again.", "err");
    }
    if (nextEmail !== savedEmail) {
      const { error: mailErr } = await supabase.auth.updateUser({ email: nextEmail });
      if (mailErr) {
        setSavingDetails(false);
        return flash(mailErr.message, "err");
      }
      flash("Check your new inbox to confirm the email change.");
    } else {
      flash("Details saved.");
    }
    setSavingDetails(false);
  }

  function resetDetails() {
    setFirst(profile?.first_name ?? "");
    setLast(profile?.last_name ?? "");
    setEmail(savedEmail);
  }

  /* ----- avatar ----- */

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uid) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return flash("Choose a JPG or PNG.", "err");
    if (file.size > MAX_AVATAR_BYTES) return flash("Photos must be under 5 MB.", "err");

    setUploading(true);
    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${uid}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      return flash("Upload failed. Try again.", "err");
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", uid);
    setProfile((p) => (p ? { ...p, avatar_url: data.publicUrl } : p));
    setUploading(false);
    window.dispatchEvent(new Event("avatar-updated"));
    flash("Profile picture updated.");
  }

  async function removePhoto() {
    if (!uid) return;
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", uid);
    setProfile((p) => (p ? { ...p, avatar_url: null } : p));
    window.dispatchEvent(new Event("avatar-updated"));
    flash("Profile picture removed.");
  }

  /* ----- password ----- */

  const strength = useMemo(() => passwordStrength(newPw), [newPw]);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) return flash("New password needs at least 8 characters.", "err");
    if (newPw !== confirmPw) return flash("New passwords don't match.", "err");
    if (newPw === curPw) return flash("Choose a password you haven't used.", "err");

    setSavingPw(true);
    // Re-check the current password before allowing a change.
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: savedEmail, password: curPw });
    if (authErr) {
      setSavingPw(false);
      return flash("Current password is incorrect.", "err");
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) return flash(error.message, "err");
    setCurPw("");
    setNewPw("");
    setConfirmPw("");
    flash("Password updated.");
  }

  /* ----- connections ----- */

  async function respond(c: Connection, accept: boolean) {
    const q = accept
      ? supabase.from("connections").update({ status: "accepted" }).eq("id", c.id)
      : supabase.from("connections").delete().eq("id", c.id);
    const { error } = await q;
    if (error) return flash("Something went wrong. Try again.", "err");
    setConnections((cur) =>
      accept ? cur.map((x) => (x.id === c.id ? { ...x, status: "accepted" } : x)) : cur.filter((x) => x.id !== c.id),
    );
    flash(accept ? `You're now connected with ${c.name}.` : "Removed.");
  }

  async function removeConnection(c: Connection) {
    if (!window.confirm(`Remove ${c.name} from your connections?`)) return;
    await respond(c, false);
  }

  /* ----- log out & delete account ----- */

  async function logOut() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
    } catch {
      setDeleting(false);
      return flash("Couldn't delete your account. Try again.", "err");
    }
    try {
      localStorage.removeItem("subtle-quiz-v1");
      localStorage.removeItem("subtle-quiz-owner");
      localStorage.removeItem("subtle-user-v1");
    } catch {}
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  /* ----- preference tags (the main answers only) ----- */

  const mins = answers.maxCommute >= 60 ? "60+" : String(answers.maxCommute);
  const budget = BUDGETS.find((b) => b.id === answers.budget);
  const prefTags = [
    budget && `Budget ${budget.range ?? budget.title}`,
    answers.housingType && label(HOUSING_TYPES, answers.housingType),
    answers.roommates === "yes" ? "With roommates" : answers.roommates === "no" ? "Living alone" : null,
    answers.car && (answers.car === "car" ? "Has a car" : answers.car === "either" ? "Car or transit" : "No car"),
    answers.commuteMode && `${label(COMMUTE_MODES, answers.commuteMode)}, up to ${mins} min`,
    answers.moveIn && (answers.moveIn === "flexible" ? "Flexible move-in" : `${label(MOVE_IN, answers.moveIn)} move-in`),
  ].filter(Boolean) as string[];

  const connected = connections.filter((c) => c.status === "accepted");
  const requests = connections.filter((c) => c.status === "pending" && c.incoming);
  const sent = connections.filter((c) => c.status === "pending" && !c.incoming);
  const visible = tab === "connected" ? connected : tab === "requests" ? requests : sent;

  /* ----- render ----- */

  if (loading) {
    return <main className="min-h-screen bg-gradient-to-b from-[#c3d5ee] to-[#f6e6d2] p-10 text-[#1f2a44]">Loading…</main>;
  }

  const fullName = `${first} ${last}`.trim() || "your profile.";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#c3d5ee] via-[#e6ebf4] to-[#f6e6d2] px-3 pb-16 pt-32 text-[#1f2a44] md:px-4">
      <AppNavbar firstName={first} />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-7">
        <header className="flex animate-[fadeIn_.5s_ease-out] flex-wrap items-end justify-between gap-6 md:pl-10">
          <div>
            <h1 className="font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em] md:text-6xl">{fullName}</h1>
            <p className="mt-2 text-[17px] text-[#4A5A75]">manage your account settings</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2.5 text-xs font-semibold text-[#2f6b3f]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z" />
              <path d="M8.5 12l2.5 2.5 4.5-5" />
            </svg>
            Verified student
          </span>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            {/* Details + photo */}
            <Card title="your details.">
              <form onSubmit={saveDetails} className="mt-6 flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="relative h-[88px] w-[88px] shrink-0">
                    {uid && (
                      <Avatar id={uid} url={profile?.avatar_url} first={first} last={last} size={88} />
                    )}
                    <button
                      type="button"
                      aria-label="Change profile picture"
                      onClick={() => fileRef.current?.click()}
                      className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-[#1f2a44] text-white focus-visible:ring-2 focus-visible:ring-[#1f2a44]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                        <circle cx="12" cy="13" r="3.5" />
                      </svg>
                    </button>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onPickPhoto} />
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <span className={`${labelCls} !mb-1`}>Profile picture</span>
                    <p className="mb-3 text-xs text-[#4a5878]">JPG or PNG, up to 5 MB. Shown to your matches and connections.</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={`${btnDark} ${smBtn}`}>
                        {uploading ? "Uploading…" : "Upload photo"}
                      </button>
                      {profile?.avatar_url && (
                        <button type="button" onClick={removePhoto} className={`${btnCls} ${smBtn}`}>Remove</button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="fn" className={labelCls}>First name</label>
                    <input id="fn" className={inputCls} value={first} onChange={(e) => setFirst(e.target.value)} required />
                  </div>
                  <div>
                    <label htmlFor="ln" className={labelCls}>Last name</label>
                    <input id="ln" className={inputCls} value={last} onChange={(e) => setLast(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label htmlFor="em" className={labelCls}>Student email</label>
                  <input id="em" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <p className="mt-1.5 text-xs text-[#4a5878]">Changing your email sends a confirmation link. Only .edu addresses are accepted.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2.5">
                  <button type="button" onClick={resetDetails} className={btnCls}>Cancel</button>
                  <button type="submit" disabled={savingDetails} className={btnDark}>
                    {savingDetails ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </Card>

            {/* Password */}
            <Card title="password.">
              <form onSubmit={changePassword} className="mt-6 flex flex-col gap-5">
                <div>
                  <label htmlFor="pw0" className={labelCls}>Current password</label>
                  <input id="pw0" type="password" autoComplete="current-password" className={inputCls} value={curPw} onChange={(e) => setCurPw(e.target.value)} placeholder="Enter your current password" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pw1" className={labelCls}>New password</label>
                    <input id="pw1" type="password" autoComplete="new-password" className={inputCls} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 8 characters" required />
                  </div>
                  <div>
                    <label htmlFor="pw2" className={labelCls}>Confirm new password</label>
                    <input id="pw2" type="password" autoComplete="new-password" className={inputCls} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Re-enter new password" required />
                  </div>
                </div>
                <div aria-live="polite">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={`h-1.5 flex-1 rounded-full ${strength >= n ? "bg-[#3b7a4a]" : "bg-[#d9e1f0]"}`} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-[#4a5878]">
                    {newPw ? `Strength: ${STRENGTH_LABEL[strength].toLowerCase()}.` : "Use upper and lower case, a number, and a symbol for a stronger password."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#4a5878]">Signed up with Google? Manage your password in your Google account.</p>
                  <button type="submit" disabled={savingPw} className={btnDark}>
                    {savingPw ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right column: connections, then preferences */}
          <div className="flex min-w-0 flex-col gap-6">
          <aside className="rounded-[28px] bg-white/70 p-6 shadow-[0_10px_40px_rgba(31,42,68,0.08)] backdrop-blur">
            <h2 className="font-[family-name:var(--font-serif)] text-[28px] font-medium">connections.</h2>
            <p className="mb-4 mt-1 text-xs text-[#4a5878]">
              {connected.length} connected · {requests.length} {requests.length === 1 ? "request" : "requests"} waiting
            </p>

            <div role="tablist" className="mb-4 flex gap-1 rounded-full bg-[#e8edf7] p-1">
              {([
                ["connected", "Connected", 0],
                ["requests", "Requests", requests.length],
                ["sent", "Sent", 0],
              ] as [Tab, string, number][]).map(([key, label, count]) => (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`h-10 flex-1 rounded-full text-[13px] font-semibold transition focus-visible:ring-2 focus-visible:ring-[#1f2a44] ${
                    tab === key ? "bg-[#1f2a44] text-white" : "text-[#3d4a6b]"
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className="ml-1.5 inline-block min-w-[18px] rounded-full bg-[#b5662f] px-1 text-[11px] leading-[18px] text-white">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <ul className="flex flex-col gap-2.5" role="tabpanel">
              {visible.length === 0 && (
                <li className="rounded-2xl bg-white p-4 text-[13px] text-[#4a5878]">
                  {tab === "connected" && "No connections yet. Find interns who share your interests."}
                  {tab === "requests" && "No requests waiting on you."}
                  {tab === "sent" && "You haven't sent any requests."}
                </li>
              )}
              {visible.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3.5 rounded-[18px] bg-white p-3">
                  <Avatar id={c.otherId} url={c.avatarUrl} first={c.name.split(" ")[0]} last={c.name.split(" ")[1]} />
                  <div className="min-w-[120px] flex-1">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-[#4a5878]">
                      {c.shared} shared {c.shared === 1 ? "interest" : "interests"}
                    </p>
                  </div>
                  {c.score !== null && (
                    <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#3b7a4a] text-xs font-bold text-white" aria-label={`Subtle score ${c.score}`}>
                      {c.score}
                    </span>
                  )}
                  <div className="flex w-full gap-1.5 pl-[58px]">
                    {c.status === "accepted" && (
                      <>
                        <button type="button" onClick={() => router.push(`/messages?with=${c.otherId}`)} className={`${btnCls} ${smBtn}`}>Message</button>
                        <button type="button" aria-label={`Remove ${c.name}`} onClick={() => removeConnection(c)} className={`${btnCls} ${smBtn} !text-[#8a3a2a]`}>Remove</button>
                      </>
                    )}
                    {c.status === "pending" && c.incoming && (
                      <>
                        <button type="button" onClick={() => respond(c, true)} className={`${btnDark} ${smBtn}`}>Accept</button>
                        <button type="button" onClick={() => respond(c, false)} className={`${btnCls} ${smBtn}`}>Decline</button>
                      </>
                    )}
                    {c.status === "pending" && !c.incoming && (
                      <button type="button" onClick={() => respond(c, false)} className={`${btnCls} ${smBtn}`}>Cancel request</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <button type="button" onClick={() => router.push("/internMatches")} className={`${btnCls} mt-5 w-full`}>
              Find more matches
            </button>
          </aside>

            {/* Preferences entry point */}
            <Card title="my preferences.">
              <p className="mt-2.5 text-[13px] text-[#3d4a6b]">
                Review your questionnaire answers and update them any time. Changes apply to your next set of matches.
              </p>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => router.push("/profile/preferences")} className={btnDark}>
                  Edit my preferences
                </button>
              </div>
              <div className="mt-5 border-t border-[#e4eaf1] pt-4">
                {prefTags.length > 0 ? (
                  <ul className="flex flex-wrap gap-2" aria-label="Your main preferences">
                    {prefTags.map((t) => (
                      <li key={t} className="rounded-full border border-[#cfd8ea] bg-white px-3 py-1.5 text-xs font-medium text-[#1f2a44]">
                        {t}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#4a5878]">No saved answers on this device yet.</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* account actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button type="button" onClick={logOut} disabled={loggingOut} className={btnCls}>
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteText("");
              setConfirmDelete(true);
            }}
            className="h-11 rounded-full border border-[#e3b5a8] bg-white px-5 text-[13px] font-semibold text-[#8a3a2a] transition hover:bg-[#fbeee9] focus-visible:ring-2 focus-visible:ring-[#8a3a2a]"
          >
            Delete account
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            disabled={deleting}
            onClick={() => setConfirmDelete(false)}
            className="absolute inset-0 bg-[#1f2a44]/30 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="relative w-full max-w-sm rounded-[28px] border border-white bg-white/95 p-7 text-center text-[#1f2a44] shadow-[0_40px_90px_-40px_rgba(30,43,68,0.6)]"
          >
            <h2 id="delete-title" className="font-[family-name:var(--font-serif)] text-3xl font-medium">Delete account?</h2>
            <p className="mt-2 text-[15px] text-[#4a5878]">
              This permanently removes your profile, photo and connections. It can&apos;t be undone.
            </p>
            <label htmlFor="delete-confirm" className={`${labelCls} mt-5 text-left`}>Type DELETE to confirm</label>
            <input
              id="delete-confirm"
              autoFocus
              autoComplete="off"
              className={inputCls}
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
            />
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleteText.trim().toUpperCase() !== "DELETE" || deleting}
                className="h-12 rounded-full bg-[#8a3a2a] px-6 text-[15px] font-semibold text-white transition hover:bg-[#6f2e21] disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete my account"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="h-12 rounded-full border border-[#cfd8ea] bg-white px-6 text-[15px] font-semibold transition hover:bg-[#f2f5fb] disabled:opacity-50">
                Keep my account
              </button>
            </div>
          </div>
        </div>
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4">
        {toast && (
          <p className={`pointer-events-auto rounded-full px-5 py-3 text-[13px] font-semibold text-white shadow-lg ${toast.tone === "ok" ? "bg-[#1f2a44]" : "bg-[#8a3a2a]"}`}>
            {toast.text}
          </p>
        )}
      </div>
    </main>
  );
}