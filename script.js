"use strict";

import("./dashboard.js")
  .then(() => import("./resource-bootstrap.js"))
  .then(() => import("./form-actions.js"))
  .then(() => import("./editing-actions.js"))
  .then(() => import("./state-write-guard.js"))
  .then(() => import("./settings.js"))
  .then(() => import("./rhythm.js"))
  .then(() => import("./finance.js"))
  .then(() => import("./journal.js"))
  .then(() => import("./planner.js"))
  .then(() => import("./command-center.js"))
  .then(() => import("./growth-centers.js"))
  .then(() => import("./expansion-fixes.js"))
  .catch((error) => console.error("Unable to load dashboard modules.", error));