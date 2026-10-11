import { getSupabase } from "./client.js";
import {
  SIGHTING_COLUMNS,
  bannerMessage,
  confidenceLabel,
  escapeHtml,
  formatCoord,
  formatWhen,
  friendlyError,
  kindLabel,
  osmLink,
  photoObjectPath,
  safePhotoUrl,
  validEmail
} from "./logic.js";

let client = null;
let queue = { pending: [], approved: [] };
let mode = "pending";
let supabaseUrl = "";
let currentEmail = "";
let flash = "";

boot();

async function boot() {
  const connection = getSupabase({ detectSessionInUrl: true });
  client = connection.client;
  const banner = document.getElementById("banner");
  if (connection.problem) {
    banner.hidden = false;
    banner.textContent = bannerMessage(connection.problem);
    document.getElementById("signed-out").hidden = true;
    return;
  }
  supabaseUrl = String(connection.config.SUPABASE_URL || "").trim();
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  if (hash.get("error")) {
    showSignNote("That sign-in link did not work. Request a new one.");
  }
  const { data } = await client.auth.getSession();
  renderSession(data.session);
  client.auth.onAuthStateChange((_event, session) => renderSession(session));
  document.getElementById("sign-in").addEventListener("submit", sendLink);
  document.getElementById("sign-out").addEventListener("click", async () => {
    await client.auth.signOut();
    renderSession(null);
  });
  document.getElementById("tab-pending").addEventListener("click", () => setMode("pending"));
  document.getElementById("tab-approved").addEventListener("click", () => setMode("approved"));
  document.getElementById("queue-list").addEventListener("click", onQueueClick);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

async function sendLink(event) {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const errorEl = document.getElementById("sign-error");
  if (!validEmail(email)) {
    errorEl.hidden = false;
    errorEl.textContent = "Enter the email address you can open on this phone.";
    return;
  }
  errorEl.hidden = true;
  const button = document.getElementById("sign-button");
  button.disabled = true;
  button.textContent = "Sending the link…";
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}${location.pathname}` }
  });
  button.disabled = false;
  button.textContent = "Email me a sign-in link";
  if (error) {
    errorEl.hidden = false;
    errorEl.textContent = friendlyError(error);
    return;
  }
  showSignNote("Check your email and tap the link. It opens this page. Look in spam if you don't see it.");
}

function showSignNote(message) {
  const note = document.getElementById("sign-note");
  note.hidden = false;
  note.textContent = message;
}

function renderSession(session) {
  const signedOut = document.getElementById("signed-out");
  const signedIn = document.getElementById("signed-in");
  if (!session) {
    currentEmail = "";
    signedOut.hidden = false;
    signedIn.hidden = true;
    document.getElementById("queue").hidden = true;
    return;
  }
  signedOut.hidden = true;
  signedIn.hidden = false;
  document.getElementById("who").textContent = session.user.email || "Signed in";
  const email = String(session.user.email || "").toLowerCase();
  if (currentEmail === email) return;
  currentEmail = email;
  loadQueue(session);
}

async function loadQueue(session) {
  const note = document.getElementById("admin-note");
  const queueEl = document.getElementById("queue");
  const email = String(session.user.email || "").toLowerCase();
  const admin = await client.from("admins").select("email").eq("email", email).maybeSingle();
  if (admin.error) {
    note.hidden = false;
    note.textContent = "Couldn't check the admin list. Check your connection and refresh.";
    queueEl.hidden = true;
    return;
  }
  if (!admin.data) {
    note.hidden = false;
    note.textContent = "This email is not on the admin list. Add it in the Supabase SQL editor, then sign in again.";
    queueEl.hidden = true;
    return;
  }
  note.hidden = true;
  queueEl.hidden = false;
  document.getElementById("queue-status").textContent = "Loading reports…";
  const [pending, approved] = await Promise.all([
    client.from("sightings").select(SIGHTING_COLUMNS).eq("status", "pending").order("created_at", { ascending: false }).limit(100),
    client.from("sightings").select(SIGHTING_COLUMNS).eq("status", "approved").order("seen_at", { ascending: false }).limit(50)
  ]);
  if (pending.error || approved.error) {
    document.getElementById("queue-status").textContent = "Couldn't load reports. Refresh the page and try again.";
    return;
  }
  queue = { pending: pending.data || [], approved: approved.data || [] };
  document.getElementById("queue-status").textContent = flash;
  flash = "";
  renderQueue();
}

function setMode(next) {
  mode = next;
  document.getElementById("tab-pending").classList.toggle("primary", next === "pending");
  document.getElementById("tab-approved").classList.toggle("primary", next === "approved");
  renderQueue();
}

function renderQueue() {
  const rows = queue[mode] || [];
  const list = document.getElementById("queue-list");
  if (!rows.length) {
    list.innerHTML = `<p class="empty">${mode === "pending" ? "No reports waiting." : "Nothing on the map yet."}</p>`;
    return;
  }
  list.innerHTML = rows.map(row => {
    const photo = safePhotoUrl(row.photo_url, supabaseUrl);
    const image = photo ? `<img src="${escapeHtml(photo)}" alt="Photo from this report">` : "";
    const approve = mode === "pending"
      ? `<button type="button" class="btn primary" data-approve="${escapeHtml(row.id)}">Approve</button>`
      : "";
    return `<article class="report-card">
      ${image}
      <span class="kicker">${escapeHtml(kindLabel(row.kind))}</span>
      <span class="when">${escapeHtml(formatWhen(row.seen_at))}</span>
      <span class="coords">${escapeHtml(formatCoord(row.lat, row.lng))}</span>
      <span class="desc">${escapeHtml(row.description)}</span>
      <span class="meta">${escapeHtml(confidenceLabel(row.confidence))} (${Number(row.confidence)} of 5) · ${escapeHtml(row.display_name || "Anonymous")}</span>
      <p class="meta"><a href="${escapeHtml(osmLink(row.lat, row.lng))}" target="_blank" rel="noopener">Open location</a></p>
      <div class="actions">
        ${approve}
        <button type="button" class="btn danger" data-delete="${escapeHtml(row.id)}">Delete</button>
      </div>
    </article>`;
  }).join("");
}

async function onQueueClick(event) {
  const approve = event.target.closest("[data-approve]");
  const remove = event.target.closest("[data-delete]");
  if (approve) await approveReport(approve.getAttribute("data-approve"));
  if (remove) await deleteReport(remove.getAttribute("data-delete"));
}

async function approveReport(id) {
  const { error } = await client.from("sightings").update({ status: "approved" }).eq("id", id);
  const status = document.getElementById("queue-status");
  if (error) {
    status.textContent = friendlyError(error);
    return;
  }
  flash = "Approved. It is on the map.";
  const { data } = await client.auth.getSession();
  if (data.session) loadQueue(data.session);
}

async function deleteReport(id) {
  if (!confirm("Delete this report? This cannot be undone.")) return;
  const row = [...queue.pending, ...queue.approved].find(item => String(item.id) === String(id));
  const { error } = await client.from("sightings").delete().eq("id", id);
  const status = document.getElementById("queue-status");
  if (error) {
    status.textContent = friendlyError(error);
    return;
  }
  const path = photoObjectPath(row?.photo_url);
  if (path) await client.storage.from("sighting-photos").remove([path]);
  flash = "Deleted.";
  const { data } = await client.auth.getSession();
  if (data.session) loadQueue(data.session);
}
