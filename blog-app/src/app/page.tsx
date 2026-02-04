import Link from "next/link";
import { format } from "date-fns";
import { getPosts } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const posts = await getPosts();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Posts</h1>
      {posts.length === 0 ? (
        <p className="text-zinc-500">
          No posts yet. <Link href="/new" className="text-blue-600 hover:underline">Create one</Link>.
        </p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/posts/${post.slug}`}
                className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <h2 className="font-semibold text-lg">{post.title}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                  <time dateTime={post.createdAt.toISOString()}>
                    {format(post.createdAt, "MMM d, yyyy")}
                  </time>
                  <span>{post.views} views</span>
                  <span>♥ {post.likeCount} likes</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
