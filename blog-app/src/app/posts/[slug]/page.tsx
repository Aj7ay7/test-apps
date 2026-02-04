import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { getPostBySlug } from "@/lib/actions";
import { MarkdownContent } from "@/components/MarkdownContent";
import { LikeButton } from "@/components/LikeButton";
import { ViewTracker } from "@/components/ViewTracker";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <>
      <ViewTracker slug={slug} />
      <article className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Back to posts
          </Link>
        </div>
        <header>
          <h1 className="text-3xl font-bold">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-zinc-500">
            <time dateTime={post.createdAt.toISOString()}>
              {format(post.createdAt, "MMMM d, yyyy")}
            </time>
            <span>{post.views} views</span>
            <LikeButton
              postId={post.id}
              initialCount={post.likeCount}
              initialLiked={false}
            />
          </div>
        </header>
        <div className="pt-2">
          <MarkdownContent content={post.content} />
        </div>
        <footer className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
          <Link
            href={`/posts/${slug}/edit`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit post
          </Link>
        </footer>
      </article>
    </>
  );
}
