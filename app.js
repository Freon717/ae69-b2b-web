const JSON_URLS = [
  "https://cdn.jsdelivr.net/gh/Freon717/ae69-catalog-data@main/catalog.json",
  "https://raw.githubusercontent.com/Freon717/ae69-catalog-data/main/catalog.json",
  "catalog.json"
];
const HIDDEN = new Set(["413","5459","5752","789","985","5781","4199","5782"]);
const money = n => n == null || n === "" ? "цена в заявке" : new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB"}).format(n);

let products = [];
let view = {name:"home"};
let cart = JSON.parse(localStorage.getItem("ae69-b2b-web-cart")||"[]");
let status = "Загрузка базы…";

function saveCart(){ localStorage.setItem("ae69-b2b-web-cart", JSON.stringify(cart)); }
function norm(s){ return String(s||"").toLowerCase().replace(/ё/g,"е").replace(/,/g,"."); }

function categories(){
  const map = new Map();
  for (const p of products) {
    const name = p.h || "Без категории";
    const rec = map.get(name) || {name, count:0};
    rec.count++;
    map.set(name, rec);
  }
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,"ru"));
}
function inCat(name){ return products.filter(p => (p.h||"Без категории")===name); }
function findCode(code){ return products.find(p => String(p.c)===String(code)); }

function setView(v){ view=v; render(); }
function nav(name){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on", b.dataset.view===name));
  if(name==="home") setView({name:"home"});
  if(name==="catalog") setView({name:"catalog"});
  if(name==="search") setView({name:"search", q: view.q||""});
  if(name==="cart") setView({name:"cart"});
}

function crumbs(extra){
  return `<div class="crumbs"><a href="#" class="js-home">Главная</a> / <a href="#" class="js-catalog">Каталог</a>${extra||""}</div>`;
}
function rowProduct(p){
  return `<button class="row js-item" data-code="${p.c}"><div><h2>${esc(p.n)}</h2><div class="muted">Код АЭ ${p.c}${p.a?" · "+esc(p.a):""}</div></div><span class="muted">→</span></button>`;
}
function esc(s){ return String(s||"").replace(/[&<>"]/g, c=>({"&":"&","<":"<",">":">","\"":"""}[c])); }

function home(){
  const cats = categories();
  return `<h1>Оптовый каталог</h1>
    <p class="muted">${esc(status)}. Поиск по коду АЭ, артикулу, ПГВА, 0,75.</p>
    ${cats.map(c=>`<button class="row js-cat" data-name="${esc(c.name)}"><div><h2>${esc(c.name)}</h2><div class="muted">${c.count} поз.</div></div><span class="muted">→</span></button>`).join("")}`;
}
function catalog(){
  return `<h1>Каталог</h1>` + categories().map(c=>`<button class="row js-cat" data-name="${esc(c.name)}"><h2>${esc(c.name)}</h2><span class="muted">${c.count}</span></button>`).join("");
}
function category(){
  const list = inCat(view.cat);
  return `${crumbs(" / "+esc(view.cat))}<h1>${esc(view.cat)}</h1><p class="muted">${list.length} позиций</p>${list.map(rowProduct).join("")}`;
}
function product(){
  const p = findCode(view.code);
  if(!p) return `${crumbs()}<p>Код ${esc(view.code)} не найден</p>`;
  const photo = (p.p&&p.p[0]) ? `<img src="${esc(p.p[0])}" alt="" style="width:100%;max-height:220px;object-fit:contain;background:#fff;border-radius:10px">` : "";
  const line = cart.find(x=>x.skuId===String(p.c));
  return `${crumbs(" / "+esc(p.h||""))}
    ${photo}
    <h1>${esc(p.n)}</h1>
    <div class="card">
      <div class="muted">Код АЭ ${p.c}${p.a?" · "+esc(p.a):""}</div>
      <div class="price" style="font-size:22px;margin:8px 0">${money(p.wholesale)}</div>
      ${line?stepper(String(p.c), line.qty):`<button class="btn js-add" data-code="${p.c}">В корзину</button>`}
    </div>
    <p class="muted">Фото с ae69.ru, если есть. Остатки не показываем.</p>`;
}
function stepper(id,qty){ return `<div class="step"><button class="js-qty" data-id="${id}" data-d="-1">−</button><span>${qty}</span><button class="js-qty" data-id="${id}" data-d="1">+</button></div>`; }
function search(){
  const q = norm(view.q||"");
  const hits = !q ? [] : products.filter(p => norm(p.c+" "+p.a+" "+p.n+" "+(p.s||"")).includes(q)).slice(0,80);
  return `<h1>Поиск</h1><input class="search" id="q" value="${esc(view.q||"")}" placeholder="7021, ПГВА 0,75">
    <p class="muted">${q?hits.length+" из "+products.length:"Введите код или название"}</p>
    ${hits.map(rowProduct).join("")}`;
}
function cartView(){
  if(!cart.length) return `<h1>Корзина</h1><p class="muted">Пока пусто. Найдите 7021 или ПГВА.</p>`;
  return `<h1>Корзина</h1><button class="btn sec js-csv">Скачать CSV</button>
    ${cart.map(i=>`<div class="card"><div class="muted">${esc(i.code)} · ${esc(i.article)}</div><div>${esc(i.name)}</div><div style="display:flex;justify-content:space-between;margin-top:8px">${stepper(i.skuId,i.qty)}<button class="btn sec js-del" data-id="${i.skuId}">Удалить</button></div></div>`).join("")}`;
}

function render(){
  const n = document.getElementById("cartN"); if(n) n.textContent = cart.length||"";
  const meta = document.getElementById("meta"); if(meta) meta.textContent = status;
  const el = document.getElementById("app");
  if(!el) return;
  if(view.name==="home") el.innerHTML = home();
  else if(view.name==="catalog") el.innerHTML = catalog();
  else if(view.name==="cat") el.innerHTML = category();
  else if(view.name==="item") el.innerHTML = product();
  else if(view.name==="search") el.innerHTML = search();
  else if(view.name==="cart") el.innerHTML = cartView();
  bind();
}
function bind(){
  document.querySelectorAll(".js-home").forEach(b=>b.onclick=e=>{e.preventDefault();nav("home");});
  document.querySelectorAll(".js-catalog").forEach(b=>b.onclick=e=>{e.preventDefault();nav("catalog");});
  document.querySelectorAll(".js-cat").forEach(b=>b.onclick=()=>setView({name:"cat",cat:b.dataset.name}));
  document.querySelectorAll(".js-item").forEach(b=>b.onclick=()=>setView({name:"item",code:b.dataset.code}));
  document.querySelectorAll(".js-add").forEach(b=>b.onclick=()=>{
    const p=findCode(b.dataset.code); if(!p) return;
    const i=cart.find(x=>x.skuId===String(p.c));
    if(i) i.qty++; else cart.push({skuId:String(p.c),code:String(p.c),article:p.a||"",name:p.n,qty:1});
    saveCart(); render();
  });
  document.querySelectorAll(".js-qty").forEach(b=>b.onclick=()=>{
    const i=cart.find(x=>x.skuId===b.dataset.id); if(!i) return;
    i.qty += Number(b.dataset.d); if(i.qty<=0) cart=cart.filter(x=>x.skuId!==i.skuId);
    saveCart(); render();
  });
  document.querySelectorAll(".js-del").forEach(b=>b.onclick=()=>{ cart=cart.filter(x=>x.skuId!==b.dataset.id); saveCart(); render(); });
  document.querySelectorAll(".js-csv").forEach(b=>b.onclick=()=>{
    const rows=[["Код АЭ","Артикул","Наименование","Кол-во"],...cart.map(i=>[i.code,i.article,i.name,i.qty])];
    const csv="\uFEFF"+rows.map(r=>r.map(x=>`"${x}"`).join(";")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="zayavka-ae69.csv"; a.click();
  });
  const q=document.getElementById("q");
  if(q){ q.oninput=()=>{ view.q=q.value; const pos=q.selectionStart; render(); const nq=document.getElementById("q"); if(nq){ nq.focus(); nq.setSelectionRange(pos,pos);} }; }
}

async function load(){
  let last;
  for (const url of JSON_URLS) {
    try {
      const res = await fetch(url, {cache:"no-store"});
      if(!res.ok) throw new Error(res.status);
      const data = await res.json();
      const list = data.products || data.skus || [];
      products = list.filter(p => !HIDDEN.has(String(p.c || p.ae69Code)));
      if (products[0] && products[0].ae69Code) {
        products = products.map(s => ({c:s.ae69Code,a:s.article,n:s.name,h:s.categoryId,s:s.search,wholesale:s.wholesale,p:[]}));
      }
      status = products.length + " поз. · база справочника";
      render();
      return;
    } catch (e) { last = e; }
  }
  status = "Не удалось скачать базу";
  render();
  console.error(last);
}

document.getElementById("logoBtn").onclick = () => nav("home");
document.querySelectorAll(".tab").forEach(b => b.onclick = () => nav(b.dataset.view));
render();
load();
