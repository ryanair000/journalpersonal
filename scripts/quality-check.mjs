import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync
} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SELF = "scripts/quality-check.mjs";
const IGNORE_DIRECTORIES = new Set([
  ".git",
  ".vercel",
  "node_modules",
  "coverage",
  "dist",
  "build"
]);
const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".txt",
  ".yaml",
  ".yml"
]);
const PROMPT_CONFIRM_ALLOWLIST = new Set(["dashboard.js", "resources.js"]);
const errors = [];
const warnings = [];
const checks = [];

function relative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function walk(directory) {
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORE_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(absolute));
    else if (entry.isFile()) output.push(absolute);
  }
  return output;
}

function addError(scope, message) {
  errors.push(`${scope}: ${message}`);
}

function addWarning(scope, message) {
  warnings.push(`${scope}: ${message}`);
}

function record(name, count, detail = "") {
  checks.push({ name, count, detail });
}

function read(filePath) {
  return readFileSync(filePath, "utf8");
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function stripCssCommentsAndStrings(source) {
  let output = "";
  let quote = "";
  let inComment = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (inComment) {
      if (character === "*" && next === "/") {
        inComment = false;
        output += "  ";
        index += 1;
      } else {
        output += character === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (quote) {
      output += character === "\n" ? "\n" : " ";
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }

    if (character === "/" && next === "*") {
      inComment = true;
      output += "  ";
      index += 1;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      output += " ";
      continue;
    }

    output += character;
  }

  return output;
}

function checkBalancedCss(filePath) {
  const source = read(filePath);
  const cleaned = stripCssCommentsAndStrings(source);
  const stack = [];

  for (let index = 0; index < cleaned.length; index += 1) {
    const character = cleaned[index];
    if (character === "{") stack.push(index);
    if (character === "}") {
      if (!stack.length) {
        addError(
          relative(filePath),
          `unexpected closing brace on line ${lineNumber(cleaned, index)}`
        );
        return;
      }
      stack.pop();
    }
  }

  if (stack.length) {
    const index = stack.at(-1);
    addError(
      relative(filePath),
      `unclosed brace opened on line ${lineNumber(cleaned, index)}`
    );
  }
}

function isExternalReference(reference) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference);
}

function normalizeLocalReference(reference) {
  const trimmed = String(reference || "").trim();
  if (!trimmed || isExternalReference(trimmed) || trimmed.includes("${")) {
    return null;
  }
  return trimmed.split("#")[0].split("?")[0];
}

function checkReference(sourceFile, reference, context) {
  const normalized = normalizeLocalReference(reference);
  if (!normalized) return;

  const sourceDirectory = path.dirname(sourceFile);
  const resolved = normalized.startsWith("/")
    ? path.join(ROOT, normalized.replace(/^\/+/, ""))
    : path.resolve(sourceDirectory, normalized);

  if (!existsSync(resolved)) {
    addError(
      relative(sourceFile),
      `${context} points to missing local asset "${reference}"`
    );
  }
}

const allFiles = walk(ROOT);
const jsFiles = allFiles.filter((file) =>
  [".js", ".mjs", ".cjs"].includes(path.extname(file))
);
const cssFiles = allFiles.filter((file) => path.extname(file) === ".css");
const htmlFiles = allFiles.filter((file) => path.extname(file) === ".html");
const jsonFiles = allFiles.filter((file) => path.extname(file) === ".json");
const textFiles = allFiles.filter((file) =>
  TEXT_EXTENSIONS.has(path.extname(file))
);

for (const filePath of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", filePath], { stdio: "pipe" });
  } catch (error) {
    const detail = String(
      error.stderr || error.stdout || error.message
    ).trim();
    addError(
      relative(filePath),
      `JavaScript syntax check failed${detail ? ` — ${detail}` : ""}`
    );
  }
}
record("JavaScript syntax", jsFiles.length, "node --check");

for (const filePath of cssFiles) checkBalancedCss(filePath);
record("CSS structure", cssFiles.length, "balanced braces");

for (const filePath of jsonFiles) {
  try {
    JSON.parse(read(filePath));
  } catch (error) {
    addError(relative(filePath), `invalid JSON — ${error.message}`);
  }
}
record("JSON parsing", jsonFiles.length);

for (const filePath of textFiles) {
  const source = read(filePath);
  const marker = /^(?:<<<<<<<|=======|>>>>>>>)(?: |$)/m.exec(source);
  if (marker) {
    addError(
      relative(filePath),
      `unresolved merge marker on line ${lineNumber(source, marker.index)}`
    );
  }
}
record("Merge markers", textFiles.length);

for (const filePath of htmlFiles) {
  const source = read(filePath);
  const ids = new Map();

  for (const match of source.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
    const id = match[1];
    const current = ids.get(id) || [];
    current.push(lineNumber(source, match.index));
    ids.set(id, current);
  }

  for (const [id, lines] of ids) {
    if (lines.length > 1) {
      addError(
        relative(filePath),
        `duplicate id "${id}" on lines ${lines.join(", ")}`
      );
    }
  }

  for (const match of source.matchAll(
    /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi
  )) {
    checkReference(
      filePath,
      match[1],
      `${match[0].split("=")[0].trim()} attribute`
    );
  }
}
record("HTML IDs and assets", htmlFiles.length);

for (const filePath of cssFiles) {
  const source = read(filePath);
  for (const match of source.matchAll(
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi
  )) {
    checkReference(filePath, match[1], "CSS url()");
  }
}

for (const filePath of jsFiles) {
  if (relative(filePath) === SELF) continue;
  const source = read(filePath);

  for (const match of source.matchAll(
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g
  )) {
    checkReference(filePath, match[1], "dynamic import");
  }

  for (const match of source.matchAll(
    /\b(?:href|src)\s*:\s*["']([^"']+)["']/g
  )) {
    checkReference(filePath, match[1], "generated asset reference");
  }

  if (path.basename(filePath) === "script.js") {
    const moduleLabels = new Set();
    const modulePaths = new Set();

    for (const match of source.matchAll(
      /\{([^{}]*\bpath\s*:\s*["'][^"']+["'][^{}]*)\}/g
    )) {
      const block = match[1];
      const pathMatch = /\bpath\s*:\s*["']([^"']+)["']/.exec(block);
      const labelMatch = /\blabel\s*:\s*["']([^"']+)["']/.exec(block);
      if (!pathMatch || !labelMatch) continue;

      const modulePath = pathMatch[1];
      const label = labelMatch[1];
      if (moduleLabels.has(label)) {
        addError(relative(filePath), `duplicate module label "${label}"`);
      }
      if (modulePaths.has(modulePath)) {
        addError(relative(filePath), `duplicate module path "${modulePath}"`);
      }
      moduleLabels.add(label);
      modulePaths.add(modulePath);
      checkReference(filePath, modulePath, `module "${label}"`);
    }

    if (!modulePaths.size) {
      addWarning(
        relative(filePath),
        "no static module registry entries were detected"
      );
    }
  }
}
record(
  "Local asset references",
  htmlFiles.length + cssFiles.length + jsFiles.length - 1
);

const unsafePatterns = [
  ["innerHTML assignment", /\.innerHTML\s*=/g],
  ["outerHTML assignment", /\.outerHTML\s*=/g],
  ["insertAdjacentHTML call", /\.insertAdjacentHTML\s*\(/g],
  ["document.write call", /\bdocument\.write(?:ln)?\s*\(/g],
  ["eval call", /(?:^|[^\w$])eval\s*\(/g],
  ["Function constructor", /\bnew\s+Function\s*\(/g]
];

for (const filePath of jsFiles) {
  const file = relative(filePath);
  if (file === SELF) continue;
  const source = read(filePath);

  for (const [label, pattern] of unsafePatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(source);
    if (match) {
      addError(file, `${label} on line ${lineNumber(source, match.index)}`);
    }
  }

  if (!PROMPT_CONFIRM_ALLOWLIST.has(file)) {
    const directPrompt =
      /\b(?:(?:globalThis|window)\.)?(?:prompt|confirm)\s*\(/g.exec(source);
    if (directPrompt) {
      addError(
        file,
        `direct browser prompt/confirm call on line ${lineNumber(
          source,
          directPrompt.index
        )}`
      );
    }
  }
}
record(
  "Unsafe browser APIs",
  jsFiles.length - 1,
  `legacy allowlist: ${[...PROMPT_CONFIRM_ALLOWLIST].join(", ")}`
);

for (const filePath of allFiles) {
  const size = statSync(filePath).size;
  if (size > 1024 * 1024) {
    addWarning(
      relative(filePath),
      `large repository file (${(size / 1024 / 1024).toFixed(2)} MB)`
    );
  }
}
record("Repository file sizes", allFiles.length);

const summaryLines = [
  "# Quality gate",
  "",
  `- Files inspected: ${allFiles.length}`,
  `- Errors: ${errors.length}`,
  `- Warnings: ${warnings.length}`,
  "",
  "| Check | Files | Details |",
  "|---|---:|---|",
  ...checks.map(
    (check) => `| ${check.name} | ${check.count} | ${check.detail || "—"} |`
  )
];

if (errors.length) {
  summaryLines.push("", "## Errors", ...errors.map((message) => `- ${message}`));
}
if (warnings.length) {
  summaryLines.push(
    "",
    "## Warnings",
    ...warnings.map((message) => `- ${message}`)
  );
}

const summary = `${summaryLines.join("\n")}\n`;
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

console.log(summary);
if (errors.length) process.exitCode = 1;
