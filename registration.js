/* IOIS legacy compatibility.
   The canonical registration controller is register.js.
   This file is intentionally kept harmless so old cached references
   cannot trigger the previous duplicate registration flow.
*/
(() => {
  "use strict";
  if (location.pathname.endsWith("/registration.html") && !location.pathname.endsWith("/register.html")) {
    location.replace("register.html" + location.search + location.hash);
  }
})();
