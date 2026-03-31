export const roleMapping = {
  admin: { db: "owner", label: "Admin" },
  manager: { db: "manager", label: "Manager" },
  office: { db: "office_admin", label: "Office" },
  sales: { db: "sales_rep", label: "Sales" },
} as const;

export type UiRole = keyof typeof roleMapping;
export type DbRole = (typeof roleMapping)[UiRole]["db"];

export const uiToDbRole = (uiRole: UiRole): DbRole => roleMapping[uiRole].db;

export const dbToUiRole = (dbRole: string): string => {
  const entry = Object.values(roleMapping).find((r) => r.db === dbRole);
  return entry ? entry.label : dbRole;
};
