import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";

export type Document = Tables<"documents">;

function storageFolderForDocType(type: string): string {
  if (type === "photo") return "photos";
  if (type === "measurements") return "measurements";
  return "files";
}

/** Safe segment for Storage object path; original name stays in `documents.file_name`. */
function sanitizeStorageFileName(original: string): string {
  const trimmed = original.trim() || "upload";
  const withoutPath = trimmed.replace(/[/\\]/g, "_");
  const safe = withoutPath.replace(/[^\w.\- ()[\]]+/g, "_").replace(/_+/g, "_").replace(/^\.+|\.+$/g, "");
  const base = safe.length > 0 ? safe : `file_${Date.now()}`;
  return base.length > 200 ? base.slice(0, 200) : base;
}

export function formatSupabaseErr(err: unknown): string {
  if (err instanceof Error) {
    const e = err as Error & { details?: string; hint?: string; code?: string };
    const parts: string[] = [e.message];
    if (e.details) parts.push(e.details);
    if (e.hint) parts.push(e.hint);
    if (e.code) parts.push(`(${e.code})`);
    return parts.filter(Boolean).join(" — ");
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export async function uploadJobDocument(params: {
  file: File;
  /** When the file body was already read (e.g. PDF text extract), pass bytes here so upload uses a fresh Blob. */
  fileBytes?: ArrayBuffer;
  jobId: string;
  type: Enums<"doc_type">;
  uploadedBy?: string;
}) {
  const { file, fileBytes, jobId, type, uploadedBy } = params;
  const folder = storageFolderForDocType(type);
  const safeName = sanitizeStorageFileName(file.name);
  const filePath = `${jobId}/${folder}/${Date.now()}_${safeName}`;

  const bytes = fileBytes ?? (await file.arrayBuffer());
  const fileSize = bytes.byteLength;
  const mime = file.type || "application/octet-stream";
  const body = new Blob([bytes], { type: mime });

  const { error: uploadError } = await supabase.storage.from("job-documents").upload(filePath, body, {
    contentType: mime,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("documents")
    .insert({
      job_id: jobId,
      file_path: filePath,
      file_name: file.name,
      file_size: fileSize,
      type,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (insertError) {
    try {
      await supabase.storage.from("job-documents").remove([filePath]);
    } catch {
      /* best-effort cleanup */
    }
    throw insertError;
  }
  return data;
}

export function useDocuments(jobId?: string) {
  return useQuery({
    queryKey: ["documents", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      file: File;
      fileBytes?: ArrayBuffer;
      jobId: string;
      type: Enums<"doc_type">;
      uploadedBy?: string;
    }) => {
      return uploadJobDocument(vars);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["documents", variables.jobId] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: Document) => {
      await supabase.storage.from("job-documents").remove([doc.file_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export async function getDocumentUrl(filePath: string) {
  const { data, error } = await supabase.storage.from("job-documents").createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
