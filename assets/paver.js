/* BagOrBulk paver UI. Math lives in calc.js (paverPlan, plan). */
addEventListener('DOMContentLoaded',function(){ 'use strict';
  var $=UI.$||function(i){return document.getElementById(i);}, n=UI.num, m=UI.money, C=window.BBCalc, form=$('pvForm'); if(!form) return;
  UI.readState(); UI.segs(render);
  function fmt(x,dp){ return (Math.round(x*Math.pow(10,dp||0))/Math.pow(10,dp||0)).toLocaleString('en-US'); }
  function stat(k,v){ return '<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>'; }
  function layer(name,r,unit){ var good=r.cheaper==='bags', q=r.per==='ton'?r.tons:r.yd;
    return '<tr><th scope="row">'+name+'</th><td>'+fmt(r.yd,2)+' yd³</td><td>'+fmt(r.tons,2)+' tons</td><td>'+fmt(r.bags)+' bags</td><td>'+(good?'Bags ('+m(r.bagCost,true)+')':'Bulk ('+m(r.bulkCost,true)+' delivered)')+'</td></tr>'; }
  var last='';
  function render(){
    var shape=$('sh').value, ps=$('ps').value, out=$('pvOut'), circ=shape==='circle';
    $('fW').hidden=circ; $('lnL').textContent=circ?'Diameter (ft)':'Length (ft)'; $('fCust').hidden=ps!=='custom';
    var bad=0; form.querySelectorAll('input[type=number]').forEach(function(el){ var b=el.value!==''&&(+el.value<0||!isFinite(+el.value)); el.setAttribute('aria-invalid',b?'true':'false'); if(b) bad++; });
    history.replaceState(null,'',UI.stateURL());
    if(bad){ out.innerHTML='<div class="alert err">'+UI.icon('alert')+'<div>Some numbers are negative or invalid. Fix the highlighted fields.</div></div>'; last=''; return; }
    var pl,pw; if(ps==='custom'){ pl=n('pl'); pw=n('pw'); } else { var q=ps.split('x'); pl=+q[0]; pw=+q[1]; }
    var r=C.paverPlan({shape:shape,l:n('ln'),w:n('wd'),pl:pl,pw:pw,waste:n('ws'),baseIn:n('bi'),sandIn:n('si'),baseWaste:n('bw'),sandWaste:n('bw'),price:$('pp').value===''?null:n('pp')});
    if(!r.area||!r.pavers){ out.innerHTML='<div class="empty">'+UI.icon('chart')+'<p><strong>Enter your patio size</strong><br>Length and width (or a diameter) in feet, and a paver size.</p></div>'; last=''; return; }
    var h='<h2>'+UI.icon('chart')+'You need '+fmt(r.pavers)+' pavers ('+pl+' × '+pw+' in)</h2>';
    h+='<div class="verdict good"><span class="vicon">'+UI.icon('check')+'</span><div><strong class="big">'+fmt(r.pavers)+' pavers, '+fmt(r.base.tons,1)+' tons of base, '+fmt(r.sand.tons,2)+' tons of sand.</strong><span>'+fmt(r.area,1)+' sq ft takes '+fmt(r.net)+' pavers ('+r.perSqFt+' per sq ft), plus '+fmt(n('ws'))+'% extra for cuts and breakage.'+(r.cost!=null?' Pavers alone: '+m(r.cost,true)+'.':'')+'</span></div></div>';
    h+='<div class="stats s3">'+stat('Pavers to buy',fmt(r.pavers))+stat('Area',fmt(r.area,1)+' sq ft')+stat('Pavers per sq ft',String(r.perSqFt))+'</div>';
    h+='<div class="table-scroll"><table><caption class="sr-only">Base and sand quantities</caption><thead><tr><th scope="col">Layer</th><th scope="col">Cubic yards</th><th scope="col">Tons</th><th scope="col">Bags (0.5 ft³)</th><th scope="col">Cheaper way to buy</th></tr></thead><tbody>'
      +layer('Gravel base ('+fmt(n('bi'),1)+' in)',r.base)+layer('Bedding sand ('+fmt(n('si'),2)+' in)',r.sand)+'</tbody></table></div>';
    h+='<p class="hint">Base and sand include '+fmt(n('bw'))+'% extra for compaction and screeding. Compact the base in 2–4 in layers, and lay geotextile fabric under it on soft or clay soil. Prices are typical 2026 defaults; change them in the <a href="../gravel-calculator/">gravel</a> and <a href="../sand-calculator/">sand</a> calculators.</p>';
    h+='<div class="actions"><button type="button" class="btn ghost sm" data-print>'+UI.icon('copy')+'Print / PDF</button><button type="button" class="btn ghost sm" id="copySum">'+UI.icon('copy')+'Copy shopping list</button></div>';
    out.innerHTML=h;
    last='Patio '+fmt(r.area,1)+' sq ft: '+fmt(r.pavers)+' pavers ('+pl+'x'+pw+' in), '+fmt(r.base.tons,1)+' tons gravel base, '+fmt(r.sand.tons,2)+' tons sand. '+location.href;
  }
  form.addEventListener('input',UI.debounce(render,40)); form.addEventListener('change',render);
  document.addEventListener('click',function(e){ if(e.target.closest('#copySum')&&last) UI.copy(last,'Shopping list copied'); });
  render();
});
