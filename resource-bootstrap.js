"use strict";

(() => {
  const qs = (selector, root = document) => root.querySelector(selector);

  function element(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([name, value]) => {
        if (value !== undefined && value !== null) node.setAttribute(name, String(value));
      });
    }
    return node;
  }

  function appendField(form, labelText, field) {
    form.append(element("label", {
      className: "form-label",
      text: labelText,
      attrs: { for: field.id }
    }));
    form.append(field);
  }

  if (!qs('link[href="resources.css"]')) {
    const link = element("link", { attrs: { rel: "stylesheet", href: "resources.css" } });
    document.head.append(link);
  }

  const journalNav = qs('.sidebar nav a[href="#journal"]');
  if (journalNav && !qs('.sidebar nav a[href="#resources"]')) {
    const resourceNav = element("a", { attrs: { href: "#resources" } });
    resourceNav.append(
      element("span", { text: "⌘" }),
      document.createTextNode(" Resources")
    );
    journalNav.after(resourceNav);
  }

  const journalToolbar = qs(".journal-toolbar");
  if (journalToolbar && !qs("#journalSearch")) {
    const search = element("label", { className: "journal-search" });
    search.append(
      element("span", { className: "sr-only", text: "Search journal entries" }),
      element("input", {
        attrs: {
          id: "journalSearch",
          type: "search",
          placeholder: "Search entries",
          autocomplete: "off"
        }
      })
    );

    const importButton = element("button", {
      className: "small-link",
      text: "Import backup",
      attrs: { type: "button", id: "importData" }
    });

    const fileInput = element("input", {
      className: "sr-only",
      attrs: {
        id: "importFile",
        type: "file",
        accept: ".json,application/json"
      }
    });

    journalToolbar.prepend(search, importButton, fileInput);
  }

  if (!qs("#resources")) {
    const section = element("section", {
      className: "resources-hub section",
      attrs: { id: "resources", "aria-labelledby": "resourcesTitle" }
    });

    const sectionTitle = element("div", { className: "section-title" });
    const titleCopy = element("div");
    titleCopy.append(
      element("p", { className: "eyebrow", text: "Useful resources" }),
      element("h2", {
        text: "Keep important links and support close.",
        attrs: { id: "resourcesTitle" }
      })
    );
    sectionTitle.append(
      titleCopy,
      element("button", {
        className: "small-link",
        text: "＋ Add resource",
        attrs: { type: "button", id: "addResource" }
      })
    );

    const toolbar = element("div", { className: "resources-toolbar" });
    const search = element("label", { className: "resource-search" });
    search.append(
      element("span", { className: "sr-only", text: "Search resources" }),
      element("input", {
        attrs: {
          id: "resourceSearch",
          type: "search",
          placeholder: "Search resources",
          autocomplete: "off"
        }
      })
    );

    const filters = element("div", {
      className: "resource-filters",
      attrs: { role: "group", "aria-label": "Filter resources by category" }
    });
    ["All", "Study", "Wellbeing", "Money", "Career", "Personal"].forEach((category, index) => {
      const button = element("button", {
        className: index === 0 ? "active" : "",
        text: category,
        attrs: {
          type: "button",
          "data-resource-filter": category,
          "aria-pressed": String(index === 0)
        }
      });
      filters.append(button);
    });

    toolbar.append(search, filters);
    section.append(
      sectionTitle,
      toolbar,
      element("div", {
        className: "resource-grid",
        attrs: { id: "resourceList", "aria-live": "polite" }
      })
    );

    const analytics = qs("#analytics");
    if (analytics) analytics.before(section);
    else qs("main")?.append(section);
  }

  if (!qs("#resourceModal")) {
    const modal = element("div", {
      className: "modal",
      attrs: {
        id: "resourceModal",
        "aria-hidden": "true",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "resourceModalTitle"
      }
    });

    const backdrop = element("div", { className: "modal-backdrop js-close-resource-modal" });
    const form = element("form", { className: "modal-card", attrs: { id: "resourceForm" } });
    form.append(
      element("button", {
        className: "modal-close js-close-resource-modal",
        text: "×",
        attrs: { type: "button", "aria-label": "Close resource form" }
      }),
      element("p", { className: "eyebrow", text: "New resource" }),
      element("h2", {
        text: "Save something useful.",
        attrs: { id: "resourceModalTitle" }
      })
    );

    appendField(form, "Title", element("input", {
      attrs: {
        id: "resourceTitle",
        type: "text",
        placeholder: "e.g. University portal",
        maxlength: "120",
        required: ""
      }
    }));

    const categorySelect = element("select", { attrs: { id: "resourceCategory", required: "" } });
    ["Study", "Wellbeing", "Money", "Career", "Personal"].forEach((category) => {
      categorySelect.append(element("option", { text: category, attrs: { value: category } }));
    });
    appendField(form, "Category", categorySelect);

    appendField(form, "Link or contact", element("input", {
      attrs: {
        id: "resourceUrl",
        type: "text",
        inputmode: "url",
        placeholder: "https://, mailto:, tel:, or #section"
      }
    }));

    appendField(form, "Note", element("textarea", {
      attrs: {
        id: "resourceNote",
        rows: "4",
        placeholder: "Why this matters or how to use it",
        maxlength: "500"
      }
    }));

    const pinLabel = element("label", { className: "resource-pin" });
    pinLabel.append(
      element("input", { attrs: { id: "resourcePinned", type: "checkbox" } }),
      document.createTextNode(" Pin this resource")
    );

    const saveButton = element("button", {
      className: "save-button",
      attrs: { type: "submit" }
    });
    saveButton.append(
      document.createTextNode("Save resource "),
      element("span", { text: "↗" })
    );

    form.append(pinLabel, saveButton);
    modal.append(backdrop, form);

    const toast = qs("#appToast");
    if (toast) toast.before(modal);
    else document.body.append(modal);
  }

  import("./resources.js").catch((error) => {
    console.error("Unable to load the resources hub.", error);
  });
})();
