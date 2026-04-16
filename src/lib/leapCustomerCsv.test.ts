import { describe, expect, it } from "vitest";
import {
  mapLeapRowToCustomer,
  mapLeapRowsToCustomers,
  normalizeLeapRowKeys,
} from "@/lib/leapCustomerCsv";

describe("leapCustomerCsv", () => {
  it("normalizeLeapRowKeys strips BOM from first column key", () => {
    const raw = { "\ufeffFirst Name": "A", "Last Name": "B" };
    const n = normalizeLeapRowKeys(raw);
    expect(n["First Name"]).toBe("A");
    expect(n["Last Name"]).toBe("B");
  });

  it("mapLeapRowToCustomer maps LEAP sample-shaped row", () => {
    const row = {
      "First Name": "Taylor",
      "Last Name": "JACKSON",
      "Company Name": "",
      "E-mail": "teamtjacks@gmail.com",
      Home: "",
      Cell: "2147837253",
      Fax: "",
      Office: "",
      Phone: "",
      Other: "",
      "Mailing address street": "724 English Drive",
      "Mailing address City": "Aubrey",
      "Mailing address State": "Texas",
      "Mailing address Zip": "76227",
      "Billing Name": "",
      "Billing address street": "724 English Drive",
      "Billing address City": "Aubrey",
      "Billing address State": "Texas",
      "Billing address Zip": "76227",
      Canvasser: "",
      "Call Center Rep": "",
      "Referred By": "",
      "Customer Type": "Residential",
      "Customer Note": "Line1\nLine2\n• Phone: (214) 783-8569",
    };

    const res = mapLeapRowToCustomer(row, {
      leadSourceKey: "referral",
      createdBy: "user-uuid-1",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.record.name).toBe("Taylor JACKSON");
    expect(res.record.lead_source).toBe("referral");
    expect(res.record.prior_crm_location).toBe("LEAP");
    expect(res.record.customer_type).toBe("residential");
    expect(res.record.company_name).toBe("");
    const contact = res.record.contact_info as {
      phones: { type: string; number: string }[];
      emails: { type: string; address: string }[];
    };
    expect(contact.emails).toEqual([{ type: "primary", address: "teamtjacks@gmail.com" }]);
    expect(contact.phones).toEqual([{ type: "mobile", number: "2147837253" }]);
    const main = res.record.main_address as Record<string, string>;
    expect(main.street).toBe("724 English Drive");
    expect(main.city).toBe("Aubrey");
    expect(main.state).toBe("Texas");
    expect(main.zip).toBe("76227");
    expect(res.record.notes).toContain("Line1");
    expect(res.record.notes).toContain("783-8569");
    expect(res.record.created_by).toBe("user-uuid-1");
    expect(res.record.customer_number).toBe("auto");
  });

  it("skips row with no name", () => {
    const res = mapLeapRowToCustomer({ "First Name": "", "Last Name": "  " }, {
      leadSourceKey: "other",
      createdBy: null,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/name/i);
  });

  it("skips commercial without company name", () => {
    const res = mapLeapRowToCustomer(
      {
        "First Name": "A",
        "Last Name": "B",
        "Customer Type": "Commercial",
        "Company Name": "",
      },
      { leadSourceKey: "other", createdBy: null },
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/company/i);
  });

  it("mapLeapRowsToCustomers collects row errors with spreadsheet row numbers", () => {
    const { records, rowErrors } = mapLeapRowsToCustomers(
      [
        { "First Name": "A", "Last Name": "B", "Customer Type": "Residential" },
        { "First Name": "", "Last Name": "", "Customer Type": "Residential" },
      ],
      { leadSourceKey: "website", createdBy: null },
    );
    expect(records).toHaveLength(1);
    expect(rowErrors).toEqual([{ rowIndex: 3, reason: "Missing first and last name" }]);
  });
});
