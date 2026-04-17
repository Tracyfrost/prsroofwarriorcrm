import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Customer = Tables<"customers">;

export function useCustomer(id: string | undefined, options?: { includeArchived?: boolean }) {
  const includeArchived = options?.includeArchived ?? false;
  return useQuery({
    queryKey: ["customer", id, includeArchived],
    enabled: !!id,
    queryFn: async () => {
      let query = supabase.from("customers").select("*").eq("id", id!);
      if (!includeArchived) {
        query = query.is("archived_at", null);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });
}

export function useArchivedCustomers() {
  return useQuery({
    queryKey: ["customers", "archived"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });
}

export type CustomerJob = Tables<"jobs"> & {
  payment_checks?: { amount: number; status: string }[];
};

export function useCustomerJobs(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-jobs", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, payment_checks(amount, status)")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerJob[];
    },
  });
}

export function useCustomerAppointments(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-appointments", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, jobs(id, job_id, customer_id)")
        .or(`customer_id.eq.${customerId!},jobs.customer_id.eq.${customerId!}`)
        .order("date_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCustomerDocuments(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-documents", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, jobs!inner(id, job_id, customer_id)")
        .eq("jobs.customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Count jobs per customer for the list view */
export function useCustomerJobCounts() {
  return useQuery({
    queryKey: ["customer-job-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("customer_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((j) => {
        counts[j.customer_id] = (counts[j.customer_id] || 0) + 1;
      });
      return counts;
    },
  });
}
