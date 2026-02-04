import { createPostAndRedirect } from "@/lib/actions";
import Link from "next/link";
import { ImportMarkdown } from "@/components/ImportMarkdown";

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">New post</h1>
      </div>

      <ImportMarkdown />

      <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Or write manually</h2>
        <form action={createPostAndRedirect} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Post title"
          />
        </div>
        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium mb-1">
            Excerpt (optional)
          </label>
          <input
            id="excerpt"
            name="excerpt"
            maxLength={600}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Short summary"
          />
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-1">
            Content (Markdown with code blocks supported)
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={16}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Write in Markdown. Use ``` for code blocks."
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Publish
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
      </div>
    </div>
  );
}
