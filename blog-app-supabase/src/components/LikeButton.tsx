"use client";

import { useState } from "react";
import { toggleLike } from "@/lib/actions";

const FINGERPRINT_KEY = "blog_fingerprint";

function getFingerprint(): string {
  if (typeof window === "undefined") return "anonymous";
  let fp = localStorage.getItem(FINGERPRINT_KEY);
  if (!fp) {
    fp = "fp_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(FINGERPRINT_KEY, fp);
  }
  return fp;
}

export function LikeButton({
  postId,
  initialCount,
  initialLiked,
}: {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (pending) return;
    setPending(true);
    const fp = getFingerprint();
    const result = await toggleLike(postId, fp);
    setCount(result.count);
    setLiked(result.liked);
    setPending(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
      aria-pressed={liked}
    >
      <span className={liked ? "text-red-500" : "text-zinc-400"}>
        {liked ? "♥" : "♡"}
      </span>
      <span>{count}</span>
    </button>
  );
}
