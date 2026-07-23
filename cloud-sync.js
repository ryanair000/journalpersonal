"use strict";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7?bundle";
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  ENCRYPTED_SYNC_TABLE
} from "./supabase-config.js";

const DASHBOARD_KEY = "myLittleLife.app.v2";
const RESOURCE_KEY = "myLittleLife.resources.v1";
const SYNC_META_KEY = "myLittleLife.cloudSync.v1";
const AUTH_STORAGE_KEY = "journalpersonal.auth.session";
const APP_TAG = "journalpersonal";
const PAYLOAD_SCHEMA = "journalpersonal.encrypted-sync";
const PAYLOAD_VERSION = 1;
const CRYPTO_VERSION = 1;
const KDF_ITERATIONS = 310000;
const AUTO_SYNC_INTERVAL = 15000;
const MAX_SYNC_PAYLOAD_BYTES = 4 * 1024 * 1024;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: AUTH_STORAGE_KEY
  }
});

let currentSession = null;
let currentUser = null;
let cloudRecord = null;
let encryptionKey = null;
let encryptionSalt = null;
let encryptionIterations = KDF_ITERATIONS;
let busy = false;
let autoSyncTimer = null;
let modalOpener = null;

function safeJsonParse(value, fallback = null) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function readSyncMeta() {
  const fallback = {
    version: 1,
    userId: "",
    lastSyncedRevision: 0,
    lastSyncedFingerprint: "",
    lastSyncedAt: ""
  };
  return { ...fallback, ...(safeJsonParse(localStorage.getItem(SYNC_META_KEY), {}) || {}) };
}

function writeSyncMeta(patch) {
  const next = { ...readSyncMeta(), ...patch, version: 1 };
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(next));
  } catch (error) {
    console.error("Unable to save sync metadata.", error);
  }
  return next;
}

function resetSyncMetaForUser(userId) {
  const meta = readSyncMeta();
  if (meta.userId === userId) return meta;
  return writeSyncMeta({
    userId,
    lastSyncedRevision: 0,
    lastSyncedFingerprint: "",
    lastSyncedAt: ""
  });
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function deriveEncryptionKey(passphrase, salt, iterations = KDF_ITERATIONS) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function encryptionContext(userId) {
  return textEncoder.encode(`${PAYLOAD_SCHEMA}:${userId}:v${CRYPTO_VERSION}`);
}

async function encryptPayload(payload, key, userId) {
  const plaintext = textEncoder.encode(JSON.stringify(payload));
  if (plaintext.byteLength > MAX_SYNC_PAYLOAD_BYTES) {
    throw new Error("Your encrypted backup is too large to sync. Export a local backup and remove large items first.");
  }

  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: encryptionContext(userId),
      tagLength: 128
    },
    key,
    plaintext
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv)
  };
}

async function decryptRecord(record, key, userId) {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(record.iv),
      additionalData: encryptionContext(userId),
      tagLength: 128
    },
    key,
    base64ToBytes(record.ciphertext)
  );

  const payload = safeJsonParse(textDecoder.decode(plaintext), null);
  if (!payload || payload.schema !== PAYLOAD_SCHEMA || payload.version !== PAYLOAD_VERSION) {
    throw new Error("This cloud backup uses an unsupported format.");
  }
  return payload;
}

function collectLocalPayload() {
  return {
    schema: PAYLOAD_SCHEMA,
    version: PAYLOAD_VERSION,
    savedAt: new Date().toISOString(),
    dashboard: safeJsonParse(localStorage.getItem(DASHBOARD_KEY), null),
    resources: safeJsonParse(localStorage.getItem(RESOURCE_KEY), null)
  };
}

async function fingerprintPayload(payload) {
  const canonical = JSON.stringify({
    schema: payload.schema,
    version: payload.version,
    dashboard: payload.dashboard,
    resources: payload.resources
  });
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(canonical));
  return bytesToBase64(new Uint8Array(digest));
}

function writeCloudPayloadToDevice(payload) {
  if (payload.dashboard && typeof payload.dashboard === "object") {
    localStorage.setItem(DASHBOARD_KEY, JSON.stringify(payload.dashboard));
  }
  if (payload.resources && typeof payload.resources === "object") {
    localStorage.setItem(RESOURCE_KEY, JSON.stringify(payload.resources));
  }
}

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

function showToast(message, type = "info") {
  const existing = qs("#cloudToast");
  if (!existing) return;
  existing.textContent = message;
  existing.dataset.type = type;
  existing.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => existing.classList.remove("show"), 3500);
}

function statusCopy(status) {
  const map = {
    "signed-out": ["Local only", "Sign in to enable encrypted sync."],
    locked: ["Cloud locked", "Enter your sync passphrase to decrypt or create the cloud copy."],
    checking: ["Checking cloud", "Comparing this device with the encrypted cloud copy."],
    syncing: ["Syncing", "Encrypting and sending data securely."],
    synced: ["Synced", "This device matches the encrypted cloud copy."],
    "local-newer": ["Changes on this device", "Local updates are waiting to be encrypted and uploaded."],
    "cloud-newer": ["Cloud update available", "Restore the cloud copy to use changes from another device."],
    conflict: ["Sync conflict", "Both this device and the cloud changed. Choose which copy to keep."],
    error: ["Sync needs attention", "Open account settings for details."]
  };
  return map[status] || map.error;
}

function updateStatus(status, detail = "") {
  const [label, fallbackDetail] = statusCopy(status);
  const button = qs("#cloudAccountButton");
  const labelNode = qs("#cloudAccountLabel");
  const dot = qs("#cloudStatusDot");
  const statusLabel = qs("#cloudStatusLabel");
  const statusDetail = qs("#cloudStatusDetail");

  if (button) button.dataset.status = status;
  if (dot) dot.dataset.status = status;
  if (statusLabel) statusLabel.textContent = label;
  if (statusDetail) statusDetail.textContent = detail || fallbackDetail;

  if (labelNode) {
    labelNode.textContent = currentUser?.email ? currentUser.email.split("@")[0] : "Account";
  }
}

function setBusy(next, message = "") {
  busy = Boolean(next);
  qsa("[data-cloud-action]").forEach((button) => {
    button.disabled = busy;
  });
  if (busy) updateStatus("syncing", message || "Working securely…");
}

function setConflictVisible(visible) {
  const panel = qs("#cloudConflictPanel");
  if (panel) panel.hidden = !visible;
}

function setAuthMessage(message, type = "info") {
  const node = qs("#cloudAuthMessage");
  if (!node) return;
  node.textContent = message;
  node.dataset.type = type;
}

function setSyncMessage(message, type = "info") {
  const node = qs("#cloudSyncMessage");
  if (!node) return;
  node.textContent = message;
  node.dataset.type = type;
}

function renderAccountState() {
  const signedOut = qs("#cloudSignedOutView");
  const signedIn = qs("#cloudSignedInView");
  const unlockView = qs("#cloudUnlockView");
  const actionsView = qs("#cloudActionsView");
  const emailNode = qs("#cloudUserEmail");

  if (signedOut) signedOut.hidden = Boolean(currentUser);
  if (signedIn) signedIn.hidden = !currentUser;
  if (emailNode) emailNode.textContent = currentUser?.email || "Signed-in account";
  if (unlockView) unlockView.hidden = !currentUser || Boolean(encryptionKey);
  if (actionsView) actionsView.hidden = !currentUser || !encryptionKey;

  if (!currentUser) updateStatus("signed-out");
  else if (!encryptionKey) updateStatus("locked");
}

function openAccountModal(event) {
  modalOpener = event?.currentTarget || document.activeElement;
  const modal = qs("#cloudAccountModal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  const target = currentUser
    ? (encryptionKey ? qs("#cloudSyncNow") : qs("#cloudPassphrase"))
    : qs("#cloudEmail");
  setTimeout(() => target?.focus(), 0);
}

function closeAccountModal() {
  const modal = qs("#cloudAccountModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modalOpener?.focus?.();
}

function injectCloudInterface() {
  if (!qs('link[href="cloud-sync.css"]')) {
    const link = element("link", { attrs: { rel: "stylesheet", href: "cloud-sync.css" } });
    document.head.append(link);
  }

  const topbar = qs(".topbar");
  const avatar = qs(".topbar .avatar");
  if (topbar && !qs("#cloudAccountButton")) {
    const button = element("button", {
      className: "cloud-account-button",
      attrs: {
        id: "cloudAccountButton",
        type: "button",
        "aria-haspopup": "dialog",
        "aria-label": "Open account and encrypted sync settings"
      }
    });
    const dot = element("span", { className: "cloud-status-dot", attrs: { id: "cloudStatusDot" } });
    const label = element("span", { text: "Account", attrs: { id: "cloudAccountLabel" } });
    button.append(dot, label);
    button.addEventListener("click", openAccountModal);
    if (avatar) avatar.before(button);
    else topbar.append(button);
  }

  if (!qs("#cloudAccountModal")) {
    const wrapper = element("div");
    wrapper.innerHTML = `
      <div class="cloud-modal" id="cloudAccountModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="cloudModalTitle">
        <div class="cloud-modal-backdrop" data-close-cloud-modal></div>
        <section class="cloud-modal-card">
          <button type="button" class="cloud-modal-close" data-close-cloud-modal aria-label="Close account settings">×</button>
          <p class="eyebrow">Account & encrypted sync</p>
          <h2 id="cloudModalTitle">Your journal, across devices.</h2>
          <p class="cloud-privacy-note">Your account authenticates you. A separate sync passphrase encrypts journal data in this browser before it is uploaded. The passphrase is never sent or stored.</p>

          <div class="cloud-status-card">
            <span class="cloud-status-dot large" data-status="signed-out"></span>
            <div><strong id="cloudStatusLabel">Local only</strong><small id="cloudStatusDetail">Sign in to enable encrypted sync.</small></div>
          </div>

          <div id="cloudSignedOutView">
            <form id="cloudAuthForm" class="cloud-form">
              <label for="cloudEmail">Email address</label>
              <input id="cloudEmail" type="email" autocomplete="email" maxlength="254" required>
              <label for="cloudPassword">Account password</label>
              <input id="cloudPassword" type="password" autocomplete="current-password" minlength="8" required>
              <div class="cloud-button-row">
                <button class="cloud-primary-button" id="cloudSignIn" type="submit" data-cloud-action>Sign in</button>
                <button class="cloud-secondary-button" id="cloudSignUp" type="button" data-cloud-action>Create account</button>
              </div>
              <p class="cloud-form-message" id="cloudAuthMessage" aria-live="polite"></p>
              <p class="cloud-fine-print">New accounts may need email confirmation. After confirming, return to this page and sign in.</p>
            </form>
          </div>

          <div id="cloudSignedInView" hidden>
            <div class="cloud-user-line"><span>Signed in as</span><strong id="cloudUserEmail"></strong></div>

            <form id="cloudUnlockView" class="cloud-form" hidden>
              <label for="cloudPassphrase">Sync passphrase</label>
              <input id="cloudPassphrase" type="password" autocomplete="off" minlength="12" maxlength="200" required>
              <p class="cloud-warning">Use at least 12 characters. This passphrase cannot be reset or recovered. Losing it means losing access to the encrypted cloud copy.</p>
              <button class="cloud-primary-button" id="cloudUnlock" type="submit" data-cloud-action>Unlock encrypted sync</button>
            </form>

            <div id="cloudActionsView" hidden>
              <div class="cloud-action-grid">
                <button class="cloud-primary-button" id="cloudSyncNow" type="button" data-cloud-action>Sync now</button>
                <button class="cloud-secondary-button" id="cloudUploadLocal" type="button" data-cloud-action>Use this device</button>
                <button class="cloud-secondary-button" id="cloudRestoreCloud" type="button" data-cloud-action>Restore cloud copy</button>
                <button class="cloud-secondary-button" id="cloudLock" type="button" data-cloud-action>Lock cloud</button>
              </div>
              <div id="cloudConflictPanel" class="cloud-conflict-panel" hidden>
                <strong>Choose which copy to keep</strong>
                <p>Using this device replaces the cloud copy. Restoring cloud replaces local dashboard data on this browser.</p>
                <div class="cloud-button-row">
                  <button class="cloud-danger-button" id="cloudConflictUseLocal" type="button" data-cloud-action>Keep this device</button>
                  <button class="cloud-secondary-button" id="cloudConflictUseCloud" type="button" data-cloud-action>Use cloud copy</button>
                </div>
              </div>
              <p class="cloud-form-message" id="cloudSyncMessage" aria-live="polite"></p>
              <div class="cloud-account-footer">
                <button class="cloud-text-button danger" id="cloudDeleteBackup" type="button" data-cloud-action>Delete cloud copy</button>
                <button class="cloud-text-button" id="cloudSignOut" type="button" data-cloud-action>Sign out</button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div class="cloud-toast" id="cloudToast" role="status" aria-live="polite"></div>
    `;
    document.body.append(...wrapper.children);
  }

  qsa("[data-close-cloud-modal]").forEach((node) => node.addEventListener("click", closeAccountModal));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && qs("#cloudAccountModal")?.classList.contains("open")) closeAccountModal();
  });

  qs("#cloudAuthForm")?.addEventListener("submit", signIn);
  qs("#cloudSignUp")?.addEventListener("click", signUp);
  qs("#cloudUnlockView")?.addEventListener("submit", unlockCloud);
  qs("#cloudSyncNow")?.addEventListener("click", () => syncNow({ manual: true }));
  qs("#cloudUploadLocal")?.addEventListener("click", () => forceUploadLocal(false));
  qs("#cloudRestoreCloud")?.addEventListener("click", () => restoreCloud(false));
  qs("#cloudConflictUseLocal")?.addEventListener("click", () => forceUploadLocal(true));
  qs("#cloudConflictUseCloud")?.addEventListener("click", () => restoreCloud(true));
  qs("#cloudLock")?.addEventListener("click", lockEncryption);
  qs("#cloudDeleteBackup")?.addEventListener("click", deleteCloudBackup);
  qs("#cloudSignOut")?.addEventListener("click", signOut);
}

async function fetchCloudRecord() {
  if (!currentUser) return null;
  const { data, error } = await supabase
    .from(ENCRYPTED_SYNC_TABLE)
    .select("user_id,ciphertext,iv,salt,kdf,crypto_version,payload_version,revision,client_updated_at,created_at,updated_at")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (error) throw error;
  cloudRecord = data || null;
  return cloudRecord;
}

async function optimisticUpload(payload, expectedRecord) {
  if (!currentUser || !encryptionKey || !encryptionSalt) throw new Error("Encrypted sync is locked.");
  const fingerprint = await fingerprintPayload(payload);
  const encrypted = await encryptPayload(payload, encryptionKey, currentUser.id);
  const now = new Date().toISOString();
  const salt = bytesToBase64(encryptionSalt);
  const currentRevision = Number(expectedRecord?.revision || 0);
  const nextRevision = currentRevision + 1;
  const values = {
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    salt,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: encryptionIterations },
    crypto_version: CRYPTO_VERSION,
    payload_version: PAYLOAD_VERSION,
    revision: nextRevision,
    client_updated_at: now,
    updated_at: now
  };

  let data;
  let error;
  if (!expectedRecord) {
    ({ data, error } = await supabase
      .from(ENCRYPTED_SYNC_TABLE)
      .insert({ user_id: currentUser.id, ...values })
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from(ENCRYPTED_SYNC_TABLE)
      .update(values)
      .eq("user_id", currentUser.id)
      .eq("revision", currentRevision)
      .select()
      .maybeSingle());
  }

  if (error) {
    if (error.code === "23505") throw new Error("The cloud copy changed while syncing. Check again before choosing a copy.");
    throw error;
  }
  if (!data) throw new Error("The cloud copy changed while syncing. Check again before choosing a copy.");

  cloudRecord = data;
  writeSyncMeta({
    userId: currentUser.id,
    lastSyncedRevision: Number(data.revision || nextRevision),
    lastSyncedFingerprint: fingerprint,
    lastSyncedAt: now
  });
  setConflictVisible(false);
  updateStatus("synced");
  return data;
}

async function unlockCloud(event) {
  event.preventDefault();
  if (!currentUser || busy) return;
  if (!crypto?.subtle) {
    setSyncMessage("Encrypted sync requires a modern browser on HTTPS.", "error");
    return;
  }

  const input = qs("#cloudPassphrase");
  const passphrase = input?.value || "";
  if (passphrase.length < 12) {
    setSyncMessage("Use a sync passphrase with at least 12 characters.", "error");
    input?.focus();
    return;
  }

  setBusy(true, "Deriving your encryption key…");
  setSyncMessage("");
  try {
    const record = await fetchCloudRecord();
    const salt = record ? base64ToBytes(record.salt) : randomBytes(16);
    const iterations = Number(record?.kdf?.iterations || KDF_ITERATIONS);
    const key = await deriveEncryptionKey(passphrase, salt, iterations);

    if (record) {
      await decryptRecord(record, key, currentUser.id);
    }

    encryptionKey = key;
    encryptionSalt = salt;
    encryptionIterations = iterations;
    if (input) input.value = "";
    renderAccountState();
    setSyncMessage(record ? "Cloud copy unlocked on this device." : "No cloud copy found. Creating an encrypted backup from this device.", "success");

    if (!record) {
      await optimisticUpload(collectLocalPayload(), null);
      showToast("Encrypted cloud backup created.", "success");
    } else {
      await evaluateSyncState({ fetchRemote: false });
    }
  } catch (error) {
    console.error("Unable to unlock encrypted sync.", error);
    encryptionKey = null;
    encryptionSalt = null;
    const message = error?.name === "OperationError"
      ? "That sync passphrase could not decrypt the cloud copy. Check it and try again."
      : (error?.message || "Unable to unlock encrypted sync.");
    setSyncMessage(message, "error");
    updateStatus("locked", message);
  } finally {
    setBusy(false);
    renderAccountState();
  }
}

async function evaluateSyncState({ fetchRemote = true } = {}) {
  if (!currentUser || !encryptionKey) return "locked";
  updateStatus("checking");
  const record = fetchRemote ? await fetchCloudRecord() : cloudRecord;
  const meta = resetSyncMetaForUser(currentUser.id);
  const localFingerprint = await fingerprintPayload(collectLocalPayload());
  const localChanged = localFingerprint !== meta.lastSyncedFingerprint;
  const remoteRevision = Number(record?.revision || 0);
  const remoteAdvanced = remoteRevision > Number(meta.lastSyncedRevision || 0);

  if (record && encryptionSalt && record.salt !== bytesToBase64(encryptionSalt)) {
    lockEncryption();
    setSyncMessage("The cloud encryption settings changed. Unlock again with the current sync passphrase.", "error");
    return "locked";
  }

  if (remoteAdvanced && localChanged) {
    setConflictVisible(true);
    updateStatus("conflict");
    setSyncMessage("Both copies changed. Choose which one to keep.", "error");
    return "conflict";
  }
  if (remoteAdvanced) {
    setConflictVisible(false);
    updateStatus("cloud-newer");
    setSyncMessage("A newer encrypted cloud copy is available.");
    return "cloud-newer";
  }
  if (localChanged) {
    setConflictVisible(false);
    updateStatus("local-newer");
    setSyncMessage("This device has changes waiting to sync.");
    return "local-newer";
  }

  setConflictVisible(false);
  updateStatus("synced");
  setSyncMessage("This device matches the encrypted cloud copy.", "success");
  return "synced";
}

async function syncNow({ manual = false } = {}) {
  if (!currentUser || !encryptionKey || busy) return;
  setBusy(true, "Checking for encrypted changes…");
  try {
    const status = await evaluateSyncState();
    if (status === "local-newer") {
      const latest = cloudRecord;
      await optimisticUpload(collectLocalPayload(), latest);
      if (manual) showToast("Encrypted changes synced.", "success");
    } else if (status === "cloud-newer" && manual) {
      showToast("A newer cloud copy is available. Choose Restore cloud copy.");
    } else if (status === "synced" && manual) {
      showToast("Already synced.", "success");
    }
  } catch (error) {
    console.error("Unable to sync.", error);
    updateStatus("error", error?.message || "Unable to sync.");
    setSyncMessage(error?.message || "Unable to sync.", "error");
  } finally {
    setBusy(false);
    renderAccountState();
  }
}

async function forceUploadLocal(fromConflict) {
  if (!currentUser || !encryptionKey || busy) return;
  const confirmed = window.confirm(
    fromConflict
      ? "Replace the encrypted cloud copy with the data on this device? This cannot be undone unless you exported a backup."
      : "Upload this device as the cloud copy? Any newer cloud changes will be replaced."
  );
  if (!confirmed) return;

  setBusy(true, "Encrypting this device…");
  try {
    const latest = await fetchCloudRecord();
    if (latest && latest.salt !== bytesToBase64(encryptionSalt)) {
      throw new Error("The cloud encryption changed. Lock and unlock again before replacing it.");
    }
    await optimisticUpload(collectLocalPayload(), latest);
    showToast("This device is now the encrypted cloud copy.", "success");
    setSyncMessage("Cloud copy replaced with this device.", "success");
  } catch (error) {
    console.error("Unable to upload local copy.", error);
    updateStatus("error", error?.message);
    setSyncMessage(error?.message || "Unable to upload this device.", "error");
  } finally {
    setBusy(false);
    renderAccountState();
  }
}

async function restoreCloud(fromConflict) {
  if (!currentUser || !encryptionKey || busy) return;
  const confirmed = window.confirm(
    fromConflict
      ? "Replace dashboard data on this browser with the encrypted cloud copy? Local unsynced changes will be lost."
      : "Restore the encrypted cloud copy on this browser? Current local dashboard data will be replaced."
  );
  if (!confirmed) return;

  setBusy(true, "Decrypting the cloud copy…");
  try {
    const latest = await fetchCloudRecord();
    if (!latest) throw new Error("No encrypted cloud copy exists yet.");
    if (latest.salt !== bytesToBase64(encryptionSalt)) {
      throw new Error("The cloud encryption changed. Lock and unlock again with the current passphrase.");
    }
    const payload = await decryptRecord(latest, encryptionKey, currentUser.id);
    const fingerprint = await fingerprintPayload(payload);
    writeCloudPayloadToDevice(payload);
    writeSyncMeta({
      userId: currentUser.id,
      lastSyncedRevision: Number(latest.revision || 0),
      lastSyncedFingerprint: fingerprint,
      lastSyncedAt: new Date().toISOString()
    });
    showToast("Cloud copy restored. Reloading…", "success");
    setTimeout(() => location.reload(), 500);
  } catch (error) {
    console.error("Unable to restore cloud copy.", error);
    updateStatus("error", error?.message);
    setSyncMessage(error?.message || "Unable to restore cloud copy.", "error");
    setBusy(false);
    renderAccountState();
  }
}

function lockEncryption() {
  encryptionKey = null;
  encryptionSalt = null;
  encryptionIterations = KDF_ITERATIONS;
  cloudRecord = null;
  setConflictVisible(false);
  setSyncMessage("Encrypted cloud data is locked on this device.");
  renderAccountState();
  if (currentUser) updateStatus("locked");
}

async function deleteCloudBackup() {
  if (!currentUser || busy) return;
  const confirmed = window.confirm(
    "Delete the encrypted cloud copy? Local data on this browser will stay, but other devices will no longer be able to restore it."
  );
  if (!confirmed) return;

  setBusy(true, "Deleting encrypted cloud copy…");
  try {
    const { error } = await supabase.from(ENCRYPTED_SYNC_TABLE).delete().eq("user_id", currentUser.id);
    if (error) throw error;
    writeSyncMeta({
      userId: currentUser.id,
      lastSyncedRevision: 0,
      lastSyncedFingerprint: "",
      lastSyncedAt: ""
    });
    lockEncryption();
    showToast("Encrypted cloud copy deleted.", "success");
  } catch (error) {
    console.error("Unable to delete cloud backup.", error);
    updateStatus("error", error?.message);
    setSyncMessage(error?.message || "Unable to delete the cloud copy.", "error");
  } finally {
    setBusy(false);
    renderAccountState();
  }
}

async function signIn(event) {
  event.preventDefault();
  if (busy) return;
  const email = qs("#cloudEmail")?.value.trim().toLowerCase() || "";
  const password = qs("#cloudPassword")?.value || "";
  if (!email || password.length < 8) {
    setAuthMessage("Enter a valid email and an account password with at least 8 characters.", "error");
    return;
  }

  setBusy(true, "Signing in…");
  setAuthMessage("");
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (qs("#cloudPassword")) qs("#cloudPassword").value = "";
    setAuthMessage("Signed in. Enter your separate sync passphrase to unlock cloud data.", "success");
  } catch (error) {
    console.error("Sign in failed.", error);
    setAuthMessage(error?.message || "Unable to sign in.", "error");
    updateStatus("error", "Sign-in failed.");
  } finally {
    setBusy(false);
    renderAccountState();
  }
}

async function signUp() {
  if (busy) return;
  const email = qs("#cloudEmail")?.value.trim().toLowerCase() || "";
  const password = qs("#cloudPassword")?.value || "";
  if (!email || password.length < 8) {
    setAuthMessage("Enter a valid email and an account password with at least 8 characters.", "error");
    return;
  }

  setBusy(true, "Creating account…");
  setAuthMessage("");
  try {
    const redirectTo = `${location.origin}${location.pathname}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { app: APP_TAG }
      }
    });
    if (error) throw error;
    if (qs("#cloudPassword")) qs("#cloudPassword").value = "";
    if (data.session) {
      setAuthMessage("Account created and signed in. Create your sync passphrase next.", "success");
    } else {
      setAuthMessage("Account created. Check your email to confirm it, then return here and sign in.", "success");
    }
  } catch (error) {
    console.error("Sign up failed.", error);
    setAuthMessage(error?.message || "Unable to create the account.", "error");
    updateStatus("error", "Account creation failed.");
  } finally {
    setBusy(false);
    renderAccountState();
  }
}

async function signOut() {
  if (busy) return;
  setBusy(true, "Signing out…");
  try {
    lockEncryption();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    closeAccountModal();
    showToast("Signed out. Local data remains on this browser.", "success");
  } catch (error) {
    console.error("Unable to sign out.", error);
    setSyncMessage(error?.message || "Unable to sign out.", "error");
  } finally {
    setBusy(false);
    renderAccountState();
  }
}

async function handleSession(session) {
  const nextUser = session?.user || null;
  const userChanged = nextUser?.id !== currentUser?.id;
  currentSession = session || null;
  currentUser = nextUser;
  if (userChanged) lockEncryption();

  if (currentUser) {
    resetSyncMetaForUser(currentUser.id);
    updateStatus("locked");
    try {
      await fetchCloudRecord();
      const unlockButton = qs("#cloudUnlock");
      if (unlockButton) unlockButton.textContent = cloudRecord ? "Unlock encrypted sync" : "Create encrypted cloud backup";
    } catch (error) {
      console.error("Unable to check encrypted cloud record.", error);
      updateStatus("error", "Signed in, but the cloud copy could not be checked.");
    }
  } else {
    cloudRecord = null;
    updateStatus("signed-out");
  }
  renderAccountState();
}

function startAutoSync() {
  clearInterval(autoSyncTimer);
  autoSyncTimer = setInterval(() => {
    if (document.visibilityState === "visible" && currentUser && encryptionKey && !busy) {
      syncNow({ manual: false });
    }
  }, AUTO_SYNC_INTERVAL);
}

async function initializeAuth() {
  injectCloudInterface();
  renderAccountState();

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Unable to read authentication session.", error);
    updateStatus("error", "Unable to restore the account session.");
  } else {
    await handleSession(data.session);
  }

  supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (event === "SIGNED_OUT" || session?.user?.id !== currentUser?.id) {
        handleSession(session);
      } else {
        currentSession = session || null;
        currentUser = session?.user || null;
        renderAccountState();
      }
    }, 0);
  });
  startAutoSync();
}

initializeAuth().catch((error) => {
  console.error("Encrypted sync failed to initialize.", error);
  updateStatus("error", "Encrypted sync could not initialize in this browser.");
});
