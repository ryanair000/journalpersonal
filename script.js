"use strict";

import("./dashboard.js")
  .then(() => import("./resource-bootstrap.js"))
  .then(() => import("./form-actions.js"))
  .then(() => import("./editing-actions.js"))
  .catch((error) => console.error("Unable to load dashboard modules.", error));
