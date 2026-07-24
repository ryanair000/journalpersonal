"use strict";

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const APP_KEY = "myLittleLife.app.v2";
const SYNC_META_KEY = "journalpersonal.cloudSync.v1";
const ITERATIONS = 310000;
const enc = new TextEncoder();
const dec = new TextDecoder();
let client = null;
let session = null;
let encryptionPassphrase = "";
let syncTimer = null;
let lastObservedHash = "";
let remoteConflict = false;

const qs = (s, root = document) => root.querySelector(s);
const configured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
const getState = () => localStorage.getItem(APP_KEY) || "{}";
const getMeta = () => { try { return JSON.parse(localStorage.getItem(SYNC_META_KEY) || "{}"); } catch { return {}; } };
const setMeta = (value) => localStorage.setItem(SYNC_META_KEY, JSON.stringify({ ...getMeta(), ...value }));
const toB64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const formatTime = (value) => value ? new Date(value).toLocaleString() : "Never";

async function fingerprint(text) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deriveKey(passphrase, salt, iterations = ITERATIONS) {
  const material = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptPayload(plainText, passphrase, userId, saltText) {
  const salt = saltText ? fromB64(saltText) : crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(`journalpersonal:v1:${userId}`) },
    key,
    enc.encode(plainText)
  );
  return { ciphertext: toB64(ciphertext), iv: toB64(iv), salt: toB64(salt) };
}

async function decryptPayload(row, passphrase, userId) {
  const key = await deriveKey(passphrase, fromB64(row.salt), row.kdf_iterations || ITERATIONS);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(row.iv), additionalData: enc.encode(`journalpersonal:v1:${userId}`) },
    key,
    fromB64(row.ciphertext)
  );
  return dec.decode(plaintext);
}

function buildUi() {
  const topbar = qs(".topbar");
  if (!topbar || qs("#authTrigger")) return;
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.id = "authTrigger";
  trigger.className = "auth-trigger";
  trigger.innerHTML = '<span class="auth-dot"></span><span>Account & sync</span>';
  topbar.append(trigger);

  const panel = document.createElement("div");
  panel.id = "authPanel";
  panel.className = "auth-panel";
  panel.innerHTML = `
    <div class="auth-panel-backdrop" data-close-auth></div>
    <section class="auth-card" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <button type="button" class="auth-close" data-close-auth aria-label="Close account panel">×</button>
      <p class="eyebrow">Private account</p>
      <h2 id="authTitle">Account & encrypted sync</h2>
      <p class="auth-copy">Your dashboard is encrypted in this browser before it is uploaded. Supabase stores ciphertext, not readable journal content.</p>
      <div id="authLoggedOut">
        <div class="auth-tabs"><button type="button" class="active" data-auth-tab="signin">Sign in</button><button type="button" data-auth-tab="signup">Create account</button></div>
        <form class="auth-form" id="signInForm">
          <label for="signInEmail">Email</label><input id="signInEmail" type="email" autocomplete="email" required>
          <label for="signInPassword">Password</label><input id="signInPassword" type="password" autocomplete="current-password" minlength="8" required>
          <button class="auth-primary" type="submit">Sign in</button>
          <button class="auth-secondary" id="forgotPassword" type="button">Forgot password</button>
        </form>
        <form class="auth-form" id="signUpForm" hidden>
          <label for="signUpEmail">Email</label><input id="signUpEmail" type="email" autocomplete="email" required>
          <label for="signUpPassword">Password</label><input id="signUpPassword" type="password" autocomplete="new-password" minlength="10" required>
          <button class="auth-primary" type="submit">Create account</button>
        </form>
      </div>
      <div id="authLoggedIn" hidden>
        <div class="sync-dashboard">
          <div class="sync-user"><strong id="syncEmail"></strong><small>Signed in securely</small></div>
          <form class="auth-form" id="unlockForm">
            <label for="encryptionPassphrase">Encryption passphrase</label>
            <input id="encryptionPassphrase" type="password" autocomplete="off" minlength="12" required>
            <p class="passphrase-help">This is separate from your account password. It is never uploaded or stored. Use the same passphrase on every device. Losing it means cloud data cannot be decrypted.</p>
            <button class="auth-primary" type="submit">Unlock encrypted sync</button>
          </form>
          <div id="syncControls" hidden>
            <div class="sync-metadata"><div><span>Last upload</span><strong id="lastUpload">Never</strong></div><div><span>Last download</span><strong id="lastDownload">Never</strong></div></div>
            <div class="sync-warning" id="syncConflict" hidden>Cloud data changed on another device. Choose which copy to keep before syncing again.</div>
            <div class="auth-row"><button class="auth-primary" id="syncNow" type="button">Sync now</button><button class="auth-secondary" id="downloadCloud" type="button">Use cloud copy</button></div>
            <button class="auth-secondary" id="uploadLocal" type="button">Replace cloud with this device</button>
            <p class="sync-lock-note">Automatic sync runs after local changes while this tab remains unlocked.</p>
          </div>
          <button class="auth-secondary auth-danger" id="signOutButton" type="button">Sign out</button>
        </div>
      </div>
      <form class="auth-form" id="updatePasswordForm" hidden>
        <label for="newAccountPassword">New account password</label><input id="newAccountPassword" type="password" autocomplete="new-password" minlength="10" required>
        <button class="auth-primary" type="submit">Update password</button>
      </form>
      <p class="auth-status" id="authStatus" role="status"></p>
    </section>`;
  document.body.append(panel);
  bindUi();
}

function status(message, type = "") {
  const node = qs("#authStatus");
  if (!node) return;
  node.textContent = message;
  node.className = `auth-status ${type}`.trim();
}

function renderSession() {
  const loggedIn = Boolean(session?.user);
  qs("#authLoggedOut").hidden = loggedIn;
  qs("#authLoggedIn").hidden = !loggedIn;
  qs("#syncEmail").textContent = session?.user?.email || "";
  const trigger = qs("#authTrigger");
  trigger?.classList.toggle("is-online", loggedIn && Boolean(encryptionPassphrase) && !remoteConflict);
  trigger?.classList.toggle("is-warning", loggedIn && (!encryptionPassphrase || remoteConflict));
  const meta = getMeta();
  if (qs("#lastUpload")) qs("#lastUpload").textContent = formatTime(meta.lastUpload);
  if (qs("#lastDownload")) qs("#lastDownload").textContent = formatTime(meta.lastDownload);
  if (qs("#syncConflict")) qs("#syncConflict").hidden = !remoteConflict;
}

async function fetchCloudRow() {
  if (!session?.user) return null;
  const { data, error } = await client.from("encrypted_user_state").select("*").eq("user_id", session.user.id).maybeSingle();
  if (error) throw error;
  return data;
}

async function uploadLocal(force = false) {
  if (!session?.user || !encryptionPassphrase) throw new Error("Unlock encrypted sync first.");
  const row = await fetchCloudRow();
  const meta = getMeta();
  if (!force && row?.updated_at && meta.lastCloudUpdatedAt && row.updated_at !== meta.lastCloudUpdatedAt) {
    remoteConflict = true; renderSession(); throw new Error("Cloud data changed on another device.");
  }
  const stateText = getState();
  const encrypted = await encryptPayload(stateText, encryptionPassphrase, session.user.id, row?.salt);
  const payload = {
    user_id: session.user.id,
    ...encrypted,
    kdf_iterations: ITERATIONS,
    encryption_version: 1,
    client_updated_at: new Date().toISOString()
  };
  const { data, error } = await client.from("encrypted_user_state").upsert(payload, { onConflict: "user_id" }).select("updated_at").single();
  if (error) throw error;
  const hash = await fingerprint(stateText);
  setMeta({ lastUpload: new Date().toISOString(), lastCloudUpdatedAt: data.updated_at, lastSyncedHash: hash });
  lastObservedHash = hash;
  remoteConflict = false; renderSession(); status("Encrypted cloud sync complete.", "success");
}

async function downloadCloud() {
  if (!session?.user || !encryptionPassphrase) throw new Error("Unlock encrypted sync first.");
  const row = await fetchCloudRow();
  if (!row) throw new Error("No cloud backup exists yet.");
  const plain = await decryptPayload(row, encryptionPassphrase, session.user.id);
  JSON.parse(plain);
  if (!confirm("Replace this device's dashboard with the decrypted cloud copy?")) return;
  localStorage.setItem(APP_KEY, plain);
  const hash = await fingerprint(plain);
  setMeta({ lastDownload: new Date().toISOString(), lastCloudUpdatedAt: row.updated_at, lastSyncedHash: hash });
  remoteConflict = false;
  location.reload();
}

async function unlock(passphrase) {
  const row = await fetchCloudRow();
  if (row) await decryptPayload(row, passphrase, session.user.id);
  encryptionPassphrase = passphrase;
  qs("#unlockForm").hidden = true;
  qs("#syncControls").hidden = false;
  lastObservedHash = await fingerprint(getState());
  remoteConflict = Boolean(row?.updated_at && getMeta().lastCloudUpdatedAt && row.updated_at !== getMeta().lastCloudUpdatedAt);
  renderSession();
  status(row ? "Encrypted sync unlocked." : "Unlocked. Your first sync will create an encrypted cloud copy.", "success");
  startWatcher();
}

function startWatcher() {
  clearInterval(syncTimer);
  syncTimer = setInterval(async () => {
    if (!session?.user || !encryptionPassphrase || remoteConflict) return;
    const hash = await fingerprint(getState());
    if (hash !== lastObservedHash) {
      lastObservedHash = hash;
      clearTimeout(startWatcher.pending);
      startWatcher.pending = setTimeout(() => uploadLocal(false).catch((e) => status(e.message, "error")), 1800);
    }
  }, 1500);
}

function bindUi() {
  qs("#authTrigger").addEventListener("click", () => qs("#authPanel").classList.add("open"));
  document.querySelectorAll("[data-close-auth]").forEach((el) => el.addEventListener("click", () => qs("#authPanel").classList.remove("open")));
  document.querySelectorAll("[data-auth-tab]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-auth-tab]").forEach((b) => b.classList.toggle("active", b === button));
    qs("#signInForm").hidden = button.dataset.authTab !== "signin";
    qs("#signUpForm").hidden = button.dataset.authTab !== "signup";
  }));
  qs("#signInForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try { const { error } = await client.auth.signInWithPassword({ email: qs("#signInEmail").value.trim(), password: qs("#signInPassword").value }); if (error) throw error; status("Signed in.", "success"); } catch (e) { status(e.message, "error"); }
  });
  qs("#signUpForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try { const { error } = await client.auth.signUp({ email: qs("#signUpEmail").value.trim(), password: qs("#signUpPassword").value, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw error; status("Check your email to confirm the account.", "success"); } catch (e) { status(e.message, "error"); }
  });
  qs("#forgotPassword").addEventListener("click", async () => {
    const email = qs("#signInEmail").value.trim();
    if (!email) return status("Enter your email first.", "error");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    status(error ? error.message : "Password-reset email sent.", error ? "error" : "success");
  });
  qs("#unlockForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try { await unlock(qs("#encryptionPassphrase").value); } catch { status("Could not decrypt cloud data. Check the passphrase.", "error"); }
  });
  qs("#syncNow").addEventListener("click", () => uploadLocal(false).catch((e) => status(e.message, "error")));
  qs("#uploadLocal").addEventListener("click", () => { if (confirm("Replace the cloud copy with this device's encrypted data?")) uploadLocal(true).catch((e) => status(e.message, "error")); });
  qs("#downloadCloud").addEventListener("click", () => downloadCloud().catch((e) => status(e.message, "error")));
  qs("#signOutButton").addEventListener("click", async () => { encryptionPassphrase = ""; clearInterval(syncTimer); await client.auth.signOut(); });
  qs("#updatePasswordForm").addEventListener("submit", async (event) => { event.preventDefault(); const { error } = await client.auth.updateUser({ password: qs("#newAccountPassword").value }); status(error ? error.message : "Password updated.", error ? "error" : "success"); if (!error) qs("#updatePasswordForm").hidden = true; });
}

async function init() {
  buildUi();
  if (!configured) {
    qs("#authTrigger").classList.add("is-warning");
    status("Cloud setup is ready in code, but a dedicated Supabase project must be connected before accounts can be enabled.", "error");
    qs("#authLoggedOut").querySelectorAll("input,button").forEach((el) => { if (!el.dataset.authTab) el.disabled = true; });
    return;
  }
  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const { data } = await client.auth.getSession();
  session = data.session;
  renderSession();
  client.auth.onAuthStateChange((event, nextSession) => {
    session = nextSession;
    if (event === "PASSWORD_RECOVERY") qs("#updatePasswordForm").hidden = false;
    if (!session) { encryptionPassphrase = ""; clearInterval(syncTimer); qs("#unlockForm").hidden = false; qs("#syncControls").hidden = true; }
    renderSession();
  });
}

init().catch((error) => { buildUi(); status(error.message, "error"); });
