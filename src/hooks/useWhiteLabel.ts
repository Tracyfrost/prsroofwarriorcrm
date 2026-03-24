import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WhiteLabelConfig = {
  id: string;
  tenant_id: string;
  company_name: string;
  app_name?: string | null;
  logo_url: string | null;
  colors: Record<string, string>;
  icon_style: string;
  tooltip_phrases: Record<string, string> | null;
  theme_pack: string | null;
};

const DEFAULT_CONFIG: Omit<WhiteLabelConfig, "id" | "tenant_id"> = {
  company_name: "Warrior Command",
  app_name: "PRS CRM",
  logo_url: null,
  colors: {
    command_slate: "210 30% 15%",
    command_olive: "85 30% 35%",
    command_amber: "38 92% 50%",
    command_iron: "210 15% 40%",
  },
  icon_style: "knot-shield",
  tooltip_phrases: null,
  theme_pack: null,
};

export function useWhiteLabel() {
  return useQuery({
    queryKey: ["white-label-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("white_label_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data
        ? ({
            id: data.id,
            tenant_id: data.tenant_id,
            company_name: data.company_name,
            app_name: data.app_name ?? null,
            logo_url: data.logo_url,
            colors: data.colors as Record<string, string>,
            icon_style: data.icon_style,
            tooltip_phrases: (data as any).tooltip_phrases as Record<string, string> | null,
            theme_pack: (data as any).theme_pack as string | null,
          } as WhiteLabelConfig)
        : null;
    },
  });
}

export function useWhiteLabelDefaults() {
  const { data } = useWhiteLabel();
  return {
    companyName: data?.company_name ?? DEFAULT_CONFIG.company_name,
    appName: data?.app_name ?? data?.company_name ?? DEFAULT_CONFIG.app_name!,
    logoUrl: data?.logo_url ?? DEFAULT_CONFIG.logo_url,
    colors: data?.colors ?? DEFAULT_CONFIG.colors,
    iconStyle: data?.icon_style ?? DEFAULT_CONFIG.icon_style,
    tooltipPhrases: data?.tooltip_phrases ?? {},
    themePack: data?.theme_pack ?? "warrior",
  };
}

export function useAppName() {
  const { appName } = useWhiteLabelDefaults();
  return appName;
}

export function useUpdateWhiteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<WhiteLabelConfig> & { id: string }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase
        .from("white_label_config")
        .update(rest as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["white-label-config"] }),
  });
}

export function useCreateWhiteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: Omit<WhiteLabelConfig, "id">) => {
      const { data, error } = await supabase
        .from("white_label_config")
        .insert(config as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["white-label-config"] }),
  });
}
