"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.min.css";

function CodeBlock({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLPreElement>) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const code = ref.current?.querySelector("code")?.textContent ?? "";
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre ref={ref} className={className} {...props}>
        {children}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export function MarkdownContent({ content }: { content: string }) {
  return (
    <article className="prose prose-zinc dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: CodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
