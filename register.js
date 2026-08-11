/* IOIS — Production Registration Controller
   Hardened registration flow:
   - timeout protection for Supabase calls
   - email-verification aware
   - secure Storage uploads
   - atomic Member ID via iois_finalize_registration
   - UPI + QR rendering
   - Telegram notification trigger after successful finalization
*/
(() => {
  "use strict";

  const CONFIG = window.IOIS_CONFIG || {};
  const SUPABASE_URL = CONFIG.SUPABASE_URL;
  const SUPABASE_KEY = CONFIG.SUPABASE_PUBLISHABLE_KEY || CONFIG.SUPABASE_ANON_KEY;

  if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("IOIS: Supabase configuration/library missing.");
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const PLANS = {
    silver:   { code:"IOIS-SILVER-10",   name:"Tiranga Silver", price:10,  direct:7 },
    gold:     { code:"IOIS-GOLD-49",     name:"Tiranga Gold Pro", price:49, direct:35 },
    platinum: { code:"IOIS-PLATINUM-99", name:"Tiranga Platinum", price:99, direct:70 },
    crystal:  { code:"IOIS-CRYSTAL-199", name:"Tiranga Crystal VIP", price:199, direct:120 },
    student:  { code:"IOIS-STUDENT-299", name:"Govt Exam Pass", price:299, direct:220 },
    diamond:  { code:"IOIS-DIAMOND-499", name:"Tiranga Diamond", price:499, direct:375 },
    vip:      { code:"IOIS-VIP-999", name:"VIP Mastermind Freelancing & AI Pass", price:999, direct:750 }
  };

  let selectedPlan = PLANS.silver;
  const $ = id => document.getElementById(id);

  function msg(text, type="error") {
    const el = $("alert-area");
    if (!el) { alert(text); return; }
    el.className = `mt-4 rounded-xl border p-4 text-sm ${type==="success"
      ? "border-emerald-400/40 bg-emerald-950/30 text-emerald-200"
      : "border-red-400/40 bg-red-950/30 text-red-200"}`;
    el.textContent = text;
    el.classList.remove("hidden");
    el.scrollIntoView({behavior:"smooth", block:"center"});
  }

  function clearMsg(){ $("alert-area")?.classList.add("hidden"); }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} में समय समाप्त हो गया। कृपया कुछ देर बाद दोबारा प्रयास करें।`)), ms)
      )
    ]);
  }

  function updatePaymentUI() {
    $("selected-plan") && ($("selected-plan").textContent = selectedPlan.name);
    $("selected-price") && ($("selected-price").textContent = `₹${selectedPlan.price}`);
    $("payment-plan-name") && ($("payment-plan-name").textContent = selectedPlan.name);
    $("payment-amount") && ($("payment-amount").textContent = `₹${selectedPlan.price}`);
    $("selected-direct") && ($("selected-direct").textContent = `₹${selectedPlan.direct}`);

    const upi = CONFIG.paymentUPI || "8877490845@spicepay";
    const upiInput = $("iois-upi");
    if (upiInput) upiInput.value = upi;

    renderUPIQR(upi, selectedPlan.price);
  }

  async function renderUPIQR(upi, amount) {
    const box = $("upi-qr-container");
    if (!box) return;

    const payload =
      `upi://pay?pa=${encodeURIComponent(upi)}` +
      `&pn=${encodeURIComponent(CONFIG.paymentName || "IOIS PLATFORM")}` +
      `&am=${encodeURIComponent(Number(amount).toFixed(2))}` +
      `&cu=INR`;

    box.innerHTML = "";

    try {
      if (!window.QRCode) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js";
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const canvas = document.createElement("canvas");
      canvas.width = 192;
      canvas.height = 192;
      box.appendChild(canvas);

      await window.QRCode.toCanvas(canvas, payload, {
        width: 192,
        margin: 2,
        errorCorrectionLevel: "M"
      });
    } catch (e) {
      console.warn("QR library unavailable; using image fallback.", e);
      const img = document.createElement("img");
      img.alt = "IOIS UPI QR";
      img.width = 192;
      img.height = 192;
      img.className = "w-48 h-48 object-contain";
      img.src =
        "https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=" +
        encodeURIComponent(payload);
      img.onerror = () => {
        box.innerHTML =
          '<div class="text-gray-500 text-xs p-4">QR temporarily unavailable.<br>UPI ID ऊपर दिया गया है।</div>';
      };
      box.appendChild(img);
    }
  }

  function initPlans() {
    document.querySelectorAll(".plan-box").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".plan-box").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");

        selectedPlan = PLANS[btn.dataset.plan] || {
          code:`IOIS-PLAN-${btn.dataset.price}`,
          name:btn.dataset.name || "IOIS Plan",
          price:Number(btn.dataset.price),
          direct:Number(btn.dataset.direct || 0)
        };

        updatePaymentUI();
      });
    });

    const q = new URLSearchParams(location.search).get("plan");
    if (q) {
      const match = [...document.querySelectorAll(".plan-box")]
        .find(x => x.dataset.price === q);
      if (match) match.click();
    }

    const first = document.querySelector(".plan-box");
    if (first && !document.querySelector(".plan-box.active")) first.classList.add("active");

    updatePaymentUI();
  }

  function getFormData() {
    return {
      fullName: $("full-name")?.value.trim() || "",
      email: $("email")?.value.trim().toLowerCase() || "",
      phone: $("phone")?.value.trim() || "",
      address: $("address")?.value.trim() || "",
      withdrawal: $("withdrawal-details")?.value.trim() || "",
      sponsorId: $("sponsor-id")?.value.trim() || "",
      sponsorName: $("sponsor-name")?.value.trim() || "",
      password: $("password")?.value || "",
      terms: !!$("terms")?.checked,
      screenshot: $("payment-screenshot")?.files?.[0] || null,
      proof: $("payment-proof")?.files?.[0] || null
    };
  }

  function validate(d) {
    if (d.fullName.split(/\s+/).length < 2)
      return "कृपया First Name और Surname दोनों दर्ज करें।";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
      return "कृपया valid Email Address दर्ज करें।";
    if (!/^[6-9]\d{9}$/.test(d.phone))
      return "कृपया valid 10-digit mobile number दर्ज करें।";
    if (d.password.length < 8)
      return "Password कम से कम 8 characters का होना चाहिए।";
    if (!d.address)
      return "Full Address आवश्यक है।";
    if (!d.withdrawal)
      return "Withdrawal UPI / Bank Details आवश्यक हैं।";
    if (!d.screenshot)
      return "Payment Screenshot upload करें।";
    if (!d.proof)
      return "Payment Address Proof upload करें।";
    if (!d.terms)
      return "कृपया declaration स्वीकार करें।";
    return null;
  }

  // Registration state.
  // Do not block initial registration on browser IndexedDB. Some Android browsers
  // can delay/block IndexedDB startup; that was causing the registration spinner.
  let pendingMemory = null;

  const DB_NAME = "iois-registration-v3";
  const STORE = "pending";

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("इस browser में local registration storage उपलब्ध नहीं है।"));
        return;
      }
      let settled = false;
      const req = indexedDB.open(DB_NAME, 1);

      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "email" });
        }
      };
      req.onsuccess = () => finish(resolve, req.result);
      req.onerror = () => finish(reject, req.error || new Error("Local storage unavailable."));
      req.onblocked = () => finish(reject, new Error("Local registration storage blocked. कृपया इस page की दूसरी IOIS tab बंद करें।"));
    });
  }

  async function savePending(d) {
    // Keep a memory copy immediately. This is the important fix: IndexedDB
    // must never prevent the user from creating the Auth account.
    pendingMemory = {
      email:d.email, fullName:d.fullName, phone:d.phone, address:d.address,
      withdrawal:d.withdrawal, sponsorId:d.sponsorId, sponsorName:d.sponsorName,
      plan:{...selectedPlan}, screenshot:d.screenshot, proof:d.proof, savedAt:Date.now()
    };

    // Best-effort persistence for email-verification reload.
    try {
      const db = await openDB();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,"readwrite");
        tx.objectStore(STORE).put(pendingMemory);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
        tx.onabort=()=>reject(tx.error || new Error("Local storage transaction aborted."));
      });
      db.close();
      return true;
    } catch (e) {
      console.warn("IOIS: IndexedDB unavailable; continuing with in-memory registration.", e);
      return false;
    }
  }

  async function getPending(email) {
    if (pendingMemory && pendingMemory.email === email) return pendingMemory;

    try {
      const db=await openDB();
      const item=await new Promise((resolve,reject)=>{
        const r=db.transaction(STORE,"readonly").objectStore(STORE).get(email);
        r.onsuccess=()=>resolve(r.result);
        r.onerror=()=>reject(r.error);
      });
      db.close();
      if (item) pendingMemory=item;
      return item || null;
    } catch(e) {
      console.warn("IOIS: Could not restore pending registration:", e);
      return null;
    }
  }

  async function deletePending(email) {
    pendingMemory = null;
    try {
      const db=await openDB();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,"readwrite");
        tx.objectStore(STORE).delete(email);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
      });
      db.close();
    } catch(e) {
      console.warn("IOIS: pending cleanup skipped:", e);
    }
  }

  function storageName(userId, kind, file) {
    const ext=(file.name.split(".").pop()||"bin")
      .toLowerCase().replace(/[^a-z0-9]/g,"");
    return `${userId}/${kind}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  }

  async function upload(file,userId,kind) {
    if (!file) throw new Error(`${kind} file missing.`);
    const path=storageName(userId,kind,file);
    const result=await withTimeout(
      client.storage.from("member-documents").upload(
        path,file,{upsert:false,contentType:file.type||undefined}
      ),
      30000,
      "Document upload"
    );
    if(result.error) throw result.error;
    return path;
  }

  async function sendTelegramNotification(memberId, pending) {
    try {
      const {data:{session}} = await client.auth.getSession();
      if (!session?.access_token) return;

      const endpoint =
        `${SUPABASE_URL}/functions/v1/iois-registration-notification`;

      const response = await withTimeout(fetch(endpoint, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "apikey":SUPABASE_KEY,
          "Authorization":`Bearer ${session.access_token}`
        },
        body:JSON.stringify({
          name: pending.fullName,
          member_id: memberId,
          plan: String(pending.plan.price),
          referral_id: memberId,
          email: pending.email,
          phone: pending.phone
        })
      }), 15000, "Telegram notification");

      if (!response.ok) {
        console.warn("Telegram notification HTTP error:", response.status);
      }
    } catch(e) {
      // Registration must not fail just because Telegram is temporarily unavailable.
      console.warn("Telegram notification skipped:", e);
    }
  }

  async function finalize(pending, user) {
    const btn=$("register-btn"), text=$("register-btn-text"), loader=$("register-loader");
    if(btn) btn.disabled=true;
    if(text) text.textContent="Documents सुरक्षित रूप से upload हो रहे हैं...";
    loader?.classList.remove("hidden");

    try {
      const [screenshotPath, proofPath] = await Promise.all([
        upload(pending.screenshot,user.id,"payment"),
        upload(pending.proof,user.id,"address-proof")
      ]);

      if(text) text.textContent="Permanent IOIS Member ID बनाया जा रहा है...";

      const siteRoot = new URL(".", location.href).href.replace(/\/$/,"/");

      const result=await withTimeout(
        client.rpc("iois_finalize_registration",{
          p_full_name:pending.fullName,
          p_email:pending.email,
          p_phone:pending.phone,
          p_address:pending.address,
          p_plan_amount:Number(pending.plan.price),
          p_plan_code:pending.plan.code,
          p_plan_name:pending.plan.name,
          p_direct_referral_amount:Number(pending.plan.direct||0),
          p_sponsor_id:pending.sponsorId||null,
          p_sponsor_name:pending.sponsorName||null,
          p_withdrawal_details:pending.withdrawal||null,
          p_payment_screenshot_path:screenshotPath,
          p_payment_proof_path:proofPath,
          p_site_url:siteRoot
        }),
        30000,
        "Registration database"
      );

      if(result.error) throw result.error;
      if(!result.data?.member_id)
        throw new Error("Member ID database से प्राप्त नहीं हुआ।");

      const memberId=result.data.member_id;

      if($("generated-user-id"))
        $("generated-user-id").textContent=memberId;

      const modal=$("success-modal");
      if(modal) modal.classList.remove("hidden");

      await deletePending(pending.email);
      localStorage.removeItem("iois_pending_registration_email");

      // Telegram is deliberately non-blocking.
      sendTelegramNotification(memberId, pending);

      msg(`Registration complete. आपका permanent Member ID है ${memberId}`, "success");

    } catch(e) {
      console.error("IOIS finalize error",e);
      msg(e.message || "Registration complete नहीं हो सकी।", "error");
    } finally {
      if(btn) btn.disabled=false;
      if(text)
        text.innerHTML='<i class="fa-solid fa-user-plus mr-2"></i> CREATE IOIS MEMBER ACCOUNT';
      loader?.classList.add("hidden");
    }
  }

  async function completeIfVerified() {
    // Legacy compatibility only. V7/V8 does not use email verification.
    return;
  }

  async function submit(e) {
    e.preventDefault();
    clearMsg();

    const d=getFormData();
    const error=validate(d);
    if(error){msg(error);return;}

    const btn=$("register-btn"), text=$("register-btn-text"), loader=$("register-loader");
    if(btn) btn.disabled=true;
    loader?.classList.remove("hidden");
    if(text) text.textContent="Account बनाया जा रहा है...";

    try {
      savePending(d).catch(e => console.warn("IOIS pending-save skipped:", e));
      try { localStorage.setItem("iois_pending_registration_email",d.email); } catch (_) {}

      const result=await withTimeout(
        client.auth.signUp({
          email:d.email,
          password:d.password,
          options:{
            // No email verification flow is used. Supabase Auth must have
            // Confirm email disabled in Authentication settings.
            data:{
              full_name:d.fullName,
              phone:d.phone,
              plan_amount:selectedPlan.price,
              plan_code:selectedPlan.code
            }
          }
        }),
        20000,
        "Account creation"
      );

      if(result.error) throw result.error;

      if(!result.data?.session?.user) {
        throw new Error("ACCOUNT_SESSION_NOT_CREATED");
      }

      const pending = pendingMemory || await getPending(d.email);
      await finalize(pending,result.data.session.user);
      return;

    } catch(e) {
      console.error("IOIS registration error",e);

      let m=e?.message||"Registration failed.";

      if(/rate limit|rate_limit|too many/i.test(m))
        m="Registration requests temporarily limited हैं। कुछ क्षण बाद दोबारा प्रयास करें।";

      if(/already registered|already exists|user already registered/i.test(m))
        m="यह email पहले से registered है। Login करें या Password Reset इस्तेमाल करें।";

      if(/local registration storage|indexeddb|local storage/i.test(m))
        m="इस browser का local storage उपलब्ध नहीं है। Registration फिर भी जारी रह सकता है; कृपया दूसरी IOIS tab बंद करके Chrome में दोबारा प्रयास करें।";

      if(/bucket.*not found/i.test(m))
        m="Storage bucket 'member-documents' नहीं मिला। Supabase Storage में यही bucket नाम verify करें।";

      msg(m,"error");

      if(btn) btn.disabled=false;
      loader?.classList.add("hidden");
      if(text)
        text.innerHTML='<i class="fa-solid fa-user-plus mr-2"></i> CREATE IOIS MEMBER ACCOUNT';
    }
  }

  window.togglePassword = () => {
    const input=$("password"), icon=$("password-eye");
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    if (icon)
      icon.className = input.type === "password"
        ? "fa-solid fa-eye"
        : "fa-solid fa-eye-slash";
  };

  window.copyUPI = async () => {
    const v=CONFIG.paymentUPI || "8877490845@spicepay";
    try {
      await navigator.clipboard.writeText(v);
      alert("UPI ID copied: "+v);
    } catch {
      alert(v);
    }
  };

  window.copyGeneratedUserID = async () => {
    const v=$("generated-user-id")?.textContent||"";
    try {
      await navigator.clipboard.writeText(v);
      alert("IOIS Member ID copied: "+v);
    } catch {
      alert("आपका IOIS Member ID: "+v);
    }
  };

  document.addEventListener("DOMContentLoaded",()=>{
    initPlans();
    $("registration-form")?.addEventListener("submit",submit);
    $("copy-upi-btn")?.addEventListener("click",window.copyUPI);
    completeIfVerified().catch(e=>{
      console.error("IOIS verification completion error:",e);
      msg(e.message || "Verification completion failed.","error");
    });
  });
})();
