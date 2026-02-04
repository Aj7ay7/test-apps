import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, updatePostAndRedirect } from "@/lib/actions";
import { DeletePostButton } from "@/components/DeletePostButton";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/posts/${slug}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Edit post</h1>
      </div>
      <form
        action={updatePostAndRedirect.bind(null, post.id)}
        className="space-y-4"
      >
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={post.title}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium mb-1">
            Excerpt
          </label>
          <input
            id="excerpt"
            name="excerpt"
            maxLength={600}
            defaultValue={post.excerpt}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-1">
            Content (Markdown)
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={16}
            defaultValue={post.content}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <Link
              href={`/posts/${slug}`}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </Link>
          </div>
          <DeletePostButton slug={slug} />
        </div>
      </form>
    </div>
  );
}
