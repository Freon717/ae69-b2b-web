// Pure helpers shared by app.js and lib.test.js. No DOM/localStorage access
// here on purpose — this file exists so these functions are testable with
// plain node:test instead of only "open on a phone and click around".
"use strict";

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

export function compact(s) {
  return norm(s).replace(/[\s.\-_/]/g, "");
}

export function expandQ(raw) {
  var q = norm(raw);
  var out = [q];
  var pairs = [
    [/шестиместн[а-я]*/g, "6 конт"],
    [/пятиместн[а-я]*/g, "5 конт"],
    [/четырехместн[а-я]*/g, "4 конт"],
    [/трехместн[а-я]*/g, "3 конт"],
    [/двухместн[а-я]*/g, "2 конт"],
    [/одноместн[а-я]*/g, "1 конт"],
  ];
  for (var i = 0; i < pairs.length; i++) {
    var re = pairs[i][0];
    var to = pairs[i][1];
    if (re.test(q)) {
      re.lastIndex = 0;
      var extra = q.replace(re, to).replace(/\s+/g, " ").trim();
      if (extra && extra !== q) out.push(extra);
      out.push(to);
    }
    re.lastIndex = 0;
  }
  return out;
}

export function attrToken(v) {
  if (v === undefined || v === false || v === "") return null;
  if (v === true) return "да";
  return String(v);
}

export function availableOptions(items, sel, key) {
  var others = [];
  for (var k in sel)
    if (Object.prototype.hasOwnProperty.call(sel, k) && k !== key && sel[k]) others.push([k, sel[k]]);
  var seen = {};
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var ok = true;
    for (var j = 0; j < others.length; j++) {
      if (attrToken(item.attrs[others[j][0]]) !== others[j][1]) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    var t = attrToken(item.attrs[key]);
    if (!t || seen[t]) continue;
    seen[t] = 1;
    out.push(t);
  }
  return out;
}

export function orderOpts(opts, vs) {
  if (!vs || !vs.length) return opts;
  return opts.slice().sort(function (a, b) {
    var ia = vs.indexOf(a);
    var ib = vs.indexOf(b);
    if (ia < 0) ia = 999;
    if (ib < 0) ib = 999;
    return ia - ib;
  });
}

export function resolveUnique(items, sel) {
  var matched = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var ok = true;
    for (var k in sel) {
      if (!Object.prototype.hasOwnProperty.call(sel, k) || !sel[k]) continue;
      if (attrToken(item.attrs[k]) !== sel[k]) {
        ok = false;
        break;
      }
    }
    if (ok) matched.push(item);
  }
  if (matched.length === 1) return matched[0];
  // Больше одного SKU на полный набор фасетов значит, что выбор ещё не
  // однозначен (в данных не хватает различающего атрибута) — показывать
  // произвольный первый SKU как результат было бы враньём пользователю.
  return null;
}

export function coverOf(hay, queries) {
  var best = 0, i, toks, n, t;
  for (i = 0; i < queries.length; i++) {
    toks = queries[i].split(/\s+/).filter(function (x) { return x.length >= 2; });
    n = 0;
    for (t = 0; t < toks.length; t++) if (hay.indexOf(toks[t]) >= 0) n++;
    if (n > best) best = n;
  }
  return best;
}

export function packCopy(sku) {
  var om = Number(sku.om) || 1;
  var pq = Number(sku.pq) || 1;
  var u = sku.u || "шт";
  if (om > 1) return "кратно " + om + " " + u;
  if (pq > 1) return "в упаковке " + pq + " " + u;
  return "заказ от 1 " + u;
}

export function stepOf(sku) {
  return Math.max(1, Number(sku && sku.om) || 1);
}

// hash — например location.hash. Передаётся явно, а не читается тут из
// location, чтобы функция работала одинаково в браузере и в node:test.
export function parseHash(hash) {
  var raw = (hash || "#/home").replace(/^#\/?/, "");
  var q = "";
  var qi = raw.indexOf("?");
  if (qi >= 0) {
    var sp = new URLSearchParams(raw.slice(qi + 1));
    q = sp.get("q") || "";
    raw = raw.slice(0, qi);
  }
  var parts = raw.split("/").filter(Boolean).map(function (p) {
    try {
      return decodeURIComponent(p);
    } catch (e) {
      return p;
    }
  });
  var a = parts[0] || "home";
  if (a === "search") return { name: "search", q: q };
  if (a === "cart") return { name: "cart" };
  if (a === "cabinet") return { name: "cabinet" };
  if (a === "catalog" && parts[2]) return { name: "sub", cat: parts[1], sub: parts[2] };
  if (a === "catalog" && parts[1]) return { name: "cat", cat: parts[1] };
  if (a === "catalog") return { name: "catalog" };
  if (a === "p" && parts[1]) return { name: "family", id: parts[1] };
  return { name: "home" };
}

// "вилка"/"розетка" — верный отраслевой термин, но "гнездо (мама)"/"штырь
// (папа)" — привычные слова для тех, кто ежедневно не имеет дела с
// разъёмами. Показываем оба сразу, значение в data-* остаётся прежним.
var SIDE_LABELS = {
  розетка: "гнездо (мама)",
  вилка: "штырь (папа)",
  пара: "пара",
};
var SIDE_ORDER = ["розетка", "вилка", "пара"];

export function displayLabel(key, value) {
  if (key === "side" && Object.prototype.hasOwnProperty.call(SIDE_LABELS, value)) {
    return SIDE_LABELS[value];
  }
  return value;
}

export function displayOrder(key) {
  return key === "side" ? SIDE_ORDER : null;
}
