"use strict";

import("./dashboard.js")
  .then(() => import("./resource-bootstrap.js"))
  .then(() => import("./form-actions.js"))
  .catch((error) => console.error("Unable to load dashboard modules.", error));
