import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BUCKET       = "photos";

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadFile(path, file, onProgress) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  if (onProgress) onProgress(1);
  return { url: urlData.publicUrl, fullPath: data.path };
}

export async function deleteFile(fullPath) {
  if (!fullPath) return;
  await supabase.storage.from(BUCKET).remove([fullPath]).catch(() => {});
}
