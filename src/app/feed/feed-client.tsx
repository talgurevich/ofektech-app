"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Post, PostComment, Profile } from "@/lib/types";
import { ProfileAvatar } from "@/components/profile-avatar";
import { formatRelativeHe } from "@/lib/utils";
import {
  MessageCircle,
  Send,
  Loader2,
  Trash2,
  Sparkles,
  ChevronDown,
} from "lucide-react";

type CurrentUser = Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "role">;

const PAGE_SIZE = 15;

function roleLabel(role: string | undefined): string {
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

function roleBadgeClass(role: string | undefined): string {
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

export function FeedClient({ currentUser }: { currentUser: CurrentUser }) {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [composerBody, setComposerBody] = useState("");
  const [posting, setPosting] = useState(false);

  const loadPage = useCallback(
    async (offset: number, replace: boolean) => {
      const { data } = await supabase
        .from("posts")
        .select(
          "*, author:profiles!posts_author_id_fkey(id, full_name, email, avatar_url, role)"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      const rows = (data as Post[]) || [];
      setHasMore(rows.length === PAGE_SIZE);
      setPosts((prev) => (replace ? rows : [...prev, ...rows]));
      setLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    loadPage(0, true);
  }, [loadPage]);

  async function submitPost() {
    const body = composerBody.trim();
    if (!body || posting) return;
    setPosting(true);
    const { data, error } = await supabase
      .from("posts")
      .insert({ author_id: currentUser.id, body })
      .select(
        "*, author:profiles!posts_author_id_fkey(id, full_name, email, avatar_url, role)"
      )
      .single();
    setPosting(false);
    if (error || !data) return;
    setPosts((prev) => [data as Post, ...prev]);
    setComposerBody("");
  }

  async function deletePost(postId: string) {
    if (!confirm("למחוק את הפוסט?")) return;
    const { error } = await supabase
      .from("posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", postId);
    if (!error) setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="size-6 text-[#22c55e]" />
          <h1 className="text-2xl font-bold text-[#1a2744]">פיד הקהילה</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          שתפו עדכונים, שאלות והצלחות עם שאר חברי התוכנית
        </p>
      </div>

      <Composer
        currentUser={currentUser}
        body={composerBody}
        setBody={setComposerBody}
        posting={posting}
        onSubmit={submitPost}
      />

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-gray-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            עדיין אין פוסטים. היו הראשונים לשתף משהו 🌱
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onDelete={() => deletePost(post.id)}
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

function Composer({
  currentUser,
  body,
  setBody,
  posting,
  onSubmit,
}: {
  currentUser: CurrentUser;
  body: string;
  setBody: (v: string) => void;
  posting: boolean;
  onSubmit: () => void;
}) {
  const canSubmit = body.trim().length > 0 && !posting;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ProfileAvatar
          fullName={currentUser.full_name}
          email={currentUser.email}
          avatarUrl={currentUser.avatar_url}
          size={40}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="מה חדש?"
            rows={3}
            maxLength={4000}
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#22c55e]"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-gray-400">
              Cmd/Ctrl+Enter לפרסום
            </p>
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

function PostCard({
  post,
  currentUser,
  onDelete,
}: {
  post: Post;
  currentUser: CurrentUser;
  onDelete: () => void;
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

  return (
    <li
      id={`post-${post.id}`}
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <ProfileAvatar
          fullName={author?.full_name}
          email={author?.email}
          avatarUrl={author?.avatar_url}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#1a2744]">
              {author?.full_name || author?.email || "משתמש/ת"}
            </p>
            {author?.role && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBadgeClass(author.role)}`}
              >
                {roleLabel(author.role)}
              </span>
            )}
            <span className="text-[11px] text-gray-400">
              {formatRelativeHe(post.created_at)}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#1a2744] whitespace-pre-wrap leading-relaxed">
            {post.body}
          </p>

          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={() => setShowComments((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#22c55e] transition-colors"
            >
              <MessageCircle className="size-3.5" />
              {commentCount ?? 0} תגובות
            </button>
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
              currentUser={currentUser}
              onCountChange={setCommentCount}
            />
          )}
        </div>
      </div>
    </li>
  );
}

function CommentThread({
  postId,
  currentUser,
  onCountChange,
}: {
  postId: string;
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

    // Notify the post author when someone else comments on their post.
    const { data: post } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .maybeSingle();
    if (post && post.author_id !== currentUser.id) {
      fetch("/api/notifications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: post.author_id,
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
    const { error } = await supabase
      .from("post_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);
    if (!error) {
      const next = comments.filter((c) => c.id !== commentId);
      setComments(next);
      onCountChange(next.length);
    }
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
                <ProfileAvatar
                  fullName={a?.full_name}
                  email={a?.email}
                  avatarUrl={a?.avatar_url}
                  size={28}
                />
                <div className="flex-1 min-w-0 rounded-lg bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-[#1a2744]">
                      {a?.full_name || a?.email || "משתמש/ת"}
                    </p>
                    {a?.role && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${roleBadgeClass(a.role)}`}
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
                    {c.body}
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
