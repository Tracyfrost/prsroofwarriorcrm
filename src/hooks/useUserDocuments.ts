import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

export type UserDocument = Tables<"user_documents">;
export type UserDocumentType = Database["public"]["Enums"]["user_document_type"];

export function useUserDocuments(userId: string | undefined, documentType?: UserDocumentType) {
  return useQuery({
    queryKey: ["user-documents", userId, documentType],
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (documentType) {
        q = q.eq("document_type", documentType);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploadUserDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      userId,
      documentType,
      uploadedBy,
      setAsProfilePicture,
    }: {
      file: File;
      userId: string;
      documentType: UserDocumentType;
      uploadedBy?: string;
      setAsProfilePicture?: boolean;
    }) => {
      const filePath = `${userId}/${documentType}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("user-documents")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("user_documents")
        .insert({
          user_id: userId,
          document_type: documentType,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: uploadedBy ?? null,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      if (setAsProfilePicture && documentType === "profile_pic") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (profile) {
          await supabase
            .from("profiles")
            .update({ profile_picture_url: filePath })
            .eq("id", profile.id);
        }
        qc.invalidateQueries({ queryKey: ["profile-by-user", userId] });
        qc.invalidateQueries({ queryKey: ["profile"] });
        qc.invalidateQueries({ queryKey: ["my-profile-hierarchy"] });
      }

      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["user-documents", variables.userId] });
    },
  });
}

export function useDeleteUserDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: UserDocument) => {
      await supabase.storage.from("user-documents").remove([doc.file_path]);
      const { error } = await supabase.from("user_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-documents"] });
    },
  });
}

export async function getUserDocumentUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("user-documents")
    .createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
