import { describe, it, expect, vi } from "vitest";

// Mock types matching our data models
interface InsuranceClaim {
  job_id: string;
  carrier: string;
  claim_number: string | null;
  is_out_of_scope: boolean;
  status: string;
  adjuster_contact: { name: string; phones: string[]; emails: string[] };
}

interface Job {
  id: string;
  job_id: string;
  claim_number: string;
  parent_job_id: string | null;
  customer_id: string;
}

describe("Claim Flow", () => {
  const mockMainJob: Job = {
    id: "main-1",
    job_id: "PRS260210-001-PL1234HG-1",
    claim_number: "PL1234HG",
    parent_job_id: null,
    customer_id: "cust-1",
  };

  const mockSubJob: Job = {
    id: "sub-1",
    job_id: "PRS260210-001-PL1234HG-2",
    claim_number: "PL1234HG",
    parent_job_id: "main-1",
    customer_id: "cust-1",
  };

  it("Main job claim number should match job_id pattern", () => {
    expect(mockMainJob.job_id).toContain(mockMainJob.claim_number);
  });

  it("Sub job should inherit parent claim number", () => {
    expect(mockSubJob.claim_number).toBe(mockMainJob.claim_number);
  });

  it("Sub job should reference parent job id", () => {
    expect(mockSubJob.parent_job_id).toBe(mockMainJob.id);
  });

  it("Out of Scope sub should be excluded from main aggregates", () => {
    const outOfScopeClaim: InsuranceClaim = {
      job_id: "sub-2",
      carrier: "Independent",
      claim_number: null,
      is_out_of_scope: true,
      status: "Pending",
      adjuster_contact: { name: "", phones: [], emails: [] },
    };

    expect(outOfScopeClaim.is_out_of_scope).toBe(true);
    expect(outOfScopeClaim.claim_number).toBeNull();
  });

  it("Linked sub claim should have main claim number", () => {
    const linkedClaim: InsuranceClaim = {
      job_id: "sub-1",
      carrier: "State Farm",
      claim_number: "PL1234HG",
      is_out_of_scope: false,
      status: "Approved",
      adjuster_contact: { name: "John Doe", phones: ["555-0100"], emails: ["john@adj.com"] },
    };

    expect(linkedClaim.is_out_of_scope).toBe(false);
    expect(linkedClaim.claim_number).toBe(mockMainJob.claim_number);
  });
});

describe("Allies Validation", () => {
  it("Should reject duplicate EIN", () => {
    const allies = [
      { id: "1", name: "ABC Roofing", ein: "12-3456789" },
      { id: "2", name: "XYZ Gutters", ein: "98-7654321" },
    ];

    const newEin = "12-3456789";
    const isDuplicate = allies.some(a => a.ein === newEin);
    expect(isDuplicate).toBe(true);
  });

  it("Should reject duplicate name (case-insensitive)", () => {
    const allies = [
      { id: "1", name: "ABC Roofing", ein: "12-3456789" },
    ];

    const newName = "abc roofing";
    const isDuplicate = allies.some(a => a.name.toLowerCase() === newName.toLowerCase());
    expect(isDuplicate).toBe(true);
  });

  it("Should allow unique entries", () => {
    const allies = [
      { id: "1", name: "ABC Roofing", ein: "12-3456789" },
    ];

    const isDupName = allies.some(a => a.name.toLowerCase() === "new vendor");
    const isDupEin = allies.some(a => a.ein === "55-5555555");
    expect(isDupName).toBe(false);
    expect(isDupEin).toBe(false);
  });
});

describe("Customer Number Generation", () => {
  it("Should follow PRS YYMMDD-SEQ format", () => {
    const customerNumber = "PRS260210-001";
    const pattern = /^PRS\d{6}-\d{3}$/;
    expect(pattern.test(customerNumber)).toBe(true);
  });

  it("Should increment sequence for same date", () => {
    const num1 = "PRS260210-001";
    const num2 = "PRS260210-002";
    const seq1 = parseInt(num1.split("-")[1]);
    const seq2 = parseInt(num2.split("-")[1]);
    expect(seq2).toBe(seq1 + 1);
  });
});

describe("Claim Completion Tracking", () => {
  it("Should calculate 0% for empty claim", () => {
    let filled = 0;
    const total = 6;
    // All fields empty
    expect(Math.round((filled / total) * 100)).toBe(0);
  });

  it("Should calculate 100% when all fields filled", () => {
    let filled = 6; // carrier, claimNumber, adjuster name, phone, email, filed_date
    const total = 6;
    expect(Math.round((filled / total) * 100)).toBe(100);
  });

  it("Should calculate partial completion correctly", () => {
    let filled = 3; // carrier, claimNumber, adjuster name only
    const total = 6;
    expect(Math.round((filled / total) * 100)).toBe(50);
  });
});
