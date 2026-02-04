"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPostFromMarkdown } from "@/lib/actions";
import { parseMarkdownFile } from "@/lib/parse-markdown";

export function ImportMarkdown() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md") && !file.name.endsWith(".markdown")) {
      setStatus("error");
      setErrorMessage("Please select a .md or .markdown file.");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    try {
      const text = await file.text();
      const { title, excerpt, content } = parseMarkdownFile(text);
      const result = await createPostFromMarkdown({ title, excerpt, content });
      if (result.error) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }
      if (result.slug) {
        router.push(`/posts/${result.slug}`);
        return;
      }
    } catch {
      setStatus("error");
      setErrorMessage("Failed to read or parse the file.");
    }
    setStatus("idle");
    e.target.value = "";
  };

  return (
    <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/50 p-4">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        Import from .md file
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        Upload a Markdown file. Use optional frontmatter (<code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">title:</code>, <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">excerpt:</code>) or use the first <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">#</code> heading as the title.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Choose Markdown file"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "loading"}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 transition-colors"
      >
        {status === "loading" ? "Importing…" : "Choose .md file"}
      </button>
      {status === "error" && errorMessage && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
