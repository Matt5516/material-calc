/* BagOrBulk ice melt UI. Math lives in calc.js (iceMeltPlan). No defaults: coverage and prices come from the user. */
addEventListener('DOMContentLoaded',function(){ 'use strict';
  var $=UI.$||function(i){return document.getElementById(i);}, n=UI.num, m=UI.money, C=window.BBCalc, form=$('imForm'); if(!form) return;
  UI.readState(); UI.segs(render);
  function fmt(x,dp){ return (Math.round(x*Math.pow(10,dp||0))/Math.pow(10,dp||0)).toLocaleString('en-US'); }
  function stat(k,v){ return '<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>'; }
  function opt(id){ return $(id).value===''?null:n(id); }
  var last='';
  function render(){
    var am=$('am').value, out=$('imOut'); $('fSq').hidden=am!=='sqft'; $('fLw').hidden=am!=='lw';
    var bad=0; form.querySelectorAll('input[type=number]').forEach(function(el){ var b=el.value!==''&&(+el.value<0||!isFinite(+el.value)); el.setAttribute('aria-invalid',b?'true':'false'); if(b) bad++; });
    history.replaceState(null,'',UI.stateURL());
    if(bad){ out.innerHTML='<div class="alert err">'+UI.icon('alert')+'<div>Negative or invalid numbers. Fix the highlighted fields.</div></div>'; last=''; return; }
    var o={apps:opt('ap'),bagLbs:opt('bl'),cov:opt('cv'),covUnit:$('cu').value,bagPrice:opt('bp'),bulkPrice:opt('up'),bulkLbs:opt('ul'),delivery:opt('dv')};
    if(am==='sqft') o.sqft=opt('sq'); else o.areas=[{l:n('dl1'),w:n('dw1')},{l:n('wl1'),w:n('ww1')}];
    var r=C.iceMeltPlan(o);
    if(!(r.sqft>0)){ last=''; out.innerHTML='<div class="empty">'+UI.icon('chart')+'<p><strong>Add your area</strong><br>Square feet, or the length and width of your driveway and walks.</p></div>'; return; }
    var need=[]; if(!o.bagLbs) need.push('the bag size'); if(!o.cov) need.push('the coverage from the label'); else if(!r.cov) need.push('the bag size (the label rate is by weight)'); if(!o.apps) need.push('the number of applications');
    var h='<h2>'+UI.icon('chart')+fmt(r.sqft)+' square feet to treat</h2>';
    if(r.bagsPer==null){
      last='';
      h+='<div class="empty">'+UI.icon('chart')+'<p><strong>Add '+need.join(' and ')+'</strong><br>The bag label has the coverage. It is not pre-filled because it differs by product.</p></div>';
      out.innerHTML=h; return;
    }
    if(r.bagsSeason!=null){
      h+='<div class="verdict good"><span class="vicon">'+UI.icon('check')+'</span><div><strong class="big">Buy '+fmt(r.bagsSeason)+' bag'+(r.bagsSeason===1?'':'s')+' for the winter.</strong><span>'+fmt(r.bagsPer)+' bag'+(r.bagsPer===1?'':'s')+' per application, '+fmt(o.apps)+' application'+(o.apps===1?'':'s')+', '+fmt(r.cov,1)+' sq ft per '+fmt(o.bagLbs,1)+' lb bag. '+(r.spareLbs>0?'About '+fmt(r.spareLbs,1)+' lb left over.':'No product left over.')+'</span></div></div>';
    } else {
      h+='<div class="verdict good"><span class="vicon">'+UI.icon('check')+'</span><div><strong class="big">'+fmt(r.bagsPer)+' bag'+(r.bagsPer===1?'':'s')+' per application.</strong><span>'+fmt(r.cov,1)+' sq ft per '+fmt(o.bagLbs,1)+' lb bag. Add the number of applications for a season total.</span></div></div>';
    }
    h+='<div class="stats s3">'+stat('Square feet',fmt(r.sqft))+stat('Bags per application',fmt(r.bagsPer))+stat('Bags for the season',r.bagsSeason==null?'—':fmt(r.bagsSeason))+'</div>';
    h+='<div class="stats s3">'+stat('Coverage per bag',fmt(r.cov,1)+' sq ft')+stat('Pounds per application',fmt(r.lbsPer,1)+' lb')+stat('Pounds for the season',r.lbsSeason==null?'—':fmt(r.lbsSeason,1)+' lb')+'</div>';
    if(r.cheaper){
      var bags=r.cheaper==='bags';
      h+='<div class="verdict '+(bags?'good':'warn')+'"><span class="vicon">'+UI.icon(bags?'check':'alert')+'</span><div><strong class="big">'+(r.cheaper==='tie'?'Bags and bulk cost the same.':(bags?'Bags cost less':'Bulk or pallet costs less')+': save '+m(r.savings)+'.')+'</strong><span>'+fmt(r.bagsSeason)+' bags at '+m(o.bagPrice)+' = '+m(r.bagCost)+' ('+m(r.bagPerLb)+' per lb). '+fmt(r.bulkUnits)+' pallet or bulk unit'+(r.bulkUnits===1?'':'s')+' at '+m(o.bulkPrice)+(o.delivery?' plus '+m(o.delivery)+' delivery':'')+' = '+m(r.bulkCost)+' ('+m(r.bulkPerLb)+' per lb before delivery). Bulk is bought in whole units, so any extra you buy is counted.</span></div></div>';
    } else if(r.bagsSeason!=null) h+='<p class="hint">Add your bag price, your pallet or bulk price and the pounds in it (under “Bag vs bulk or pallet”) to see which costs less.</p>';
    h+='<p class="hint">Coverage is the number you entered from your bag. Follow the bag’s directions for temperature and ice thickness, and check its label for use on new concrete, pets and plants.</p>';
    h+='<div class="actions"><button type="button" class="btn ghost sm" data-print>'+UI.icon('copy')+'Print / PDF</button><button type="button" class="btn ghost sm" id="copySum">'+UI.icon('copy')+'Copy summary</button></div>';
    out.innerHTML=h;
    last='Ice melt: '+fmt(r.sqft)+' sq ft, '+fmt(r.bagsPer)+' bags per application'+(r.bagsSeason!=null?', '+fmt(r.bagsSeason)+' for '+fmt(o.apps)+' applications':'')+' ('+fmt(o.bagLbs,1)+' lb bags). '+location.href;
  }
  form.addEventListener('input',UI.debounce(render,40)); form.addEventListener('change',render);
  document.addEventListener('click',function(e){ if(e.target.closest('#copySum')&&last) UI.copy(last,'Summary copied'); });
  render();
});
