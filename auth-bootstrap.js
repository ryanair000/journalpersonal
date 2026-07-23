"use strict";

if (!document.querySelector('link[href="auth-sync.css"]')) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "auth-sync.css";
  document.head.append(link);
}

import("./auth-sync.js").catch((error) => {
  console.error("Unable to load account and encrypted sync tools.", error);
});
