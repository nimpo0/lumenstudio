import { createClient } from "@supabase/supabase-js";

const BUCKET = "photos";
let _client = null;

function getClient() {
  if (_client) return _client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars не налаштовано (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
  _client = createClient(url, key);
  return _client;
}

export function getSupabase() {
  return getClient();
}

export async function signInWithGoogleSupabase() {
  const client = getClient();
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

export async function getSupabaseSession() {
  const client = getClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function uploadFile(path, file, onProgress) {
  const client = getClient();
  const { data, error } = await client.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });

  if (error) throw error;

  const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(data.path);
  if (onProgress) onProgress(1);
  return { url: urlData.publicUrl, fullPath: data.path };
}

export async function deleteFile(fullPath) {
  if (!fullPath) return;
  const client = getClient();
  await client.storage.from(BUCKET).remove([fullPath]).catch(() => {});
}
