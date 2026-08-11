/* IOIS PLATFORM - Production-ready frontend controller */
const IOIS_CONFIG = {
  brand: "IOIS PLATFORM",
  plans: [
    {id:"starter",name:"Starter",display:"Alpha Starter Pass",price:10,payout:7,color:"amber",features:["Digital ID Pass","3 CV Templates","2 Cover Letters","10 ChatGPT Prompts","Useful Website Links"]},
    {id:"basic",name:"Basic",display:"Nexus Pro Creator Kit",price:49,payout:35,color:"amber",features:["Pro Creator Badge","15+ Bio-data","50+ Social Posts","Smartphone Website Guide"]},
    {id:"plus",name:"Plus",display:"Apex Executive Pass",price:99,payout:70,color:"teal",features:["Executive Business Pass","100+ Branding Templates","Logos","Business Card Bundle"]},
    {id:"premium",name:"Premium",display:"Zenith VIP Creator",price:199,payout:120,color:"purple",features:["VIP Creator Card","Mobile Design Masterclass","300+ Marketing Banners"]},
    {id:"pro",name:"Pro",display:"Govt Exam & Student",price:299,payout:220,color:"green",features:["Student ID Card","Govt Job Alert Sheet","GK & Exam Notes"]},
    {id:"business",name:"Business",display:"Diamond Business Agency",price:499,payout:375,color:"cyan",features:["Diamond Agency Card","1000+ Graphic Assets","Video Assets","Agency Manual"]},
    {id:"enterprise",name:"Enterprise",display:"VIP Mastermind & AI",price:999,payout:750,color:"purple",features:["VIP Elite Card","ChatGPT / Canva AI Mastery","Freelancing Blueprint"]}
  ]
};

const examples = [
["उदाहरण 1 — ₹10 Starter","सुनील ने राहुल को जोड़ा। राहुल ने ₹10 दिए, तो applicable direct payout example ₹7 है।"],
["उदाहरण 2 — ₹10 Referral","अमित ने रमेश को kit share की। Eligible referral के अनुसार ₹7 payout example है।"],
["उदाहरण 3 — ₹10 Referral","विक्रम ने दीपक को refer किया। ₹10 plan पर ₹7 payout example दिया गया है।"],
["उदाहरण 4 — ₹10 Referral","मनोज ने नेहा को code दिया। Eligible transaction पर ₹7 example payout है।"],
["उदाहरण 5 — ₹10 Referral","रोहित ने अजय को plan समझाया। ₹10 plan का example payout ₹7 है।"],
["उदाहरण 6 — ₹49 Basic","सुनील ने राजू को Basic kit share की। ₹49 plan पर ₹35 payout example है।"],
["उदाहरण 7 — ₹49 Referral","अमित ने प्रिया को जोड़ा। ₹49 plan का example direct payout ₹35 है।"],
["उदाहरण 8 — ₹49 Referral","विक्रम ने करण को refer किया। Eligible ₹49 sale पर ₹35 example payout है।"],
["उदाहरण 9 — ₹49 Referral","मनोज ने पूजा को kit दी। ₹49 plan पर ₹35 example payout है।"],
["उदाहरण 10 — ₹49 Referral","रोहित ने आशीष को जोड़ा। ₹49 plan का example payout ₹35 है।"],
["उदाहरण 11 — ₹99 Plus","सुनील ने विकास को Plus pass share किया। ₹99 plan पर ₹70 example payout है।"],
["उदाहरण 12 — ₹99 Referral","अमित ने सोनिया को जोड़ा। Eligible ₹99 transaction पर ₹70 example payout है।"],
["उदाहरण 13 — ₹99 Referral","विक्रम ने अनिल को refer किया। ₹99 plan पर ₹70 example payout है।"],
["उदाहरण 14 — ₹99 Referral","मनोज ने नेहा को pass दिलाया। ₹99 plan का example payout ₹70 है।"],
["उदाहरण 15 — ₹99 Referral","रोहित ने दीपक को जोड़ा। ₹99 plan पर ₹70 example payout है।"],
["उदाहरण 16 — ₹199 Premium","सुनील ने मनीष को Premium pass दिया। Source structure में ₹120 direct और ₹20 L2 example दिया गया था।"],
["उदाहरण 17 — ₹299 Pro","सुनील ने अमन को Student Pass दिया। ₹299 plan पर ₹220 direct payout example है।"],
["उदाहरण 18 — ₹499 Business","सुनील ने संजय को Agency Pass share किया। ₹499 plan पर ₹375 direct payout example है।"],
["उदाहरण 19 — ₹999 Enterprise","सुनील ने आकाश को Mastermind Pass दिया। ₹999 plan पर ₹750 direct payout example है।"],
["उदाहरण 20 — ₹10 से ₹999 Cross-Level","Starter से शुरू करने वाला promoter higher plan sale कर सकता है, यदि applicable program rules इसकी अनुमति दें। ₹999 पर ₹750 example payout है।"],
["उदाहरण 21 — ₹49 से ₹499 Agency Sale","Basic से शुरू करने वाला promoter Business plan sale कर सकता है, यदि eligible हो। ₹499 पर ₹375 example payout है।"]
];

function $(id){return document.getElementById(id);}
function money(n){return "₹"+Number(n).toLocaleString("en-IN");}
function showToast(message,type="info"){
  const t=$("toast"); if(!t)return;
  t.textContent=message; t.className="toast show "+type;
  clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>t.className="toast",3500);
}

function renderPlans(){
  const grid=$("plans-grid"), select=$("reg-plan"), payout=$("payout-grid");
  if(!grid)return;
  grid.innerHTML=IOIS_CONFIG.plans.map((p,i)=>`
    <article class="plan-card ${p.color==="purple"?"featured":""}">
      <span class="plan-no">PLAN ${String(i+1).padStart(2,"0")} ${i===6?"• VIP":""}</span>
      <h3>${p.display}</h3><div class="plan-price">${money(p.price)}</div>
      <ul>${p.features.map(x=>`<li>✓ ${x}</li>`).join("")}</ul>
      <div class="payout">Direct Payout Example: ${money(p.payout)}</div>
      <button class="btn-primary full" onclick="openRegistrationFlowWithTier('${p.id}')">Join ${money(p.price)}</button>
    </article>`).join("");
  if(select) select.innerHTML=IOIS_CONFIG.plans.map((p,i)=>`<option value="${p.id}">${i+1}. ${p.name} — ${money(p.price)}</option>`).join("");
  if(payout) payout.innerHTML=IOIS_CONFIG.plans.map(p=>`<div class="payout-card"><small>${p.name}</small><b>${money(p.price)}</b><strong>${money(p.payout)}</strong></div>`).join("");
}
function renderExamples(){
  const box=$("examples-list"); if(!box)return;
  box.innerHTML=examples.map((e,i)=>`<details><summary>${e[0]}</summary><p>${e[1]}</p></details>`).join("");
}
function updateClock(){
  const now=new Date(), h=now.getHours(), m=now.getMinutes(), s=now.getSeconds();
  const ap=h>=12?"PM":"AM", hh=(h%12)||12;
  $("digital-clock").textContent=`${String(hh).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} ${ap}`;
  $("clock-date").textContent=now.toLocaleDateString("hi-IN",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  $("clock-hour").style.transform=`translateX(-50%) rotate(${h%12*30+m*.5}deg)`;
  $("clock-min").style.transform=`translateX(-50%) rotate(${m*6+s*.1}deg)`;
  $("clock-sec").style.transform=`translateX(-50%) rotate(${s*6}deg)`;
}
async function loadWeather(){
  const temp=$("weather-temp"), status=$("weather-status"), loc=$("weather-location"), extra=$("weather-extra"), label=$("weather-location-label");
  if(!navigator.geolocation){fallbackWeather();return;}
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const {latitude,longitude}=pos.coords;
      const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`);
      const d=await r.json(), c=d.current;
      temp.textContent=`${Math.round(c.temperature_2m)}°C`;
      const map={0:"☀️ साफ मौसम",1:"🌤️ हल्के बादल",2:"⛅ आंशिक बादल",3:"☁️ बादल",45:"🌫️ कोहरा",51:"🌦️ हल्की बारिश",61:"🌧️ बारिश",71:"❄️ बर्फ",80:"🌦️ वर्षा",95:"⛈️ आंधी"};
      status.textContent=map[c.weather_code]||"🌤️ मौसम";
      loc.textContent=`Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;
      label.textContent="GPS Live Weather";
      extra.textContent=`Humidity ${c.relative_humidity_2m}% · Wind ${Math.round(c.wind_speed_10m)} km/h`;
    }catch(e){fallbackWeather();}
  },fallbackWeather,{enableHighAccuracy:true,timeout:8000});
}
function fallbackWeather(){
  $("weather-temp").textContent="--°C"; $("weather-status").textContent="📍 Location permission दें";
  $("weather-location").textContent="Weather के लिए GPS permission आवश्यक है";
  $("weather-extra").textContent="Live weather unavailable"; $("weather-location-label").textContent="GPS Permission";
}
function toggleMobileMenu(){ $("mobile-menu").classList.toggle("open"); }
function scrollToPlans(){ $("plans")?.scrollIntoView({behavior:"smooth"}); }
function openVideo(){window.open("https://www.youtube.com/watch?v=0gYd3mIxksc","_blank","noopener");}
function openRegistrationFlow(){openRegistrationFlowWithTier("starter");}
function openRegistrationFlowWithTier(tier){
  const safeTier=encodeURIComponent(tier||"starter");
  window.location.href=`register.html?plan=${safeTier}`;
}
function openLoginModal(){ window.location.href="login.html"; }
function closeModals(e){
  if(e && e.target!==$("modal-overlay"))return;
  $("modal-overlay").classList.remove("active"); $("registration-modal").classList.remove("active"); $("login-modal").classList.remove("active"); document.body.classList.remove("modal-open");
}
function handleDetailsSubmit(e){
  e.preventDefault();
  const name=$("reg-name").value.trim(), phone=$("reg-phone").value.replace(/\D/g,""), ref=$("reg-ref").value.trim(), id=$("reg-plan").value;
  if(!/^[6-9]\d{9}$/.test(phone)){showToast("कृपया सही 10-digit Indian mobile number डालें","error");return;}
  const plan=IOIS_CONFIG.plans.find(x=>x.id===id);
  const record={name,phone,ref,plan:plan?.name||id,price:plan?.price||0,createdAt:new Date().toISOString()};
  const list=JSON.parse(localStorage.getItem("iois_leads")||"[]"); list.push(record); localStorage.setItem("iois_leads",JSON.stringify(list));
  closeModals(); showToast(`Registration saved — ${plan.name} (${money(plan.price)})`,"success");
  setTimeout(()=>alert(`IOIS Registration\\n\\nName: ${name}\\nPlan: ${plan.name}\\nAmount: ${money(plan.price)}\\n\\nNext step: official payment/verification process.`),250);
}
function handleLogin(e){
  e.preventDefault(); showToast("Frontend login form ready. Supabase Auth connect होने पर real login होगा.","success"); closeModals();
}
document.addEventListener("DOMContentLoaded",()=>{renderPlans();renderExamples();updateClock();setInterval(updateClock,1000);loadWeather();});
window.openRegistrationFlow=openRegistrationFlow; window.openRegistrationFlowWithTier=openRegistrationFlowWithTier; window.openLoginModal=openLoginModal; window.closeModals=closeModals; window.toggleMobileMenu=toggleMobileMenu; window.scrollToPlans=scrollToPlans; window.handleDetailsSubmit=handleDetailsSubmit; window.handleLogin=handleLogin; window.openVideo=openVideo;