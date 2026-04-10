import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function captionFromFileName(fileName: string): string {
  const base = fileName.replace(/^.*[/\\]/, "").trim();
  return base.slice(0, 255) || "Untitled";
}

// Phase 2 (Production War Room): optional production_item_id on site_cam media for per-line tagging.

export interface SiteCamMedia {
  id: string;
  job_id: string;
  type: "photo" | "video";
  original_path: string;
  annotated_path: string | null;
  thumbnail_path: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  tags: string[];
  annotations: any;
  comments: any[];
  is_public: boolean;
  caption: string | null;
  /** Virtual folder; omitted before migration applied */
  folder_id?: string | null;
  created_at: string;
  updated_at: string;
  // joined
  jobs?: { job_id: string; customers: { name: string } | null } | null;
}

export interface SiteCamFolder {
  id: string;
  job_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
}

export interface SiteCamPage {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  media_order: string[];
  layout: any;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Media for a specific job
export function useSiteCamMedia(jobId: string | undefined) {
  return useQuery({
    queryKey: ["sitecam-media", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sitecam_media")
        .select("*")
        .eq("job_id", jobId!)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SiteCamMedia[];
    },
  });
}

// Global feed - all recent media
export function useSiteCamFeed(limit = 50) {
  return useQuery({
    queryKey: ["sitecam-feed", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sitecam_media")
        .select("*, jobs(job_id, customers(name))")
        .order("uploaded_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as SiteCamMedia[];
    },
  });
}

export function useSiteCamFolders(jobId: string | undefined) {
  return useQuery({
    queryKey: ["sitecam-folders", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sitecam_folders")
        .select("*")
        .eq("job_id", jobId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SiteCamFolder[];
    },
  });
}

export function useCreateSiteCamFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      name,
      parentId,
    }: {
      jobId: string;
      name: string;
      parentId?: string | null;
    }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Folder name is required");
      const { data, error } = await supabase
        .from("sitecam_folders")
        .insert({
          job_id: jobId,
          name: trimmed,
          parent_id: parentId ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as SiteCamFolder;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sitecam-folders", data.job_id] });
    },
  });
}

export function useUpdateSiteCamFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Folder name is required");
      const { data, error } = await supabase
        .from("sitecam_folders")
        .update({ name: trimmed } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as SiteCamFolder;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sitecam-folders", data.job_id] });
    },
  });
}

export function useDeleteSiteCamFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { count: mediaCount, error: mediaErr } = await supabase
        .from("sitecam_media")
        .select("id", { count: "exact", head: true })
        .eq("folder_id", id);
      if (mediaErr) throw mediaErr;
      if ((mediaCount ?? 0) > 0) {
        throw new Error("Move or delete photos in this folder first");
      }
      const { count: childCount, error: childErr } = await supabase
        .from("sitecam_folders")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", id);
      if (childErr) throw childErr;
      if ((childCount ?? 0) > 0) {
        throw new Error("Delete subfolders first");
      }
      const { error } = await supabase.from("sitecam_folders").delete().eq("id", id);
      if (error) throw error;
      return { jobId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sitecam-folders", data.jobId] });
      qc.invalidateQueries({ queryKey: ["sitecam-media", data.jobId] });
    },
  });
}

export function useUploadSiteCamMedia() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      jobId,
      file,
      type = "photo",
      tags = [],
      caption,
      folderId,
    }: {
      jobId: string;
      file: File;
      type?: "photo" | "video";
      tags?: string[];
      caption?: string;
      folderId?: string | null;
    }) => {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${jobId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const resolvedCaption = caption ?? captionFromFileName(file.name);

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("sitecam")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      // Create DB record
      const { data, error } = await supabase
        .from("sitecam_media")
        .insert({
          job_id: jobId,
          type,
          original_path: path,
          tags,
          caption: resolvedCaption,
          folder_id: folderId ?? null,
          uploaded_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["sitecam-media", data.job_id] });
      qc.invalidateQueries({ queryKey: ["sitecam-feed"] });
    },
  });
}

export function useUpdateSiteCamMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      tags?: string[];
      caption?: string | null;
      folder_id?: string | null;
      annotations?: any;
      annotated_path?: string;
      is_public?: boolean;
      comments?: any[];
    }) => {
      const { data, error } = await supabase
        .from("sitecam_media")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["sitecam-media", data.job_id] });
      qc.invalidateQueries({ queryKey: ["sitecam-feed"] });
    },
  });
}

export function useDeleteSiteCamMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      jobId,
      originalPath,
      annotatedPath,
      thumbnailPath,
    }: {
      id: string;
      jobId: string;
      originalPath: string;
      annotatedPath?: string | null;
      thumbnailPath?: string | null;
    }) => {
      const paths = [originalPath, annotatedPath, thumbnailPath].filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabase.storage.from("sitecam").remove(paths);
      }
      const { error } = await supabase.from("sitecam_media").delete().eq("id", id);
      if (error) throw error;
      return { jobId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sitecam-media", data.jobId] });
      qc.invalidateQueries({ queryKey: ["sitecam-feed"] });
    },
  });
}

// Pages
export function useSiteCamPages(jobId: string | undefined) {
  return useQuery({
    queryKey: ["sitecam-pages", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sitecam_pages")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SiteCamPage[];
    },
  });
}

export function useCreateSiteCamPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ jobId, title, description }: { jobId: string; title: string; description?: string }) => {
      const { data, error } = await supabase
        .from("sitecam_pages")
        .insert({ job_id: jobId, title, description, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["sitecam-pages", data.job_id] });
    },
  });
}

export async function getMediaUrl(path: string): Promise<string> {
  // Bucket is private — use signed URLs with 1-hour expiry
  const { data, error } = await supabase.storage
    .from("sitecam")
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL:", error);
    return "";
  }
  return data.signedUrl;
}

// Synchronous helper that returns a promise — useful for components
// that need to resolve URLs asynchronously
export function useMediaUrl(path: string | null | undefined) {
  const { data: url } = useQuery({
    queryKey: ["sitecam-signed-url", path],
    enabled: !!path,
    staleTime: 30 * 60 * 1000, // 30 min cache (URL valid for 60 min)
    queryFn: () => getMediaUrl(path!),
  });
  return url ?? "";
}
