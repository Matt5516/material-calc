/* BagOrBulk UI: areas editor, live results, bag vs bulk verdict, diagram. Math lives in calc.js. */
addEventListener('DOMContentLoaded',function(){ 'use strict';
  var $=UI.$||function(i){return document.getElementById(i);}, n=UI.num, m=UI.money, C=window.BBCalc, M=C.MATERIALS;
  var form=$('bbForm'); if(!form) return;
  var SHAPES=form.dataset.shapes.split(','), DEF=JSON.parse(form.dataset.area), box=$('areas');
  var SN={rect:'Rectangle',circle:'Circle',tri:'Triangle',hole:'Post holes'};
  var DEPTH={concrete:'4 in for patios and sidewalks, 5–6 in for driveways and shed bases.',gravel:'2 in for paths, 4 in for a driveway top-up, 6–8 in (2–3 layers) for a new driveway.',mulch:'2–3 in for beds, 3–4 in to smother weeds. Do not pile it against trunks.',topsoil:'2 in to top-dress a lawn, 4–6 in for new lawn, 8–12 in for raised beds.',sand:'1 in under pavers, 2 in for leveling, 6–12 in for a sandbox.'};
  var uid=0;
  function fmt(x,dp){ return (Math.round(x*Math.pow(10,dp||0))/Math.pow(10,dp||0)).toLocaleString('en-US'); }
  function labels(shape){ return shape==='circle'?['Diameter (ft)','','Depth (in)','']:shape==='tri'?['Base (ft)','Height (ft)','Depth (in)','']:shape==='hole'?['Hole diameter (in)','Hole depth (in)','','Holes']:['Length (ft)','Width (ft)','Depth (in)','']; }
  function row(a){ var i=++uid, L=labels(a.shape), f=function(k,lab,v,step){ return lab?'<div><label for="'+k+i+'">'+lab+'</label><input id="'+k+i+'" data-k="'+k+'" type="number" inputmode="decimal" min="0" step="'+(step||'any')+'" value="'+(v==null?'':v)+'"></div>':''; };
    var el=document.createElement('div'); el.className='area'; el.setAttribute('role','group'); el.setAttribute('aria-label','Area '+(box.children.length+1));
    el.innerHTML=(SHAPES.length>1?'<div class="shape"><label for="s'+i+'">Shape</label><select id="s'+i+'" data-k="shape">'+SHAPES.map(function(s){return '<option value="'+s+'"'+(s===a.shape?' selected':'')+'>'+SN[s]+'</option>';}).join('')+'</select></div>':'<input type="hidden" data-k="shape" value="'+a.shape+'">')
      +f('l',L[0],a.l)+f('w',L[1],a.w)+f('d',L[2],a.d)+f('n',L[3],a.n||(a.shape==='hole'?4:''),'1')
      +'<button type="button" class="icon-btn rm" aria-label="Remove this area"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>';
    box.appendChild(el); }
  function read(){ return Array.prototype.map.call(box.children,function(el){ var a={}; el.querySelectorAll('[data-k]').forEach(function(x){ a[x.dataset.k]=x.dataset.k==='shape'?x.value:(x.value===''?0:+x.value); }); if(a.shape==='hole'&&!a.n) a.n=1; if(a.shape!=='hole') delete a.n; return a; }); }
  function enc(as){ return as.map(function(a){ return [a.shape,a.l||0,a.w||0,a.d||0].concat(a.n?[a.n]:[]).join(':'); }).join('|'); }
  function dec(s){ return s.split('|').map(function(p){ var q=p.split(':'); return {shape:SHAPES.indexOf(q[0])>=0?q[0]:SHAPES[0],l:+q[1]||0,w:+q[2]||0,d:+q[3]||0,n:q[4]?+q[4]:undefined}; }); }
  function setAreas(as){ box.innerHTML=''; as.forEach(row); }
  function applyMat(k,keep){ var d=M[k], b=d.bulk, p=keep||new URLSearchParams();
    var bag=$('bag'); bag.innerHTML=d.bags.map(function(x){return '<option value="'+x.cuft+'" data-lbs="'+(x.lbs||'')+'" data-price="'+x.price+'">'+x.label+'</option>';}).join(''); bag.dataset.def=String(d.bags[0].cuft); if(!p.has('bag')) bag.value=bag.dataset.def; else bag.value=p.get('bag');
    var defs={bp:d.bags[0].price,up:b.price,dl:b.delivery,mn:b.min,ws:d.waste,dn:d.density};
    Object.keys(defs).forEach(function(id){ var el=$(id); el.dataset.def=String(defs[id]); if(!p.has(id)) el.value=defs[id]; });
    var ul=document.querySelector('label[for=up]'); if(ul) ul.textContent='Bulk price per '+(b.per==='ton'?'ton':'cubic yard');
    var ml=document.querySelector('label[for=mn]'); if(ml) ml.textContent='Minimum bulk order ('+(b.per==='ton'?'tons':'yd³')+')';
    var dh=$('depthHint'); if(dh) dh.textContent='Depth guide: '+DEPTH[k]; }
  function stat(k,v,cls){ return '<div class="stat"><div class="k">'+k+'</div><div class="v '+(cls||'')+'">'+v+'</div></div>'; }
  function diagram(a){ if(!a) return ''; var W=320,H=170,s='<svg class="chart diagram" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Top view of area 1">';
    var fill='color-mix(in srgb,var(--brand) 22%,transparent)', st='var(--brand)';
    if(a.shape==='circle'||a.shape==='hole'){ s+='<circle cx="160" cy="80" r="62" style="fill:'+fill+';stroke:'+st+'" stroke-width="3"/><line x1="98" y1="80" x2="222" y2="80" stroke="var(--ink)" stroke-dasharray="4 4"/><text x="160" y="72" text-anchor="middle">'+fmt(a.l,1)+(a.shape==='hole'?' in':' ft')+'</text>'+(a.shape==='hole'?'<text x="160" y="160" text-anchor="middle">× '+(a.n||1)+' holes, '+fmt(a.w,1)+' in deep</text>':'<text x="160" y="162" text-anchor="middle">'+fmt(a.d,1)+' in deep</text>'); }
    else { var l=Math.max(a.l,0.1),w=Math.max(a.w,0.1),k=Math.min(260/l,120/w),rw=l*k,rh=w*k,x=(W-rw)/2,y=(H-20-rh)/2+4;
      s+= a.shape==='tri'? '<polygon points="'+x+','+(y+rh)+' '+(x+rw)+','+(y+rh)+' '+x+','+y+'" style="fill:'+fill+';stroke:'+st+'" stroke-width="3"/>' : '<rect x="'+x+'" y="'+y+'" width="'+rw+'" height="'+rh+'" rx="4" style="fill:'+fill+';stroke:'+st+'" stroke-width="3"/>';
      s+='<text x="'+(W/2)+'" y="'+(y+rh+16)+'" text-anchor="middle">'+fmt(a.l,1)+' ft</text><text x="'+(x-6)+'" y="'+(y+rh/2+4)+'" text-anchor="end">'+fmt(a.w,1)+' ft</text><text x="'+(W/2)+'" y="'+(y+rh/2+4)+'" text-anchor="middle">'+fmt(a.d,1)+' in deep</text>'; }
    return s+'</svg>'; }
  var last='';
  function render(){ var k=$('mat').value, d=M[k], as=read(), out=$('bbOut');
    var bad=0; form.querySelectorAll('input[type=number]').forEach(function(el){ var b=el.value!==''&&(+el.value<0||!isFinite(+el.value)); el.setAttribute('aria-invalid',b?'true':'false'); if(b) bad++; });
    $('a').value=enc(as)===enc([DEF])?'':enc(as);
    history.replaceState(null,'',UI.stateURL());
    if(bad){ out.innerHTML='<div class="alert err">'+UI.icon('alert')+'<div>Negative or invalid numbers. Fix the highlighted fields.</div></div>'; return; }
    var opt=$('bag').selectedOptions[0];
    var r=C.plan({material:k,areas:as,waste:n('ws'),bagCuFt:+$('bag').value,bagLbs:opt&&opt.dataset.lbs?+opt.dataset.lbs:null,bagPrice:n('bp'),bulkPrice:n('up'),delivery:n('dl'),min:n('mn'),density:n('dn'),shortLoadFee:$('sl')?n('sl'):0});
    if(!r.cuft){ out.innerHTML='<div class="empty">'+UI.icon('chart')+'<p><strong>Add your measurements</strong><br>Length, width and depth. Your answer shows up here.</p></div>'; return; }
    var ton=d.bulk.per==='ton', unit=ton?'tons':'yd³', good=r.cheaper==='bags';
    var h='<h2>'+UI.icon('chart')+'You need '+fmt(r.yd,2)+' cubic yards of '+d.name.toLowerCase()+'</h2>';
    h+='<div class="verdict '+(good?'good':'warn')+'"><span class="vicon">'+UI.icon(good?'check':'swap')+'</span><div><strong class="big">'+(good?'Buy '+r.bags+' bags':'Order '+fmt(r.orderQty,2)+' '+unit+' in bulk')+'. You save about '+m(r.savings,true)+'.</strong><span>'+r.bags+' bags cost '+m(r.bagCost,true)+'; a bulk delivery costs '+m(r.bulkCost,true)+(r.shortLoad?' including a '+m(r.shortLoad,true)+' short-load fee':'')+'.'+(r.breakEvenYd!=null?' Bulk wins above about '+fmt(r.breakEvenYd,2)+' yd³ ('+fmt(r.breakEvenCuFt,1)+' ft³) at these prices.':'')+'</span></div></div>';
    h+='<div class="stats s3">'+stat('Cubic yards',fmt(r.yd,2))+stat('Cubic feet',fmt(r.cuft,1))+stat(ton||k==='concrete'?'Weight':'Tons (approx.)',ton||k==='concrete'?fmt(r.tons,2)+' tons':fmt(r.tons,2))
      +stat('Bags ('+opt.textContent.replace(/ bag.*$/,'')+')',fmt(r.bags))+stat('Bag weight total',fmt(r.totalBagLbs)+' lb')+stat('Cubic meters',fmt(r.cuft*0.0283168,2))+'</div>';
    h+=UI.bars([{label:'Bags',value:r.bagCost,color:'var(--brand)'},{label:'Bulk delivery',value:r.bulkCost,color:'var(--brand-2)'}],{label:'Cost of bags versus bulk delivery',h:170});
    h+='<p class="hint">Includes '+fmt(n('ws'))+'% extra for waste and settling ('+fmt(r.rawCuFt,1)+' ft³ before it). '+(r.totalBagLbs>2000?'That’s over a ton of bags. Plan several trips or pay for delivery.':'')+'</p>';
    h+=diagram(as[0]);
    h+='<div class="actions"><button type="button" class="btn ghost sm" data-print>'+UI.icon('copy')+'Print / PDF</button><button type="button" class="btn ghost sm" id="copySum">'+UI.icon('copy')+'Copy shopping list</button></div>';
    out.innerHTML=h;
    last=d.name+': '+fmt(r.yd,2)+' yd³ ('+fmt(r.cuft,1)+' ft³, ~'+fmt(r.tons,2)+' tons). Bags: '+r.bags+' × '+opt.textContent+' = '+m(r.bagCost,true)+'. Bulk: '+fmt(r.orderQty,2)+' '+unit+' = '+m(r.bulkCost,true)+'. Cheaper: '+(good?'bags':'bulk')+'. '+location.href;
  }
  var st=UI.readState(), p=st.params;
  var k0=$('mat').value; applyMat(k0,p);
  setAreas(p.get('a')?dec(p.get('a')):[DEF]);
  if(UI.segs) UI.segs(function(){ applyMat($('mat').value); render(); });
  form.addEventListener('input',UI.debounce(render,40));
  form.addEventListener('change',function(e){ var t=e.target; if(t.dataset&&t.dataset.k==='shape'){ var i=Array.prototype.indexOf.call(box.children,t.closest('.area')), as=read(), a=as[i]; if(a.shape==='hole'){a.l=12;a.w=36;a.n=4;a.d=0;} else if(!a.d){a.d=DEF.d||4;} setAreas(as); var sel=box.children[i]&&box.children[i].querySelector('select'); if(sel) sel.focus(); }
    if(t.id==='bag'){ var o=t.selectedOptions[0]; if(o){ $('bp').value=o.dataset.price; } } render(); });
  $('addArea').addEventListener('click',function(){ row({shape:SHAPES[0],l:'',w:'',d:read()[0]?read()[0].d:DEF.d}); box.lastChild.querySelector('input[type=number]').focus(); render(); });
  box.addEventListener('click',function(e){ var b=e.target.closest('.rm'); if(!b) return; if(box.children.length>1){ b.closest('.area').remove(); } else { box.innerHTML=''; row({shape:SHAPES[0],l:'',w:'',d:''}); } render(); });
  document.addEventListener('click',function(e){ if(e.target.closest('#copySum')) UI.copy(last,'Shopping list copied'); });
  render();
});
