"use client";

import { useEffect } from "react";
import { incrementViews } from "@/lib/actions";

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    incrementViews(slug);
  }, [slug]);
  return null;
}
