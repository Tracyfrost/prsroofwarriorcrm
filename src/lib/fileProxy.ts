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
  // Open the tab synchronously so the browser doesn't block it as a popup.
  // All subsequent awaits happen after the tab is already open.
  const newTab = window.open("", "_blank");
  if (!newTab) {
    throw new Error("Popup blocked — please allow popups for this site.");
  }
  newTab.document.title = "Loading\u2026";
  newTab.document.body.innerText = "Loading file\u2026";

  try {
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
    newTab.location.href = blobUrl;
  } catch (err) {
    newTab.close();
    throw err;
  }
}
