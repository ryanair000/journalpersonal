"use strict";

import("./dashboard.js")
  .then(() => import("./resource-bootstrap.js"))
  .then(() => import("./cloud-sync.js"))
  .catch((error) => console.error("Unable to load dashboard modules.", error));
