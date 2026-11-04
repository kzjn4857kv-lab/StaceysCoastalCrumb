/*
  STACEY'S COASTAL CRUMB SETTINGS
  Replace the values below before publishing.
*/
const SUPABASE_URL = "https://kexrxtydurzkbfwqerqr.supabase.co";
const SUPABASE_KEY = "sb_publishable_yuxz9YQ22Oe0fwX60sl2Iw_Q_EaoRcx";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SETTINGS = {
  weeklyLoafLimit: 8, // Fallback only; weekly capacity is read from Supabase.
  bakerPhone: "19738014502",     // Stacey's order text number
  bakerEmail: "",     // Orders are sent by text
  currency: "$",
  products: [
    {name:"Plain Sourdough", desc:"Traditional artisan sourdough loaf", price:9, isLoaf:true},
    {name:"Herbed Sourdough", desc:"Savory herb sourdough loaf", price:10, isLoaf:true},
    {name:"Croissant Loaf", desc:"Buttery croissant-style loaf", price:11, isLoaf:true},
    {name:"Inclusion Loaf", desc:"Choose an inclusion below", price:12, isLoaf:true},
    {name:"Tantalizing Tomato", desc:"A rich tomato sauce made with tomatoes, olive oil, butter, red wine, onion, garlic, and spices.", price:8, isLoaf:false},
    {name:"Very Vodka", desc:"A creamy vodka sauce made with tomatoes, cream, pancetta, vodka, butter, onion, garlic, and spices.", price:10, isLoaf:false}
  ]
};

const DRAFT_KEY = "staceysCoastalCrumbOrderDraft";
let savedDraft = {};
try { savedDraft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch(e) { savedDraft = {}; }
const quantities = SETTINGS.products.map((p,i) => Number(savedDraft.quantities?.[i] || 0));
let inclusionSelections = Array.isArray(savedDraft.inclusionSelections) ? savedDraft.inclusionSelections : [];

function persistOrderDraft(){
  try{
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      quantities,
      inclusionSelections,
      name:document.getElementById("name")?.value || "",
      phone:document.getElementById("phone")?.value || "",
      address:document.getElementById("address")?.value || "",
      orderWeek:document.getElementById("orderWeek")?.value || "",
      notes:document.getElementById("notes")?.value || ""
    }));
  }catch(e){}
}
function restoreOrderDraft(){
  ["name","phone","address","orderWeek","notes"].forEach(id=>{
    const el=document.getElementById(id);
    if(el && savedDraft[id] !== undefined) el.value=savedDraft[id];
  });
  document.querySelectorAll("#name,#phone,#address,#orderWeek,#notes").forEach(el=>{
    el.addEventListener("input",persistOrderDraft);
    el.addEventListener("change",persistOrderDraft);
  });
}

function money(n){return SETTINGS.currency + n.toFixed(2)}

function renderProducts(){
  const sourdoughBox=document.getElementById("sourdoughProducts");
  const sauceBox=document.getElementById("sauceProducts");
  const productMarkup=(p,i)=>`
    <div class="product">
      <div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="price">${p.price>0 ? money(p.price) : "Price to be confirmed"}</div>
      </div>
      <div class="qty">
        <button type="button" aria-label="Remove one ${p.name}" onclick="changeQty(${i},-1)">−</button>
        <span id="q${i}">0</span>
        <button type="button" aria-label="Add one ${p.name}" onclick="changeQty(${i},1)">+</button>
      </div>
    </div>`;
  sourdoughBox.innerHTML=SETTINGS.products.map((p,i)=>({p,i}))
    .filter(x=>x.p.isLoaf).map(x=>productMarkup(x.p,x.i)).join("");
  sauceBox.innerHTML=SETTINGS.products.map((p,i)=>({p,i}))
    .filter(x=>!x.p.isLoaf).map(x=>productMarkup(x.p,x.i)).join("");
}
async function changeQty(i,d){
  const currentTotal=getSelectedLoaves();
  if(d>0){
    const date=document.getElementById("orderWeek").value;
    if(!date){
      alert("Please choose an order week before adding items.");
      return;
    }
    // Sauce products do not count against the weekly loaf capacity.
    if(SETTINGS.products[i].isLoaf){
      try{
        const weekKey=getWeekKey(date);
        const used=await getWeekUsed(weekKey);
        const weeklyLimit=await getWeekCapacity(weekKey);
        if(used+currentTotal+1>weeklyLimit){
          const remaining=Math.max(0,weeklyLimit-used-currentTotal);
          alert(`Only ${remaining} more loaf(s) can be added for this order week. The weekly limit is ${weeklyLimit} loaves.`);
          return;
        }
      }catch(e){
        alert("We couldn't check weekly availability. Please try again.");
        return;
      }
    }
  }
  quantities[i]=Math.max(0,quantities[i]+d);
  document.getElementById("q"+i).textContent=quantities[i];
  updateTotal();
  updateInclusionVisibility();
  updateCapacityMessage();
  persistOrderDraft();
}
const INCLUSIONS = [
  "Chocolate Chip Croissant",
  "Cheddar Jalapeño",
  "Blueberry Lemon",
  "Caramelized Onion Gruyere",
  "Cinnamon Raisin",
  "Sun-dried Tomato and Parmesan",
  "Cranberry Walnut",
  "Chili Crisp and Green Scallion",
  "Kalamata Olives and Rosemary",
  "Rosemary",
  "Marzipan",
  "Caraway and Rye",
  "Other"
];

function updateInclusionVisibility(){
  const idx=SETTINGS.products.findIndex(p=>p.name==="Inclusion Loaf");
  const count=idx>=0 ? quantities[idx] : 0;
  const card=document.getElementById("inclusionCard");
  if(count>0){
    // Preserve existing selections when quantity changes, while keeping exactly one selection per loaf.
    inclusionSelections=inclusionSelections.slice(0,count);
    while(inclusionSelections.length<count) inclusionSelections.push("");
    card.style.display="block";
    renderInclusionSelections();
  }else{
    inclusionSelections=[];
    card.style.display="none";
    document.getElementById("inclusionSelections").innerHTML="";
  }
}

function renderInclusionSelections(){
  const box=document.getElementById("inclusionSelections");
  box.innerHTML=inclusionSelections.map((value,i)=>{
    const isOther=value.startsWith("Other:") || value==="Other";
    const otherValue=value.startsWith("Other:") ? value.slice(6) : "";
    return `
      <div style="padding:14px 0;border-bottom:1px solid var(--line)">
        <label for="inclusion${i}">Inclusion Loaf ${i+1} *</label>
        <select id="inclusion${i}" onchange="setInclusion(${i}, this.value)">
          <option value="">Select an inclusion</option>
          ${INCLUSIONS.map(x=>`<option ${(!isOther && value===x) || (isOther && x==="Other") ? "selected" : ""}>${x}</option>`).join("")}
        </select>
        <div id="otherInclusionWrap${i}" style="display:${isOther?"block":"none"};margin-top:8px">
          <label for="otherInclusion${i}">Other Inclusion</label>
          <input id="otherInclusion${i}" value="${otherValue.replace(/&/g,"&amp;").replace(/"/g,"&quot;")}" placeholder="Tell us what you'd like" oninput="setOtherInclusion(${i}, this.value)">
        </div>
      </div>`;
  }).join("");
}

function setInclusion(i,value){
  inclusionSelections[i]=value;
  persistOrderDraft();
  if(value!=="Other"){
    document.getElementById(`otherInclusionWrap${i}`).style.display="none";
  }else{
    document.getElementById(`otherInclusionWrap${i}`).style.display="block";
  }
}

function setOtherInclusion(i,value){
  inclusionSelections[i]=value.trim() ? "Other: "+value.trim() : "Other";
  persistOrderDraft();
}

function calculateOrderTotal(o){
  let total=0;
  SETTINGS.products.forEach((p,i)=>total+=p.price*quantities[i]);
  return Number(total.toFixed(2));
}
function updateTotal(){
  let total=0;
  SETTINGS.products.forEach((p,i)=>total+=p.price*quantities[i]);
  document.getElementById("total").textContent=money(total);
  const count=getSelectedLoaves();
  document.getElementById("selectedLoafCount").textContent=`${count} ${count===1?"loaf":"loaves"} selected`;
}
function getOrder(){
  const items=SETTINGS.products.map((p,i)=>({p,i})).filter(x=>quantities[x.i]>0)
    .map(x=>`${quantities[x.i]} × ${x.p.name}`);
  let inclusions=[];
  const inclusionIdx=SETTINGS.products.findIndex(p=>p.name==="Inclusion Loaf");
  if(inclusionIdx>=0 && quantities[inclusionIdx]>0){
    inclusions=inclusionSelections.slice(0,quantities[inclusionIdx]);
  }
  return {
    items,
    inclusions,
    name:document.getElementById("name").value.trim(),
    phone:document.getElementById("phone").value.trim(),
    address:document.getElementById("address").value.trim(),
    orderWeek:document.getElementById("orderWeek").value,
    
    notes:document.getElementById("notes").value.trim()
  };
}
function validate(o){
  if(!o.items.length){alert("Please select at least one loaf.");return false}
  if(!o.name||!o.phone||!o.address||!o.orderWeek){alert("Please complete your name, phone number, address, and order week.");return false}
  const inclusionIdx=SETTINGS.products.findIndex(p=>p.name==="Inclusion Loaf");
  if(inclusionIdx>=0 && quantities[inclusionIdx]>0){
    const count=quantities[inclusionIdx];
    for(let i=0;i<count;i++){
      if(!o.inclusions[i]){alert(`Please select an inclusion for Inclusion Loaf ${i+1}.`);return false}
      if(o.inclusions[i]==="Other"){
        alert(`Please enter the other inclusion for Inclusion Loaf ${i+1}.`);return false
      }
    }
  }
  return true;
}
function orderText(o){
  return `NEW STACEY'S COASTAL CRUMB ORDER

Customer: ${o.name}
Phone: ${o.phone}
Address: ${o.address}
Order Week: ${o.orderWeek}
Total: ${money(calculateOrderTotal(o))}

Items:
${o.items.join("\n")}
${o.inclusions && o.inclusions.length ? "Inclusions:\n" + o.inclusions.map((x,i)=>`  Inclusion Loaf ${i+1}: ${x}`).join("\n") : ""}

Notes: ${o.notes || "None"}`;
}

function populateOrderWeeks(){
  const select=document.getElementById("orderWeek");
  const today=new Date();
  today.setHours(12,0,0,0);

  // Calculate the Monday of the current week.
  const day=today.getDay();
  const diff=(day===0 ? -6 : 1-day);
  const firstMonday=new Date(today);
  firstMonday.setDate(today.getDate()+diff);

  // Offer 12 order weeks, all starting on Monday.
  for(let i=0;i<14;i++){
    const monday=new Date(firstMonday);
    monday.setDate(firstMonday.getDate()+(i*7));
    const value=monday.toISOString().slice(0,10);

    const option=document.createElement("option");
    option.value=value;
    option.textContent=`Week of ${monday.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
    select.appendChild(option);
  }
}

function getWeekKey(dateString){
  const d=new Date(dateString+"T12:00:00");
  const day=d.getDay();
  const diff=(day===0 ? -6 : 1-day);
  d.setDate(d.getDate()+diff);
  return d.toISOString().slice(0,10);
}
async function getWeekUsed(weekKey){
  const {data,error}=await db.rpc("weekly_loaves",{pickup_week:weekKey});
  if(error) throw new Error("Unable to check weekly availability.");
  return Number(data||0);
}

async function getWeekCapacity(weekKey){
  const {data,error}=await db.rpc("weekly_capacity_for_week",{p_week_start:weekKey});
  if(error) throw new Error("Unable to check weekly capacity.");
  return Number(data ?? SETTINGS.weeklyLoafLimit);
}
function getSelectedLoaves(){
  return quantities.reduce((sum,q,i)=>sum+(SETTINGS.products[i].isLoaf ? q : 0),0);
}
async function updateCapacityMessage(){
  const date=document.getElementById("orderWeek").value;
  const box=document.getElementById("capacityMessage");
  if(!date){box.textContent="Select an order week to see weekly availability.";return}
  try{
    const weekKey=getWeekKey(date);
    const [used,weeklyLimit]=await Promise.all([
      getWeekUsed(weekKey),
      getWeekCapacity(weekKey)
    ]);
    const remaining=Math.max(0,weeklyLimit-used);
    box.textContent=`${remaining} of ${weeklyLimit} loaves remaining for the week of ${weekKey}.`;
  }catch(e){ box.textContent="Availability is temporarily unavailable. Please try again."; }
}
async function saveOrderForCapacity(o){
  const weekKey=getWeekKey(o.orderWeek);
  const latestUsed=await getWeekUsed(weekKey);
  const weeklyLimit=await getWeekCapacity(weekKey);
  const requested=getSelectedLoaves();
  if(latestUsed+requested>weeklyLimit){
    throw new Error(`This week's capacity has changed. Only ${Math.max(0,weeklyLimit-latestUsed)} loaf(s) remain.`);
  }
  const {error}=await db.from("orders").insert([{
    customer_name:o.name, phone:o.phone, customer_address:o.address, pickup_date:o.orderWeek, 
    items:o.items.join("\\n"), inclusion:o.inclusions.join("\\n"), total_amount:calculateOrderTotal(o), quantity:getSelectedLoaves(),
    notes:o.notes, status:"New"
  }]);
  if(error) throw new Error("Unable to save the order.");
}
async function checkCapacity(o){
  const weekKey=getWeekKey(o.orderWeek);
  const [used,weeklyLimit]=await Promise.all([
    getWeekUsed(weekKey),
    getWeekCapacity(weekKey)
  ]);
  return {used,requested:getSelectedLoaves(),weeklyLimit,remaining:Math.max(0,weeklyLimit-used)};
}

async function clearOrderForm(){
  quantities.fill(0);
  document.getElementById("name").value="";
  document.getElementById("phone").value="";
  document.getElementById("address").value="";
  document.getElementById("orderWeek").value="";
  document.getElementById("notes").value="";
  inclusionSelections=[];
  document.getElementById("inclusionSelections").innerHTML="";
  document.getElementById("inclusionCard").style.display="none";
  renderProducts();
  updateTotal();
  document.getElementById("capacityMessage").textContent="Select an order week to see weekly availability.";
  try{localStorage.removeItem(DRAFT_KEY)}catch(e){}
}

async function submitOrder(){
  const o=getOrder(); if(!validate(o)) return;
  try{
    const cap=await checkCapacity(o);
    if(cap.used+cap.requested>cap.weeklyLimit){
      alert(`That order would exceed this week's ${cap.weeklyLimit}-loaf limit. Only ${cap.remaining} loaf(s) remain available for that week.`);
      await updateCapacityMessage(); return;
    }
    await saveOrderForCapacity(o);
    await clearOrderForm();
    document.querySelectorAll(".card:not(#confirmation)").forEach(card=>card.style.display="none");
    document.getElementById("confirmation").style.display="block";
  }catch(e){ alert(e.message||"Unable to submit the order. Please try again."); }
}
function returnToOrdering(){
  document.getElementById("confirmation").style.display="none";
  document.querySelectorAll(".card:not(#confirmation)").forEach(card=>card.style.display="block");
}

populateOrderWeeks();
restoreOrderDraft();
renderProducts();
updateTotal();
updateInclusionVisibility();
if(document.getElementById("orderWeek").value) updateCapacityMessage();
