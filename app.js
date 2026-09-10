(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  var scriptEl = document.querySelector("script[src*='app.js']");
  var BASE = "./";
  if (scriptEl && scriptEl.src) BASE = scriptEl.src.replace(/app\.js(\?.*)?$/, "");

  var CATALOG_URL = BASE + "catalog-public.json?v=8";
  var data = { cats: [], families: [], skus: [] };
  var famById = {};
  var skuById = {};
  var skusByFam = {};
  var catById = {};
  var status = "Загрузка базы…";
  var view = { name: "home" };
  var selected = {};
  var cart = [];
  var favs = [];
  try {
    cart = JSON.parse(localStorage.getItem("ae69-b2b-web-cart") || "[]") || [];
  } catch (e) {
    cart = [];
  }
  try {
    favs = JSON.parse(localStorage.getItem("ae69-b2b-web-favs") || "[]") || [];
  } catch (e) {
    favs = [];
  }

  function saveCart() {
    localStorage.setItem("ae69-b2b-web-cart", JSON.stringify(cart));
  }
  function saveFavs() {
    localStorage.setItem("ae69-b2b-web-favs", JSON.stringify(favs.slice(0, 80)));
  }
  function isFav(id) {
    return favs.indexOf(id) >= 0;
  }
  function toggleFav(id) {
    var i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1);
    else favs.unshift(id);
    saveFavs();
  }
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/,/g, ".")
      .replace(/\s+/g, " ")
      .trim();
  }
  function compact(s) {
    return norm(s).replace(/[\s.\-_/]/g, "");
  }
  function expandQ(raw) {
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
  function setStatus(t) {
    status = t;
    var meta = document.getElementById("meta");
    if (meta) meta.textContent = t;
    var cn = document.getElementById("cartN");
    if (cn) cn.textContent = cart.length ? String(cart.length) : "";
  }
  function setTab(name) {
    var tabs = document.querySelectorAll(".tab");
    for (var i = 0; i < tabs.length; i++) {
      var key = tabs[i].getAttribute("data-view");
      var on =
        key === name ||
        (name === "cat" && key === "catalog") ||
        (name === "sub" && key === "catalog") ||
        (name === "family" && key === "catalog") ||
        (name === "search" && key === "home");
      tabs[i].classList.toggle("on", on);
    }
  }
  function go(v, push) {
    if (!v || v.name !== "family") selected = {};
    view = v;
    if (push !== false) {
      var h = "#/" + v.name;
      if (v.cat) h += "/" + encodeURIComponent(v.cat);
      if (v.sub) h += "/" + encodeURIComponent(v.sub);
      if (v.id) h += "/" + encodeURIComponent(v.id);
      if (v.q) h += "?q=" + encodeURIComponent(v.q);
      if (location.hash !== h) history.pushState(v, "", h);
    }
    render();
  }
  function parseHash() {
    var raw = (location.hash || "#/home").replace(/^#\/?/, "");
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

  function attrToken(v) {
    if (v === undefined || v === false || v === "") return null;
    if (v === true) return "да";
    return String(v);
  }
  function availableOptions(items, sel, key) {
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
  function orderOpts(opts, vs) {
    if (!vs || !vs.length) return opts;
    return opts.slice().sort(function (a, b) {
      var ia = vs.indexOf(a);
      var ib = vs.indexOf(b);
      if (ia < 0) ia = 999;
      if (ib < 0) ib = 999;
      return ia - ib;
    });
  }
  function prefixSel(fam, upto) {
    var prefix = {};
    for (var i = 0; i < upto; i++) {
      var k = fam.sels[i].k;
      if (selected[k]) prefix[k] = selected[k];
    }
    return prefix;
  }
  function resolveUnique(items, sel) {
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
    if (matched.length > 1) return matched[0];
    return null;
  }
  function famSkus(id) {
    return skusByFam[id] || [];
  }
  function crumbs(extra) {
    return (
      '<div class="crumbs"><a href="#/home" class="js-home">Главная</a> / <a href="#/catalog" class="js-catalog">Каталог</a>' +
      (extra || "") +
      "</div>"
    );
  }
  function row(title, sub, href) {
    return (
      '<a class="row" href="' +
      esc(href) +
      '"><div><h2>' +
      esc(title) +
      '</h2><div class="muted">' +
      esc(sub) +
      '</div></div><span class="muted">→</span></a>'
    );
  }
  function packCopy(sku) {
    var om = Number(sku.om) || 1;
    var pq = Number(sku.pq) || 1;
    var u = sku.u || "шт";
    if (om > 1) return "кратно " + om + " " + u;
    if (pq > 1) return "в упаковке " + pq + " " + u;
    return "заказ от 1 " + u;
  }
  function stepOf(sku) {
    return Math.max(1, Number(sku && sku.om) || 1);
  }

  function homeHtml() {
    var html =
      "<h1>Точный SKU за минуту</h1><p class=\"muted\">Каталог ООО «Автоэлектроника», Тверь. Оптовая цена — в полном B2B после входа. Остатки не показываем.</p>";
    html += '<div class="grid2">';
    html += '<a class="row" href="#/catalog"><div><h2>Каталог</h2><div class="muted">Категории и семейства</div></div><span class="muted">→</span></a>';
    html += '<a class="row" href="#/cabinet"><div><h2>Кабинет</h2><div class="muted">Телефон и избранное</div></div><span class="muted">→</span></a>';
    html += "</div>";
    html += "<h2 style=\"margin-top:16px\">Категории</h2>";
    html += '<div class="chips">';
    for (var i = 0; i < data.cats.length; i++) {
      var c = data.cats[i];
      html +=
        '<a class="chip" href="#/catalog/' +
        encodeURIComponent(c.id) +
        '">' +
        esc(c.s || c.n) +
        "</a>";
    }
    html += "</div>";
    if (favs.length) {
      html += "<h2 style=\"margin-top:16px\">Избранное</h2>";
      for (i = 0; i < favs.length && i < 6; i++) {
        var fam = famById[favs[i]];
        if (fam) html += row(fam.t, fam.n + " SKU", "#/p/" + encodeURIComponent(fam.id));
      }
    }
    return html;
  }
  function catalogHtml() {
    var html = crumbs() + "<h1>Каталог</h1><p class=\"muted\">" + esc(status) + "</p>";
    for (var i = 0; i < data.cats.length; i++) {
      var c = data.cats[i];
      html += row(c.n, c.fc + " семейств", "#/catalog/" + encodeURIComponent(c.id));
    }
    if (!data.cats.length) html += "<p class=\"muted\">Если список пуст — обновите страницу.</p>";
    return html;
  }
  function catHtml() {
    var cat = catById[view.cat];
    if (!cat) return crumbs() + "<p>Нет категории</p>";
    var html = crumbs(" / " + esc(cat.n)) + "<h1>" + esc(cat.n) + "</h1>";
    for (var i = 0; i < cat.subs.length; i++) {
      var s = cat.subs[i];
      if (!s.fc) continue;
      html += row(s.n, s.fc + " семейств", "#/catalog/" + encodeURIComponent(cat.id) + "/" + encodeURIComponent(s.id));
    }
    return html;
  }
  function subHtml() {
    var cat = catById[view.cat];
    var subLabel = view.sub;
    if (cat) {
      for (var i = 0; i < cat.subs.length; i++) if (cat.subs[i].id === view.sub) subLabel = cat.subs[i].n;
    }
    var html =
      crumbs(
        " / <a href=\"#/catalog/" +
          encodeURIComponent(view.cat) +
          "\">" +
          esc(cat ? cat.n : view.cat) +
          "</a> / " +
          esc(subLabel),
      ) +
      "<h1>" +
      esc(subLabel) +
      "</h1>";
    var n = 0;
    for (var f = 0; f < data.families.length; f++) {
      var fam = data.families[f];
      if (fam.c !== view.cat || fam.s !== view.sub) continue;
      n++;
      html += row(fam.t, fam.n + " SKU" + (fam.own ? " · своё пр-во" : ""), "#/p/" + encodeURIComponent(fam.id));
    }
    if (!n) html += "<p class=\"muted\">Нет семейств</p>";
    return html;
  }
  function initSelected(fam, items) {
    selected = {};
    if (!fam.sels || !fam.sels.length) return;
    for (var i = 0; i < fam.sels.length; i++) {
      var key = fam.sels[i].k;
      var opts = orderOpts(availableOptions(items, selected, key), fam.sels[i].vs);
      if (opts.length) selected[key] = opts[0];
    }
  }
  function familyHtml() {
    var fam = famById[view.id];
    if (!fam) return crumbs() + "<p>Не найдено</p>";
    var items = famSkus(fam.id);
    if (!Object.keys(selected).length) initSelected(fam, items);
    var i, sel, opts, v, on, prefix;
    for (i = 0; i < (fam.sels || []).length; i++) {
      sel = fam.sels[i];
      prefix = prefixSel(fam, i);
      opts = orderOpts(availableOptions(items, prefix, sel.k), sel.vs);
      if (selected[sel.k] && opts.indexOf(selected[sel.k]) < 0) selected[sel.k] = opts[0] || "";
    }
    var sku = fam.sels && fam.sels.length ? resolveUnique(items, selected) : items[0] || null;
    var cat = catById[fam.c];
    var extra = " / <a href=\"#/catalog/" + encodeURIComponent(fam.c) + "\">" + esc(cat ? cat.n : fam.c) + "</a>";
    extra +=
      " / <a href=\"#/catalog/" +
      encodeURIComponent(fam.c) +
      "/" +
      encodeURIComponent(fam.s) +
      "\">" +
      esc(subNameOf(fam)) +
      "</a>";
    var html = crumbs(extra) + "<h1>" + esc(fam.t) + "</h1>";
    if (fam.own) html += "<div class=\"muted\">Своё производство</div>";
    html +=
      '<button class="heart js-fav" type="button" data-id="' +
      esc(fam.id) +
      '">' +
      (isFav(fam.id) ? "♥ В избранном" : "♡ В избранное") +
      "</button>";
    for (i = 0; i < (fam.sels || []).length; i++) {
      sel = fam.sels[i];
      prefix = prefixSel(fam, i);
      opts = orderOpts(availableOptions(items, prefix, sel.k), sel.vs);
      if (!opts.length) continue;
      html += "<div class=\"muted\" style=\"margin-top:12px\">" + esc(sel.l) + "</div><div class=\"chips\">";
      for (var j = 0; j < opts.length; j++) {
        v = opts[j];
        on = selected[sel.k] === v ? " on" : "";
        html +=
          '<button class="chip' +
          on +
          ' js-facet" type="button" data-key="' +
          esc(sel.k) +
          '" data-val="' +
          esc(v) +
          '">' +
          esc(v) +
          "</button>";
      }
      html += "</div>";
    }
    html += '<div class="card">';
    if (sku) {
      html += "<p>" + esc(sku.n) + "</p>";
      html += '<div class="muted">Код АЭ ' + esc(sku.c) + (sku.a ? " · " + esc(sku.a) : "") + "</div>";
      html += '<p class="price-note">Оптовая цена — в полном B2B после входа. Этот стенд без прайса.</p>';
      var qty = lineQty(sku.id);
      if (qty) {
        html +=
          '<div class="step" data-sku="' +
          esc(sku.id) +
          '"><button type="button" class="js-minus">−</button><span>' +
          esc(String(qty)) +
          '</span><button type="button" class="js-plus">+</button></div>';
      } else {
        html +=
          '<button class="btn js-add" type="button" data-id="' +
          esc(sku.id) +
          '" style="margin-top:10px">В корзину</button>';
      }
      html += '<div class="muted" style="margin-top:8px">' + esc(packCopy(sku)) + "</div>";
    } else {
      html += "<p class=\"muted\">Выберите параметры — появится конкретный SKU.</p>";
    }
    html += "</div>";
    return html;
  }
  function subNameOf(fam) {
    var cat = catById[fam.c];
    if (!cat) return fam.s;
    for (var i = 0; i < cat.subs.length; i++) if (cat.subs[i].id === fam.s) return cat.subs[i].n;
    return fam.s;
  }
  function lineQty(id) {
    for (var i = 0; i < cart.length; i++) if (cart[i].skuId === id) return cart[i].qty;
    return 0;
  }
  function lineOf(id) {
    for (var i = 0; i < cart.length; i++) if (cart[i].skuId === id) return cart[i];
    return null;
  }
  function addSku(sku, qty) {
    if (!sku) return;
    var step = stepOf(sku);
    var min = Math.max(step, Number(sku.moq) || step);
    var n = qty || min;
    if (n < min) n = min;
    if (n % step) n = Math.ceil(n / step) * step;
    var line = lineOf(sku.id);
    if (line) line.qty += n;
    else
      cart.push({
        skuId: sku.id,
        code: sku.c,
        article: sku.a || "",
        name: sku.n,
        qty: n,
        om: step,
        moq: min,
        unit: sku.u || "шт",
      });
    saveCart();
  }
  function setLineQty(id, qty) {
    var sku = skuById[id];
    var step = stepOf(sku);
    if (qty <= 0) {
      cart = cart.filter(function (x) {
        return x.skuId !== id;
      });
      saveCart();
      return;
    }
    var line = lineOf(id);
    if (!line) return;
    if (qty % step) qty = Math.ceil(qty / step) * step;
    line.qty = qty;
    saveCart();
  }
  function searchHtml() {
    var q = view.q || "";
    var html = "<h1>Поиск</h1><p class=\"muted\">Точный код важнее названия. 0,75 = 0.75</p>";
    var queries = expandQ(q);
    var nq = queries[0];
    var cq = compact(q);
    if (!nq) return html + "<p class=\"muted\">Введите код АЭ, артикул или название</p>";
    var hits = [];
    var i, s, hay, rank, qi;
    for (i = 0; i < data.skus.length; i++) {
      s = data.skus[i];
      var code = compact(s.c);
      var art = compact(s.a);
      hay = norm(s.c + " " + (s.a || "") + " " + (s.n || ""));
      rank = null;
      if (code === cq || art === cq) rank = 0;
      else if (code.indexOf(cq) === 0 || art.indexOf(cq) === 0) rank = 1;
      else {
        for (qi = 0; qi < queries.length; qi++) {
          if (hay.indexOf(queries[qi]) >= 0) {
            rank = 2;
            break;
          }
          var toks = queries[qi].split(/\s+/).filter(function (t) { return t.length >= 2; });
          if (toks.length >= 2) {
            var all = true;
            for (var ti = 0; ti < toks.length; ti++) if (hay.indexOf(toks[ti]) < 0) all = false;
            if (all) {
              rank = 2;
              break;
            }
          }
        }
      }
      if (rank === null && cq.length >= 3 && (code.indexOf(cq) >= 0 || art.indexOf(cq) >= 0)) rank = 3;
      if (rank === null) continue;
      hits.push({ sku: s, rank: rank });
    }
    hits.sort(function (a, b) {
      return a.rank - b.rank;
    });
    var shown = 0;
    var seenFam = {};
    for (i = 0; i < hits.length && shown < 60; i++) {
      s = hits[i].sku;
      var fam = famById[s.fid];
      var title = s.n;
      var sub = "Код АЭ " + s.c + (s.a ? " · " + s.a : "");
      if (hits[i].rank >= 2 && fam && !seenFam[fam.id]) {
        seenFam[fam.id] = 1;
        html += row(fam.t, fam.n + " SKU", "#/p/" + encodeURIComponent(fam.id));
        shown++;
      }
      html += row(title, sub, "#/p/" + encodeURIComponent(s.fid));
      shown++;
    }
    if (!shown) html += "<p class=\"muted\">Ничего не найдено</p>";
    else html += "<p class=\"muted\">Показано " + shown + "</p>";
    return html;
  }
  function cartHtml() {
    if (!cart.length) return "<h1>Корзина</h1><p class=\"muted\">Пока пусто. Это заявка, не оплата.</p>";
    var html = "<h1>Корзина</h1>";
    for (var i = 0; i < cart.length; i++) {
      var it = cart[i];
      html +=
        '<div class="card"><div class="muted">' +
        esc(it.code) +
        (it.article ? " · " + esc(it.article) : "") +
        "</div><div>" +
        esc(it.name) +
        "</div>";
      html +=
        '<div class="step" data-sku="' +
        esc(it.skuId) +
        '"><button type="button" class="js-minus">−</button><span>' +
        esc(String(it.qty)) +
        '</span><button type="button" class="js-plus">+</button></div>';
      html += '<div class="muted" style="margin-top:8px">шаг ' + esc(String(it.om || 1)) + " " + esc(it.unit || "шт") + "</div></div>";
    }
    html += "<p class=\"muted\">Это заявка, не оплата. Цену подтверждает AE69.</p>";
    return html;
  }
  function cabinetHtml() {
    var html =
      "<h1>Кабинет</h1><p>ООО «Автоэлектроника», Тверь</p><p><a class=\"phone\" href=\"tel:+74822559777\">(4822) 559-777</a></p>";
    html += "<p class=\"muted\">Полный B2B с оптовыми ценами, заявками и компанией — в авторизованной версии. Здесь витрина каталога без прайса.</p>";
    html += "<h2>Избранное</h2>";
    if (!favs.length) html += "<p class=\"muted\">Пока пусто — отметьте карточку товара.</p>";
    for (var i = 0; i < favs.length; i++) {
      var fam = famById[favs[i]];
      if (fam) html += row(fam.t, fam.n + " SKU", "#/p/" + encodeURIComponent(fam.id));
    }
    return html;
  }

  function render() {
    var el = document.getElementById("app");
    if (!el) return;
    setStatus(status);
    var name = view.name;
    if (name === "home" || name === "search") setTab("home");
    else if (name === "cart") setTab("cart");
    else if (name === "cabinet") setTab("cabinet");
    else setTab("catalog");
    try {
      if (name === "home") el.innerHTML = homeHtml();
      else if (name === "catalog") el.innerHTML = catalogHtml();
      else if (name === "cat") el.innerHTML = catHtml();
      else if (name === "sub") el.innerHTML = subHtml();
      else if (name === "family") el.innerHTML = familyHtml();
      else if (name === "search") el.innerHTML = searchHtml();
      else if (name === "cart") el.innerHTML = cartHtml();
      else if (name === "cabinet") el.innerHTML = cabinetHtml();
      else el.innerHTML = homeHtml();
    } catch (e) {
      el.innerHTML = '<p style="padding:16px;color:#a11">' + esc(e.message) + "</p>";
      return;
    }
    bind();
    var hq = document.getElementById("headQ");
    if (hq && name !== "search") hq.value = "";
    if (hq && name === "search") hq.value = view.q || "";
  }

  function currentSku() {
    var fam = famById[view.id];
    if (!fam) return null;
    var items = famSkus(fam.id);
    if (!fam.sels || !fam.sels.length) return items[0] || null;
    return resolveUnique(items, selected);
  }

  function bind() {
    var el = document.getElementById("app");
    if (!el) return;
    el.onclick = function (ev) {
      var t = ev.target;
      while (t && t !== el) {
        if (t.classList && t.classList.contains("js-facet")) {
          var key = t.getAttribute("data-key");
          selected[key] = t.getAttribute("data-val");
          var fam = famById[view.id];
          if (fam && fam.sels) {
            var idx = -1,
              i,
              k,
              opts;
            for (i = 0; i < fam.sels.length; i++) if (fam.sels[i].k === key) idx = i;
            if (idx >= 0) {
              for (i = idx + 1; i < fam.sels.length; i++) delete selected[fam.sels[i].k];
              var items = famSkus(fam.id);
              for (i = idx + 1; i < fam.sels.length; i++) {
                k = fam.sels[i].k;
                opts = orderOpts(availableOptions(items, selected, k), fam.sels[i].vs);
                if (opts.length) selected[k] = opts[0];
              }
            }
          }
          render();
          return;
        }
        if (t.classList && t.classList.contains("js-fav")) {
          toggleFav(t.getAttribute("data-id"));
          render();
          return;
        }
        if (t.classList && t.classList.contains("js-add")) {
          addSku(skuById[t.getAttribute("data-id")]);
          render();
          return;
        }
        if (t.classList && (t.classList.contains("js-minus") || t.classList.contains("js-plus"))) {
          var wrap = t.parentNode;
          var id = wrap && wrap.getAttribute("data-sku");
          var sku = skuById[id];
          var step = stepOf(sku);
          var cur = lineQty(id);
          if (!cur && t.classList.contains("js-plus")) {
            addSku(sku || currentSku());
            render();
            return;
          }
          if (t.classList.contains("js-minus")) setLineQty(id, cur - step);
          else setLineQty(id, cur + step);
          render();
          return;
        }
        t = t.parentNode;
      }
    };
  }

  function indexData(payload) {
    data = payload;
    famById = {};
    skuById = {};
    skusByFam = {};
    catById = {};
    var i, f, s, c;
    for (i = 0; i < data.families.length; i++) {
      f = data.families[i];
      famById[f.id] = f;
    }
    for (i = 0; i < data.skus.length; i++) {
      s = data.skus[i];
      skuById[s.id] = s;
      if (!skusByFam[s.fid]) skusByFam[s.fid] = [];
      skusByFam[s.fid].push(s);
    }
    for (i = 0; i < data.cats.length; i++) {
      c = data.cats[i];
      catById[c.id] = c;
    }
    status = data.skuCount + " SKU · " + data.familyCount + " семейств";
  }

  function load() {
    fetch(CATALOG_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("каталог HTTP " + res.status);
        return res.json();
      })
      .then(function (payload) {
        indexData(payload);
        view = parseHash();
        render();
      })
      .catch(function (err) {
        status = "Не удалось скачать базу";
        var el = document.getElementById("app");
        if (el) el.innerHTML = "<p style=\"padding:16px;color:#a11\">" + esc(err.message || status) + "</p>";
        setStatus(status);
      });
  }

  var logo = document.getElementById("logoBtn");
  if (logo)
    logo.onclick = function () {
      go({ name: "home" });
    };
  var tabs = document.querySelectorAll(".tab");
  for (var t = 0; t < tabs.length; t++) {
    tabs[t].onclick = function () {
      var name = this.getAttribute("data-view");
      if (name === "home") go({ name: "home" });
      else if (name === "catalog") go({ name: "catalog" });
      else if (name === "cart") go({ name: "cart" });
      else if (name === "cabinet") go({ name: "cabinet" });
    };
  }
  var headQ = document.getElementById("headQ");
  if (headQ) {
    headQ.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        go({ name: "search", q: headQ.value || "" });
      }
    });
    headQ.addEventListener("change", function () {
      if (headQ.value) go({ name: "search", q: headQ.value });
    });
  }
  window.addEventListener("popstate", function () {
    view = parseHash();
    if (view.name !== "family") selected = {};
    render();
  });
  window.addEventListener("hashchange", function () {
    view = parseHash();
    if (view.name !== "family") selected = {};
    render();
  });
  load();
})();
