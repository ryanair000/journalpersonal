"use strict";

(() => {
  const qs = (selector, root = document) => root.querySelector(selector);

  if (!qs('link[href="resources.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "resources.css";
    document.head.append(link);
  }

  const journalNav = qs('.sidebar nav a[href="#journal"]');
  if (journalNav && !qs('.sidebar nav a[href="#resources"]')) {
    const resourceNav = document.createElement("a");
    resourceNav.href = "#resources";
    resourceNav.innerHTML = "<span>⌘</span> Resources";
    journalNav.after(resourceNav);
  }

  const journalToolbar = qs(".journal-toolbar");
  if (journalToolbar && !qs("#journalSearch")) {
    const search = document.createElement("label");
    search.className = "journal-search";
    search.innerHTML = '<span class="sr-only">Search journal entries</span><input id="journalSearch" type="search" placeholder="Search entries" autocomplete="off">';

    const importButton = document.createElement("button");
    importButton.type = "button";
    importButton.className = "small-link";
    importButton.id = "importData";
    importButton.textContent = "Import backup";

    const fileInput = document.createElement("input");
    fileInput.className = "sr-only";
    fileInput.id = "importFile";
    fileInput.type = "file";
    fileInput.accept = ".json,application/json";

    journalToolbar.prepend(search, importButton, fileInput);
  }

  if (!qs("#resources")) {
    const section = document.createElement("section");
    section.className = "resources-hub section";
    section.id = "resources";
    section.setAttribute("aria-labelledby", "resourcesTitle");
    section.innerHTML = `
      <div class="section-title">
        <div>
          <p class="eyebrow">Useful resources</p>
          <h2 id="resourcesTitle">Keep important links and support close.</h2>
        </div>
        <button type="button" class="small-link" id="addResource">＋ Add resource</button>
      </div>
      <div class="resources-toolbar">
        <label class="resource-search">
          <span class="sr-only">Search resources</span>
          <input id="resourceSearch" type="search" placeholder="Search resources" autocomplete="off">
        </label>
        <div class="resource-filters" role="group" aria-label="Filter resources by category">
          <button type="button" class="active" data-resource-filter="All" aria-pressed="true">All</button>
          <button type="button" data-resource-filter="Study" aria-pressed="false">Study</button>
          <button type="button" data-resource-filter="Wellbeing" aria-pressed="false">Wellbeing</button>
          <button type="button" data-resource-filter="Money" aria-pressed="false">Money</button>
          <button type="button" data-resource-filter="Career" aria-pressed="false">Career</button>
          <button type="button" data-resource-filter="Personal" aria-pressed="false">Personal</button>
        </div>
      </div>
      <div class="resource-grid" id="resourceList" aria-live="polite"></div>
    `;

    const analytics = qs("#analytics");
    if (analytics) analytics.before(section);
    else qs("main")?.append(section);
  }

  if (!qs("#resourceModal")) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "resourceModal";
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "resourceModalTitle");
    modal.innerHTML = `
      <div class="modal-backdrop js-close-resource-modal"></div>
      <form class="modal-card" id="resourceForm">
        <button class="modal-close js-close-resource-modal" type="button" aria-label="Close resource form">×</button>
        <p class="eyebrow">New resource</p>
        <h2 id="resourceModalTitle">Save something useful.</h2>
        <label class="form-label" for="resourceTitle">Title</label>
        <input id="resourceTitle" type="text" placeholder="e.g. University portal" maxlength="120" required>
        <label class="form-label" for="resourceCategory">Category</label>
        <select id="resourceCategory" required>
          <option value="Study">Study</option>
          <option value="Wellbeing">Wellbeing</option>
          <option value="Money">Money</option>
          <option value="Career">Career</option>
          <option value="Personal">Personal</option>
        </select>
        <label class="form-label" for="resourceUrl">Link or contact</label>
        <input id="resourceUrl" type="text" inputmode="url" placeholder="https://, mailto:, tel:, or #section">
        <label class="form-label" for="resourceNote">Note</label>
        <textarea id="resourceNote" rows="4" placeholder="Why this matters or how to use it" maxlength="500"></textarea>
        <label class="resource-pin"><input id="resourcePinned" type="checkbox"> Pin this resource</label>
        <button class="save-button" type="submit">Save resource <span>↗</span></button>
      </form>
    `;

    const toast = qs("#appToast");
    if (toast) toast.before(modal);
    else document.body.append(modal);
  }

  import("./resources.js").catch((error) => {
    console.error("Unable to load the resources hub.", error);
  });
})();
