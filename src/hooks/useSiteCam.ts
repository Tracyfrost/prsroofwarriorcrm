import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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
  created_at: string;
  updated_at: string;
  // joined
  jobs?: { job_id: string; customers: { name: string } | null } | null;
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
    }: {
      jobId: string;
      file: File;
      type?: "photo" | "video";
      tags?: string[];
      caption?: string;
    }) => {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${jobId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("sitecam")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from("sitecam").getPublicUrl(path);

      // Create DB record
      const { data, error } = await supabase
        .from("sitecam_media")
        .insert({
          job_id: jobId,
          type,
          original_path: path,
          tags,
          caption,
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
      caption?: string;
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
    mutationFn: async ({ id, jobId, originalPath }: { id: string; jobId: string; originalPath: string }) => {
      // Delete from storage
      await supabase.storage.from("sitecam").remove([originalPath]);
      // Delete DB record
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
