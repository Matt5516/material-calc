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
// ---- Grass seed. Rates are lb of seed per 1,000 sq ft: {lo, mid, hi} for a new lawn and for overseeding. mid is the default (conservative, not the top of the range).
// Sources: see the grass seed guide (Purdue AY-25-W, Virginia Tech SPES-299-C Table 1, Univ. of Tennessee W160-B). Overseeding rates are roughly half to two-thirds of new-lawn rates.
var SEED = {
 'tall-fescue':   {name:'Tall fescue', season:'cool', nw:{lo:6,mid:7.5,hi:9}, ov:{lo:4,mid:5,hi:6}},
 'bluegrass':     {name:'Kentucky bluegrass', season:'cool', nw:{lo:2,mid:2.5,hi:3}, ov:{lo:1,mid:1.5,hi:2}},
 'ryegrass':      {name:'Perennial ryegrass', season:'cool', nw:{lo:3,mid:4.5,hi:6}, ov:{lo:2,mid:3,hi:4}},
 'fine-fescue':   {name:'Fine fescue', season:'cool', nw:{lo:4,mid:4.5,hi:5}, ov:{lo:2,mid:2.5,hi:3}},
 'bermuda':       {name:'Bermuda (hulled)', season:'warm', nw:{lo:0.5,mid:1,hi:2}, ov:{lo:0.5,mid:0.75,hi:1}},
 'zoysia':        {name:'Zoysia (seeded)', season:'warm', nw:{lo:1,mid:2,hi:3}, ov:{lo:0.5,mid:1,hi:1.5}},
 'centipede':     {name:'Centipede', season:'warm', nw:{lo:0.25,mid:0.4,hi:0.5}, ov:{lo:0.2,mid:0.25,hi:0.4}}
};
var SEED_BAGS = [3,7,20,50];
function sqftFrom(o){ if(o.sqft!=null&&o.sqft!=='') return +o.sqft||0; if(o.acres) return (+o.acres||0)*43560; return (+o.l||0)*(+o.w||0); }
// o: {sqft | acres | l,w (ft), type, mode ('new'|'over'), rate (lb/1000, optional override), price (per bag, optional), bagLbs (size you will buy, optional)}
function seedPlan(o){
  var S=SEED[o.type]||SEED['tall-fescue'], R=S[o.mode==='over'?'ov':'nw'], area=sqftFrom(o);
  var rate=(o.rate!=null&&o.rate!==''&&+o.rate>0)? +o.rate : R.mid, k=area/1000;
  var bags={}; SEED_BAGS.forEach(function(b){ bags[b]=k>0? Math.ceil(k*rate/b - 1e-9) : 0; });
  var lbs=k*rate, bl=+o.bagLbs||0, cost=(o.price!=null&&o.price!==''&&+o.price>0&&bl>0)? bags[bl]*(+o.price) : null;
  return {area:r2(area), rate:rate, lo:r2(k*R.lo), mid:r2(lbs), hi:r2(k*R.hi), lbs:r2(lbs), bags:bags, cost:cost==null?null:r2(cost), rateLo:R.lo, rateHi:R.hi};
}
// Most practical single bag size: least seed left over among sizes that take 6 bags or fewer; if none, the biggest bag. Ties go to the larger bag.
function bestBag(lbs){ var best=null; SEED_BAGS.forEach(function(b){ var n=Math.ceil(lbs/b-1e-9), over=n*b-lbs; if(n>=1&&n<=6&&(best===null||over<best.over-1e-9||(Math.abs(over-best.over)<1e-9&&b>best.size))) best={size:b,n:n,over:over}; });
  if(!best){ var b2=SEED_BAGS[SEED_BAGS.length-1], n2=Math.ceil(lbs/b2-1e-9); best={size:b2,n:n2,over:n2*b2-lbs}; } best.over=r2(best.over); return best; }
// ---- Pavers. o: {shape:'rect'|'circle', l, w (ft; circle: l = diameter), pl, pw (paver inches), waste (% extra pavers, default 7), baseIn (default 4), sandIn (default 1), baseWaste, sandWaste (% , default 10), price (per paver, optional)}
function paverPlan(o){
  var area=o.shape==='circle'? PI*(+o.l||0)*(+o.l||0)/4 : (+o.l||0)*(+o.w||0);
  var pl=+o.pl||0, pw=+o.pw||0, per=(pl>0&&pw>0)? 144/(pl*pw) : 0;
  var ws=(o.waste==null||o.waste==='')?7:+o.waste;
  var net=area*per, pavers=Math.ceil(net*(1+ws/100) - 1e-9);
  var bi=(o.baseIn==null||o.baseIn==='')?4:+o.baseIn, si=(o.sandIn==null||o.sandIn==='')?1:+o.sandIn;
  var base=plan({material:'gravel', cuft:area*bi/12, waste:o.baseWaste==null?10:o.baseWaste});
  var sand=plan({material:'sand', cuft:area*si/12, waste:o.sandWaste==null?10:o.sandWaste});
  var cost=(o.price!=null&&o.price!==''&&+o.price>0)? pavers*(+o.price) : null;
  return {area:r2(area), perSqFt:Math.round(per*1000)/1000, net:Math.ceil(net-1e-9), pavers:pavers, base:base, sand:sand, cost:cost==null?null:r2(cost)};
}
// ---- Firewood. A full cord is 128 ft3 of stacked wood (4 x 4 x 8 ft). A "face cord" (rick) is 4 ft high x 8 ft long x ONE piece length deep, so its size depends on the log length.
// Store bundle size is NOT standardised (varies by brand); 0.75 ft3 is only a starting assumption the tool lets you edit.
var CORD_CUFT = 128, FACE_SQFT = 32, PIECE_LENGTHS = [12,16,18,24], BUNDLE_CUFT = 0.75;
function faceCordCuFt(pieceIn){ return FACE_SQFT*(+pieceIn||0)/12; }
// Dimension (value + unit 'ft'|'in') -> feet
function toFt(v,u){ v=+v||0; return u==='in'? v/12 : v; }
// o: {burnPerMonth (optional), mode:'stack'|'cords'|'face', l,h,d (+ lu,hu,du units 'ft'|'in', default ft) | qty, pieceIn (default 16), bundleCuFt (default 0.75), bundlePrice, cordPrice (per full cord), delivery}
function firewoodPlan(o){
  var piece=+o.pieceIn>0? +o.pieceIn : 16, cuft, face;
  if(o.mode==='cords'){ cuft=(+o.qty||0)*CORD_CUFT; }
  else if(o.mode==='face'){ cuft=(+o.qty||0)*faceCordCuFt(piece); }
  else { var l=toFt(o.l,o.lu), h=toFt(o.h,o.hu), d=toFt(o.d,o.du); cuft=l*h*d; piece=d*12; }
  var fc=piece>0? cuft/faceCordCuFt(piece) : 0;
  var bu=+o.bundleCuFt>0? +o.bundleCuFt : BUNDLE_CUFT, bundles=cuft>0? Math.ceil(cuft/bu - 1e-9) : 0;
  var bp=(o.bundlePrice!=null&&o.bundlePrice!==''&&+o.bundlePrice>0)? +o.bundlePrice : null, cp=(o.cordPrice!=null&&o.cordPrice!==''&&+o.cordPrice>0)? +o.cordPrice : null;
  var dl=+o.delivery>0? +o.delivery : 0, burn=+o.burnPerMonth>0? +o.burnPerMonth : null;  // burnPerMonth: face cords (same log length) the user burns per month; no default
  
  var bundleCost=bp!=null? bundles*bp : null, cordCost=(cp!=null&&cuft>0)? cuft/CORD_CUFT*cp+dl : null;
  var cheaper=(bundleCost!=null&&cordCost!=null)? (bundleCost<cordCost?'bundles':(bundleCost>cordCost?'cord':'tie')) : null;
  return {cuft:r2(cuft), cords:Math.round(cuft/CORD_CUFT*1000)/1000, faceCords:Math.round(fc*1000)/1000, pieceIn:r2(piece), bundles:bundles, bundleCuFt:bu,
          bundleCost:bundleCost==null?null:r2(bundleCost), cordCost:cordCost==null?null:r2(cordCost), cheaper:cheaper,
          savings:cheaper?r2(Math.abs(bundleCost-cordCost)):null,
          breakEvenBundlePrice:(cordCost!=null&&bundles>0)? r2(cordCost/bundles) : null,   // a bundle must cost less than this to beat the delivered wood
          months:burn!=null&&fc>0? Math.round(fc/burn*100)/100 : null,
          bundleCostPerCord:bp!=null? r2(bp/bu*CORD_CUFT) : null};
}
// ---- Ice melt. Nothing here is a default: coverage comes from the bag label, so every input is the user's.
// Label rates convert to pounds per square foot: lb per sq yd / 9, oz per sq yd / 16 / 9, lb per 1,000 sq ft / 1000, oz per sq ft / 16. 'sqft' means the label already says sq ft per bag.
var ICE_UNITS = {sqft:'sq ft per bag', lbyd:'lb per sq yd', ozyd:'oz per sq yd', lbk:'lb per 1,000 sq ft', ozft:'oz per sq ft'};
function lbPerSqFt(v,unit){ v=+v||0; if(v<=0) return 0; return unit==='lbyd'? v/9 : unit==='ozyd'? v/16/9 : unit==='lbk'? v/1000 : unit==='ozft'? v/16 : 0; }
// sq ft one bag covers: straight from the label, or bag pounds / pounds per sq ft. 0 when it cannot be worked out.
function iceCoverage(bagLbs,v,unit){ if(unit==='sqft'||!unit) return (+v>0)? +v : 0; var r=lbPerSqFt(v,unit); return (r>0&&+bagLbs>0)? (+bagLbs)/r : 0; }
function posNum(x){ return (x!=null&&x!==''&&+x>0)? +x : null; }
function r3(x){ return Math.round(x*1000)/1000; }
// o: {sqft | areas:[{l,w}] (ft), apps (applications), bagLbs, cov, covUnit, bagPrice, bulkPrice, bulkLbs (pounds in the pallet/bulk purchase), delivery}
function iceMeltPlan(o){
  var sqft=posNum(o.sqft)||0; if(!sqft&&o.areas) o.areas.forEach(function(a){ sqft+=(+a.l||0)*(+a.w||0); });
  var apps=posNum(o.apps), bagLbs=posNum(o.bagLbs), cov=iceCoverage(bagLbs,o.cov,o.covUnit);
  var res={sqft:r2(sqft), cov:cov>0?r2(cov):null, bagsPer:null, bagsSeason:null, lbsPer:null, lbsSeason:null, spareLbs:null, bagCost:null, bulkUnits:null, bulkCost:null, cheaper:null, savings:null, bagPerLb:null, bulkPerLb:null};
  if(!(sqft>0&&cov>0&&bagLbs)) return res;
  res.bagsPer=Math.ceil(sqft/cov-1e-9); res.lbsPer=r2(sqft/cov*bagLbs);
  if(!apps) return res;
  var need=sqft*apps/cov;   // bags' worth of product for the whole season, rounded up once
  res.bagsSeason=Math.ceil(need-1e-9); res.lbsSeason=r2(need*bagLbs); res.spareLbs=r2((res.bagsSeason-need)*bagLbs);
  var bp=posNum(o.bagPrice), up=posNum(o.bulkPrice), bl=posNum(o.bulkLbs), dl=posNum(o.delivery)||0;
  if(bp!=null){ res.bagCost=r2(res.bagsSeason*bp); res.bagPerLb=r3(bp/bagLbs); }
  if(up!=null&&bl!=null){ res.bulkUnits=Math.ceil(need*bagLbs/bl-1e-9); res.bulkCost=r2(res.bulkUnits*up+dl); res.bulkPerLb=r3(up/bl); }
  if(res.bagCost!=null&&res.bulkCost!=null){ res.cheaper=res.bagCost<res.bulkCost?'bags':(res.bagCost>res.bulkCost?'bulk':'tie'); res.savings=r2(Math.abs(res.bagCost-res.bulkCost)); }
  return res;
}
var api = {iceMeltPlan:iceMeltPlan, iceCoverage:iceCoverage, lbPerSqFt:lbPerSqFt, ICE_UNITS:ICE_UNITS,firewoodPlan:firewoodPlan, faceCordCuFt:faceCordCuFt, CORD_CUFT:CORD_CUFT, PIECE_LENGTHS:PIECE_LENGTHS, BUNDLE_CUFT:BUNDLE_CUFT, SEED:SEED, SEED_BAGS:SEED_BAGS, seedPlan:seedPlan, bestBag:bestBag, paverPlan:paverPlan, MATERIALS:MATERIALS, CUFT_PER_YD:CUFT_PER_YD, areaSqFt:areaSqFt, cuft:cuft, totalCuFt:totalCuFt, withWaste:withWaste, bagsNeeded:bagsNeeded, plan:plan, coverage:coverage, r2:r2, ceilTo:ceilTo};
if (typeof module!=='undefined' && module.exports) module.exports=api; else root.BBCalc=api;
})(typeof window!=='undefined'?window:this);
