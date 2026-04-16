import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";

export type Document = Tables<"documents">;
export type JobDocumentFolder = Tables<"job_document_folders">;
export type JobDocumentFolderScope = Enums<"job_document_folder_scope">;

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

/** Display `documents.file_name` when mirroring `sitecam_media.caption`. */
export function jobFileNameFromSiteCamCaption(caption: string | null | undefined): string {
  const t = caption?.trim() ?? "";
  return t.length > 0 ? t : "Untitled";
}

/** `sitecam_media.caption` value when mirroring Job Files `file_name`. */
export function siteCamCaptionFromJobFileName(fileName: string): string | null {
  const t = fileName.trim();
  if (t.length === 0 || t === "Untitled") return null;
  return t;
}

export async function uploadJobDocument(params: {
  file: File;
  /** When the file body was already read (e.g. PDF text extract), pass bytes here so upload uses a fresh Blob. */
  fileBytes?: ArrayBuffer;
  jobId: string;
  type: Enums<"doc_type">;
  uploadedBy?: string;
  /** Logical Job Files folder (Photos / Docs scopes only). */
  folderId?: string | null;
  /** When set, links this row to SiteCam media for title sync (same-job copy from SiteCam). */
  sitecamMediaId?: string | null;
  /** Overrides `file.name` in `documents.file_name` (e.g. SiteCam caption). */
  displayFileName?: string;
}) {
  const { file, fileBytes, jobId, type, uploadedBy, folderId, sitecamMediaId, displayFileName } = params;
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

  const logicalName = (displayFileName?.trim() || file.name).trim() || "Untitled";

  const { data, error: insertError } = await supabase
    .from("documents")
    .insert({
      job_id: jobId,
      file_path: filePath,
      file_name: logicalName,
      file_size: fileSize,
      type,
      uploaded_by: uploadedBy,
      folder_id: folderId ?? null,
      sitecam_media_id: sitecamMediaId ?? null,
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

export function useJobDocumentFolders(jobId: string | undefined, scope: JobDocumentFolderScope | null) {
  return useQuery({
    queryKey: ["job-document-folders", jobId, scope],
    enabled: !!jobId && !!scope,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_document_folders")
        .select("*")
        .eq("job_id", jobId!)
        .eq("scope", scope!)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as JobDocumentFolder[];
    },
  });
}

export function useCreateJobDocumentFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      jobId: string;
      parentId: string | null;
      name: string;
      scope: JobDocumentFolderScope;
    }) => {
      const name = vars.name.trim();
      if (!name) throw new Error("Folder name is required");
      const { data, error } = await supabase
        .from("job_document_folders")
        .insert({
          job_id: vars.jobId,
          parent_id: vars.parentId,
          name,
          scope: vars.scope,
        })
        .select()
        .single();
      if (error) throw error;
      return data as JobDocumentFolder;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job-document-folders", data.job_id, data.scope] });
    },
  });
}

export function useUpdateJobDocumentFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; name: string; jobId: string; scope: JobDocumentFolderScope }) => {
      const name = vars.name.trim();
      if (!name) throw new Error("Folder name is required");
      const { error } = await supabase.from("job_document_folders").update({ name }).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["job-document-folders", vars.jobId, vars.scope] });
    },
  });
}

export function useDeleteJobDocumentFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (folder: JobDocumentFolder) => {
      const { count: childCount, error: cErr } = await supabase
        .from("job_document_folders")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", folder.id);
      if (cErr) throw cErr;
      if (childCount && childCount > 0) {
        throw new Error("Move or delete subfolders first.");
      }
      const { count: docCount, error: dErr } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("folder_id", folder.id);
      if (dErr) throw dErr;
      if (docCount && docCount > 0) {
        throw new Error("Move or delete files in this folder first.");
      }
      const { error } = await supabase.from("job_document_folders").delete().eq("id", folder.id);
      if (error) throw error;
    },
    onSuccess: (_d, folder) => {
      qc.invalidateQueries({ queryKey: ["job-document-folders", folder.job_id, folder.scope] });
    },
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      jobId: string;
      folderId?: string | null;
      fileName?: string;
    }) => {
      const patch: Record<string, unknown> = {};
      if (vars.folderId !== undefined) {
        patch.folder_id = vars.folderId;
      }
      if (vars.fileName !== undefined) {
        const trimmed = vars.fileName.trim();
        patch.file_name = trimmed.length > 0 ? trimmed : "Untitled";
      }
      if (Object.keys(patch).length === 0) return;
      const { data: row, error } = await supabase
        .from("documents")
        .update(patch)
        .eq("id", vars.id)
        .select("sitecam_media_id")
        .single();
      if (error) throw error;
      if (vars.fileName !== undefined && row?.sitecam_media_id) {
        const cap = siteCamCaptionFromJobFileName(String(patch.file_name));
        const { error: scErr } = await supabase
          .from("sitecam_media")
          .update({ caption: cap })
          .eq("id", row.sitecam_media_id);
        if (scErr) throw scErr;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["documents", vars.jobId] });
      if (vars.fileName !== undefined) {
        qc.invalidateQueries({ queryKey: ["sitecam-media", vars.jobId] });
        qc.invalidateQueries({ queryKey: ["sitecam-feed"] });
      }
    },
  });
}

/** Cached signed URL for thumbnails/previews (align with ~1h token). */
export function useDocumentSignedUrl(filePath: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["document-signed-url", filePath],
    queryFn: () => getDocumentUrl(filePath!),
    enabled: Boolean(filePath && enabled),
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
  });
}

export function useMoveDocumentsToFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { ids: string[]; jobId: string; folderId: string | null }) => {
      if (vars.ids.length === 0) return;
      const { error } = await supabase
        .from("documents")
        .update({ folder_id: vars.folderId })
        .in("id", vars.ids)
        .eq("job_id", vars.jobId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["documents", vars.jobId] });
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
      folderId?: string | null;
      sitecamMediaId?: string | null;
      displayFileName?: string;
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

/** Root-to-folder chain for breadcrumbs (excludes other branches). */
export function jobFolderAncestors(
  folderId: string | null,
  folders: JobDocumentFolder[],
): JobDocumentFolder[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const segments: JobDocumentFolder[] = [];
  let id: string | null = folderId;
  const guard = new Set<string>();
  while (id) {
    if (guard.has(id)) break;
    guard.add(id);
    const f = byId.get(id);
    if (!f) break;
    segments.unshift(f);
    id = f.parent_id;
  }
  return segments;
}

export function jobFolderLabelPath(folderId: string | null, folders: JobDocumentFolder[]): string {
  const chain = jobFolderAncestors(folderId, folders);
  if (chain.length === 0) return "Root";
  return chain.map((f) => f.name).join(" / ");
}

export async function getDocumentUrl(filePath: string) {
  const { data, error } = await supabase.storage.from("job-documents").createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
