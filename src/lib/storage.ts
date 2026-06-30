"use client";
// Upload a café image to Supabase Storage and return its public URL. Runs in the
// browser with the owner's session, so the storage RLS (manager of this café)
// authorizes the write. The returned URL is stored in the menu/brand row exactly
// like any other image src — no resolver needed downstream.
import { createClient } from "@/lib/supabase/client";

const BUCKET = "cafe-public";

export async function uploadCafeImage(
  file: File,
  cafeId: string,
  kind: "logo" | "cover" | "item",
): Promise<string> {
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const path = `${cafeId}/${kind}/${id}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
