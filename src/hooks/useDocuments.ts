import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Document = Tables<"documents">;

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
    mutationFn: async ({
      file,
      jobId,
      type,
      uploadedBy,
    }: {
      file: File;
      jobId: string;
      type: string;
      uploadedBy?: string;
    }) => {
      const filePath = `${jobId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("job-documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("documents")
        .insert({
          job_id: jobId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          type: type as any,
          uploaded_by: uploadedBy,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      return data;
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
      // Delete from storage
      await supabase.storage.from("job-documents").remove([doc.file_path]);
      // Delete from DB
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export async function getDocumentUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("job-documents")
    .createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
