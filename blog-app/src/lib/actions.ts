"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import slugify from "slugify";

const defaultFingerprint = "anonymous";

export async function getPosts() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { likes: true } },
    },
  });
  return posts.map((p) => ({
    ...p,
    likeCount: p._count.likes,
  }));
}

export async function getPostBySlug(slug: string) {
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      _count: { select: { likes: true } },
    },
  });
  if (!post) return null;
  return { ...post, likeCount: post._count.likes };
}

export async function getPostById(id: string) {
  return prisma.post.findUnique({ where: { id } });
}

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  if (!title?.trim() || !content?.trim()) {
    return { error: "Title and content are required." };
  }
  const baseSlug = slugify(title, { lower: true, strict: true }) || "post";
  let slug = baseSlug;
  let n = 0;
  while (await prisma.post.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }
  await prisma.post.create({
    data: {
      title: title.trim(),
      slug,
      excerpt: (excerpt || title).trim().slice(0, 600),
      content: content.trim(),
    },
  });
  revalidatePath("/");
  return { slug };
}

export async function createPostAndRedirect(formData: FormData) {
  const result = await createPost(formData);
  if (result.slug) redirect(`/posts/${result.slug}`);
}

export async function createPostFromMarkdown(payload: {
  title: string;
  excerpt: string;
  content: string;
}) {
  const { title, excerpt, content } = payload;
  if (!title?.trim() || !content?.trim()) {
    return { error: "Title and content are required." };
  }
  const baseSlug = slugify(title, { lower: true, strict: true }) || "post";
  let slug = baseSlug;
  let n = 0;
  while (await prisma.post.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }
  await prisma.post.create({
    data: {
      title: title.trim(),
      slug,
      excerpt: (excerpt || title).trim().slice(0, 600),
      content: content.trim(),
    },
  });
  revalidatePath("/");
  return { slug };
}

export async function updatePost(id: string, formData: FormData) {
  const title = formData.get("title") as string;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  if (!title?.trim() || !content?.trim()) {
    return { error: "Title and content are required." };
  }
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return { error: "Post not found." };
  const baseSlug = slugify(title, { lower: true, strict: true }) || "post";
  let slug = baseSlug;
  if (slug !== existing.slug) {
    let n = 0;
    while (await prisma.post.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++n}`;
    }
  } else {
    slug = existing.slug;
  }
  await prisma.post.update({
    where: { id },
    data: {
      title: title.trim(),
      slug,
      excerpt: (excerpt || title).trim().slice(0, 600),
      content: content.trim(),
    },
  });
  revalidatePath("/");
  revalidatePath(`/posts/${existing.slug}`);
  revalidatePath(`/posts/${slug}`);
  return { slug };
}

export async function updatePostAndRedirect(id: string, formData: FormData) {
  const result = await updatePost(id, formData);
  if (result.slug) redirect(`/posts/${result.slug}`);
}

export async function deletePost(id: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { error: "Post not found." };
  await prisma.post.delete({ where: { id } });
  revalidatePath("/");
  return { ok: true };
}

export async function incrementViews(slug: string) {
  await prisma.post.update({
    where: { slug },
    data: { views: { increment: 1 } },
  });
  revalidatePath(`/posts/${slug}`);
}

export async function toggleLike(postId: string, fingerprint: string = defaultFingerprint) {
  const existing = await prisma.like.findUnique({
    where: { postId_fingerprint: { postId, fingerprint } },
  });
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    revalidatePath("/");
  } else {
    await prisma.like.create({
      data: { postId, fingerprint },
    });
    revalidatePath("/");
  }
  const count = await prisma.like.count({ where: { postId } });
  return { count, liked: !existing };
}

export async function getLikeStatus(postId: string, fingerprint: string = defaultFingerprint) {
  const like = await prisma.like.findUnique({
    where: { postId_fingerprint: { postId, fingerprint } },
  });
  return { liked: !!like };
}
