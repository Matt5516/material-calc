/* BagOrBulk firewood UI. Math lives in calc.js (firewoodPlan). */
addEventListener('DOMContentLoaded',function(){ 'use strict';
  var $=UI.$||function(i){return document.getElementById(i);}, n=UI.num, m=UI.money, C=window.BBCalc, form=$('fwForm'); if(!form) return;
  UI.readState(); UI.segs(render);
  function fmt(x,dp){ return (Math.round(x*Math.pow(10,dp||0))/Math.pow(10,dp||0)).toLocaleString('en-US'); }
  function stat(k,v){ return '<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>'; }
  function opt(id){ return $(id).value===''?null:n(id); }
  var last='';
  function render(){
    var md=$('md').value, out=$('fwOut');
    $('qStack').hidden=md!=='stack'; $('qQty').hidden=md==='stack';
    $('qtL').textContent=md==='cords'?'How many cords?':'How many face cords?';
    var bad=0; form.querySelectorAll('input[type=number]').forEach(function(el){ var b=el.value!==''&&(+el.value<0||!isFinite(+el.value)); el.setAttribute('aria-invalid',b?'true':'false'); if(b) bad++; });
    history.replaceState(null,'',UI.stateURL());
    if(bad){ out.innerHTML='<div class="alert err">'+UI.icon('alert')+'<div>Negative or invalid numbers. Fix the highlighted fields.</div></div>'; last=''; return; }
    var o={mode:md,pieceIn:n('pc'),bundleCuFt:n('bu'),burnPerMonth:opt('bn'),bundlePrice:opt('bp'),cordPrice:opt('cp'),delivery:opt('dl')};
    if(md==='stack'){ o.l=n('sl'); o.lu=$('slu').value; o.h=n('sh'); o.hu=$('shu').value; o.d=n('sd'); o.du=$('sdu').value; } else o.qty=n('qt');
    var r=C.firewoodPlan(o);
    if(!(r.cuft>0)){ out.innerHTML='<div class="empty">'+UI.icon('chart')+'<p><strong>Add your wood</strong><br>A stack size, or a number of cords or face cords.</p></div>'; last=''; return; }
    var fcNote=md==='stack'?'4 × 8 ft face, '+fmt(r.pieceIn,1)+' in deep':'4 × 8 ft face, '+fmt(r.pieceIn,0)+' in logs';
    var h='<h2>'+UI.icon('chart')+fmt(r.cuft,1)+' cubic feet of firewood</h2>';
    h+='<div class="verdict good"><span class="vicon">'+UI.icon('check')+'</span><div><strong class="big">'+fmt(r.cords,2)+' of a full cord</strong><span>A full cord is 128 ft³ of stacked wood. That is also '+fmt(r.faceCords,2)+' face cord'+(r.faceCords===1?'':'s')+' ('+fcNote+') and about '+fmt(r.bundles)+' store bundles at '+fmt(r.bundleCuFt,2)+' ft³ each.</span></div></div>';
    h+='<div class="stats s3">'+stat('Cubic feet',fmt(r.cuft,1))+stat('Full cords',fmt(r.cords,2))+stat('Face cords',fmt(r.faceCords,2))+'</div>';
    h+='<div class="stats s3">'+stat('Bundles ('+fmt(r.bundleCuFt,2)+' ft³)',fmt(r.bundles))+stat('Cubic yards',fmt(r.cuft/27,2))+stat('Log length',fmt(r.pieceIn,0)+' in')+'</div>';
    if(r.cheaper){
      var cord=r.cheaper==='cord';
      h+='<div class="verdict '+(cord?'good':'warn')+'"><span class="vicon">'+UI.icon(cord?'check':'alert')+'</span><div><strong class="big">'+(r.cheaper==='tie'?'Bundles and delivery cost the same.':(cord?'Delivered wood':'Bundles')+' costs less: save '+m(r.savings)+'.')+'</strong><span>'+fmt(r.bundles)+' bundles at '+m(n('bp'))+' = '+m(r.bundleCost)+' ('+m(r.bundleCostPerCord)+' per full cord). Delivered: '+fmt(r.cuft/128,2)+' cord at '+m(n('cp'))+(o.delivery?' + '+m(o.delivery)+' delivery':'')+' = '+m(r.cordCost)+'. Bundles must cost under '+m(r.breakEvenBundlePrice)+' each to match.</span></div></div>';
    } else h+='<p class="hint">Add a price per bundle and a price per full cord (under “Bundles and prices”) to see which costs less.</p>';
    if(r.months!=null) h+='<div class="verdict good"><span class="vicon">'+UI.icon('check')+'</span><div><strong class="big">About '+fmt(r.months,1)+' month'+(r.months===1?'':'s')+' of burning</strong><span>'+fmt(r.faceCords,2)+' face cords at your '+fmt(o.burnPerMonth,2)+' per month. Use the same log length for the rate and the wood.</span></div></div>';
    h+='<p class="hint">Stacked volume includes the air between logs, which is how cords are sold. Delivered loads are sometimes “thrown” instead of stacked and can settle. Ask the seller how it’s measured. A partial cord is priced pro rata here, but sellers may charge more per piece for small loads. Bundle sizes are not standardised, so use the label’s cubic feet.</p>';
    h+='<div class="actions"><button type="button" class="btn ghost sm" data-print>'+UI.icon('copy')+'Print / PDF</button><button type="button" class="btn ghost sm" id="copySum">'+UI.icon('copy')+'Copy summary</button></div>';
    out.innerHTML=h;
    last='Firewood: '+fmt(r.cuft,1)+' ft³ = '+fmt(r.cords,2)+' cord = '+fmt(r.faceCords,2)+' face cords (~'+fmt(r.bundles)+' bundles at '+fmt(r.bundleCuFt,2)+' ft³). '+location.href;
  }
  form.addEventListener('input',UI.debounce(render,40)); form.addEventListener('change',render);
  document.addEventListener('click',function(e){ if(e.target.closest('#copySum')&&last) UI.copy(last,'Summary copied'); });
  render();
});
