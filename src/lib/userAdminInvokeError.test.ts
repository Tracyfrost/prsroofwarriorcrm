import { describe, expect, it } from "vitest";
import {
  formatUserAdminHttpError,
  isGenericJwtFailureMessage,
} from "./userAdminInvokeError";

describe("isGenericJwtFailureMessage", () => {
  it("treats empty as generic", () => {
    expect(isGenericJwtFailureMessage("")).toBe(true);
    expect(isGenericJwtFailureMessage("   ")).toBe(true);
  });
  it("detects gateway Invalid JWT", () => {
    expect(isGenericJwtFailureMessage("Invalid JWT")).toBe(true);
    expect(isGenericJwtFailureMessage("invalid jwt")).toBe(true);
  });
  it("does not treat long messages as generic", () => {
    const long = "Invalid JWT and also " + "more context ".repeat(20);
    expect(isGenericJwtFailureMessage(long)).toBe(false);
  });
});

describe("formatUserAdminHttpError", () => {
  it("maps gateway 401 Invalid JWT without string code to friendly hint", () => {
    const msg = formatUserAdminHttpError(
      401,
      { message: "Invalid JWT" },
      "",
    );
    expect(msg).toContain("session could not be verified");
    expect(msg).not.toMatch(/^Invalid JWT$/i);
  });

  it("respects NOT_AUTHENTICATED code", () => {
    expect(
      formatUserAdminHttpError(401, { error: "x", code: "NOT_AUTHENTICATED" }, ""),
    ).toContain("could not be verified");
  });

  it("respects FORBIDDEN code", () => {
    expect(
      formatUserAdminHttpError(403, { error: "Unauthorized: admin role required", code: "FORBIDDEN" }, ""),
    ).toContain("admin role");
  });

  it("respects DUPLICATE_EMAIL code", () => {
    expect(
      formatUserAdminHttpError(409, { error: "exists", code: "DUPLICATE_EMAIL" }, ""),
    ).toContain("exists");
  });
});
