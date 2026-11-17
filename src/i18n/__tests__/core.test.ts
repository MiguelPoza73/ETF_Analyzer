import { describe, expect, it } from "vitest";
import { createI18n } from "../core";

describe("span", () => {
  const es = createI18n("es");
  const en = createI18n("en");

  it("rounds to one decimal but never up to a whole year", () => {
    expect(es.span(2.7)).toBe("2,7 años");
    expect(es.span(2.6995)).toBe("2,7 años");
    expect(en.span(2.99)).toBe("2.9 years");
    expect(en.span(2.95)).toBe("2.9 years");
    expect(en.span(5.96)).toBe("5.9 years");
  });

  it("drops the decimal on whole numbers and uses the singular for one year", () => {
    expect(es.span(3)).toBe("3 años");
    expect(es.span(1)).toBe("1 año");
    expect(en.span(1.04)).toBe("1 year");
  });

  it("rounds to whole years from 10 years on", () => {
    expect(en.span(14.99)).toBe("15 years");
    expect(es.span(32.4)).toBe("32 años");
  });
});
