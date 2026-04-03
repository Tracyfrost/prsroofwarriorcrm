/**
 * Job ordering worksheet rows — seeded for new jobs; merged with saved `job_ordering_lines` by `key`.
 */
export type JobOrderingLine = {
  key: string;
  /** First numeric column (e.g. bundle / width) */
  q1: string;
  label: string;
  /** Primary quantity */
  q2: string;
  q3: string;
  valley50ft: string;
  valley25ft: string;
  flag: boolean;
};

export const DEFAULT_JOB_ORDERING_LINES: JobOrderingLine[] = [
  { key: "header_30yr", q1: "28.00", label: "30 Year", q2: "", q3: "Final Totals", valley50ft: "", valley25ft: "", flag: false },
  { key: "shingles", q1: "28.00", label: "Shingles", q2: "84.0", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "hip_ridge", q1: "79", label: "Hip & Ridge", q2: "2.6", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "drip_edge", q1: "188", label: "Drip Edge", q2: "22", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "starter", q1: "188", label: "Starter", q2: "2.0", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "felt", q1: "2318.15", label: "Felt", q2: "3", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "valley", q1: "", label: "Valley", q2: "50FT:", q3: "", valley50ft: "", valley25ft: "25FT:", flag: false },
  { key: "three_in_one", q1: "2", label: "3 in 1", q2: "2", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "four_in_one", q1: "", label: "4 in 1", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "turbines", q1: "", label: "Turbines", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "exhaust_cap", q1: "", label: "Exhaust Cap", q2: "3-5\"", q3: "", valley50ft: "", valley25ft: "5-7\"", flag: false },
  { key: "turtle_vent", q1: "2", label: "Turtle Vent", q2: "2", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "lead_jacks", q1: "", label: "Lead Jacks", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "special_vent", q1: "", label: "Special Vent", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "slant_backs", q1: "", label: "Slant Backs", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "power_vent_cover", q1: "", label: "Power Vent Cover", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "roof_jack", q1: "", label: "Roof Jack", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "ridge_vent", q1: "", label: "Ridge Vent", q2: "0", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "rain_diverter", q1: "", label: "Rain Diverter", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "z_ridge", q1: "", label: "Z Ridge", q2: "0", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "nails", q1: "2", label: "Nails", q2: "1", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "caps", q1: "1", label: "Caps", q2: "1", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "osb_decking", q1: "", label: "OSB Decking", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "dryer_vent", q1: "", label: "Dryer Vent", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "installer_header", q1: "", label: "Installer Price", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "bundles_shingles", q1: "84", label: "Bundles of Shingles", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "bundles_starter", q1: "2.0", label: "Bundles of Starter", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "bundles_ridge", q1: "3", label: "Bundles of Ridge", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
  { key: "total_paying_installer", q1: "29.54", label: "Total Paying Installer", q2: "", q3: "", valley50ft: "", valley25ft: "", flag: false },
];

export function mergeJobOrderingLines(saved: unknown): JobOrderingLine[] {
  if (!Array.isArray(saved)) return DEFAULT_JOB_ORDERING_LINES.map((r) => ({ ...r }));
  const byKey = new Map<string, JobOrderingLine>();
  for (const row of saved) {
    if (row && typeof row === "object" && typeof (row as JobOrderingLine).key === "string") {
      const r = row as Partial<JobOrderingLine>;
      byKey.set(r.key!, {
        key: r.key!,
        q1: String(r.q1 ?? ""),
        label: String(r.label ?? ""),
        q2: String(r.q2 ?? ""),
        q3: String(r.q3 ?? ""),
        valley50ft: String(r.valley50ft ?? (r as any).valley50 ?? ""),
        valley25ft: String(r.valley25ft ?? (r as any).valley25 ?? ""),
        flag: Boolean(r.flag),
      });
    }
  }
  return DEFAULT_JOB_ORDERING_LINES.map((def) => {
    const s = byKey.get(def.key);
    return s ? { ...def, ...s } : { ...def };
  });
}
