"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeletePostButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setPending(true);
    const res = await fetch(`/posts/${slug}/delete`, { method: "POST" });
    if (res.ok) router.push("/");
    else setPending(false);
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className={`text-sm font-medium disabled:opacity-50 ${
        confirming
          ? "text-red-600 hover:text-red-700"
          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
      }`}
    >
      {pending ? "Deleting…" : confirming ? "Click again to delete" : "Delete post"}
    </button>
  );
}
