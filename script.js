"use strict";

import("./dashboard.js")
  .then(() => import("./resource-bootstrap.js"))
  .then(() => import("./cloud-sync.js"))
  .then(() => {
    const journalPrivacy = document.querySelector(".journal-actions span");
    const footerPrivacy = document.querySelector(".footer span:last-child");
    if (journalPrivacy) journalPrivacy.textContent = "local by default · encrypted sync optional";
    if (footerPrivacy) footerPrivacy.innerHTML = "<b>●</b> private locally · encrypted in cloud";

    const accountButton = document.querySelector("#cloudAccountButton");
    const modalDot = document.querySelector(".cloud-status-dot.large");
    if (accountButton && modalDot) {
      const mirrorStatus = () => {
        modalDot.dataset.status = accountButton.dataset.status || "signed-out";
      };
      mirrorStatus();
      new MutationObserver(mirrorStatus).observe(accountButton, {
        attributes: true,
        attributeFilter: ["data-status"]
      });
    }
  })
  .catch((error) => console.error("Unable to load dashboard modules.", error));
