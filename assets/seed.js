/* BagOrBulk grass seed UI. Math lives in calc.js (seedPlan, bestBag). */
addEventListener('DOMContentLoaded',function(){ 'use strict';
  var $=UI.$||function(i){return document.getElementById(i);}, n=UI.num, m=UI.money, C=window.BBCalc, form=$('gsForm'); if(!form) return;
  var NOTE={'tall-fescue':'Common in the transition zone and the north; good in sun and light shade.','bluegrass':'Cool-season; slow to germinate (2–3 weeks), so it is often blended.','ryegrass':'Fastest to germinate (5–10 days); often mixed in for quick cover.','fine-fescue':'Best in shade and low-input lawns.','bermuda':'Warm-season, full sun. Hulled seed; unhulled seed needs about double the rate.','zoysia':'Warm-season and slow to establish. Seeded varieties only (many zoysia lawns are sod or plugs).','centipede':'Warm-season, low-maintenance; seeded very lightly.'};
  var sel=$('gt'); sel.innerHTML=Object.keys(C.SEED).map(function(k){ var s=C.SEED[k]; return '<option value="'+k+'">'+s.name+' ('+s.season+'-season)</option>'; }).join('');
  var st=UI.readState(); if(st.params.has('gt')) sel.value=st.params.get('gt'); UI.segs(render);
  function fmt(x,dp){ return (Math.round(x*Math.pow(10,dp||0))/Math.pow(10,dp||0)).toLocaleString('en-US'); }
  function stat(k,v){ return '<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>'; }
  var last='';
  function render(){
    var am=$('am').value; $('fSq').hidden=am!=='sqft'; $('fL').hidden=$('fW').hidden=am!=='lw'; $('fA').hidden=am!=='acres';
    var mode=$('pj').value, type=sel.value, S=C.SEED[type], out=$('gsOut');
    $('gtHint').textContent=NOTE[type]||'';
    var bad=0; form.querySelectorAll('input[type=number]').forEach(function(el){ var b=el.value!==''&&(+el.value<0||!isFinite(+el.value)); el.setAttribute('aria-invalid',b?'true':'false'); if(b) bad++; });
    history.replaceState(null,'',UI.stateURL());
    if(bad){ out.innerHTML='<div class="alert err">'+UI.icon('alert')+'<div>Some numbers are negative or invalid. Fix the highlighted fields.</div></div>'; last=''; return; }
    var o={type:type,mode:mode,rate:$('rt').value===''?null:n('rt'),price:$('bp').value===''?null:n('bp'),bagLbs:n('bl')};
    if(am==='sqft') o.sqft=n('sq'); else if(am==='acres') o.acres=n('ac'); else { o.l=n('ln'); o.w=n('wd'); }
    var r=C.seedPlan(o);
    if(!r.area){ out.innerHTML='<div class="empty">'+UI.icon('chart')+'<p><strong>Enter your lawn size</strong><br>Square feet, length × width, or acres.</p></div>'; last=''; return; }
    var best=C.bestBag(r.lbs), R=S[mode==='over'?'ov':'nw'], custom=o.rate!=null;
    var h='<h2>'+UI.icon('chart')+'You need about '+fmt(r.lbs,1)+' lb of '+S.name.toLowerCase()+' seed</h2>';
    h+='<div class="verdict good"><span class="vicon">'+UI.icon('check')+'</span><div><strong class="big">Buy '+best.n+' × '+best.size+' lb bag'+(best.n>1?'s':'')+(best.over>0?' ('+fmt(best.over,1)+' lb to spare)':'')+'.</strong><span>'+fmt(r.area)+' sq ft at '+fmt(r.rate,2)+' lb per 1,000 sq ft'+(custom?' (your rate)':' ('+(mode==='over'?'overseeding':'new lawn')+' mid-range; published range '+R.lo+'–'+R.hi+')')+'.'+(r.cost!=null?' Total for '+r.bags[o.bagLbs]+' × '+o.bagLbs+' lb bags: '+m(r.cost,true)+'.':'')+'</span></div></div>';
    h+='<div class="stats s3">'+stat('Pounds (default)',fmt(r.lbs,1)+' lb')+stat('Low end ('+R.lo+' lb/1,000)',fmt(r.lo,1)+' lb')+stat('High end ('+R.hi+' lb/1,000)',fmt(r.hi,1)+' lb')+'</div>';
    h+='<div class="table-scroll"><table><caption class="sr-only">Bags needed by size</caption><thead><tr><th scope="col">Bag size</th><th scope="col">Bags to buy</th><th scope="col">Total seed</th>'+(o.price!=null?'<th scope="col">Cost at your price</th>':'')+'</tr></thead><tbody>'
      +C.SEED_BAGS.map(function(b){ return '<tr><th scope="row">'+b+' lb</th><td>'+r.bags[b]+'</td><td>'+(r.bags[b]*b)+' lb</td>'+(o.price!=null?'<td>'+m(r.bags[b]*o.price,true)+'</td>':'')+'</tr>'; }).join('')+'</tbody></table></div>';
    h+='<p class="hint">Rates are pounds of seed per 1,000 sq ft from university extension guidance (see the <a href="../how-much-grass-seed-per-square-foot/">seeding rate guide and sources</a>). Your seed bag’s label rate wins if it differs, especially for coated seed. Seed in two passes at right angles, and keep the top inch moist until it sprouts.</p>';
    h+='<div class="actions"><button type="button" class="btn ghost sm" data-print>'+UI.icon('copy')+'Print / PDF</button><button type="button" class="btn ghost sm" id="copySum">'+UI.icon('copy')+'Copy shopping list</button></div>';
    out.innerHTML=h;
    last=S.name+' ('+(mode==='over'?'overseeding':'new lawn')+'), '+fmt(r.area)+' sq ft: '+fmt(r.lbs,1)+' lb. Buy '+best.n+' × '+best.size+' lb. '+location.href;
  }
  form.addEventListener('input',UI.debounce(render,40)); form.addEventListener('change',render);
  document.addEventListener('click',function(e){ if(e.target.closest('#copySum')&&last) UI.copy(last,'Shopping list copied'); });
  render();
});
