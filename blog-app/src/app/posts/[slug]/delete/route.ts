import { deletePost } from "@/lib/actions";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await import("@/lib/actions").then((a) => a.getPostBySlug(slug));
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deletePost(post.id);
  return NextResponse.json({ ok: true });
}
