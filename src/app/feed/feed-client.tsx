"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Post, PostComment, Profile } from "@/lib/types";
import { ProfileAvatar } from "@/components/profile-avatar";
import { formatRelativeHe, cn } from "@/lib/utils";
import {
  MessageCircle,
  Send,
  Loader2,
  Trash2,
  Sparkles,
  ChevronDown,
  Image as ImageIcon,
  X,
  Pin,
  PinOff,
} from "lucide-react";

type CurrentUser = Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "role">;
type FeedMember = Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "role">;

const PAGE_SIZE = 15;
const POST_MEDIA_BUCKET = "post-media";
const REACTIONS = ["👍", "❤️", "👏", "🎉"] as const;

function roleLabel(role: string | undefined | null): string {
  switch (role) {
    case "candidate":
      return "יזם/ת";
    case "mentor":
      return "מנטור/ית";
    case "admin":
      return "מנהל/ת";
    case "visitor":
      return "מאזין/ת";
    default:
      return "";
  }
}

function OnlinePresence({
  members,
  viewerId,
}: {
  members: FeedMember[];
  viewerId: string;
}) {
  const [open, setOpen] = useState(false);
  if (members.length === 0) return null;
  const others = members.filter((m) => m.id !== viewerId);
  const stack = members.slice(0, 4);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-[#22c55e]/10 px-2.5 py-1 text-xs font-medium text-[#16a34a] hover:bg-[#22c55e]/20 transition-colors"
        title="לחצו לרשימה מלאה"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-[#22c55e]" />
        </span>
        <span className="tabular-nums">{members.length} מחוברים כעת</span>
        <div className="flex -space-x-1.5 -space-x-reverse">
          {stack.map((m) => (
            <ProfileAvatar
              key={m.id}
              fullName={m.full_name}
              email={m.email}
              avatarUrl={m.avatar_url}
              size={18}
              className="ring-2 ring-white"
            />
          ))}
        </div>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 left-0 max-h-80 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <p className="px-2 py-1 text-[11px] font-semibold text-gray-500">
            מחוברים כעת ({members.length})
          </p>
          <ul className="space-y-1">
            {members.map((m) => {
              const isMe = m.id === viewerId;
              return (
                <li key={m.id}>
                  <Link
                    href={isMe ? "/profile" : `/profile/${m.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[#22c55e]/5 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <ProfileAvatar
                      fullName={m.full_name}
                      email={m.email}
                      avatarUrl={m.avatar_url}
                      size={24}
                    />
                    <span className="text-sm text-[#1a2744] truncate flex-1 min-w-0">
                      {m.full_name || m.email}
                      {isMe && (
                        <span className="text-[10px] text-gray-400"> (אתם)</span>
                      )}
                    </span>
                    <span className="size-1.5 rounded-full bg-[#22c55e]" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {others.length === 0 && (
            <p className="px-2 py-2 text-[11px] text-gray-400">
              רק אתם מחוברים כרגע
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Wraps the avatar/name with a link to the author's profile, except when the
// viewer is the author themselves — that goes to the editor at /profile.
function ProfileLink({
  authorId,
  viewerId,
  className,
  children,
}: {
  authorId: string;
  viewerId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const href = authorId === viewerId ? "/profile" : `/profile/${authorId}`;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function roleBadgeClass(role: string | undefined | null): string {
  switch (role) {
    case "mentor":
      return "bg-[#1a2744]/10 text-[#1a2744]";
    case "admin":
      return "bg-amber-100 text-amber-700";
    case "visitor":
      return "bg-gray-100 text-gray-500";
    case "candidate":
    default:
      return "bg-[#22c55e]/10 text-[#22c55e]";
  }
}

const ALL_TOKENS = ["all", "כולם"] as const;

function detectMentions(body: string, members: FeedMember[]): {
  names: string[];
  all: boolean;
} {
  if (!body.includes("@")) return { names: [], all: false };
  const all = ALL_TOKENS.some((token) =>
    new RegExp(`@${token}\\b`, "i").test(body)
  );
  const names = new Set<string>();
  for (const m of members) {
    const name = (m.full_name || "").trim();
    if (!name) continue;
    const re = new RegExp(
      `@${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`
    );
    if (re.test(body)) names.add(name);
  }
  return { names: Array.from(names), all };
}

// Render a body with @mentions and @all/@כולם highlighted.
function renderBodyWithMentions(body: string, members: FeedMember[]): React.ReactNode {
  if (!body.includes("@")) return body;
  const names = members
    .map((m) => (m.full_name || "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const tokens = [...ALL_TOKENS, ...names];
  if (tokens.length === 0) return body;
  const escaped = tokens.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`@(${escaped.join("|")})\\b`, "g");
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of body.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) parts.push(body.slice(last, start));
    const isAll = ALL_TOKENS.includes(m[1] as (typeof ALL_TOKENS)[number]);
    parts.push(
      <span
        key={start}
        className={
          isAll
            ? "rounded bg-amber-100 px-1 text-amber-700 font-medium"
            : "rounded bg-[#22c55e]/10 px-1 text-[#16a34a] font-medium"
        }
      >
        @{m[1]}
      </span>
    );
    last = start + m[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return parts;
}

export function FeedClient({ currentUser }: { currentUser: CurrentUser }) {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [members, setMembers] = useState<FeedMember[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<FeedMember[]>([]);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);

  // Composer state
  const [composerBody, setComposerBody] = useState("");
  const [composerImage, setComposerImage] = useState<File | null>(null);
  const [composerPreview, setComposerPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Bump feed_last_seen_at on mount so the sidebar badge clears.
  useEffect(() => {
    supabase
      .from("profiles")
      .update({ feed_last_seen_at: new Date().toISOString() })
      .eq("id", currentUser.id)
      .then(() => {});
  }, [supabase, currentUser.id]);

  // Realtime — push newly-inserted posts into a "pending" tray so we don't
  // yank the user's scroll. Comments are streamed in their own thread.
  useEffect(() => {
    const channel = supabase
      .channel("feed-posts-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const row = payload.new as Post;
          if (!row?.id) return;
          if (row.author_id === currentUser.id) return; // own post is already in list
          if (row.deleted_at) return;
          const { data } = await supabase
            .from("posts")
            .select(
              "*, author:profiles!posts_author_id_fkey(id, full_name, email, avatar_url, role)"
            )
            .eq("id", row.id)
            .is("deleted_at", null)
            .maybeSingle();
          if (!data) return;
          const post = data as Post;
          if (post.pinned_at) {
            setPinnedPosts((prev) =>
              prev.some((p) => p.id === post.id) ? prev : [post, ...prev]
            );
          } else {
            setPendingPosts((prev) =>
              prev.some((p) => p.id === post.id) ? prev : [post, ...prev]
            );
          }
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [supabase, currentUser.id]);

  function flushPending() {
    if (pendingPosts.length === 0) return;
    setPosts((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const fresh = pendingPosts.filter((p) => !seen.has(p.id));
      return [...fresh, ...prev];
    });
    setPendingPosts([]);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Realtime presence — track who's currently viewing /feed.
  useEffect(() => {
    const channel = supabase.channel("feed-presence", {
      config: { presence: { key: currentUser.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          { user?: FeedMember }[]
        >;
        const seen = new Set<string>();
        const list: FeedMember[] = [];
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            const u = p.user;
            if (u && !seen.has(u.id)) {
              seen.add(u.id);
              list.push(u);
            }
          }
        }
        setOnlineMembers(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user: {
              id: currentUser.id,
              full_name: currentUser.full_name,
              email: currentUser.email,
              avatar_url: currentUser.avatar_url,
              role: currentUser.role,
            },
          });
        }
      });
    return () => {
      channel.unsubscribe();
    };
  }, [supabase, currentUser]);

  // Load member directory once for mentions and authorship lookups.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role")
        .order("full_name");
      if (!cancelled) setMembers((data as FeedMember[]) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const loadPage = useCallback(
    async (offset: number, replace: boolean) => {
      const [
        { data: pinned },
        { data: page },
      ] = await Promise.all([
        offset === 0
          ? supabase
              .from("posts")
              .select(
                "*, author:profiles!posts_author_id_fkey(id, full_name, email, avatar_url, role)"
              )
              .is("deleted_at", null)
              .not("pinned_at", "is", null)
              .order("pinned_at", { ascending: false })
          : Promise.resolve({ data: null }),
        supabase
          .from("posts")
          .select(
            "*, author:profiles!posts_author_id_fkey(id, full_name, email, avatar_url, role)"
          )
          .is("deleted_at", null)
          .is("pinned_at", null)
          .order("created_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1),
      ]);
      const pageRows = (page as Post[]) || [];
      setHasMore(pageRows.length === PAGE_SIZE);
      setPosts((prev) => (replace ? pageRows : [...prev, ...pageRows]));
      if (offset === 0) setPinnedPosts((pinned as Post[]) || []);
      setLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    loadPage(0, true);
  }, [loadPage]);

  function pickImage(file: File | null) {
    setComposerImage(file);
    if (composerPreview) URL.revokeObjectURL(composerPreview);
    setComposerPreview(file ? URL.createObjectURL(file) : null);
  }

  async function uploadImage(file: File): Promise<{ url: string; path: string } | null> {
    if (!file.type.startsWith("image/")) return null;
    if (file.size > 5 * 1024 * 1024) return null;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `posts/${currentUser.id}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from(POST_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return null;
    const { data: pub } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);
    return { url: pub.publicUrl, path };
  }

  async function notifyMentions(body: string, postId: string) {
    const { names, all } = detectMentions(body, members);
    if (!all && names.length === 0) return;
    fetch("/api/feed/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        body,
        mentionedNames: names,
        mentionAll: all,
      }),
    });
  }

  async function submitPost() {
    const body = composerBody.trim();
    if ((!body && !composerImage) || posting) return;
    setPosting(true);

    let image_url: string | null = null;
    let image_path: string | null = null;
    if (composerImage) {
      const uploaded = await uploadImage(composerImage);
      if (uploaded) {
        image_url = uploaded.url;
        image_path = uploaded.path;
      }
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: currentUser.id,
        body: body || " ",
        image_url,
        image_path,
      })
      .select(
        "*, author:profiles!posts_author_id_fkey(id, full_name, email, avatar_url, role)"
      )
      .single();
    setPosting(false);
    if (error || !data) return;

    setPosts((prev) => [data as Post, ...prev]);
    if (body) notifyMentions(body, data.id);
    fetch("/api/feed/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "post",
        postId: data.id,
        text: body,
        imageUrl: image_url || undefined,
      }),
    });
    setComposerBody("");
    pickImage(null);
  }

  async function deletePost(post: Post) {
    if (!confirm("למחוק את הפוסט?")) return;
    const { error, data } = await supabase
      .from("posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", post.id)
      .select("id");
    if (error) {
      alert(`שגיאה במחיקה: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      alert(
        "המחיקה נחסמה ע\"י הרשאות. ודאו שהמשתמש מחובר כמנהל או כיוצר/ת הפוסט."
      );
      return;
    }
    if (post.image_path) {
      supabase.storage.from(POST_MEDIA_BUCKET).remove([post.image_path]);
    }
    // Surface admin moderation in Slack — only when an admin removes someone
    // else's post (a self-delete is just normal cleanup).
    if (
      currentUser.role === "admin" &&
      post.author_id !== currentUser.id
    ) {
      const preview = (post.body || "").trim().slice(0, 120);
      const authorName =
        post.author?.full_name || post.author?.email || "משתמש";
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "feed_moderation",
          description: `מנהל מחק פוסט של ${authorName} מהפיד: "${preview}"`,
        }),
      });
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    setPinnedPosts((prev) => prev.filter((p) => p.id !== post.id));
  }

  async function togglePin(post: Post) {
    const next = post.pinned_at ? null : new Date().toISOString();
    const { data, error } = await supabase
      .from("posts")
      .update({ pinned_at: next })
      .eq("id", post.id)
      .select(
        "*, author:profiles!posts_author_id_fkey(id, full_name, email, avatar_url, role)"
      )
      .single();
    if (error || !data) {
      alert("רק מנהל/ת יכול/ה להצמיד פוסטים");
      return;
    }
    const updated = data as Post;
    const preview = (updated.body || "").trim().slice(0, 120);
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: updated.pinned_at ? "feed_pin" : "feed_unpin",
        description: updated.pinned_at
          ? `פוסט הוצמד בפיד: "${preview}"`
          : `פוסט הוסר מהצמדה בפיד: "${preview}"`,
      }),
    });
    if (updated.pinned_at) {
      setPosts((prev) => prev.filter((p) => p.id !== updated.id));
      setPinnedPosts((prev) => [
        updated,
        ...prev.filter((p) => p.id !== updated.id),
      ]);
    } else {
      setPinnedPosts((prev) => prev.filter((p) => p.id !== updated.id));
      setPosts((prev) =>
        [updated, ...prev.filter((p) => p.id !== updated.id)].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="size-6 text-[#22c55e]" />
          <h1 className="text-2xl font-bold text-[#1a2744]">פיד הקהילה</h1>
          <OnlinePresence members={onlineMembers} viewerId={currentUser.id} />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          שתפו עדכונים, שאלות והצלחות עם שאר חברי התוכנית
        </p>
      </div>

      <Composer
        currentUser={currentUser}
        body={composerBody}
        setBody={setComposerBody}
        members={members}
        image={composerImage}
        previewUrl={composerPreview}
        onPickImage={pickImage}
        posting={posting}
        onSubmit={submitPost}
      />

      {pendingPosts.length > 0 && (
        <div className="sticky top-2 z-10 flex justify-center">
          <button
            type="button"
            onClick={flushPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-[#16a34a]"
          >
            <ChevronDown className="size-3.5 rotate-180" />
            {pendingPosts.length === 1
              ? "פוסט חדש — לחצו לרענון"
              : `${pendingPosts.length} פוסטים חדשים — לחצו לרענון`}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-gray-400" />
        </div>
      ) : posts.length === 0 && pinnedPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            עדיין אין פוסטים. היו הראשונים לשתף משהו 🌱
          </p>
        </div>
      ) : (
        <>
          {pinnedPosts.length > 0 && (
            <ul className="space-y-4">
              {pinnedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  members={members}
                  currentUser={currentUser}
                  onDelete={() => deletePost(post)}
                  onTogglePin={() => togglePin(post)}
                />
              ))}
            </ul>
          )}
          <ul className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                members={members}
                currentUser={currentUser}
                onDelete={() => deletePost(post)}
                onTogglePin={() => togglePin(post)}
              />
            ))}
          </ul>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => loadPage(posts.length, false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                <ChevronDown className="size-4" />
                טען עוד
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Composer ----------

function Composer({
  currentUser,
  body,
  setBody,
  members,
  image,
  previewUrl,
  onPickImage,
  posting,
  onSubmit,
}: {
  currentUser: CurrentUser;
  body: string;
  setBody: (v: string) => void;
  members: FeedMember[];
  image: File | null;
  previewUrl: string | null;
  onPickImage: (f: File | null) => void;
  posting: boolean;
  onSubmit: () => void;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const canSubmit = (body.trim().length > 0 || !!image) && !posting;

  const mentionState = useMentionAutocomplete(taRef, body, members);

  function applyMention(name: string) {
    if (!taRef.current) return;
    const cursor = taRef.current.selectionStart ?? body.length;
    const before = body.slice(0, mentionState.atPos);
    const after = body.slice(cursor);
    const next = `${before}@${name} ${after}`;
    setBody(next);
    mentionState.close();
    requestAnimationFrame(() => {
      if (!taRef.current) return;
      const pos = before.length + name.length + 2;
      taRef.current.focus();
      taRef.current.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ProfileAvatar
          fullName={currentUser.full_name}
          email={currentUser.email}
          avatarUrl={currentUser.avatar_url}
          size={40}
        />
        <div className="flex-1 min-w-0 space-y-2 relative">
          <textarea
            ref={taRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="מה חדש?  השתמשו ב־@ כדי לאזכר חברי קהילה"
            rows={3}
            maxLength={4000}
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#22c55e]"
          />

          {mentionState.open && mentionState.suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-56 w-72 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {mentionState.suggestions.map((m) => {
                const isAll = m.id === "__all__";
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() =>
                        applyMention(isAll ? "all" : m.full_name || m.email || "")
                      }
                      className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm hover:bg-[#22c55e]/5"
                    >
                      {isAll ? (
                        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                          @
                        </span>
                      ) : (
                        <ProfileAvatar
                          fullName={m.full_name}
                          email={m.email}
                          avatarUrl={m.avatar_url}
                          size={24}
                        />
                      )}
                      <span className="text-[#1a2744] truncate">
                        {isAll ? "כל הקהילה" : m.full_name || m.email}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                          isAll
                            ? "bg-amber-100 text-amber-700"
                            : roleBadgeClass(m.role)
                        )}
                      >
                        {isAll ? "@all" : roleLabel(m.role)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {previewUrl && (
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt=""
                className="max-h-60 rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => onPickImage(null)}
                className="absolute top-2 left-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                title="הסר תמונה"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                <ImageIcon className="size-3.5" />
                תמונה
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickImage(e.target.files?.[0] || null)}
              />
              <p className="text-[11px] text-gray-400 hidden sm:block">
                Cmd/Ctrl+Enter לפרסום
              </p>
            </div>
            <button
              onClick={onSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              פרסם
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Mention autocomplete hook ----------

function useMentionAutocomplete(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  body: string,
  members: FeedMember[]
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [atPos, setAtPos] = useState(0);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? 0;
    const upto = body.slice(0, cursor);
    const m = upto.match(/@([֐-׿A-Za-z0-9'\s]{0,40})$/);
    if (!m) {
      setOpen(false);
      return;
    }
    const start = cursor - m[0].length;
    setAtPos(start);
    setQuery(m[1]);
    setOpen(true);
  }, [body, textareaRef]);

  const suggestions = useMemo(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase();
    const list: FeedMember[] = [];
    // Pin "@all" pseudo-member at the top when the query matches.
    if (q === "" || "all".startsWith(q) || "כולם".startsWith(q)) {
      list.push({
        id: "__all__",
        full_name: "all",
        email: "",
        avatar_url: null,
        role: "admin",
      });
    }
    for (const m of members) {
      const name = (m.full_name || m.email || "").toLowerCase();
      if (q === "" || name.includes(q)) list.push(m);
    }
    return list.slice(0, 6);
  }, [open, query, members]);

  return {
    open,
    suggestions,
    atPos,
    close: () => setOpen(false),
  };
}

// ---------- Post card ----------

function PostCard({
  post,
  members,
  currentUser,
  onDelete,
  onTogglePin,
}: {
  post: Post;
  members: FeedMember[];
  currentUser: CurrentUser;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id)
        .is("deleted_at", null);
      if (!cancelled) setCommentCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, post.id]);

  const author = post.author;
  const canDelete = currentUser.id === post.author_id || currentUser.role === "admin";
  const isAdmin = currentUser.role === "admin";
  const isSystem = post.kind === "system";

  return (
    <li
      id={`post-${post.id}`}
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm",
        post.pinned_at ? "border-amber-300 bg-amber-50/30" : "border-gray-100"
      )}
    >
      {post.pinned_at && (
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          <Pin className="size-3" />
          מוצמד
        </div>
      )}
      <div className="flex items-start gap-3">
        <ProfileLink authorId={post.author_id} viewerId={currentUser.id}>
          <ProfileAvatar
            fullName={author?.full_name}
            email={author?.email}
            avatarUrl={author?.avatar_url}
            size={40}
          />
        </ProfileLink>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ProfileLink
              authorId={post.author_id}
              viewerId={currentUser.id}
              className="text-sm font-semibold text-[#1a2744] hover:text-[#22c55e] transition-colors"
            >
              {author?.full_name || author?.email || "משתמש/ת"}
            </ProfileLink>
            {author?.role && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  roleBadgeClass(author.role)
                )}
              >
                {roleLabel(author.role)}
              </span>
            )}
            {isSystem && (
              <span className="rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[10px] font-medium text-[#16a34a]">
                עדכון פעילות
              </span>
            )}
            <span className="text-[11px] text-gray-400">
              {formatRelativeHe(post.created_at)}
            </span>
          </div>
          <p
            className={cn(
              "mt-2 text-sm whitespace-pre-wrap leading-relaxed",
              isSystem ? "text-gray-600 italic" : "text-[#1a2744]"
            )}
          >
            {renderBodyWithMentions(post.body, members)}
          </p>
          {post.image_url && (
            <a
              href={post.image_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block"
            >
              <img
                src={post.image_url}
                alt=""
                className="max-h-[480px] w-auto rounded-lg border border-gray-100"
                loading="lazy"
              />
            </a>
          )}

          <ReactionsBar postId={post.id} currentUser={currentUser} />

          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={() => setShowComments((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#22c55e] transition-colors"
            >
              <MessageCircle className="size-3.5" />
              {commentCount ?? 0} תגובות
            </button>
            {isAdmin && (
              <button
                onClick={onTogglePin}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 transition-colors"
              >
                {post.pinned_at ? (
                  <>
                    <PinOff className="size-3.5" />
                    בטל הצמדה
                  </>
                ) : (
                  <>
                    <Pin className="size-3.5" />
                    הצמד
                  </>
                )}
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="size-3.5" />
                מחק
              </button>
            )}
          </div>

          {showComments && (
            <CommentThread
              postId={post.id}
              postAuthorId={post.author_id}
              members={members}
              currentUser={currentUser}
              onCountChange={setCommentCount}
            />
          )}
        </div>
      </div>
    </li>
  );
}

// ---------- Reactions bar ----------

function ReactionsBar({
  postId,
  currentUser,
}: {
  postId: string;
  currentUser: CurrentUser;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("post_reactions")
        .select("kind, user_id")
        .eq("post_id", postId);
      if (cancelled) return;
      const c: Record<string, number> = {};
      const m = new Set<string>();
      for (const r of (data || []) as { kind: string; user_id: string }[]) {
        c[r.kind] = (c[r.kind] ?? 0) + 1;
        if (r.user_id === currentUser.id) m.add(r.kind);
      }
      setCounts(c);
      setMine(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, postId, currentUser.id]);

  async function toggle(kind: string) {
    const has = mine.has(kind);
    // Optimistic
    setMine((prev) => {
      const n = new Set(prev);
      if (has) n.delete(kind);
      else n.add(kind);
      return n;
    });
    setCounts((prev) => ({
      ...prev,
      [kind]: Math.max(0, (prev[kind] ?? 0) + (has ? -1 : 1)),
    }));
    if (has) {
      await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUser.id)
        .eq("kind", kind);
    } else {
      await supabase
        .from("post_reactions")
        .insert({ post_id: postId, user_id: currentUser.id, kind });
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {REACTIONS.map((kind) => {
        const count = counts[kind] ?? 0;
        const active = mine.has(kind);
        return (
          <button
            key={kind}
            onClick={() => toggle(kind)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
              active
                ? "border-[#22c55e] bg-[#22c55e]/10 text-[#16a34a]"
                : "border-gray-200 bg-white text-gray-500 hover:border-[#22c55e] hover:text-[#16a34a]"
            )}
          >
            <span>{kind}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Comment thread ----------

function CommentThread({
  postId,
  postAuthorId,
  members,
  currentUser,
  onCountChange,
}: {
  postId: string;
  postAuthorId: string;
  members: FeedMember[];
  currentUser: CurrentUser;
  onCountChange: (n: number) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("post_comments")
        .select(
          "*, author:profiles!post_comments_author_id_fkey(id, full_name, email, avatar_url, role)"
        )
        .eq("post_id", postId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const rows = (data as PostComment[]) || [];
      setComments(rows);
      onCountChange(rows.length);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, postId, onCountChange]);

  // Realtime — append new comments inserted by other users into the thread.
  useEffect(() => {
    const channel = supabase
      .channel(`comments-stream-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const row = payload.new as PostComment;
          if (!row?.id) return;
          if (row.author_id === currentUser.id) return; // own comment is already in state
          if (row.deleted_at) return;
          const { data } = await supabase
            .from("post_comments")
            .select(
              "*, author:profiles!post_comments_author_id_fkey(id, full_name, email, avatar_url, role)"
            )
            .eq("id", row.id)
            .is("deleted_at", null)
            .maybeSingle();
          if (!data) return;
          setComments((prev) => {
            if (prev.some((c) => c.id === (data as PostComment).id)) return prev;
            const next = [...prev, data as PostComment];
            onCountChange(next.length);
            return next;
          });
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [supabase, postId, currentUser.id, onCountChange]);

  async function notifyMentions(text: string, commentId: string) {
    const { names, all } = detectMentions(text, members);
    if (!all && names.length === 0) return;
    fetch("/api/feed/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        commentId,
        body: text,
        mentionedNames: names,
        mentionAll: all,
      }),
    });
  }

  async function submitComment() {
    const trimmed = body.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, author_id: currentUser.id, body: trimmed })
      .select(
        "*, author:profiles!post_comments_author_id_fkey(id, full_name, email, avatar_url, role)"
      )
      .single();
    setPosting(false);
    if (error || !data) return;

    const next = [...comments, data as PostComment];
    setComments(next);
    onCountChange(next.length);
    setBody("");

    notifyMentions(trimmed, (data as PostComment).id);

    fetch("/api/feed/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "comment",
        postId,
        text: trimmed,
      }),
    });

    if (postAuthorId !== currentUser.id) {
      fetch("/api/notifications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: postAuthorId,
          type: "feedback",
          title: "תגובה חדשה לפוסט שלך",
          body: trimmed.slice(0, 120),
          link: `/feed#post-${postId}`,
        }),
      });
    }
  }

  async function deleteComment(commentId: string) {
    if (!confirm("למחוק את התגובה?")) return;
    const { error, data } = await supabase
      .from("post_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId)
      .select("id");
    if (error) {
      alert(`שגיאה במחיקה: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      alert("המחיקה נחסמה ע\"י הרשאות.");
      return;
    }
    const removed = comments.find((c) => c.id === commentId);
    if (
      removed &&
      currentUser.role === "admin" &&
      removed.author_id !== currentUser.id
    ) {
      const preview = (removed.body || "").trim().slice(0, 120);
      const authorName =
        removed.author?.full_name || removed.author?.email || "משתמש";
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "feed_moderation",
          description: `מנהל מחק תגובה של ${authorName} בפיד: "${preview}"`,
        }),
      });
    }
    const next = comments.filter((c) => c.id !== commentId);
    setComments(next);
    onCountChange(next.length);
  }

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="size-4 animate-spin text-gray-400" />
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const a = c.author;
            const canDelete =
              c.author_id === currentUser.id || currentUser.role === "admin";
            return (
              <li key={c.id} className="flex items-start gap-2">
                <ProfileLink authorId={c.author_id} viewerId={currentUser.id}>
                  <ProfileAvatar
                    fullName={a?.full_name}
                    email={a?.email}
                    avatarUrl={a?.avatar_url}
                    size={28}
                  />
                </ProfileLink>
                <div className="flex-1 min-w-0 rounded-lg bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ProfileLink
                      authorId={c.author_id}
                      viewerId={currentUser.id}
                      className="text-xs font-semibold text-[#1a2744] hover:text-[#22c55e] transition-colors"
                    >
                      {a?.full_name || a?.email || "משתמש/ת"}
                    </ProfileLink>
                    {a?.role && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                          roleBadgeClass(a.role)
                        )}
                      >
                        {roleLabel(a.role)}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {formatRelativeHe(c.created_at)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="ml-auto text-gray-400 hover:text-red-600"
                        title="מחק"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[#1a2744] whitespace-pre-wrap leading-relaxed">
                    {renderBodyWithMentions(c.body, members)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-start gap-2">
        <ProfileAvatar
          fullName={currentUser.full_name}
          email={currentUser.email}
          avatarUrl={currentUser.avatar_url}
          size={28}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (
                (e.metaKey || e.ctrlKey) &&
                e.key === "Enter" &&
                body.trim().length > 0
              ) {
                e.preventDefault();
                submitComment();
              }
            }}
            placeholder="הוסף תגובה..."
            rows={2}
            maxLength={2000}
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#22c55e]"
          />
          <div className="flex items-center justify-end">
            <button
              onClick={submitComment}
              disabled={body.trim().length === 0 || posting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a2744] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1a2744]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {posting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              שלח
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
