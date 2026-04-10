import { describe, expect, it } from "vitest";
import { parseGafRoofAreaSqFt, sqFtToRoofingSquares } from "./quickMeasureParse";

describe("parseGafRoofAreaSqFt", () => {
  it("parses comma-separated sq ft", () => {
    expect(parseGafRoofAreaSqFt("Roof Area 26,200 sq ft total")).toBe(26200);
  });

  it("is case-insensitive", () => {
    expect(parseGafRoofAreaSqFt("roof area 1900 SQ FT")).toBe(1900);
  });

  it("returns null when missing", () => {
    expect(parseGafRoofAreaSqFt("No roof data")).toBeNull();
  });
});

describe("sqFtToRoofingSquares", () => {
  it("converts to roofing squares with 2 decimal places", () => {
    expect(sqFtToRoofingSquares(2500)).toBe(25);
    expect(sqFtToRoofingSquares(2537)).toBe(25.37);
  });
});
