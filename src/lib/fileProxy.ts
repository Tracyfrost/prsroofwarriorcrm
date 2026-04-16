import { supabase } from "@/integrations/supabase/client";

/**
 * Opens a file through the server-side proxy so the browser address bar
 * shows our own domain instead of a raw Supabase signed URL.
 *
 * The proxy authenticates the request using the current Supabase session token,
 * fetches the file with the service-role key, and streams it back.
 */
export async function openFileViaProxy(
  bucket: string,
  storagePath: string,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("You must be signed in to view files.");
  }

  const params = new URLSearchParams({ bucket, path: storagePath });
  const proxyUrl = `/api/file-proxy?${params.toString()}`;

  const resp = await fetch(proxyUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    throw new Error("Could not load file.");
  }

  const blob = await resp.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
}
