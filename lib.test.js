import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  esc,
  norm,
  compact,
  expandQ,
  attrToken,
  availableOptions,
  orderOpts,
  resolveUnique,
  coverOf,
  packCopy,
  stepOf,
  parseHash,
} from "./lib.js";

describe("esc", () => {
  it("escapes the five HTML-sensitive characters", () => {
    assert.equal(esc(`<a href="x">Т&О</a>`), "&lt;a href=&quot;x&quot;&gt;Т&amp;О&lt;/a&gt;");
  });
  it("treats null/undefined as empty string", () => {
    assert.equal(esc(null), "");
    assert.equal(esc(undefined), "");
  });
});

describe("norm / compact", () => {
  it("lowercases, folds ё->е and comma->dot, collapses spaces", () => {
    assert.equal(norm("  Гнёздо,  6,3ММ "), "гнездо. 6.3мм");
  });
  it("compact strips separators (spaces, dots, dashes) on top of norm", () => {
    assert.equal(compact("ПГВА 0,75"), "пгва075");
  });
});

describe("expandQ", () => {
  it("adds a numeric-contact alias for spelled-out contact counts", () => {
    const out = expandQ("шестиместная колодка");
    assert.ok(out.includes("6 конт"));
  });
  it("returns just the normalized query when nothing matches", () => {
    assert.deepEqual(expandQ("ПГВА 0,75"), ["пгва 0.75"]);
  });
});

describe("attrToken", () => {
  it("maps boolean true to the affirmative word and blanks to null", () => {
    assert.equal(attrToken(true), "да");
    assert.equal(attrToken(false), null);
    assert.equal(attrToken(""), null);
    assert.equal(attrToken(undefined), null);
    assert.equal(attrToken("IP66/67"), "IP66/67");
  });
});

describe("availableOptions / orderOpts", () => {
  const items = [
    { attrs: { color: "белый", size: "1" } },
    { attrs: { color: "белый", size: "2" } },
    { attrs: { color: "чёрный", size: "1" } },
  ];
  it("only offers sizes consistent with the other already-selected facets", () => {
    assert.deepEqual(availableOptions(items, { color: "белый" }, "size"), ["1", "2"]);
    assert.deepEqual(availableOptions(items, { color: "чёрный" }, "size"), ["1"]);
  });
  it("orderOpts sorts by the family's declared value order", () => {
    assert.deepEqual(orderOpts(["2", "1"], ["1", "2"]), ["1", "2"]);
    assert.deepEqual(orderOpts(["b", "a"], undefined), ["b", "a"]);
  });
});

describe("resolveUnique", () => {
  const items = [
    { id: "s1", attrs: { color: "белый", size: "1" } },
    { id: "s2", attrs: { color: "белый", size: "2" } },
  ];
  it("returns the single matching item", () => {
    assert.equal(resolveUnique(items, { color: "белый", size: "1" })?.id, "s1");
  });
  it("returns null when nothing matches", () => {
    assert.equal(resolveUnique(items, { color: "красный" }), null);
  });
  it("returns null (not an arbitrary pick) when the facets don't disambiguate", () => {
    // Regression test: this used to silently return items[0], showing one
    // specific SKU as if it were the unique result of the user's choice.
    assert.equal(resolveUnique(items, { color: "белый" }), null);
  });
});

describe("coverOf", () => {
  it("counts how many tokens of the best-matching query appear in the haystack", () => {
    assert.equal(coverOf("пгва 0.75 белый", ["пгва 0.75"]), 2);
    assert.equal(coverOf("пгва 0.75 белый", ["не совпадёт"]), 0);
  });
});

describe("packCopy / stepOf", () => {
  it("describes order multiples, then pack quantity, then single-unit default", () => {
    assert.equal(packCopy({ om: 100, pq: 1, u: "шт" }), "кратно 100 шт");
    assert.equal(packCopy({ om: 1, pq: 50, u: "шт" }), "в упаковке 50 шт");
    assert.equal(packCopy({ om: 1, pq: 1, u: "шт" }), "заказ от 1 шт");
  });
  it("stepOf floors at 1 even for missing/zero om", () => {
    assert.equal(stepOf({ om: 0 }), 1);
    assert.equal(stepOf(null), 1);
    assert.equal(stepOf({ om: 100 }), 100);
  });
});

describe("parseHash", () => {
  it("routes catalog paths by segment count", () => {
    assert.deepEqual(parseHash("#/catalog"), { name: "catalog" });
    assert.deepEqual(parseHash("#/catalog/harnesses"), { name: "cat", cat: "harnesses" });
    assert.deepEqual(parseHash("#/catalog/harnesses/fog_light_kits"), {
      name: "sub",
      cat: "harnesses",
      sub: "fog_light_kits",
    });
  });
  it("routes product and search views", () => {
    assert.deepEqual(parseHash("#/p/sku-8250"), { name: "family", id: "sku-8250" });
    assert.deepEqual(parseHash("#/search?q=6886"), { name: "search", q: "6886" });
  });
  it("defaults to home for empty or unknown hash", () => {
    assert.deepEqual(parseHash(""), { name: "home" });
    assert.deepEqual(parseHash("#/nope"), { name: "home" });
  });
});
