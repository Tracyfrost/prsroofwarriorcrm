import { describe, expect, it } from "vitest";
import { resolvePlanningRoofSquares } from "./roofSquares";

const jobBase = {
  squares_actual_installed: null as number | null,
  squares_final: null as number | null,
  number_of_squares: null as number | null,
};

describe("resolvePlanningRoofSquares", () => {
  it("prefers squares_estimated when > 0", () => {
    expect(
      resolvePlanningRoofSquares(
        { ...jobBase, squares_estimated: 42, squares_actual_installed: 99 },
        { scope_sq_all_structures: "50 SQ", estimate_roof_sq: 30 },
      ),
    ).toBe(42);
  });

  it("ignores squares_estimated when 0 or negative and uses scope", () => {
    expect(
      resolvePlanningRoofSquares({ ...jobBase, squares_estimated: 0 }, { scope_sq_all_structures: "Approx 27.5 total" }),
    ).toBe(27.5);
  });

  it("parses first number from scope text", () => {
    expect(
      resolvePlanningRoofSquares({ ...jobBase }, { scope_sq_all_structures: "Scope: 33 squares all structures" }),
    ).toBe(33);
  });

  it("uses estimate_roof_sq when scope empty or non-numeric", () => {
    expect(
      resolvePlanningRoofSquares({ ...jobBase }, { scope_sq_all_structures: "", estimate_roof_sq: 19 }),
    ).toBe(19);
  });

  it("coerces string estimate_roof_sq", () => {
    expect(resolvePlanningRoofSquares({ ...jobBase }, { estimate_roof_sq: "12" as unknown as number })).toBe(12);
  });

  it("falls back installed → final → number_of_squares", () => {
    expect(resolvePlanningRoofSquares({ ...jobBase, squares_actual_installed: 7 }, {})).toBe(7);
    expect(
      resolvePlanningRoofSquares({ ...jobBase, squares_actual_installed: null, squares_final: 8 }, {}),
    ).toBe(8);
    expect(
      resolvePlanningRoofSquares(
        { ...jobBase, squares_actual_installed: null, squares_final: null, number_of_squares: 9 },
        {},
      ),
    ).toBe(9);
  });

  it("returns 0 when nothing is set", () => {
    expect(resolvePlanningRoofSquares(null, null)).toBe(0);
    expect(resolvePlanningRoofSquares({ ...jobBase }, {})).toBe(0);
  });

  it("treats empty scope as no match", () => {
    expect(resolvePlanningRoofSquares({ ...jobBase }, { scope_sq_all_structures: "no digits here" })).toBe(0);
  });
});
