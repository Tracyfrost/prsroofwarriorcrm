import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CLAIM_STATUSES = ["Pending", "Approved", "Denied", "Settled"] as const;
export type ClaimStatus = typeof CLAIM_STATUSES[number];

export type AdjusterContact = {
  name: string;
  phones: string[];
  emails: string[];
};

export type InsuranceClaim = {
  id: string;
  job_id: string;
  carrier: string;
  adjuster_contact: AdjusterContact;
  claim_number: string | null;
  filed_date: string | null;
  approved_date: string | null;
  closed_date: string | null;
  status: ClaimStatus;
  policy_number: string | null;
  notes: string | null;
  is_out_of_scope: boolean;
  created_at: string;
  updated_at: string;
};

export function useInsuranceClaim(jobId: string | undefined) {
  return useQuery({
    queryKey: ["insurance-claim", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("insurance_claims")
        .select("*")
        .eq("job_id", jobId!)
        .maybeSingle();
      if (error) throw error;
      return data as InsuranceClaim | null;
    },
  });
}

export function useUpsertInsuranceClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (claim: Partial<InsuranceClaim> & { job_id: string }) => {
      // Try update first, then insert
      const { data: existing } = await (supabase as any)
        .from("insurance_claims")
        .select("id")
        .eq("job_id", claim.job_id)
        .maybeSingle();

      if (existing) {
        const { id: _id, job_id: _jid, created_at: _ca, updated_at: _ua, ...updates } = claim;
        const { data, error } = await (supabase as any)
          .from("insurance_claims")
          .update(updates)
          .eq("job_id", claim.job_id)
          .select()
          .single();
        if (error) throw error;
        return data as InsuranceClaim;
      } else {
        const { data, error } = await (supabase as any)
          .from("insurance_claims")
          .insert(claim)
          .select()
          .single();
        if (error) throw error;
        return data as InsuranceClaim;
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["insurance-claim", data.job_id] });
    },
  });
}

export function useDeleteInsuranceClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { error } = await (supabase as any)
        .from("insurance_claims")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { jobId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["insurance-claim", data.jobId] });
    },
  });
}
