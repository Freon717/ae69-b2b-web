function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

var JSON_URLS = [
  "https://cdn.jsdelivr.net/gh/Freon717/ae69-catalog-data@main/catalog.json",
  "https://raw.githubusercontent.com/Freon717/ae69-catalog-data/main/catalog.json"
];
var HIDDEN = { "413": 1, "5459": 1, "5752": 1, "789": 1, "985": 1, "5781": 1, "4199": 1, "5782": 1 };

var products = [];
var view = { name: "home" };
var status = "Загрузка базы…";
var cart = [];
try {
  cart = JSON.parse(localStorage.getItem("ae69-b2b-web-cart") || "[]") || [];
} catch (e) {
  cart = [];
}

function saveCart() {
  localStorage.setItem("ae69-b2b-web-cart", JSON.stringify(cart));
}
function norm(s) {
  return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/,/g, ".");
}
function categories() {
  var map = {};
  var order = [];
  for (var i = 0; i < products.length; i++) {
    var name = products[i].h || "Без категории";
    if (!map[name]) {
      map[name] = { name: name, count: 0 };
      order.push(map[name]);
    }
    map[name].count++;
  }
  order.sort(function (a, b) { return a.name.localeCompare(b.name, "ru"); });
  return order;
}
function inCat(name) {
  var out = [];
  for (var i = 0; i < products.length; i++) {
    if ((products[i].h || "Без категории") === name) out.push(products[i]);
  }
  return out;
}
function findCode(code) {
  code = String(code);
  for (var i = 0; i < products.length; i++) if (String(products[i].c) === code) return products[i];
  return null;
}
function setView(v) {
  view = v;
  render();
}
function nav(name) {
  var tabs = document.querySelectorAll(".tab");
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("on", tabs[i].getAttribute("data-view") === name);
  if (name === "home") setView({ name: "home" });
  if (name === "catalog") setView({ name: "catalog" });
  if (name === "search") setView({ name: "search", q: view.q || "" });
  if (name === "cart") setView({ name: "cart" });
}
function crumbs(extra) {
  return "<div class=\"crumbs\"><a href=\"#\" class=\"js-home\">Главная</a> / <a href=\"#\" class=\"js-catalog\">Каталог</a>" + (extra || "") + "</div>";
}
function rowProduct(p) {
  return "<button class=\"row js-item\" type=\"button\" data-code=\"" + esc(p.c) + "\"><div><h2>" + esc(p.n) + "</h2><div class=\"muted\">Код АЭ " + esc(p.c) + (p.a ? " · " + esc(p.a) : "") + "</div></div><span class=\"muted\">→</span></button>";
}
function homeHtml() {
  var cats = categories();
  var html = "<h1>Каталог</h1><p class=\"muted\">" + esc(status) + "</p>";
  for (var i = 0; i < cats.length; i++) {
    html += "<button class=\"row js-cat\" type=\"button\" data-name=\"" + esc(cats[i].name) + "\"><div><h2>" + esc(cats[i].name) + "</h2><div class=\"muted\">" + cats[i].count + " поз.</div></div><span class=\"muted\">→</span></button>";
  }
  if (!cats.length) html += "<p class=\"muted\">Если список пуст — обновите страницу. База качается с GitHub.</p>";
  return html;
}
function searchHtml() {
  var q = norm(view.q || "");
  var html = "<h1>Поиск</h1><input class=\"search\" id=\"q\" value=\"" + esc(view.q || "") + "\" placeholder=\"7021, ПГВА 0,75\">";
  if (!q) return html + "<p class=\"muted\">Введите код АЭ или название</p>";
  var n = 0;
  for (var i = 0; i < products.length && n < 80; i++) {
    var p = products[i];
    var hay = norm(p.c + " " + (p.a || "") + " " + (p.n || ""));
    if (hay.indexOf(q) < 0) continue;
    html += rowProduct(p);
    n++;
  }
  return html + "<p class=\"muted\">Найдено " + n + "</p>";
}
function itemHtml() {
  var p = findCode(view.code);
  if (!p) return crumbs() + "<p>Не найден</p>";
  var photo = p.p && p.p[0] ? "<img src=\"" + esc(p.p[0]) + "\" alt=\"\" style=\"width:100%;max-height:220px;object-fit:contain;background:#fff;border-radius:10px\">" : "";
  return crumbs(" / " + esc(p.h || "")) + photo + "<h1>" + esc(p.n) + "</h1><div class=\"card\"><div class=\"muted\">Код АЭ " + esc(p.c) + (p.a ? " · " + esc(p.a) : "") + "</div><p class=\"muted\">Оптовая цена в полном B2B, здесь база справочника.</p><button class=\"btn js-add\" type=\"button\" data-code=\"" + esc(p.c) + "\">В корзину</button></div>";
}
function cartHtml() {
  if (!cart.length) return "<h1>Корзина</h1><p class=\"muted\">Пока пусто</p>";
  var html = "<h1>Корзина</h1>";
  for (var i = 0; i < cart.length; i++) {
    html += "<div class=\"card\"><div class=\"muted\">" + esc(cart[i].code) + "</div><div>" + esc(cart[i].name) + "</div><div>× " + cart[i].qty + "</div></div>";
  }
  return html;
}
function render() {
  var el = document.getElementById("app");
  var meta = document.getElementById("meta");
  var cn = document.getElementById("cartN");
  if (meta) meta.textContent = status;
  if (cn) cn.textContent = cart.length ? String(cart.length) : "";
  if (!el) return;
  try {
    if (view.name === "home" || view.name === "catalog") el.innerHTML = homeHtml();
    else if (view.name === "cat") {
      var list = inCat(view.cat);
      var html = crumbs(" / " + esc(view.cat)) + "<h1>" + esc(view.cat) + "</h1><p class=\"muted\">" + list.length + " поз.</p>";
      for (var i = 0; i < list.length; i++) html += rowProduct(list[i]);
      el.innerHTML = html;
    } else if (view.name === "item") el.innerHTML = itemHtml();
    else if (view.name === "search") el.innerHTML = searchHtml();
    else if (view.name === "cart") el.innerHTML = cartHtml();
  } catch (e) {
    el.innerHTML = "<p style=\"padding:16px;color:#a11\">" + esc(e.message) + "</p>";
    return;
  }
  bind();
}
function bind() {
  function on(sel, fn) {
    var nodes = document.querySelectorAll(sel);
    for (var i = 0; i < nodes.length; i++) nodes[i].onclick = fn;
  }
  on(".js-home", function (e) { e.preventDefault(); nav("home"); });
  on(".js-catalog", function (e) { e.preventDefault(); nav("catalog"); });
  on(".js-cat", function () { setView({ name: "cat", cat: this.getAttribute("data-name") }); });
  on(".js-item", function () { setView({ name: "item", code: this.getAttribute("data-code") }); });
  on(".js-add", function () {
    var p = findCode(this.getAttribute("data-code"));
    if (!p) return;
    cart.push({ skuId: String(p.c), code: String(p.c), article: p.a || "", name: p.n, qty: 1 });
    saveCart();
    render();
  });
  var q = document.getElementById("q");
  if (q) {
    q.oninput = function () {
      view.q = q.value;
      var pos = q.selectionStart;
      render();
      var nq = document.getElementById("q");
      if (nq) { nq.focus(); nq.setSelectionRange(pos, pos); }
    };
  }
}
function applyPayload(data) {
  var list = data.products || data.skus || [];
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var raw = list[i];
    var code = String(raw.c || raw.ae69Code || "");
    if (!code || HIDDEN[code]) continue;
    out.push({
      c: code,
      a: raw.a || raw.article || "",
      n: raw.n || raw.name || "",
      h: raw.h || raw.categoryName || raw.categoryId || "Без категории",
      p: raw.p || []
    });
  }
  products = out;
  status = products.length + " позиций";
  render();
}
function load() {
  var i = 0;
  function next() {
    if (i >= JSON_URLS.length) {
      status = "Не удалось скачать базу. Проверьте сеть.";
      render();
      return;
    }
    var url = JSON_URLS[i++];
    fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    }).then(applyPayload).catch(next);
  }
  next();
}

var logo = document.getElementById("logoBtn");
if (logo) logo.onclick = function () { nav("home"); };
var tabs = document.querySelectorAll(".tab");
for (var t = 0; t < tabs.length; t++) {
  tabs[t].onclick = function () { nav(this.getAttribute("data-view")); };
}
render();
load();
