"use strict";

(() => {
  const config = window.MLL_SUPABASE_CONFIG;
  const META_KEY = "mll.sync.meta.v1";
  const KEY_TIMES_KEY = "mll.sync.keyTimes.v1";
  const AUTHENTICATED_KEY = "mll.authenticatedBefore";
  const MAX_PAYLOAD_BYTES = 4_500_000;
  const POLL_MS = 30_000;
  const LOGIN_USERNAME = "Charry";
  const LOCAL_TEST_MODE = ["127.0.0.1", "localhost"].includes(window.location.hostname) && new URLSearchParams(window.location.search).has("mllTest");
  const USERNAME_LOGIN_ENDPOINT = config?.url ? `${config.url}/functions/v1/journal-username-login` : "";
  const ignoredExact = new Set([
    META_KEY,
    KEY_TIMES_KEY,
    AUTHENTICATED_KEY,
    "privacyPinHash",
    "myLittleLife.formNotice",
    "myLittleLife.commandNotice"
  ]);
  const ignoredPrefixes = ["sb-", "supabase.", "mll.auth."];
  let client = null;
  let session = null;
  let applyingRemote = false;
  let syncTimer = null;
  let pollTimer = null;
  let syncInFlight = false;
  let syncQueued = false;
  let authMode = "signin";
  let accountCard = null;

  const safeParse = (value, fallback) => {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  };

  const callUsernameAuth = async (payload) => {
    if (!USERNAME_LOGIN_ENDPOINT) throw new Error("Username login is not configured.");
    const response = await fetch(USERNAME_LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Username login is temporarily unavailable.");
    return data;
  };

  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;

  const shouldSyncKey = (key) => {
    const name = String(key || "");
    if (!name || ignoredExact.has(name)) return false;
    return !ignoredPrefixes.some((prefix) => name.startsWith(prefix));
  };

  const readMeta = () => safeParse(localStorage.getItem(META_KEY), {});
  const writeMeta = (next) => nativeSetItem.call(localStorage, META_KEY, JSON.stringify(next));
  const readKeyTimes = () => safeParse(localStorage.getItem(KEY_TIMES_KEY), {});
  const writeKeyTimes = (next) => nativeSetItem.call(localStorage, KEY_TIMES_KEY, JSON.stringify(next));

  const updateAccountCard = (state, detail = "") => {
    if (!accountCard) return;
    const badge = accountCard.querySelector("[data-mll-sync-badge]");
    const note = accountCard.querySelector("[data-mll-sync-note]");
    if (badge) {
      badge.className = `mll-sync-badge ${state}`;
      badge.textContent = state === "synced" ? "Synced" : state === "syncing" ? "Syncing" : state === "offline" ? "Offline" : state === "error" ? "Needs attention" : "Local";
    }
    if (note) note.textContent = detail || "Changes are saved on this device.";
  };

  const markLocalChange = (key) => {
    if (applyingRemote || !shouldSyncKey(key)) return;
    const now = new Date().toISOString();
    const keyTimes = readKeyTimes();
    keyTimes[key] = now;
    writeKeyTimes(keyTimes);
    const meta = readMeta();
    meta.localUpdatedAt = now;
    writeMeta(meta);
    scheduleSync();
  };

  Storage.prototype.setItem = function setItem(key, value) {
    nativeSetItem.call(this, key, value);
    if (this === localStorage) markLocalChange(String(key));
  };

  Storage.prototype.removeItem = function removeItem(key) {
    nativeRemoveItem.call(this, key);
    if (this === localStorage) markLocalChange(String(key));
  };

  const snapshotLocal = () => {
    const values = {};
    const keyUpdatedAt = readKeyTimes();
    const fallbackTime = readMeta().localUpdatedAt || new Date().toISOString();

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!shouldSyncKey(key)) continue;
      values[key] = localStorage.getItem(key);
      if (!keyUpdatedAt[key]) keyUpdatedAt[key] = fallbackTime;
    }

    Object.keys(keyUpdatedAt).forEach((key) => {
      if (!shouldSyncKey(key)) delete keyUpdatedAt[key];
      if (!(key in values)) values[key] = null;
    });

    writeKeyTimes(keyUpdatedAt);
    return { version: 1, values, keyUpdatedAt };
  };

  const normalizeSnapshot = (payload) => ({
    version: 1,
    values: payload && typeof payload.values === "object" && payload.values ? payload.values : {},
    keyUpdatedAt: payload && typeof payload.keyUpdatedAt === "object" && payload.keyUpdatedAt ? payload.keyUpdatedAt : {}
  });

  const mergeSnapshots = (local, remote) => {
    const merged = { version: 1, values: {}, keyUpdatedAt: {} };
    const keys = new Set([...Object.keys(local.values), ...Object.keys(remote.values), ...Object.keys(local.keyUpdatedAt), ...Object.keys(remote.keyUpdatedAt)]);
    keys.forEach((key) => {
      if (!shouldSyncKey(key)) return;
      const localTime = local.keyUpdatedAt[key] || "";
      const remoteTime = remote.keyUpdatedAt[key] || "";
      const useRemote = remoteTime > localTime;
      merged.values[key] = useRemote ? (remote.values[key] ?? null) : (local.values[key] ?? null);
      merged.keyUpdatedAt[key] = useRemote ? remoteTime : localTime;
    });
    return merged;
  };

  const mergeFirstDeviceSnapshot = (local, remote) => {
    const merged = { version: 1, values: {}, keyUpdatedAt: {} };
    const keys = new Set([...Object.keys(local.values), ...Object.keys(remote.values), ...Object.keys(local.keyUpdatedAt), ...Object.keys(remote.keyUpdatedAt)]);
    keys.forEach((key) => {
      if (!shouldSyncKey(key)) return;
      const remoteOwnsKey = Object.prototype.hasOwnProperty.call(remote.values, key) || Object.prototype.hasOwnProperty.call(remote.keyUpdatedAt, key);
      merged.values[key] = remoteOwnsKey ? (remote.values[key] ?? null) : (local.values[key] ?? null);
      merged.keyUpdatedAt[key] = remoteOwnsKey ? (remote.keyUpdatedAt[key] || "") : (local.keyUpdatedAt[key] || "");
    });
    return merged;
  };

  const snapshotsEqual = (left, right) => {
    const first = normalizeSnapshot(left);
    const second = normalizeSnapshot(right);
    const keys = new Set([...Object.keys(first.values), ...Object.keys(second.values), ...Object.keys(first.keyUpdatedAt), ...Object.keys(second.keyUpdatedAt)]);
    return [...keys].every((key) => (first.values[key] ?? null) === (second.values[key] ?? null) && (first.keyUpdatedAt[key] || "") === (second.keyUpdatedAt[key] || ""));
  };

  const changedSnapshotKeys = (before, after) => {
    const first = normalizeSnapshot(before);
    const second = normalizeSnapshot(after);
    const keys = new Set([...Object.keys(first.values), ...Object.keys(second.values), ...Object.keys(first.keyUpdatedAt), ...Object.keys(second.keyUpdatedAt)]);
    return [...keys].filter((key) => (first.values[key] ?? null) !== (second.values[key] ?? null) || (first.keyUpdatedAt[key] || "") !== (second.keyUpdatedAt[key] || ""));
  };

  const notifyDataChanged = (keys, source = "cloud") => {
    window.dispatchEvent(new CustomEvent("mll:data-changed", { detail: { keys, source } }));
  };

  const clearSyncableLocal = () => {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (shouldSyncKey(key)) keys.push(key);
    }
    applyingRemote = true;
    try {
      keys.forEach((key) => nativeRemoveItem.call(localStorage, key));
      writeKeyTimes({});
    } finally {
      applyingRemote = false;
    }
  };

  const applySnapshot = (snapshot) => {
    applyingRemote = true;
    try {
      const existingKeys = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (shouldSyncKey(key)) existingKeys.push(key);
      }
      existingKeys.forEach((key) => {
        if (!(key in snapshot.values) || snapshot.values[key] === null) nativeRemoveItem.call(localStorage, key);
      });
      Object.entries(snapshot.values).forEach(([key, value]) => {
        if (!shouldSyncKey(key)) return;
        if (value === null) nativeRemoveItem.call(localStorage, key);
        else nativeSetItem.call(localStorage, key, String(value));
      });
      writeKeyTimes(snapshot.keyUpdatedAt);
    } finally {
      applyingRemote = false;
    }
  };

  const showCloudAlert = (message) => {
    document.querySelector("#mllCloudAlert")?.remove();
    const alert = document.createElement("div");
    alert.id = "mllCloudAlert";
    alert.className = "mll-cloud-alert";
    alert.textContent = message;
    document.body.append(alert);
    window.setTimeout(() => alert.remove(), 5500);
  };

  const pushSnapshot = async (snapshot) => {
    const encoded = JSON.stringify(snapshot);
    if (new Blob([encoded]).size > MAX_PAYLOAD_BYTES) throw new Error("Your journal is too large for automatic sync. Export a backup and remove a few large images.");
    const { data, error } = await client
      .from(config.table)
      .upsert({ user_id: session.user.id, payload: snapshot }, { onConflict: "user_id" })
      .select("updated_at")
      .single();
    if (error) throw error;
    const now = data?.updated_at || new Date().toISOString();
    writeMeta({ ...readMeta(), userId: session.user.id, lastSyncedAt: now, localUpdatedAt: now });
    updateAccountCard("synced", `Last synced ${new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`);
  };

  const syncNow = async ({ quiet = false } = {}) => {
    if (!client || !session?.user) return;
    if (!navigator.onLine) {
      updateAccountCard("offline", "You are offline. Changes will sync when your connection returns.");
      return;
    }
    if (syncInFlight) {
      syncQueued = true;
      return;
    }
    syncInFlight = true;
    updateAccountCard("syncing", "Comparing this device with your cloud copy…");
    try {
      const deviceMeta = readMeta();
      const accountChanged = Boolean(deviceMeta.userId && deviceMeta.userId !== session.user.id);
      const firstSyncOnDevice = deviceMeta.userId !== session.user.id;
      if (accountChanged) clearSyncableLocal();
      const local = snapshotLocal();
      const { data, error } = await client
        .from(config.table)
        .select("payload, updated_at")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        await pushSnapshot(local);
        if (!quiet) showCloudAlert("Your journal is now connected to cloud sync.");
        if (accountChanged) notifyDataChanged(Object.keys(local.values));
        return;
      }

      const remote = normalizeSnapshot(data.payload);
      const merged = firstSyncOnDevice ? mergeFirstDeviceSnapshot(local, remote) : mergeSnapshots(local, remote);
      const remoteChanges = !snapshotsEqual(local, merged);
      const cloudNeedsMerge = !snapshotsEqual(remote, merged);

      if (remoteChanges) applySnapshot(merged);
      if (cloudNeedsMerge) await pushSnapshot(merged);
      else {
        const now = data.updated_at || new Date().toISOString();
        writeMeta({ ...readMeta(), userId: session.user.id, lastSyncedAt: now, localUpdatedAt: now });
        updateAccountCard("synced", `Last synced ${new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`);
      }

      if (remoteChanges) {
        showCloudAlert("Newer changes were received from another device. Your dashboard was updated quietly.");
        notifyDataChanged(changedSnapshotKeys(local, merged));
      } else if (!quiet) {
        showCloudAlert("Everything is up to date.");
      }
    } catch (error) {
      const missingTable = error?.code === "42P01" || error?.code === "PGRST205" || /journal_sync|schema cache/i.test(error?.message || "");
      updateAccountCard("error", missingTable ? "Cloud table setup is still required in Supabase." : (error?.message || "Sync could not finish."));
      if (!quiet) showCloudAlert(missingTable ? "Cloud sync is waiting for its secure database table." : "Sync paused. Your changes remain safe on this device.");
    } finally {
      syncInFlight = false;
      if (syncQueued) {
        syncQueued = false;
        window.setTimeout(() => syncNow({ quiet: true }), 0);
      }
    }
  };

  function scheduleSync() {
    if (!session?.user) return;
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => syncNow({ quiet: true }), 1600);
    updateAccountCard(navigator.onLine ? "syncing" : "offline", navigator.onLine ? "Saving your latest change…" : "Saved locally; waiting for internet.");
  }

  const createAccountCard = () => {
    const host = document.querySelector(".backup-tools");
    if (!host) return;
    accountCard = document.createElement("div");
    accountCard.id = "mllAccountCard";
    accountCard.className = "mll-account-card";
    accountCard.innerHTML = `
      <div class="mll-account-heading">
        <div class="mll-account-copy"><strong data-mll-account-email>Not signed in</strong><small>Private phone–laptop sync</small></div>
        <span class="mll-sync-badge" data-mll-sync-badge>Local</span>
      </div>
      <p class="mll-sync-note" data-mll-sync-note>Your entries are currently stored on this device.</p>
      <div class="mll-account-actions">
        <button type="button" data-mll-sync-now>Sync now</button>
        <button type="button" data-mll-password hidden>Change password</button>
        <button type="button" data-mll-signout>Sign out</button>
      </div>`;
    host.append(accountCard);
    accountCard.querySelector("[data-mll-sync-now]").addEventListener("click", () => syncNow());
    accountCard.querySelector("[data-mll-password]").addEventListener("click", () => {
      const gate = document.querySelector("#mllAuthGate");
      if (!gate) return;
      document.body.classList.add("mll-auth-locked");
      gate.hidden = false;
      gate.showRecovery?.();
    });
    accountCard.querySelector("[data-mll-signout]").addEventListener("click", async () => {
      await client?.auth.signOut();
    });
  };

  const createAuthGate = () => {
    const gate = document.createElement("div");
    gate.id = "mllAuthGate";
    gate.className = "mll-auth-gate";
    gate.hidden = true;
    gate.innerHTML = `
      <section class="mll-auth-card" role="dialog" aria-modal="true" aria-labelledby="mllAuthTitle">
        <span class="mll-auth-mark">✳</span>
        <p class="eyebrow">my little life</p>
        <h1 id="mllAuthTitle">Your private space, everywhere.</h1>
        <p class="mll-auth-copy" data-mll-auth-copy>Use your private username and password on your phone or laptop.</p>
        <form class="mll-auth-form">
          <label class="mll-auth-field" data-mll-username-field>Username<input type="text" name="username" autocomplete="username" required value="${LOGIN_USERNAME}" placeholder="Your username"></label>
          <label class="mll-auth-field">Password<input type="password" name="password" autocomplete="current-password" minlength="6" required placeholder="At least 6 characters"></label>
          <button class="mll-auth-submit" type="submit">Sign in securely</button>
          <button class="mll-auth-secondary" type="button" data-mll-reset>Forgot password?</button>
          <p class="mll-auth-message" aria-live="polite"></p>
        </form>
        <p class="mll-auth-trust"><span>♡</span>Your cloud data is protected by your account and database row-level security. Local entries still work offline.</p>
      </section>`;
    document.body.append(gate);

    const form = gate.querySelector("form");
    const message = gate.querySelector(".mll-auth-message");
    const submit = gate.querySelector(".mll-auth-submit");
    const password = form.elements.password;
    const title = gate.querySelector("#mllAuthTitle");
    const copy = gate.querySelector("[data-mll-auth-copy]");
    const usernameField = gate.querySelector("[data-mll-username-field]");
    const reset = gate.querySelector("[data-mll-reset]");

    const setMode = (mode) => {
      authMode = mode;
      const recovering = mode === "recovery";
      usernameField.hidden = recovering;
      reset.hidden = recovering;
      title.textContent = recovering ? "Choose a new password." : "Your private space, everywhere.";
      copy.textContent = recovering
        ? "Make it memorable and private. Once saved, use it to sign in on your phone and laptop."
        : "Use your private username and password on your phone or laptop.";
      submit.textContent = recovering ? "Save new password" : "Sign in securely";
      password.autocomplete = recovering ? "new-password" : "current-password";
      password.value = "";
      message.textContent = "";
      message.className = "mll-auth-message";
    };
    gate.showRecovery = () => setMode("recovery");
    gate.showSignIn = () => setMode("signin");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!client) return;
      submit.disabled = true;
      message.textContent = authMode === "recovery" ? "Saving your new password…" : "Signing you in…";
      message.className = "mll-auth-message";
      try {
        if (authMode === "recovery") {
          const result = await client.auth.updateUser({ password: password.value });
          if (result.error) throw result.error;
          message.textContent = "Password updated. Opening your journal…";
          await setSignedIn(session);
        } else {
          const authData = await callUsernameAuth({
            action: "login",
            username: form.elements.username.value.trim(),
            password: password.value
          });
          const result = await client.auth.setSession({
            access_token: authData.access_token,
            refresh_token: authData.refresh_token
          });
          if (result.error) throw result.error;
          message.textContent = "Welcome back. Loading your journal…";
        }
      } catch (error) {
        message.textContent = error?.message || "That did not work. Check your details and try again.";
        message.className = "mll-auth-message error";
      } finally {
        submit.disabled = false;
      }
    });

    gate.querySelector("[data-mll-reset]").addEventListener("click", async () => {
      const username = form.elements.username.value.trim();
      if (!username) {
        message.textContent = "Enter your username first, then choose Forgot password.";
        message.className = "mll-auth-message error";
        return;
      }
      reset.disabled = true;
      try {
        const result = await callUsernameAuth({ action: "recover", username });
        message.textContent = result.message || "If the username is correct, a reset link has been sent.";
        message.className = "mll-auth-message";
      } catch (error) {
        message.textContent = error?.message || "Password recovery is temporarily unavailable.";
        message.className = "mll-auth-message error";
      } finally {
        reset.disabled = false;
      }
    });

    return gate;
  };

  const setSignedIn = async (nextSession) => {
    session = nextSession;
    const gate = document.querySelector("#mllAuthGate");
    const email = accountCard?.querySelector("[data-mll-account-email]");
    const signOut = accountCard?.querySelector("[data-mll-signout]");
    const syncButton = accountCard?.querySelector("[data-mll-sync-now]");
    const passwordButton = accountCard?.querySelector("[data-mll-password]");

    if (session?.user) {
      nativeSetItem.call(localStorage, AUTHENTICATED_KEY, "true");
      document.body.classList.remove("mll-auth-locked");
      if (gate) gate.hidden = true;
      if (email) email.textContent = LOGIN_USERNAME;
      if (signOut) signOut.hidden = false;
      if (syncButton) syncButton.hidden = false;
      if (passwordButton) passwordButton.hidden = false;
      window.clearInterval(pollTimer);
      pollTimer = window.setInterval(() => syncNow({ quiet: true }), POLL_MS);
      await syncNow({ quiet: true });
    } else {
      window.clearInterval(pollTimer);
      gate?.showSignIn?.();
      if (email) email.textContent = "Not signed in";
      if (signOut) signOut.hidden = true;
      if (syncButton) syncButton.hidden = true;
      if (passwordButton) passwordButton.hidden = true;
      updateAccountCard(navigator.onLine ? "local" : "offline", navigator.onLine ? "Sign in to synchronize your phone and laptop." : "Offline. Your entries remain on this device.");
      document.body.classList.add("mll-auth-locked");
      if (gate) gate.hidden = false;
    }
    window.dispatchEvent(new CustomEvent("mll:auth", {
      detail: {
        authenticated: Boolean(session?.user),
        userId: session?.user?.id || null,
        email: session?.user?.email || null
      }
    }));
  };

  const start = async () => {
    createAccountCard();
    if (LOCAL_TEST_MODE) {
      document.body.classList.remove("mll-auth-locked");
      updateAccountCard("local", "Local test mode. Cloud login is not used.");
      return;
    }
    createAuthGate();

    if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) {
      const returning = localStorage.getItem(AUTHENTICATED_KEY) === "true";
      updateAccountCard("offline", "Cloud login is unavailable. Your local journal is still safe.");
      if (returning) {
        document.body.classList.remove("mll-auth-locked");
        document.querySelector("#mllAuthGate").hidden = true;
      } else {
        document.body.classList.add("mll-auth-locked");
        document.querySelector("#mllAuthGate").hidden = false;
        document.querySelector(".mll-auth-message").textContent = "Connect to the internet to sign in for the first time.";
      }
      return;
    }

    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    client.auth.onAuthStateChange((event, nextSession) => {
      if (event === "INITIAL_SESSION") return;
      if (event === "PASSWORD_RECOVERY") {
        session = nextSession;
        document.body.classList.add("mll-auth-locked");
        const gate = document.querySelector("#mllAuthGate");
        if (gate) {
          gate.hidden = false;
          gate.showRecovery?.();
        }
        return;
      }
      window.setTimeout(() => setSignedIn(nextSession), 0);
    });
    const { data } = await client.auth.getSession();
    await setSignedIn(data.session);
  };

  window.addEventListener("online", () => {
    updateAccountCard("syncing", "Back online. Catching up…");
    syncNow({ quiet: true });
  });
  window.addEventListener("offline", () => updateAccountCard("offline", "Offline. Changes are still saved on this device."));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncNow({ quiet: true });
  });
  window.addEventListener("load", start);
  window.mllCloudSync = {
    syncNow: () => syncNow(),
    snapshotLocal,
    getClient: () => client,
    getSession: () => session
  };
})();
