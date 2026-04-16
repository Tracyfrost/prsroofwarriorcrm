import type { Database, Json } from "@/integrations/supabase/types";

export type CustomerInsertLeap = Database["public"]["Tables"]["customers"]["Insert"];

/** LEAP Customer Listing export column names (quoted headers in CSV). */
export const LEAP_CUSTOMER_HEADERS = [
  "First Name",
  "Last Name",
  "Company Name",
  "E-mail",
  "Home",
  "Cell",
  "Fax",
  "Office",
  "Phone",
  "Other",
  "Mailing address street",
  "Mailing address City",
  "Mailing address State",
  "Mailing address Zip",
  "Billing Name",
  "Billing address street",
  "Billing address City",
  "Billing address State",
  "Billing address Zip",
  "Canvasser",
  "Call Center Rep",
  "Referred By",
  "Customer Type",
  "Customer Note",
] as const;

export type LeapMapRowResult =
  | { ok: true; record: CustomerInsertLeap }
  | { ok: false; reason: string };

function trimCell(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Strip UTF-8 BOM from keys (common on Windows CSV exports). */
export function normalizeLeapRowKeys(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const nk = k.replace(/^\ufeff/, "").trim();
    out[nk] = v == null ? "" : String(v);
  }
  return out;
}

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (key in row && row[key] != null) return trimCell(row[key]);
  }
  return "";
}

const PHONE_FIELDS: { col: string; type: string }[] = [
  { col: "Cell", type: "mobile" },
  { col: "Home", type: "home" },
  { col: "Office", type: "office" },
  { col: "Phone", type: "primary" },
  { col: "Other", type: "other" },
  { col: "Fax", type: "fax" },
];

/**
 * Map one LEAP Customer Listing row to a `customers` insert payload.
 * Does not run normalization on `leadSourceKey` — caller should pass `normalizeLeadSourceKey(name) ?? name`.
 */
export function mapLeapRowToCustomer(
  rawRow: Record<string, unknown>,
  options: {
    leadSourceKey: string | null;
    createdBy: string | null;
    priorCrmLocation?: string;
  },
): LeapMapRowResult {
  const row = normalizeLeapRowKeys(rawRow);

  const first = pick(row, "First Name");
  const last = pick(row, "Last Name");
  if (!first && !last) {
    return { ok: false, reason: "Missing first and last name" };
  }

  const companyName = pick(row, "Company Name");
  const customerTypeRaw = pick(row, "Customer Type");
  const isCommercial = customerTypeRaw.toLowerCase() === "commercial";
  const customer_type: "residential" | "commercial" = isCommercial ? "commercial" : "residential";

  if (isCommercial && !companyName) {
    return { ok: false, reason: "Commercial customer requires company name" };
  }

  const phones: { type: string; number: string }[] = [];
  for (const { col, type } of PHONE_FIELDS) {
    const num = pick(row, col);
    if (num) phones.push({ type, number: num });
  }

  const email = pick(row, "E-mail", "Email");
  const emails: { type: string; address: string }[] = [];
  if (email) emails.push({ type: "primary", address: email });

  const main_address = {
    street: pick(row, "Mailing address street"),
    city: pick(row, "Mailing address City"),
    state: pick(row, "Mailing address State"),
    zip: pick(row, "Mailing address Zip"),
  };

  const billingStreet = pick(row, "Billing address street");
  const billingCity = pick(row, "Billing address City");
  const billingState = pick(row, "Billing address State");
  const billingZip = pick(row, "Billing address Zip");
  const billingName = pick(row, "Billing Name");

  let billing_address: Json | null = null;
  if (billingStreet || billingCity || billingState || billingZip || billingName) {
    billing_address = {
      street: billingStreet,
      line2: billingName || "",
      city: billingCity,
      state: billingState,
      zip: billingZip,
    } as Json;
  }

  let notes = pick(row, "Customer Note");
  const referred_by = pick(row, "Referred By");
  const canvasser = pick(row, "Canvasser");
  const callCenterRep = pick(row, "Call Center Rep");

  const leapMeta: Record<string, string> = {};
  if (canvasser) leapMeta.canvasser = canvasser;
  if (callCenterRep) leapMeta.call_center_rep = callCenterRep;

  const custom_fields: Record<string, unknown> =
    Object.keys(leapMeta).length > 0 ? { leap: leapMeta } : {};

  const name_json: Json = {
    primary: { first, last },
    spouse: null,
  };

  const name = `${first} ${last}`.trim();

  const record: CustomerInsertLeap = {
    name,
    name_json,
    company_name: companyName || "",
    contact_info: { phones, emails } as Json,
    main_address: main_address as Json,
    billing_address,
    customer_type,
    notes: notes || "",
    referred_by: referred_by || null,
    lead_source: options.leadSourceKey,
    prior_crm_location: options.priorCrmLocation ?? "LEAP",
    custom_fields: (Object.keys(custom_fields).length > 0 ? custom_fields : {}) as Json,
    created_by: options.createdBy,
    customer_number: "auto",
    insurance_carrier: "",
  };

  return { ok: true, record };
}

export type LeapBatchMapResult = {
  records: CustomerInsertLeap[];
  rowErrors: { rowIndex: number; reason: string }[];
};

/** 1-based row numbers in errors match typical spreadsheet rows (header = row 1, first data = row 2). */
export function mapLeapRowsToCustomers(
  rows: Record<string, unknown>[],
  options: {
    leadSourceKey: string | null;
    createdBy: string | null;
    priorCrmLocation?: string;
  },
): LeapBatchMapResult {
  const records: CustomerInsertLeap[] = [];
  const rowErrors: { rowIndex: number; reason: string }[] = [];

  rows.forEach((raw, i) => {
    const res = mapLeapRowToCustomer(raw, options);
    const spreadsheetRow = i + 2;
    if (res.ok) records.push(res.record);
    else rowErrors.push({ rowIndex: spreadsheetRow, reason: res.reason });
  });

  return { records, rowErrors };
}
