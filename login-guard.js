/* IOIS Login/Dashboard hardening patch */
(() => {
  "use strict";
  const TIMEOUT=20000;
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  async function waitForSupabase(max=10000){
    const start=Date.now();
    while(!window.supabase && Date.now()-start<max) await wait(100);
    return !!window.supabase;
  }
  function setLoading(on){
    document.querySelectorAll('[data-login-loading],#login-loader,.login-loader').forEach(x=>x.classList.toggle('hidden',!on));
  }
  window.IOIS_loginGuard = {TIMEOUT, waitForSupabase,setLoading};
})();
