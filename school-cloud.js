"use strict";

(() => {
  const DOCUMENTS_KEY = "schoolCloudDocuments";
  const UNIT_RESOURCES_KEY = "schoolUnitResources";
  const APPLICATIONS_KEY = "attachmentApplications";
  const BUCKET = "journal-documents";
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const unitCatalog = [
    ["BPL3103", "Pharmacology II (Autonomic Pharmacology)", "2026-08-06"],
    ["BPL3102", "Pharmacology I (Introduction to Pharmacology)", "2026-08-07"],
    ["BPC4102", "Pharmaceutical Chemistry VII (NMR)", "2026-08-07"],
    ["BPC4101", "Spectroscopy III", "2026-08-08"],
    ["BPL5101", "Clinical Pharmacy V", "2026-08-10"],
    ["BPL4201", "Pharmacology IX (Chemotherapy I)", "2026-08-11"],
    ["BPL4106", "Pharmacology VIII (GIT)", "2026-08-11"],
    ["BPC3103", "Pharmaceutical Chemistry III (Analytical Methods I)", "2026-08-12"],
    ["BPL4105", "Pharmacology VII (CVS)", "2026-08-12"],
    ["BPC4204", "Pharmaceutical Chemistry XII (ANS)", "2026-08-13"],
    ["BPL4104", "Pharmacology VI (Respiratory and Renal)", "2026-08-13"],
    ["BCH2206", "Spectroscopy II", "2026-08-14"],
    ["BPL4205", "Clinical Pharmacy IV", "2026-08-14"],
    ["BPT3102", "Pharmaceutics II (Drug Standards and GMP)", "2026-08-15"],
    ["BPA2204", "Human Pathology IV", "2026-08-16"],
    ["BMM2102", "Immunology", "2026-08-16"],
    ["BPT4204", "Pharmacy Management III", "2026-08-17"],
    ["BPT4103", "Pharmacy Management I", "2026-08-17"],
    ["BPA2203", "Human Pathology III", "2026-08-18"],
    ["BPC3202", "Pharmaceutical Chemistry V (CNS Drugs)", "2026-08-19"],
    ["PBCU001", "Research Methods", "2026-08-19"],
    ["BPL4103", "Clinical Pharmacy II", "2026-08-19"],
    ["BPC4202", "Pharmaceutical Chemistry X (NSAIDs and Antihistamines)", "2026-08-20"],
    ["BPL4203", "Pharmacology XI (Vitamins and Endocrine)", "2026-08-21"],
    ["BPT4102", "Pharmaceutics VI (Unit Operations)", "2026-08-21"]
  ];
  const progressLabels = {
    0: "Not started",
    25: "Started",
    50: "Halfway",
    75: "Reviewing",
    100: "Complete"
  };
  let client = null;
  let session = null;
  let documents = readArray(DOCUMENTS_KEY);
  let unitResources = readArray(UNIT_RESOURCES_KEY);
  let applications = readArray(APPLICATIONS_KEY);

  const escapeText = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveArray(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    window.mllCloudSync?.syncNow();
  }

  const formatSize = (bytes) => {
    const size = Number(bytes) || 0;
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (value) => {
    if (!value) return "Not scheduled";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  };

  const safePathPart = (value) => String(value || "file")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "file";

  const fileTypeLabel = (name) => {
    const extension = String(name).split(".").pop()?.toUpperCase() || "FILE";
    return extension.slice(0, 5);
  };

  function setDocumentStatus(message, state = "") {
    const status = document.querySelector("#schoolDocumentStatus");
    if (!status) return;
    status.textContent = message;
    status.className = `school-cloud-status${state ? ` ${state}` : ""}`;
  }

  function populateUnitCodes() {
    const list = document.querySelector("#schoolUnitCodes");
    const filter = document.querySelector("#schoolDocumentUnitFilter");
    if (!list) return;
    const known = new Set(unitCatalog.map(([code]) => code));
    readArray("examEntries").forEach((item) => item.code && known.add(String(item.code).toUpperCase()));
    documents.forEach((item) => item.unit && known.add(String(item.unit).toUpperCase()));
    unitResources.forEach((item) => item.unit && known.add(String(item.unit).toUpperCase()));
    list.replaceChildren(...[...known].sort().map((code) => {
      const option = document.createElement("option");
      option.value = code;
      return option;
    }));
    if (filter) {
      const selected = filter.value;
      filter.replaceChildren();
      const all = document.createElement("option");
      all.value = "all";
      all.textContent = "All units";
      filter.append(all, ...[...known].sort().map((code) => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = code;
        return option;
      }));
      filter.value = [...known].includes(selected) ? selected : "all";
    }
  }

  function renderDocumentSummary(filtered, filteredResources = unitResources) {
    const host = document.querySelector("#schoolDocumentSummary");
    if (!host) return;
    const complete = documents.filter((item) => Number(item.progress) === 100).length;
    const pastPapers = documents.filter((item) => item.category === "Past paper").length;
    const quizzes = documents.filter((item) => item.category === "Quiz").length;
    host.innerHTML = `
      <span><strong>${documents.length}</strong> uploaded</span>
      <span><strong>${unitResources.length}</strong> links & notes</span>
      <span><strong>${quizzes}</strong> quizzes</span>
      <span><strong>${pastPapers}</strong> past papers</span>
      <span><strong>${complete}</strong> completed</span>
      <span><strong>${filtered.length + filteredResources.length}</strong> visible</span>`;
  }

  const averageProgress = (items) => items.length ? Math.round(items.reduce((total, item) => total + (Number(item.progress) || 0), 0) / items.length) : 0;

  function renderUnitResourceCenter() {
    unitResources = readArray(UNIT_RESOURCES_KEY);
    const stats = document.querySelector("#schoolUnitResourceStats");
    const grid = document.querySelector("#schoolUnitResourceGrid");
    if (!stats || !grid) return;
    const query = document.querySelector("#schoolUnitResourceSearch")?.value.trim().toLowerCase() || "";
    const currentCodes = new Set(unitCatalog.map(([code]) => code));
    const combined = [...documents, ...unitResources].filter((item) => currentCodes.has(String(item.unit || "").toUpperCase()));
    const materialUnits = new Set(combined.map((item) => String(item.unit || "").toUpperCase()).filter(Boolean));
    stats.innerHTML = `<span><strong>${materialUnits.size}/${unitCatalog.length}</strong> units with materials</span><span><strong>${documents.length}</strong> private files</span><span><strong>${unitResources.length}</strong> links or notes</span><span><strong>${averageProgress(combined)}%</strong> average review</span>`;
    const visibleUnits = unitCatalog.filter(([code, name]) => !query || `${code} ${name}`.toLowerCase().includes(query));
    grid.innerHTML = visibleUnits.map(([code, name, examDate]) => {
      const files = documents.filter((item) => String(item.unit).toUpperCase() === code);
      const saved = unitResources.filter((item) => String(item.unit).toUpperCase() === code);
      const materials = [...files, ...saved];
      const progress = averageProgress(materials);
      return `<article class="unit-resource-folder ${materials.length ? "has-materials" : ""}" data-unit-folder="${escapeText(code)}"><header><code>${escapeText(code)}</code><b>${materials.length} item${materials.length === 1 ? "" : "s"}</b></header><strong>${escapeText(name)}</strong><small>Exam ${escapeText(formatDate(examDate))} · ${files.length} file${files.length === 1 ? "" : "s"} · ${saved.length} link/note${saved.length === 1 ? "" : "s"}</small><div class="unit-resource-folder-progress"><i style="width:${progress}%"></i></div><div class="unit-resource-folder-actions"><button type="button" data-unit-upload="${escapeText(code)}">Upload file</button><button type="button" data-unit-resource-add="${escapeText(code)}">Add link/note</button><button type="button" data-unit-resource-view="${escapeText(code)}">View</button></div></article>`;
    }).join("") || '<div class="unit-resource-empty">No unit matches that search.</div>';
  }

  function filteredUnitResources() {
    const query = document.querySelector("#schoolDocumentSearch")?.value.trim().toLowerCase() || "";
    const type = document.querySelector("#schoolDocumentTypeFilter")?.value || "all";
    const progress = document.querySelector("#schoolDocumentProgressFilter")?.value || "all";
    const unit = document.querySelector("#schoolDocumentUnitFilter")?.value || "all";
    return unitResources
      .filter((item) => !query || `${item.title} ${item.unit} ${item.kind} ${item.notes}`.toLowerCase().includes(query))
      .filter((item) => unit === "all" || String(item.unit).toUpperCase() === unit)
      .filter((item) => type === "all" || item.kind === type)
      .filter((item) => progress === "all" || Number(item.progress) === Number(progress))
      .sort((left, right) => String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt)));
  }

  function renderSavedUnitResources(filtered = filteredUnitResources()) {
    const list = document.querySelector("#schoolUnitResourceList");
    if (!list) return;
    if (!filtered.length) {
      list.innerHTML = `<div class="unit-resource-empty">${unitResources.length ? "No saved links or notes match these filters." : "Add a trusted link, a short summary, or a study note for any unit."}</div>`;
      return;
    }
    list.innerHTML = filtered.map((item) => {
      const progressValue = Number(item.progress) || 0;
      return `<article class="unit-saved-resource-row" data-unit-resource-id="${escapeText(item.id)}"><span class="unit-saved-resource-icon">${item.kind === "Link" ? "LINK" : item.kind === "Summary" ? "SUM" : "NOTE"}</span><div class="unit-saved-resource-copy"><strong>${escapeText(item.title)}</strong><small>${escapeText(item.unit)} · ${escapeText(item.kind)}</small>${item.notes ? `<p>${escapeText(item.notes)}</p>` : ""}</div><div class="school-document-progress"><select data-unit-resource-progress="${escapeText(item.id)}" aria-label="Progress for ${escapeText(item.title)}">${Object.entries(progressLabels).map(([value, label]) => `<option value="${value}" ${Number(value) === progressValue ? "selected" : ""}>${label}</option>`).join("")}</select><span class="school-progress-track"><i style="width:${progressValue}%"></i></span><b>${progressValue}%</b></div><div class="school-document-actions">${item.kind === "Link" ? `<button type="button" data-unit-resource-open="${escapeText(item.id)}">Open</button>` : ""}<button type="button" data-unit-resource-edit="${escapeText(item.id)}">Edit</button><button type="button" class="danger" data-unit-resource-delete="${escapeText(item.id)}">Delete</button></div></article>`;
    }).join("");
  }

  function updateUnitResourceUrlField() {
    const isLink = document.querySelector("#schoolUnitResourceType")?.value === "Link";
    const field = document.querySelector("#schoolUnitResourceUrlField");
    const input = document.querySelector("#schoolUnitResourceUrl");
    if (field) field.hidden = !isLink;
    if (input) input.required = isLink;
  }

  function openUnitResourceForm(item = null, unit = "") {
    const form = document.querySelector("#schoolUnitResourceForm");
    if (!form) return;
    form.hidden = false;
    document.querySelector("#schoolUnitResourceEditingId").value = item?.id || "";
    document.querySelector("#schoolUnitResourceUnit").value = item?.unit || unit || document.querySelector("#schoolDocumentUnitFilter")?.value.replace("all", "") || "";
    document.querySelector("#schoolUnitResourceType").value = item?.kind || "Link";
    document.querySelector("#schoolUnitResourceTitle").value = item?.title || "";
    document.querySelector("#schoolUnitResourceUrl").value = item?.url || "";
    document.querySelector("#schoolUnitResourceProgress").value = String(Number(item?.progress) || 0);
    document.querySelector("#schoolUnitResourceNotes").value = item?.notes || "";
    form.querySelector('button[type="submit"]').textContent = item ? "Save changes" : "Save resource";
    updateUnitResourceUrlField();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    document.querySelector("#schoolUnitResourceTitle").focus();
  }

  function closeUnitResourceForm() {
    const form = document.querySelector("#schoolUnitResourceForm");
    if (!form) return;
    form.reset();
    form.hidden = true;
    document.querySelector("#schoolUnitResourceEditingId").value = "";
    updateUnitResourceUrlField();
  }

  function safeResourceUrl(value) {
    try {
      const url = new URL(String(value).trim());
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function saveUnitResource(event) {
    event.preventDefault();
    const id = document.querySelector("#schoolUnitResourceEditingId").value || crypto.randomUUID();
    const kind = document.querySelector("#schoolUnitResourceType").value;
    const url = kind === "Link" ? safeResourceUrl(document.querySelector("#schoolUnitResourceUrl").value) : "";
    if (kind === "Link" && !url) {
      setDocumentStatus("Use a complete http:// or https:// link.", "error");
      return;
    }
    const existing = unitResources.find((item) => item.id === id);
    const item = {
      id,
      unit: document.querySelector("#schoolUnitResourceUnit").value.trim().toUpperCase(),
      kind,
      title: document.querySelector("#schoolUnitResourceTitle").value.trim(),
      url,
      progress: Number(document.querySelector("#schoolUnitResourceProgress").value) || 0,
      notes: document.querySelector("#schoolUnitResourceNotes").value.trim(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const index = unitResources.findIndex((resource) => resource.id === id);
    if (index >= 0) unitResources[index] = item;
    else unitResources.push(item);
    saveArray(UNIT_RESOURCES_KEY, unitResources);
    closeUnitResourceForm();
    populateUnitCodes();
    renderDocuments();
    setDocumentStatus(`${kind} saved for ${item.unit}.`, "success");
  }

  function openUnitResource(id) {
    const item = unitResources.find((resource) => resource.id === id);
    if (!item) return;
    if (item.kind !== "Link") { openUnitResourceForm(item); return; }
    const url = safeResourceUrl(item.url);
    if (!url) { setDocumentStatus("This saved link is not valid.", "error"); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function deleteUnitResource(button, id) {
    if (button.dataset.confirmed !== "true") {
      button.dataset.confirmed = "true";
      button.classList.add("confirming");
      button.textContent = "Confirm delete";
      window.setTimeout(() => { button.dataset.confirmed = "false"; button.classList.remove("confirming"); button.textContent = "Delete"; }, 4000);
      return;
    }
    unitResources = unitResources.filter((item) => item.id !== id);
    saveArray(UNIT_RESOURCES_KEY, unitResources);
    renderDocuments();
    setDocumentStatus("Unit resource deleted.", "success");
  }

  function renderDocuments() {
    const list = document.querySelector("#schoolDocumentList");
    if (!list) return;
    documents = readArray(DOCUMENTS_KEY);
    unitResources = readArray(UNIT_RESOURCES_KEY);
    const query = document.querySelector("#schoolDocumentSearch")?.value.trim().toLowerCase() || "";
    const type = document.querySelector("#schoolDocumentTypeFilter")?.value || "all";
    const progress = document.querySelector("#schoolDocumentProgressFilter")?.value || "all";
    const unit = document.querySelector("#schoolDocumentUnitFilter")?.value || "all";
    const filtered = documents
      .filter((item) => !query || `${item.name} ${item.unit} ${item.category}`.toLowerCase().includes(query))
      .filter((item) => unit === "all" || String(item.unit).toUpperCase() === unit)
      .filter((item) => type === "all" || item.category === type)
      .filter((item) => progress === "all" || Number(item.progress) === Number(progress))
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    const visibleResources = filteredUnitResources();
    renderDocumentSummary(filtered, visibleResources);
    renderUnitResourceCenter();
    renderSavedUnitResources(visibleResources);
    if (!filtered.length) {
      list.innerHTML = `<div class="school-empty">${documents.length ? "No documents match these filters." : "Your uploaded notes and papers will appear here."}</div>`;
      return;
    }
    list.innerHTML = filtered.map((item) => {
      const progressValue = Number(item.progress) || 0;
      const pageText = item.pages ? ` · ${Math.round((progressValue / 100) * Number(item.pages))}/${item.pages} pages` : "";
      return `
        <article class="school-document-row" data-document-id="${escapeText(item.id)}">
          <span class="school-document-icon">${escapeText(fileTypeLabel(item.name))}</span>
          <div class="school-document-copy"><strong title="${escapeText(item.name)}">${escapeText(item.name)}</strong><small>${escapeText(item.unit)} · ${escapeText(item.category)} · ${formatSize(item.size)}${pageText}</small></div>
          <div class="school-document-progress">
            <select data-document-progress="${escapeText(item.id)}" aria-label="Progress for ${escapeText(item.name)}">
              ${Object.entries(progressLabels).map(([value, label]) => `<option value="${value}" ${Number(value) === progressValue ? "selected" : ""}>${label}</option>`).join("")}
            </select>
            <span class="school-progress-track"><i style="width:${progressValue}%"></i></span><b>${progressValue}%</b>
          </div>
          <div class="school-document-actions"><button type="button" data-document-open="${escapeText(item.id)}">Open</button><button type="button" class="danger" data-document-delete="${escapeText(item.id)}">Delete</button></div>
        </article>`;
    }).join("");
  }

  async function openDocument(id) {
    const item = documents.find((documentItem) => documentItem.id === id);
    if (!item || !client || !session?.user) {
      setDocumentStatus("Sign in and connect to the internet to open this file.", "error");
      return;
    }
    if (!navigator.onLine) {
      setDocumentStatus("This file is in your private cloud. Reconnect to open it.", "error");
      return;
    }
    setDocumentStatus(`Opening ${item.name}…`);
    const preview = window.open("", "_blank");
    if (preview) {
      preview.document.title = "Opening private file…";
      preview.document.body.textContent = "Opening your private document…";
      preview.opener = null;
    }
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(item.path, 90);
    if (error || !data?.signedUrl) {
      preview?.close();
      setDocumentStatus(error?.message || "The file could not be opened.", "error");
      return;
    }
    if (preview) preview.location.href = data.signedUrl;
    else window.location.href = data.signedUrl;
    setDocumentStatus("Private link created. It expires automatically.", "success");
  }

  async function deleteDocument(button, id) {
    if (button.dataset.confirmed !== "true") {
      button.dataset.confirmed = "true";
      button.classList.add("confirming");
      button.textContent = "Confirm delete";
      window.setTimeout(() => {
        button.dataset.confirmed = "false";
        button.classList.remove("confirming");
        button.textContent = "Delete";
      }, 4000);
      return;
    }
    const item = documents.find((documentItem) => documentItem.id === id);
    if (!item || !client || !session?.user) return;
    button.disabled = true;
    const { error } = await client.storage.from(BUCKET).remove([item.path]);
    if (error) {
      button.disabled = false;
      setDocumentStatus(error.message, "error");
      return;
    }
    documents = documents.filter((documentItem) => documentItem.id !== id);
    saveArray(DOCUMENTS_KEY, documents);
    renderDocuments();
    setDocumentStatus("Document deleted from private storage.", "success");
  }

  async function uploadDocuments(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const files = [...document.querySelector("#schoolDocumentFiles").files];
    const unit = document.querySelector("#schoolDocumentUnit").value.trim().toUpperCase();
    const category = document.querySelector("#schoolDocumentType").value;
    const pages = Number(document.querySelector("#schoolDocumentPages").value) || null;
    const submit = form.querySelector('button[type="submit"]');
    if (!client || !session?.user) {
      setDocumentStatus("Sign in before uploading private documents.", "error");
      return;
    }
    if (!navigator.onLine) {
      setDocumentStatus("Reconnect to upload. Your existing dashboard still works offline.", "error");
      return;
    }
    if (!files.length || !unit) return;
    const oversized = files.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setDocumentStatus(`${oversized.name} is larger than 20 MB.`, "error");
      return;
    }
    submit.disabled = true;
    let uploaded = 0;
    try {
      for (const file of files) {
        setDocumentStatus(`Uploading ${uploaded + 1} of ${files.length}: ${file.name}…`);
        const id = crypto.randomUUID();
        const path = `${session.user.id}/${safePathPart(unit)}/${id}-${safePathPart(file.name)}`;
        const { error } = await client.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined
        });
        if (error) throw error;
        documents.push({
          id,
          path,
          name: file.name,
          unit,
          category,
          pages,
          progress: 0,
          size: file.size,
          mime: file.type,
          createdAt: new Date().toISOString()
        });
        uploaded += 1;
      }
      saveArray(DOCUMENTS_KEY, documents);
      form.reset();
      document.querySelector("#schoolFileSummary").textContent = "PDF, Word, PowerPoint, spreadsheet, image, text, CSV or JSON · up to 20 MB each";
      populateUnitCodes();
      renderDocuments();
      setDocumentStatus(`${uploaded} document${uploaded === 1 ? "" : "s"} uploaded securely.`, "success");
    } catch (error) {
      saveArray(DOCUMENTS_KEY, documents);
      renderDocuments();
      setDocumentStatus(`${uploaded} uploaded. ${error?.message || "The next file could not be uploaded."}`, "error");
    } finally {
      submit.disabled = false;
    }
  }

  function nextSearchDay() {
    const date = new Date();
    for (let offset = 0; offset < 8; offset += 1) {
      const candidate = new Date(date);
      candidate.setDate(date.getDate() + offset);
      if ([2, 4].includes(candidate.getDay())) {
        return candidate.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
      }
    }
    return "Tuesday";
  }

  function renderAttachmentStats(filtered) {
    const host = document.querySelector("#attachmentStats");
    if (!host) return;
    const applied = applications.filter((item) => ["Applied", "Follow-up", "Interview", "Accepted"].includes(item.status)).length;
    const followUps = applications.filter((item) => item.followUpDate && item.followUpDate >= new Date().toISOString().slice(0, 10) && item.status !== "Accepted").length;
    const accepted = applications.filter((item) => item.status === "Accepted").length;
    host.innerHTML = `<span><strong>${applications.length}</strong> facilities</span><span><strong>${applied}</strong> applied</span><span><strong>${followUps}</strong> follow-ups</span><span><strong>${accepted}</strong> accepted</span><span><strong>${filtered.length}</strong> visible</span>`;
  }

  function renderApplications() {
    const list = document.querySelector("#attachmentApplicationList");
    if (!list) return;
    applications = readArray(APPLICATIONS_KEY);
    const query = document.querySelector("#attachmentSearch")?.value.trim().toLowerCase() || "";
    const status = document.querySelector("#attachmentStatusFilter")?.value || "all";
    const today = new Date().toISOString().slice(0, 10);
    const filtered = applications
      .filter((item) => !query || `${item.facility} ${item.location} ${item.contact} ${item.notes}`.toLowerCase().includes(query))
      .filter((item) => status === "all" || item.status === status)
      .sort((left, right) => String(left.followUpDate || "9999").localeCompare(String(right.followUpDate || "9999")));
    renderAttachmentStats(filtered);
    if (!filtered.length) {
      list.innerHTML = `<div class="attachment-empty">${applications.length ? "No applications match this filter." : "Add the first facility you want to research or approach."}</div>`;
      return;
    }
    list.innerHTML = filtered.map((item) => {
      const overdue = item.followUpDate && item.followUpDate < today && !["Accepted", "Declined"].includes(item.status);
      return `
        <article class="attachment-application-row ${overdue ? "overdue" : ""} ${item.status === "Accepted" ? "accepted" : ""}" data-attachment-id="${escapeText(item.id)}">
          <div class="attachment-facility"><strong>${escapeText(item.facility)}</strong><small>${escapeText(item.location || "Location to confirm")}${item.contact ? ` · ${escapeText(item.contact)}` : ""}</small>${item.notes ? `<small>${escapeText(item.notes)}</small>` : ""}</div>
          <div class="attachment-detail"><span class="attachment-status-pill ${item.status === "Accepted" ? "accepted" : ""}">${escapeText(item.status)}</span><small>${escapeText(item.method || "Method not set")}</small></div>
          <div class="attachment-detail"><b>${overdue ? "Follow-up overdue" : "Next follow-up"}</b><small>${formatDate(item.followUpDate)}</small>${item.appliedDate ? `<small>Applied ${formatDate(item.appliedDate)}</small>` : ""}</div>
          <div class="attachment-row-actions"><button type="button" data-attachment-edit="${escapeText(item.id)}">Edit</button><button type="button" data-attachment-delete="${escapeText(item.id)}">Delete</button></div>
        </article>`;
    }).join("");
  }

  function openAttachmentForm(item = null) {
    const form = document.querySelector("#attachmentApplicationForm");
    form.hidden = false;
    document.querySelector("#attachmentEditingId").value = item?.id || "";
    document.querySelector("#attachmentFacility").value = item?.facility || "";
    document.querySelector("#attachmentLocation").value = item?.location || "";
    document.querySelector("#attachmentContact").value = item?.contact || "";
    document.querySelector("#attachmentContactDetail").value = item?.contactDetail || "";
    document.querySelector("#attachmentMethod").value = item?.method || "In person";
    document.querySelector("#attachmentStatus").value = item?.status || "Researching";
    document.querySelector("#attachmentAppliedDate").value = item?.appliedDate || "";
    document.querySelector("#attachmentFollowUpDate").value = item?.followUpDate || "";
    document.querySelector("#attachmentNotes").value = item?.notes || "";
    form.querySelector('button[type="submit"]').textContent = item ? "Save changes" : "Save application";
    document.querySelector("#attachmentFacility").focus();
  }

  function closeAttachmentForm() {
    const form = document.querySelector("#attachmentApplicationForm");
    form.reset();
    form.hidden = true;
    document.querySelector("#attachmentEditingId").value = "";
  }

  function saveApplication(event) {
    event.preventDefault();
    const id = document.querySelector("#attachmentEditingId").value || crypto.randomUUID();
    const item = {
      id,
      facility: document.querySelector("#attachmentFacility").value.trim(),
      location: document.querySelector("#attachmentLocation").value.trim(),
      contact: document.querySelector("#attachmentContact").value.trim(),
      contactDetail: document.querySelector("#attachmentContactDetail").value.trim(),
      method: document.querySelector("#attachmentMethod").value,
      status: document.querySelector("#attachmentStatus").value,
      appliedDate: document.querySelector("#attachmentAppliedDate").value,
      followUpDate: document.querySelector("#attachmentFollowUpDate").value,
      notes: document.querySelector("#attachmentNotes").value.trim(),
      updatedAt: new Date().toISOString()
    };
    const index = applications.findIndex((application) => application.id === id);
    if (index >= 0) applications[index] = item;
    else applications.push(item);
    saveArray(APPLICATIONS_KEY, applications);
    closeAttachmentForm();
    renderApplications();
  }

  function deleteApplication(button, id) {
    if (button.dataset.confirmed !== "true") {
      button.dataset.confirmed = "true";
      button.classList.add("confirming");
      button.textContent = "Confirm";
      window.setTimeout(() => {
        button.dataset.confirmed = "false";
        button.classList.remove("confirming");
        button.textContent = "Delete";
      }, 4000);
      return;
    }
    applications = applications.filter((item) => item.id !== id);
    saveArray(APPLICATIONS_KEY, applications);
    renderApplications();
  }

  async function refreshAuth(authSession = null) {
    client = window.mllCloudSync?.getClient?.() || null;
    session = authSession || window.mllCloudSync?.getSession?.() || null;
    const submit = document.querySelector("#schoolDocumentForm button[type='submit']");
    if (submit) submit.disabled = !session?.user;
    setDocumentStatus(session?.user ? "Private storage ready." : "Sign in to upload and open private files.", session?.user ? "success" : "");
  }

  function focusUnitResources(unit, action = "view") {
    const code = String(unit || "").trim().toUpperCase();
    if (!code) return;
    const filter = document.querySelector("#schoolDocumentUnitFilter");
    const uploadUnit = document.querySelector("#schoolDocumentUnit");
    if (filter && [...filter.options].some((option) => option.value === code)) filter.value = code;
    if (uploadUnit) uploadUnit.value = code;
    renderDocuments();
    document.querySelector("#schoolDocuments")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (action === "upload") {
      setDocumentStatus(`${code} selected. Choose files to upload securely.`);
      document.querySelector("#schoolDocumentFiles")?.click();
    } else if (action === "add") {
      openUnitResourceForm(null, code);
    } else {
      const count = [...documents, ...unitResources].filter((item) => String(item.unit).toUpperCase() === code).length;
      setDocumentStatus(count ? `Showing ${count} resource${count === 1 ? "" : "s"} for ${code}.` : `${code} has no saved materials yet. Upload a file or add a link or note.`);
    }
  }

  function bindEvents() {
    const openReferenceUploader = (category) => {
      const library = document.querySelector("#schoolDocuments");
      const type = document.querySelector("#schoolDocumentType");
      const files = document.querySelector("#schoolDocumentFiles");
      if (!library || !type || !files) return;
      type.value = category;
      library.scrollIntoView({ behavior: "smooth", block: "start" });
      setDocumentStatus(`${category} selected. Choose your file, add its unit code, then upload securely.`);
      files.click();
    };
    document.querySelector("#uploadReferencePdf")?.addEventListener("click", () => openReferenceUploader("Reference"));
    document.querySelector("#uploadQuizFile")?.addEventListener("click", () => openReferenceUploader("Quiz"));
    document.querySelector("#schoolDocumentForm")?.addEventListener("submit", uploadDocuments);
    document.querySelector("#schoolDocumentFiles")?.addEventListener("change", (event) => {
      const files = [...event.currentTarget.files];
      document.querySelector("#schoolFileSummary").textContent = files.length ? `${files.length} selected · ${formatSize(files.reduce((total, file) => total + file.size, 0))} total` : "PDF, Word, PowerPoint, spreadsheet, image, text, CSV or JSON · up to 20 MB each";
    });
    ["#schoolDocumentSearch", "#schoolDocumentUnitFilter", "#schoolDocumentTypeFilter", "#schoolDocumentProgressFilter"].forEach((selector) => document.querySelector(selector)?.addEventListener(selector.includes("Search") ? "input" : "change", renderDocuments));
    document.querySelector("#schoolDocumentList")?.addEventListener("change", (event) => {
      const id = event.target.dataset.documentProgress;
      if (!id) return;
      const item = documents.find((documentItem) => documentItem.id === id);
      if (!item) return;
      item.progress = Number(event.target.value);
      item.updatedAt = new Date().toISOString();
      saveArray(DOCUMENTS_KEY, documents);
      renderDocuments();
    });
    document.querySelector("#schoolDocumentList")?.addEventListener("click", (event) => {
      const openId = event.target.dataset.documentOpen;
      const deleteId = event.target.dataset.documentDelete;
      if (openId) openDocument(openId);
      if (deleteId) deleteDocument(event.target, deleteId);
    });
    document.querySelector("#schoolUnitResourceSearch")?.addEventListener("input", renderUnitResourceCenter);
    document.querySelector("#addSchoolUnitResource")?.addEventListener("click", () => openUnitResourceForm());
    document.querySelector("#addSchoolUnitResourceSecondary")?.addEventListener("click", () => openUnitResourceForm());
    document.querySelector("#cancelSchoolUnitResource")?.addEventListener("click", closeUnitResourceForm);
    document.querySelector("#schoolUnitResourceType")?.addEventListener("change", updateUnitResourceUrlField);
    document.querySelector("#schoolUnitResourceForm")?.addEventListener("submit", saveUnitResource);
    document.querySelector("#schoolUnitResourceGrid")?.addEventListener("click", (event) => {
      const upload = event.target.dataset.unitUpload;
      const add = event.target.dataset.unitResourceAdd;
      const view = event.target.dataset.unitResourceView;
      if (upload) focusUnitResources(upload, "upload");
      if (add) focusUnitResources(add, "add");
      if (view) focusUnitResources(view, "view");
    });
    document.querySelector("#schoolUnitResourceList")?.addEventListener("change", (event) => {
      const id = event.target.dataset.unitResourceProgress;
      if (!id) return;
      const item = unitResources.find((resource) => resource.id === id);
      if (!item) return;
      item.progress = Number(event.target.value);
      item.updatedAt = new Date().toISOString();
      saveArray(UNIT_RESOURCES_KEY, unitResources);
      renderDocuments();
    });
    document.querySelector("#schoolUnitResourceList")?.addEventListener("click", (event) => {
      const openId = event.target.dataset.unitResourceOpen;
      const editId = event.target.dataset.unitResourceEdit;
      const deleteId = event.target.dataset.unitResourceDelete;
      if (openId) openUnitResource(openId);
      if (editId) openUnitResourceForm(unitResources.find((item) => item.id === editId));
      if (deleteId) deleteUnitResource(event.target, deleteId);
    });
    document.addEventListener("mll:open-unit-resources", (event) => focusUnitResources(event.detail?.unit, event.detail?.action || "view"));

    document.querySelector("#toggleAttachmentForm")?.addEventListener("click", () => openAttachmentForm());
    document.querySelector("#cancelAttachmentForm")?.addEventListener("click", closeAttachmentForm);
    document.querySelector("#attachmentApplicationForm")?.addEventListener("submit", saveApplication);
    document.querySelector("#attachmentSearch")?.addEventListener("input", renderApplications);
    document.querySelector("#attachmentStatusFilter")?.addEventListener("change", renderApplications);
    document.querySelector("#attachmentApplicationList")?.addEventListener("click", (event) => {
      const editId = event.target.dataset.attachmentEdit;
      const deleteId = event.target.dataset.attachmentDelete;
      if (editId) openAttachmentForm(applications.find((item) => item.id === editId));
      if (deleteId) deleteApplication(event.target, deleteId);
    });
    window.addEventListener("mll:auth", (event) => refreshAuth(event.detail?.authenticated ? { user: { id: event.detail.userId, email: event.detail.email } } : null));
  }

  function start() {
    populateUnitCodes();
    renderDocuments();
    renderApplications();
    const rhythm = document.querySelector("#attachmentSearchRhythm");
    if (rhythm) rhythm.textContent = `Next protected search day: ${nextSearchDay()} · keep Tuesday and Thursday for applications and follow-ups.`;
    bindEvents();
    refreshAuth();
  }

  window.addEventListener("load", start);
})();
