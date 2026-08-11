/* IOIS SIMPLE AUTH GUARD */
(() => {
  "use strict";
  const MAX_WAIT = 12000;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function waitForAuth(max=MAX_WAIT) {
    const start = Date.now();
    while (!window.IOISAuth && Date.now() - start < max) await sleep(100);
    return !!window.IOISAuth;
  }
  window.IOISLoginGuard = { waitForAuth, MAX_WAIT };
})();
