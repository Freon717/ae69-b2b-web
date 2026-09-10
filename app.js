const HIDDEN = new Set(["413","5459","5752","789","985","5781","4199","5782"]);
const money = n => n == null ? "—" : new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB"}).format(n);
const DEMO = {
  sourceDate: "демо для браузера",
  categories: [
    {id:"wires",name:"Провода и кабели",subs:["pgva","kgvva","amg"]},
    {id:"connectors",name:"Автомобильные разъёмы и колодки",subs:["housings"]},
    {id:"protection",name:"Защита и изоляция проводки",subs:["corrugated_tubes"]}
  ],
  families: [
    {id:"wire-pgva",title:"Провод автомобильный ПГВА",categoryId:"wires",subId:"pgva",own:true,
      selectors:[{key:"section",label:"Сечение"},{key:"length",label:"Длина"},{key:"color",label:"Цвет"}]},
    {id:"wire-pgva-rainbow",title:"Набор проводов ПГВА «Радуга»",categoryId:"wires",subId:"pgva",own:true,selectors:[]},
    {id:"wire-kgvva",title:"Кабель автомобильный КГВВА",categoryId:"wires",subId:"kgvva",own:true,
      selectors:[{key:"section",label:"Сечение"},{key:"cores",label:"Жилы"},{key:"length",label:"Длина"}]},
    {id:"wire-amg",title:"Провод массы АМГ",categoryId:"wires",subId:"amg",own:true,
      selectors:[{key:"section",label:"Сечение"},{key:"length",label:"Длина"}]},
    {id:"col-6",title:"Колодка 6-контактная",categoryId:"connectors",subId:"housings",own:true,
      selectors:[{key:"kit",label:"Комплектация"}]},
    {id:"gofra",title:"Гофротрубка автомобильная",categoryId:"protection",subId:"corrugated_tubes",own:false,
      selectors:[{key:"class",label:"Класс"},{key:"split",label:"Исполнение"},{key:"diameter",label:"Диаметр"}]}
  ],
  skus: [
    sku("6886","7021","ПГВА 0,75 красный 5 м","wire-pgva",65.98,{section:"0,75 мм²",length:"Отрезок 5 м",color:"красный"}),
    sku("6887","7021-10","ПГВА 0,75 чёрный 5 м","wire-pgva",65.98,{section:"0,75 мм²",length:"Отрезок 5 м",color:"чёрный"}),
    sku("6888","7021-50","ПГВА 0,75 красный бухта 50 м","wire-pgva",489.0,{section:"0,75 мм²",length:"Бухта 50 м",color:"красный"}),
    sku("6901","7060","ПГВА 6,00 красный 5 м","wire-pgva",214.0,{section:"6,00 мм²",length:"Отрезок 5 м",color:"красный"}),
    sku("6902","7060-10","ПГВА 6,00 чёрный 5 м","wire-pgva",214.0,{section:"6,00 мм²",length:"Отрезок 5 м",color:"чёрный"}),
    sku("6903","7060-10m","ПГВА 6,00 красный 10 м","wire-pgva",398.0,{section:"6,00 мм²",length:"Отрезок 10 м",color:"красный"}),
    sku("6999","7021-R","ПГВА «Радуга»","wire-pgva-rainbow",890,{}),
    sku("7101","КГ-2x1.5","КГВВА 2x1,50 5 м","wire-kgvva",312,{section:"1,50 мм²",cores:"2",length:"Отрезок 5 м"}),
    sku("7102","КГ-3x1.5","КГВВА 3x1,50 5 м","wire-kgvva",401,{section:"1,50 мм²",cores:"3",length:"Отрезок 5 м"}),
    sku("7201","АМГ-16","АМГ 16 мм²","wire-amg",155,{section:"16,00 мм²",length:"Нарезка от 1 м"}),
    sku("801","4171","Колодка 6к голая","col-6",42,{kit:"Голая"}),
    sku("802","4171-сб","Колодка 6к с проводом","col-6",118,{kit:"С проводом"}),
    sku("901","GF-B-R","Гофра B разрезная 10 мм","gofra",76,{class:"B",split:"Разрезная",diameter:"10 мм"}),
    sku("902","GF-B-N","Гофра B неразрезная 10 мм","gofra",81,{class:"B",split:"Неразрезная",diameter:"10 мм"}),
    sku("903","GF-E-R","Гофра E разрезная 10 мм","gofra",94,{class:"E",split:"Разрезная",diameter:"10 мм"})
  ]
};
function sku(id,art,name,familyId,price,attrs){
  return {id,ae69Code:id,article:art,name,familyId,wholesale:price,packQty:1,orderMultiple:1,minOrderQty:1,unit:"шт",ownProduction:true,attrs};
}
let CATALOG = DEMO;
let view = {name:"home"};
let cart = JSON.parse(localStorage.getItem("ae69-b2b-web-cart")||"[]");
function saveCart(){localStorage.setItem("ae69-b2b-web-cart",JSON.stringify(cart));}
function familiesOf(cat,sub){return CATALOG.families.filter(f=>f.categoryId===cat && (!sub||f.subId===sub));}
function skusOf(fid){return CATALOG.skus.filter(s=>s.familyId===fid && !HIDDEN.has(s.ae69Code));}
function available(skus,selected,key){
  const others=Object.entries(selected).filter(([k,v])=>k!==key&&v);
  const pool=skus.filter(s=>others.every(([k,v])=>String(s.attrs[k]||"")===v));
  return [...new Set(pool.map(s=>String(s.attrs[key]||"")).filter(Boolean))];
}
function resolve(skus,selected){
  const hit=skus.filter(s=>Object.entries(selected).every(([k,v])=>!v||String(s.attrs[k]||"")===v));
  return hit.length===1?hit[0]:undefined;
}
function setView(v){view=v;render();}
function nav(name){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on",b.dataset.view===name));
  if(name==="home") setView({name:"home"});
  if(name==="catalog") setView({name:"catalog"});
  if(name==="search") setView({name:"search",q:""});
  if(name==="cart") setView({name:"cart"});
}
function render(){
  document.getElementById("cartN").textContent = cart.length?cart.length:"";
  const el=document.getElementById("app");
  if(view.name==="home") el.innerHTML = home();
  else if(view.name==="catalog") el.innerHTML = catalog();
  else if(view.name==="cat") el.innerHTML = category();
  else if(view.name==="family") el.innerHTML = family();
  else if(view.name==="search") el.innerHTML = search();
  else if(view.name==="cart") el.innerHTML = cartView();
  bind();
}
function home(){
  return `<h1>Оптовый каталог</h1>
    <p class="muted">То же, что в APK, только в браузере. Сейчас: ${CATALOG.sourceDate}. Остатки не показываем.</p>
    ${CATALOG.categories.map(c=>`<button class="row js-cat" data-id="${c.id}"><div><h2>${c.name}</h2><div class="muted">${familiesOf(c.id).length} семейств</div></div><span class="muted">→</span></button>`).join("")}`;
}
function catalog(){
  return `<h1>Каталог</h1>` + CATALOG.categories.map(c=>`<button class="row js-cat" data-id="${c.id}"><h2>${c.name}</h2><span class="muted">→</span></button>`).join("");
}
function category(){
  const c=CATALOG.categories.find(x=>x.id===view.id);
  const list=familiesOf(view.id);
  return `<div class="crumbs"><a href="#" class="js-home">Главная</a> / <a href="#" class="js-catalog">Каталог</a> / ${c?c.name:""}</div>
    <h1>${c?c.name:""}</h1>
    ${list.map(f=>{
      const from=Math.min(...skusOf(f.id).map(s=>s.wholesale));
      return `<button class="row js-fam" data-id="${f.id}"><div><h2>${f.title}</h2><div class="muted">${skusOf(f.id).length} вариант. ${f.own?"· своё пр-во":""}</div></div><span class="price">от ${money(from)}</span></button>`;
    }).join("")}`;
}
function family(){
  const f=CATALOG.families.find(x=>x.id===view.id);
  if(!f) return "Нет карточки";
  const skus=skusOf(f.id);
  view.sel = view.sel || {};
  f.selectors.forEach(s=>{ if(!view.sel[s.key]) view.sel[s.key]=(available(skus,view.sel,s.key)[0]||""); });
  f.selectors.forEach(s=>{ const opts=available(skus,view.sel,s.key); if(view.sel[s.key]&&!opts.includes(view.sel[s.key])) view.sel[s.key]=opts[0]||""; });
  const sku=f.selectors.length?resolve(skus,view.sel):skus[0];
  const line=sku&&cart.find(x=>x.skuId===sku.id);
  const catsel=`${f.selectors.map(s=>`<div><div class="muted">${s.label}</div><div class="chips">${available(skus,view.sel,s.key).map(v=>`<button class="chip ${view.sel[s.key]===v?"on":""} js-opt" data-k="${s.key}" data-v="${v}">${v}</button>`).join("")}</div></div>`).join("")}`;
  const buy=sku?`<div class="card"><p>${sku.name}</p><div class="muted">Код АЭ ${sku.ae69Code} · ${sku.article}</div><div class="price" style="font-size:24px;margin:8px 0">${money(sku.wholesale)}</div>${line?stepper(line.skuId,line.qty):`<div style="display:flex;gap:8px;align-items:center"><button class="btn js-add" data-id="${sku.id}">В корзину</button></div>`}</div>`:`<p class="muted">Выберите сочетание — цена появится у конкретного SKU.</p>`;
  return `<div class="crumbs"><a href="#" class="js-home">Главная</a> / <a href="#" class="js-catalog">Каталог</a> / ${f.title}</div><h1>${f.title}</h1>${catsel}${buy}`;
}
function stepper(id,qty){return `<div class="step"><button class="js-qty" data-id="${id}" data-d="-1">−</button><span>${qty}</span><button class="js-qty" data-id="${id}" data-d="1">+</button></div>`;}
function search(){
  const q=(view.q||"").toLowerCase().replace(",",".");
  const hits=!q?[]:CATALOG.skus.filter(s=>`${s.ae69Code} ${s.article} ${s.name}`.toLowerCase().replace(",",".").includes(q)).slice(0,30);
  return `<h1>Поиск</h1><input class="search" id="q" value="${view.q||""}" placeholder="7021, ПГВА 0,75, 6,3">
    ${hits.map(s=>`<button class="row js-fam" data-id="${s.familyId}"><div><h2>${s.name}</h2><div class="muted">${s.ae69Code} · ${s.article}</div></div><span class="price">${money(s.wholesale)}</span></button>`).join("")}`;
}
function cartView(){
  if(!cart.length) return `<h1>Корзина</h1><p class="muted">Пока пусто. Найдите ПГВА 6 мм² или 7021.</p>`;
  const sum=cart.reduce((n,i)=>n+i.qty*i.price,0);
  return `<h1>Корзина</h1><button class="btn sec js-csv">Скачать CSV</button>
    ${cart.map(i=>`<div class="card"><div class="muted">${i.code} · ${i.article}</div><div>${i.name}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">${stepper(i.skuId,i.qty)}<b>${money(i.qty*i.price)}</b></div></div>`).join("")}
    <div class="card"><b>Итого ${money(sum)}</b><div class="muted">Заявка, не оплата.</div></div>`;
}
function bind(){
  document.querySelectorAll(".js-cat").forEach(b=>b.onclick=()=>setView({name:"cat",id:b.dataset.id}));
  document.querySelectorAll(".js-fam").forEach(b=>b.onclick=()=>setView({name:"family",id:b.dataset.id,sel:{}}));
  document.querySelectorAll(".js-home").forEach(b=>b.onclick=e=>{e.preventDefault();nav("home");});
  document.querySelectorAll(".js-catalog").forEach(b=>b.onclick=e=>{e.preventDefault();nav("catalog");});
  document.querySelectorAll(".js-opt").forEach(b=>b.onclick=()=>{view.sel[b.dataset.k]=b.dataset.v;render();});
  document.querySelectorAll(".js-add").forEach(b=>b.onclick=()=>{
    const s=CATALOG.skus.find(x=>x.id===b.dataset.id); if(!s) return;
    const i=cart.find(x=>x.skuId===s.id);
    if(i) i.qty+=1; else cart.push({skuId:s.id,code:s.ae69Code,article:s.article,name:s.name,qty:1,price:s.wholesale});
    saveCart();render();
  });
  document.querySelectorAll(".js-qty").forEach(b=>b.onclick=()=>{
    const i=cart.find(x=>x.skuId===b.dataset.id); if(!i) return;
    i.qty+=Number(b.dataset.d); if(i.qty<=0) cart=cart.filter(x=>x.skuId!==i.skuId);
    saveCart();render();
  });
  document.querySelectorAll(".js-csv").forEach(b=>b.onclick=()=>{
    const rows=[["Код АЭ","Артикул","Наименование","Кол-во","Цена","Сумма"],...cart.map(i=>[i.code,i.article,i.name,i.qty,i.price,i.qty*i.price])];
    const csv="\uFEFF"+rows.map(r=>r.map(x=>`"${x}"`).join(";")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="zayavka-ae69.csv"; a.click();
  });
  const q=document.getElementById("q");
  if(q) q.oninput=()=>{view.q=q.value;render(); document.getElementById("q").focus(); document.getElementById("q").setSelectionRange(q.value.length,q.value.length);};
}
document.getElementById("logoBtn").onclick=()=>nav("home");
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>nav(b.dataset.view));
fetch("catalog.json").then(r=>r.ok?r.json():null).then(j=>{
  if(j&&j.skus){ CATALOG={sourceDate:j.source?.sourceDate||"catalog.json",categories:j.categories||DEMO.categories,families:j.families||DEMO.families,skus:j.skus.filter(s=>!HIDDEN.has(s.ae69Code))}; }
  document.getElementById("meta").textContent=CATALOG.sourceDate;
  render();
}).catch(()=>render());
render();
