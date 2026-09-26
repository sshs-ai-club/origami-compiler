import { describe, expect, it } from "vitest";
import { parseRequest } from "./rules.ts";

describe("rule-based intent parser", () => {
  it("parses the reference request", () => {
    const s = parseRequest("I want to make a realistic dragon, with 21x21 paper, with about ~ 200 steps or less.");
    expect(s.target).toBe("dragon");
    expect(s.target_text).toBe("realistic dragon");
    expect(s.style).toBe("3d");
    expect(s.detail).toBe("high");
    expect(s.step_budget).toEqual({ max: 200, approximate: true });
    // unit-less 21x21 is the sheet the user has; the grid is left to design/
    expect(s.sheet.size_cm).toBe(21);
    expect(s.sheet.grid_n).toBeNull();
  });

  it("parses the Eiffel tower request from GOAL.md", () => {
    const s = parseRequest("I want to make a 3D shaped Eiffel tower with less than 300 steps, single paper");
    expect(s.target).toBe("eiffel_tower");
    expect(s.style).toBe("3d");
    expect(s.step_budget).toEqual({ max: 300, approximate: false });
    expect(s.sheet.count).toBe(1);
  });

  it("never guesses a budget", () => {
    expect(parseRequest("fold me a crane").step_budget).toBeNull();
  });

  it("reads units when given", () => {
    expect(parseRequest("a bird from 35cm x 35cm paper").sheet.size_cm).toBe(35);
    expect(parseRequest("a bird on a 32x32 grid").sheet.grid_n).toBe(32);
    expect(parseRequest("a bird on a 32 grid").sheet.grid_n).toBe(32);
  });

  it("flags incompatible constraints instead of failing silently", () => {
    const s = parseRequest("a highly detailed dragon in under 30 steps");
    expect(s.ambiguous.some((a) => a.includes("pull against"))).toBe(true);
  });

  it("flags out-of-scope sheet requests", () => {
    expect(parseRequest("a modular dragon").ambiguous.some((a) => a.includes("out of scope"))).toBe(true);
    expect(parseRequest("a dragon, cutting allowed").ambiguous.some((a) => a.includes("out of scope"))).toBe(true);
  });

  it("reports an unknown subject", () => {
    expect(parseRequest("I want to make a vase with 100 steps").target).toBe("vase");
    const u = parseRequest("I want to make a zeppelin");
    expect(u.target).toBeNull();
    expect(u.target_text).toBe("zeppelin");
  });
});
