"use strict";

import("https://cdn.jsdelivr.net/gh/ryanair000/journalpersonal@7ad06f262f3cbb99417d2c832fef976c7ea77272/script.js")
  .then(() => import("./resource-bootstrap.js"))
  .catch((error) => console.error("Unable to load dashboard modules.", error));
