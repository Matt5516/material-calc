/* BagOrBulk math: volumes, bags, tons and bag-vs-bulk cost. Pure functions, no DOM. Tested in _tests/unit.test.js. */
(function(root){
'use strict';
var CUFT_PER_YD = 27, PI = Math.PI;
// Typical figures (editable in the tools). Densities in tons per cubic yard; bag yields in cubic feet.
var MATERIALS = {
 concrete: {name:'Concrete', unit:'yd', density:2.0, bags:[{id:'80',label:'80 lb bag',cuft:0.60,lbs:80,price:6.50},{id:'60',label:'60 lb bag',cuft:0.45,lbs:60,price:5.25},{id:'40',label:'40 lb bag',cuft:0.30,lbs:40,price:4.25}],
   bulk:{price:170,per:'yd',delivery:0,min:1,step:0.25,shortLoadUnder:4,shortLoadFee:150}, waste:10},
 gravel:   {name:'Gravel', unit:'ton', density:1.4, bags:[{id:'50',label:'0.5 ft³ bag (~50 lb)',cuft:0.5,lbs:50,price:5.50}],
   bulk:{price:45,per:'ton',delivery:100,min:1,step:0.5}, waste:10},
 mulch:    {name:'Mulch', unit:'yd', density:0.3, bags:[{id:'2',label:'2 ft³ bag',cuft:2,lbs:20,price:4.00},{id:'3',label:'3 ft³ bag',cuft:3,lbs:30,price:6.00},{id:'1.5',label:'1.5 ft³ bag',cuft:1.5,lbs:15,price:3.50}],
   bulk:{price:40,per:'yd',delivery:75,min:1,step:0.5}, waste:5},
 topsoil:  {name:'Topsoil', unit:'yd', density:1.1, bags:[{id:'0.75',label:'0.75 ft³ bag (40 lb)',cuft:0.75,lbs:40,price:3.25},{id:'1',label:'1 ft³ bag',cuft:1,lbs:55,price:4.50},{id:'1.5',label:'1.5 ft³ bag',cuft:1.5,lbs:80,price:6.50}],
   bulk:{price:35,per:'yd',delivery:75,min:1,step:0.5}, waste:10},
 sand:     {name:'Sand', unit:'ton', density:1.35, bags:[{id:'0.5',label:'0.5 ft³ bag (50 lb)',cuft:0.5,lbs:50,price:5.00}],
   bulk:{price:40,per:'ton',delivery:100,min:1,step:0.5}, waste:10}
};
function r2(x){ return Math.round(x*100)/100; }
function ceilTo(x,step){ if(!step) return x; return Math.ceil(x/step - 1e-9)*step; }
// One area -> cubic feet. shape: 'rect' (l ft, w ft, d in), 'circle' (l = diameter ft, d in), 'tri' (l, w legs/base-height ft, d in), 'hole' (l = diameter in, w = depth in, n = count)
function areaSqFt(a){ var l=+a.l||0, w=+a.w||0;
  if(a.shape==='circle') return PI*l*l/4;
  if(a.shape==='tri') return l*w/2;
  if(a.shape==='hole') return PI*(l/12)*(l/12)/4*(+a.n||1);
  return l*w; }
function cuft(a){ if(a.shape==='hole') return areaSqFt(a)*((+a.w||0)/12);
  return areaSqFt(a)*((+a.d||0)/12)*(a.n?+a.n:1); }
function totalCuFt(areas){ return areas.reduce(function(s,a){ return s+cuft(a); },0); }
function withWaste(v,pct){ return v*(1+(+pct||0)/100); }
function bagsNeeded(v,bagCuFt){ return bagCuFt>0? Math.ceil(v/bagCuFt - 1e-9) : 0; }
// Full plan. o: {material, areas, waste, bagCuFt, bagPrice, bulkPrice, bulkPer ('yd'|'ton'), delivery, min, step, density, shortLoadUnder, shortLoadFee}
function plan(o){
  var M = MATERIALS[o.material]||MATERIALS.gravel, b=M.bulk;
  var g=function(k,def){ return o[k]===undefined||o[k]===null||o[k]===''?def:+o[k]; };
  var density=g('density',M.density), waste=g('waste',M.waste);
  var raw = o.cuft!=null? +o.cuft : totalCuFt(o.areas||[]);
  var v = withWaste(raw,waste), yd=v/CUFT_PER_YD, tons=yd*density;
  var bagCuFt=g('bagCuFt',M.bags[0].cuft), bagPrice=g('bagPrice',M.bags[0].price);
  var bags=bagsNeeded(v,bagCuFt), bagCost=bags*bagPrice;
  var per=o.bulkPer||b.per, qty=per==='ton'?tons:yd, step=g('step',b.step), min=g('min',b.min);
  var orderQty = qty>0? Math.max(min, ceilTo(qty,step)) : 0;
  var slu=g('shortLoadUnder',b.shortLoadUnder||0), slf=g('shortLoadFee',b.shortLoadFee||0);
  var shortLoad = (slu && orderQty>0 && orderQty<slu)? slf : 0;
  var bulkCost = orderQty>0? orderQty*g('bulkPrice',b.price)+g('delivery',b.delivery)+shortLoad : 0;
  var bagLbs = o.bagLbs!=null? +o.bagLbs : M.density*2000/CUFT_PER_YD*bagCuFt; // weight per bag
  var cheaper = bags===0? 'none' : (bagCost<=bulkCost? 'bags':'bulk');
  // break-even volume (cu ft, after waste) where bulk becomes cheaper, scanning in 0.1 ft³ steps up to 50 yd
  var be=null; for(var x=0.1;x<=1350;x+=0.1){ var s=plan1(x); if(s.bulk<s.bag){ be=r2(x); break; } }
  function plan1(x){ var q=(per==='ton'?x/CUFT_PER_YD*density:x/CUFT_PER_YD), oq=Math.max(min,ceilTo(q,step)); var sl=(slu&&oq<slu)?slf:0;
    return {bag:bagsNeeded(x,bagCuFt)*bagPrice, bulk:oq*g('bulkPrice',b.price)+g('delivery',b.delivery)+sl}; }
  return {rawCuFt:r2(raw), cuft:r2(v), yd:r2(yd), tons:r2(tons), bags:bags, bagCost:r2(bagCost), orderQty:r2(orderQty), per:per, shortLoad:shortLoad,
          bulkCost:r2(bulkCost), cheaper:cheaper, savings:r2(Math.abs(bagCost-bulkCost)), bagLbs:Math.round(bagLbs), totalBagLbs:Math.round(bagLbs*bags),
          breakEvenCuFt:be, breakEvenYd: be==null?null:r2(be/CUFT_PER_YD)};
}
// coverage of 1 cubic yard at a depth (in) -> square feet
function coverage(depthIn){ return depthIn>0? r2(CUFT_PER_YD*12/depthIn) : 0; }
var api = {MATERIALS:MATERIALS, CUFT_PER_YD:CUFT_PER_YD, areaSqFt:areaSqFt, cuft:cuft, totalCuFt:totalCuFt, withWaste:withWaste, bagsNeeded:bagsNeeded, plan:plan, coverage:coverage, r2:r2, ceilTo:ceilTo};
if (typeof module!=='undefined' && module.exports) module.exports=api; else root.BBCalc=api;
})(typeof window!=='undefined'?window:this);
