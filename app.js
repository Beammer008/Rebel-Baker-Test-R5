const KEY='rebel_baker_v2_preview';
const BRAND_KEY='rebel_baker_v2_brand';
let db=JSON.parse(localStorage.getItem(KEY)||'{"recipes":[],"ingredients":[]}'), editing=null, editingIngredientId=null;
const $=id=>document.getElementById(id);
// Upgrade the old name-only Ingredient Library without discarding existing recipes.
db.ingredients=(db.ingredients||[]).map(x=>typeof x==='string'?{id:uid(),name:x,packQty:0,packUnit:'g',packPrice:0,density:0,tspGrams:0,densitySource:'',densityReliability:'unknown',tspSource:'',tspReliability:'unknown'}:{density:0,tspGrams:0,densitySource:'',densityReliability:'unknown',tspSource:'',tspReliability:'unknown',...x});
db.recipes=(db.recipes||[]).map(r=>({...r,extras:r.extras||[],ingredients:(r.ingredients||[]).map(x=>({...x,buyUnit:x.buyUnit||x.unit||'g',usageUnit:x.usageUnit||x.unit||'g',densitySource:x.densitySource||'',densityReliability:x.densityReliability||'unknown',tspSource:x.tspSource||'',tspReliability:x.tspReliability||'unknown'}))}));
function uid(){return 'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function persist(){localStorage.setItem(KEY,JSON.stringify(db));refresh()}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('selected',b.dataset.page===id));if(id==='recipes')renderRecipes();if(id==='ingredients')renderLibrary();window.scrollTo(0,0)}
function refresh(){$('recipeCount').textContent=db.recipes.length;$('ingredientCount').textContent=db.ingredients.length;$('productCount').textContent='0';let recent=$('recent');recent.innerHTML=db.recipes.length?db.recipes.slice(-3).reverse().map(r=>`<div class="recipe-item"><div><b>${esc(r.name)}</b><small>${esc(r.category)} · ${r.yield} pcs · ฿${money((r.cost||0)/(r.yield||1))}/piece</small></div><button onclick="editRecipe('${r.id}')">OPEN ↗</button></div>`).join(''):'Your next signature bake starts here.';renderIngredientOptions()}
function unitOptions(selected){return ['g','kg','oz','lb','ml','L','tsp','tbsp','cup','fl oz','pcs','dozen'].map(u=>`<option value="${u}" ${selected===u?'selected':''}>${u}</option>`).join('')}
function newRecipe(){editing=null;$('editorTitle').innerHTML='New recipe<span class="dot">.</span>';$('rName').value='';$('rCategory').value='Cookies';$('rYield').value=12;$('sellingPrice').value=0;$('ingredientRows').innerHTML='';$('extraRows').innerHTML='';$('costWarnings').innerHTML='';addIngredientRow();calculate();showPage('editor')}
function addIngredientRow(v={}){let tr=document.createElement('tr');let oldUnit=v.usageUnit||v.unit||'g';tr.innerHTML=`<td><input class="name-input" list="ingredientOptions" placeholder="ค้นหาวัตถุดิบ" value="${esc(v.name||'')}" oninput="ingredientPicked(this)"></td><td><input class="buy-qty" type="number" min="0" step="any" placeholder="1000" value="${v.buyQty??''}" oninput="calculate()"></td><td><select class="buy-unit" onchange="calculate()">${unitOptions(v.buyUnit||v.unit||'g')}</select></td><td><input class="buy-price" type="number" min="0" step="any" placeholder="65" value="${v.buyPrice??''}" oninput="calculate()"></td><td><input class="used-qty" type="number" min="0" step="any" placeholder="500" value="${v.used??''}" oninput="calculate()"></td><td><select class="used-unit" onchange="calculate()">${unitOptions(oldUnit)}</select></td><td class="row-cost">฿0.00</td><td><button class="remove" aria-label="ลบแถว" onclick="this.closest('tr').remove();calculate()">×</button></td>`;$('ingredientRows').appendChild(tr);calculate()}
function ingredientPicked(input){let name=input.value.trim().toLowerCase(),item=db.ingredients.find(x=>x.name.toLowerCase()===name),tr=input.closest('tr');if(item){tr.querySelector('.buy-qty').value=item.packQty||'';tr.querySelector('.buy-unit').value=item.packUnit||'g';tr.querySelector('.buy-price').value=item.packPrice??'';tr.dataset.density=item.density||'';tr.dataset.tspgrams=item.tspGrams||'';tr.dataset.libraryId=item.id||'';tr.dataset.densitySource=item.densitySource||'';tr.dataset.densityReliability=item.densityReliability||'unknown';tr.dataset.tspSource=item.tspSource||'';tr.dataset.tspReliability=item.tspReliability||'unknown';}else{['density','tspgrams','libraryId','densitySource','tspSource'].forEach(k=>tr.dataset[k]='');tr.dataset.densityReliability='unknown';tr.dataset.tspReliability='unknown';}calculate()}
function addExtraRow(v={}){let d=document.createElement('div');d.className='extra-row';d.innerHTML=`<input placeholder="เช่น กล่อง / ค่าแก๊ส" value="${esc(v.name||'')}" oninput="calculate()"><input type="number" min="0" step="any" placeholder="จำนวน" value="${v.qty??1}" oninput="calculate()"><input type="number" min="0" step="any" placeholder="ราคา/หน่วย" value="${v.price??0}" oninput="calculate()"><select><option value="batch" ${v.mode==='batch'?'selected':''}>ต่อสูตร</option><option value="piece" ${v.mode==='piece'?'selected':''}>ต่อชิ้น</option></select><button class="remove" onclick="this.parentElement.remove();calculate()">×</button>`;d.querySelector('select').onchange=calculate;$('extraRows').appendChild(d);calculate()}
const U={g:['mass',1],kg:['mass',1000],oz:['mass',28.349523125],lb:['mass',453.59237],ml:['volume',1],L:['volume',1000],tsp:['volume',5],tbsp:['volume',15],cup:['volume',240],'fl oz':['volume',29.5735295625],pcs:['count',1],dozen:['count',12]};
function toCanonical(q,u){let x=U[u];return x?{family:x[0],value:q*x[1]}:null}
function convertUsageToPurchaseBase(q,u,purchaseFamily,density,tspGrams){let z=toCanonical(q,u);if(!z)return null;if(z.family===purchaseFamily)return z.value;
 // Ingredient-specific teaspoon weight takes precedence for household spoon measures.
 if((u==='tsp'||u==='tbsp'||u==='cup')&&tspGrams>0){let grams=q*(u==='tsp'?tspGrams:u==='tbsp'?tspGrams*3:tspGrams*48);if(purchaseFamily==='mass')return grams;if(purchaseFamily==='volume'&&density>0)return grams/density;return null;}
 if(density>0){if(z.family==='mass'&&purchaseFamily==='volume')return z.value/density;if(z.family==='volume'&&purchaseFamily==='mass')return z.value*density;}
 return null}
function calculate(){
 let ing=0,batch=0,piece=0,warnings=[],activeIngredientRows=0;
 const rows=[...$('ingredientRows').rows];
 rows.forEach((tr,i)=>{
  const name=tr.querySelector('.name-input').value.trim();
  const buyRaw=tr.querySelector('.buy-qty').value.trim();
  const priceRaw=tr.querySelector('.buy-price').value.trim();
  const usedRaw=tr.querySelector('.used-qty').value.trim();
  const hasAny=!!name||buyRaw!==''||priceRaw!==''||usedRaw!=='';
  if(!hasAny){tr.querySelector('.row-cost').textContent='฿0.00';tr.querySelector('.row-cost').classList.remove('invalid-cost');return;}
  activeIngredientRows++;
  const buy=Number(buyRaw),price=Number(priceRaw),used=Number(usedRaw);
  const bu=tr.querySelector('.buy-unit').value,uu=tr.querySelector('.used-unit').value;
  const density=Number(tr.dataset.density||0),tsp=Number(tr.dataset.tspgrams||0),bf=U[bu]?.[0];
  const baseBuy=Number.isFinite(buy)?toCanonical(buy,bu):null;
  const useBase=Number.isFinite(used)?convertUsageToPurchaseBase(used,uu,bf,density,tsp):null;
  let cost=0,valid=true;
  if(!name||buyRaw===''||priceRaw===''||usedRaw===''||!Number.isFinite(buy)||!Number.isFinite(price)||!Number.isFinite(used)||buy<=0||price<0||used<=0){
   valid=false;warnings.push(`${name||'แถว '+(i+1)}: กรุณาระบุชื่อ ขนาดซื้อ ราคา และปริมาณที่ใช้ให้ครบ โดยขนาดซื้อ/ปริมาณใช้ต้องมากกว่า 0 และราคาต้องไม่ติดลบ`);
  }else if(!baseBuy||!bf||useBase===null||!Number.isFinite(useBase)||baseBuy.value<=0||useBase<=0){
   valid=false;warnings.push(`${name}: แปลง ${uu} เป็น ${bu} ไม่ได้ กรุณาตรวจหน่วย หรือเพิ่ม Density เมื่อแปลง g↔ml / ค่า g/tsp เมื่อใช้ช้อนตวงกับวัตถุดิบที่ซื้อเป็นน้ำหนัก`);
  }else{
   cost=price*(useBase/baseBuy.value);
   if(!Number.isFinite(cost)||cost<0){valid=false;cost=0;warnings.push(`${name}: ผลคำนวณต้นทุนไม่ถูกต้อง กรุณาตรวจข้อมูลอีกครั้ง`);}
  }
  tr.querySelector('.row-cost').textContent=valid?'฿'+money(cost):'ตรวจข้อมูล';
  tr.querySelector('.row-cost').classList.toggle('invalid-cost',!valid);
  ing+=cost;
 });
 if(activeIngredientRows===0)warnings.push('กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการก่อนบันทึกสูตร');
 document.querySelectorAll('.extra-row').forEach((d,i)=>{
  const x=d.querySelectorAll('input,select'),name=x[0].value.trim(),qtyRaw=x[1].value.trim(),priceRaw=x[2].value.trim();
  if(!name&&priceRaw==='')return;
  const q=Number(qtyRaw),p=Number(priceRaw);
  if(!name||qtyRaw===''||priceRaw===''||!Number.isFinite(q)||!Number.isFinite(p)||q<=0||p<0){warnings.push(`ค่าใช้จ่ายเพิ่มเติมแถว ${i+1}: กรุณาระบุชื่อ จำนวนมากกว่า 0 และราคาที่ไม่ติดลบ`);return;}
  const c=q*p;if(!Number.isFinite(c)){warnings.push(`ค่าใช้จ่ายเพิ่มเติมแถว ${i+1}: ผลคำนวณไม่ถูกต้อง`);return;}
  if(x[3].value==='piece')piece+=c;else batch+=c;
 });
 const yRaw=$('rYield').value.trim(),y=Number(yRaw),yieldValid=yRaw!==''&&Number.isFinite(y)&&y>0;
 if(!yieldValid)warnings.push('จำนวนผลผลิตต้องมากกว่า 0');
 const safeYield=yieldValid?y:1;
 const priceRaw=$('sellingPrice').value.trim(),price=priceRaw===''?0:Number(priceRaw);
 if(!Number.isFinite(price)||price<0)warnings.push('ราคาขายต้องไม่ติดลบ');
 const total=ing+batch+piece*safeYield,per=total/safeYield,sellingPrice=Number.isFinite(price)&&price>=0?price:0;
 $('ingredientTotal').textContent='฿'+money(ing);$('extraTotal').textContent='฿'+money(batch+piece*safeYield);$('batchTotal').textContent='฿'+money(total);$('pieceTotal').textContent='฿'+money(per);$('profit').textContent='฿'+money(sellingPrice-per);$('margin').textContent='Gross margin '+(sellingPrice>0?((sellingPrice-per)/sellingPrice*100).toFixed(1):'0.0')+'%';
 $('costWarnings').innerHTML=warnings.length?warnings.map(w=>`<div class="warning-line">⚠ ${esc(w)}</div>`).join(''):'<div class="ok-line">✓ ข้อมูลวัตถุดิบและหน่วยพร้อมคำนวณ</div>';
 return {ing,batch,piece,total,per,valid:warnings.length===0,ingredientCount:activeIngredientRows,yield:safeYield};
}
function saveRecipe(){
 let name=$('rName').value.trim();
 if(!name){alert('กรุณาใส่ชื่อสูตรก่อนบันทึก');return;}
 let costs=calculate();
 if(!costs.valid){alert('ยังบันทึกไม่ได้ กรุณาแก้ไขข้อมูลที่แสดงคำเตือนก่อน');return;}
 let r={id:editing||Date.now().toString(),name,category:$('rCategory').value,yield:costs.yield,sellingPrice:Number($('sellingPrice').value)||0,cost:costs.total,ingredients:[...$('ingredientRows').rows].filter(tr=>tr.querySelector('.name-input').value.trim()).map(tr=>({name:tr.querySelector('.name-input').value.trim(),buyQty:Number(tr.querySelector('.buy-qty').value),buyPrice:Number(tr.querySelector('.buy-price').value),buyUnit:tr.querySelector('.buy-unit').value,used:Number(tr.querySelector('.used-qty').value),usageUnit:tr.querySelector('.used-unit').value,ingredientId:tr.dataset.libraryId||null,density:Number(tr.dataset.density)||0,tspGrams:Number(tr.dataset.tspgrams)||0,densitySource:tr.dataset.densitySource||'',densityReliability:tr.dataset.densityReliability||'unknown',tspSource:tr.dataset.tspSource||'',tspReliability:tr.dataset.tspReliability||'unknown'})),extras:[...document.querySelectorAll('.extra-row')].filter(d=>d.querySelector('input').value.trim()).map(d=>{let x=d.querySelectorAll('input,select');return {name:x[0].value.trim(),qty:Number(x[1].value),price:Number(x[2].value),mode:x[3].value}})};
 let i=db.recipes.findIndex(x=>x.id===r.id);if(i>=0)db.recipes[i]=r;else db.recipes.push(r);persist();showPage('recipes');
}
function renderRecipes(){$('recipeList').innerHTML=db.recipes.length?db.recipes.slice().reverse().map(r=>`<div class="recipe-item"><div><b>${esc(r.name)}</b><small>${esc(r.category)} · Yield ${r.yield} · Cost ฿${money(r.cost)}</small></div><button onclick="editRecipe('${r.id}')">EDIT ↗</button></div>`).join(''):'ยังไม่มีสูตร เริ่มสร้างสูตรแรกของคุณได้เลย'}
function editRecipe(id){let r=db.recipes.find(x=>x.id===id);if(!r)return;editing=id;$('editorTitle').innerHTML='Edit recipe<span class="dot">.</span>';$('rName').value=r.name;$('rCategory').value=r.category;$('rYield').value=r.yield;$('sellingPrice').value=r.sellingPrice||0;$('ingredientRows').innerHTML='';$('extraRows').innerHTML='';r.ingredients.forEach(v=>{addIngredientRow(v);let tr=$('ingredientRows').lastElementChild;tr.dataset.density=v.density||'';tr.dataset.tspgrams=v.tspGrams||'';tr.dataset.libraryId=v.ingredientId||'';tr.dataset.densitySource=v.densitySource||'';tr.dataset.densityReliability=v.densityReliability||'unknown';tr.dataset.tspSource=v.tspSource||'';tr.dataset.tspReliability=v.tspReliability||'unknown'});r.extras.forEach(addExtraRow);calculate();showPage('editor')}
function clearIngredientForm(){['libName','libPackQty','libPackPrice','libDensity','libDensitySource','libTspGrams','libTspSource'].forEach(id=>$(id).value='');$('libPackUnit').value='g';$('libDensityReliability').value='unknown';$('libTspReliability').value='unknown';editingIngredientId=null;$('saveIngredientButton').textContent='＋ SAVE INGREDIENT';$('cancelIngredientEdit').hidden=true}
function cancelIngredientEdit(){clearIngredientForm()}
function editLibraryIngredient(id){let x=db.ingredients.find(v=>v.id===id);if(!x)return;editingIngredientId=id;$('libName').value=x.name||'';$('libPackQty').value=x.packQty||'';$('libPackUnit').value=x.packUnit||'g';$('libPackPrice').value=x.packPrice??'';$('libDensity').value=x.density||'';$('libDensitySource').value=x.densitySource||'';$('libDensityReliability').value=x.densityReliability||'unknown';$('libTspGrams').value=x.tspGrams||'';$('libTspSource').value=x.tspSource||'';$('libTspReliability').value=x.tspReliability||'unknown';$('saveIngredientButton').textContent='SAVE CHANGES';$('cancelIngredientEdit').hidden=false;window.scrollTo(0,0)}
function addLibraryIngredient(){let name=$('libName').value.trim(),packQty=+$('libPackQty').value||0,packPrice=+$('libPackPrice').value||0,density=+$('libDensity').value||0,tspGrams=+$('libTspGrams').value||0;if(!name){alert('กรุณาใส่ชื่อวัตถุดิบ');return}if(packQty<0||packPrice<0||density<0||tspGrams<0){alert('ตัวเลขต้องไม่ติดลบ');return}let duplicate=db.ingredients.find(x=>x.name.toLowerCase()===name.toLowerCase()&&x.id!==editingIngredientId);if(duplicate){alert('มีวัตถุดิบชื่อนี้ในคลังแล้ว กรุณาแก้ไขรายการเดิมแทน');return}let old=editingIngredientId?db.ingredients.findIndex(x=>x.id===editingIngredientId):-1;let item={id:editingIngredientId||uid(),name,packQty,packUnit:$('libPackUnit').value,packPrice,density,tspGrams,densitySource:$('libDensitySource').value.trim(),densityReliability:density?$('libDensityReliability').value:'unknown',tspSource:$('libTspSource').value.trim(),tspReliability:tspGrams?$('libTspReliability').value:'unknown'};if(old>=0)db.ingredients[old]=item;else db.ingredients.push(item);clearIngredientForm();persist();renderLibrary();alert('บันทึกข้อมูลวัตถุดิบแล้ว')}
function renderIngredientOptions(){$('ingredientOptions').innerHTML=db.ingredients.map(x=>`<option value="${esc(x.name)}"></option>`).join('')}
function reliabilityText(v){return ({label:'ฉลาก/ผู้ผลิต',reference:'แหล่งอ้างอิง',measured:'ทดลองวัดเอง',estimated:'ค่าประมาณ',unknown:'ยังไม่ระบุ'})[v]||'ยังไม่ระบุ'}
function renderLibrary(){$('ingredientLibrary').innerHTML=db.ingredients.length?db.ingredients.map((x,i)=>`<div class="library-item"><div><b>${esc(x.name)}</b><small>${x.packQty||'ยังไม่ระบุ'} ${esc(x.packUnit||'')} · ฿${money(x.packPrice||0)} ${x.density?`· Density ${x.density} g/ml (${reliabilityText(x.densityReliability)})${x.densitySource?' · '+esc(x.densitySource):''}`:''} ${x.tspGrams?`· ${x.tspGrams}g/tsp (${reliabilityText(x.tspReliability)})${x.tspSource?' · '+esc(x.tspSource):''}`:''}</small></div><div class="library-actions"><button class="edit-ingredient" onclick="editLibraryIngredient('${x.id}')">EDIT</button><button class="remove" aria-label="ลบวัตถุดิบ" onclick="if(confirm('ลบวัตถุดิบนี้ออกจากคลัง? สูตรที่บันทึกไว้จะไม่ถูกลบ')){db.ingredients.splice(${i},1);persist();renderLibrary()}">×</button></div></div>`).join(''):'<div class="empty">ยังไม่มีวัตถุดิบในคลัง</div>';renderIngredientOptions()}
function exportData(){let a=document.createElement('a'),blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='rebel-baker-v2-r5-backup.json';a.click();URL.revokeObjectURL(a.href)}
function importData(e){let f=e.target.files[0];if(!f)return;let rd=new FileReader();rd.onload=()=>{try{let d=JSON.parse(rd.result);if(!d||!Array.isArray(d.recipes)||!Array.isArray(d.ingredients))throw Error();let nextIngredients=d.ingredients.map(x=>typeof x==='string'?{id:uid(),name:x,packQty:0,packUnit:'g',packPrice:0,density:0,tspGrams:0,densitySource:'',densityReliability:'unknown',tspSource:'',tspReliability:'unknown'}:{density:0,tspGrams:0,densitySource:'',densityReliability:'unknown',tspSource:'',tspReliability:'unknown',...x});let nextRecipes=d.recipes.map(r=>({...r,ingredients:(r.ingredients||[]).map(x=>({...x,buyUnit:x.buyUnit||x.unit||'g',usageUnit:x.usageUnit||x.unit||'g',densitySource:x.densitySource||'',densityReliability:x.densityReliability||'unknown',tspSource:x.tspSource||'',tspReliability:x.tspReliability||'unknown'})),extras:r.extras||[]}));if(!confirm('นำเข้าข้อมูลจะแทนที่ข้อมูลในเบราว์เซอร์นี้ ต้องการทำต่อหรือไม่? แนะนำให้ Export สำรองก่อน'))return;db={recipes:nextRecipes,ingredients:nextIngredients};persist();alert('นำเข้าข้อมูลสำเร็จ')}catch{alert('ไฟล์สำรองไม่ถูกต้อง หรือโครงสร้างข้อมูลไม่รองรับ')}e.target.value=''};rd.readAsText(f)}
function money(n){return (+n||0).toFixed(2)}function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const brandDefaults={app:'Bakery Studio',name:'REBEL BAKER',slogan:'BAKE BOLD.<br><em>BUILD YOUR</em><br>BUSINESS.',sub:'YOUR CREATIVE KITCHEN'};
let brand=JSON.parse(localStorage.getItem(BRAND_KEY)||'null')||{...brandDefaults};
function applyBrand(){const app=brand.app||brandDefaults.app,name=brand.name||brandDefaults.name;document.title=app+' | '+name;$('brandTopApp').textContent=app.toUpperCase();$('brandTopName').textContent=name.toUpperCase()+' · V2 PREVIEW';$('dashSlogan').innerHTML=brand.slogan||brandDefaults.slogan;$('dashSubSlogan').textContent=(brand.sub||brandDefaults.sub).toUpperCase();$('brandAppInput').value=app;$('brandNameInput').value=name;$('brandSloganInput').value=(brand.slogan||brandDefaults.slogan).replace(/<br>/g,' ').replace(/<[^>]*>/g,'');$('brandSubInput').value=brand.sub||brandDefaults.sub}
function saveBrandSettings(){brand={app:$('brandAppInput').value.trim()||brandDefaults.app,name:$('brandNameInput').value.trim()||brandDefaults.name,slogan:esc($('brandSloganInput').value.trim()||brandDefaults.slogan).replace(/\n/g,'<br>'),sub:$('brandSubInput').value.trim()||brandDefaults.sub};localStorage.setItem(BRAND_KEY,JSON.stringify(brand));applyBrand();alert('บันทึก Brand Settings แล้ว')}
function restoreBrandDefaults(){brand={...brandDefaults};localStorage.setItem(BRAND_KEY,JSON.stringify(brand));applyBrand();alert('คืนค่าเริ่มต้นแล้ว')}
document.addEventListener('input',e=>{if(e.target.id==='rYield')calculate()});refresh();addIngredientRow();applyBrand();clearIngredientForm();