import { getSupabase } from "./client.js";
import {
  ALASKA_BOUNDS,
  CONFIDENCE,
  DISPLAY_NAME_KEY,
  KINDS,
  SIGHTING_COLUMNS,
  bannerMessage,
  checkRateLimit,
  compressImageFile,
  confidenceLabel,
  connectionProblem,
  escapeHtml,
  excerpt,
  filterSightings,
  formatCoord,
  formatWhen,
  friendlyError,
  geolocationMessage,
  kindLabel,
  nowLocalInput,
  rateLimitMessage,
  readDisplayName,
  readTimestamps,
  rememberSubmission,
  safePhotoUrl,
  submitBlockMessage,
  validateSighting,
  writeDisplayName,
  writeTimestamps
} from "./logic.js";

const state = {
  sightings: [],
  draft: null,
  photo: null,
  previewUrl: "",
  busy: false,
  loadError: ""
};

let map = null;
let pins = null;
let draftMarker = null;
let supabaseUrl = "";
const markerById = new Map();

boot();

function boot() {
  const { client, problem, config } = getSupabase();
  supabaseUrl = problem ? "" : String(config.SUPABASE_URL || "").trim();
  const banner = document.getElementById("banner");
  if (problem) {
    banner.hidden = false;
    banner.textContent = bannerMessage(problem);
  }
  setupMap();
  setupReport();
  setupList();
  setupNav();
  if (client) loadSightings(client);
  else renderList();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function setupMap() {
  const el = document.getElementById("map");
  if (!window.L) {
    el.innerHTML = '<p class="map-fallback">The map could not load. Check your connection and refresh.</p>';
    return;
  }
  map = L.map(el, { zoomControl: false, minZoom: 2, worldCopyJump: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  L.control.zoom({ position: "topright" }).addTo(map);
  pins = L.layerGroup().addTo(map);
  requestAnimationFrame(() => {
    map.invalidateSize();
    map.fitBounds(ALASKA_BOUNDS, { padding: [16, 16] });
  });
  map.on("click", event => {
    if (document.body.dataset.view !== "report") return;
    setDraft(event.latlng.lat, event.latlng.lng, false);
  });
}

function setupNav() {
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  document.getElementById("thanks-map").addEventListener("click", () => showView("map"));
}

function showView(view) {
  document.body.dataset.view = view;
  document.querySelectorAll(".tab").forEach(button => {
    const on = button.dataset.view === view;
    button.classList.toggle("on", on);
    if (on) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.getElementById("map-hint").hidden = view !== "report";
  if (view !== "list" && map) {
    requestAnimationFrame(() => map.invalidateSize());
  }
}

function setupReport() {
  const kindBox = document.getElementById("kind-chips");
  kindBox.innerHTML = KINDS.map(kind => chip("kind", kind.id, kind.label, kind.label)).join("");
  const scoreBox = document.getElementById("confidence-chips");
  scoreBox.innerHTML = CONFIDENCE.map(item => chip(
    "confidence",
    item.value,
    String(item.value),
    `${item.value}, ${item.label}`
  )).join("");
  scoreBox.addEventListener("change", () => {
    const selected = document.querySelector('input[name="confidence"]:checked');
    const label = confidenceLabel(selected?.value);
    document.getElementById("confidence-word").textContent = label
      ? `${selected.value} — ${label}`
      : "Choose 1 (a guess) through 5 (very sure).";
  });

  const seen = document.getElementById("seen-at");
  seen.value = nowLocalInput();
  const name = document.getElementById("display-name");
  name.value = readDisplayName(localStorage, DISPLAY_NAME_KEY);

  document.getElementById("use-location").addEventListener("click", useMyLocation);
  document.getElementById("photo").addEventListener("change", onPhotoChosen);
  document.getElementById("photo-clear").addEventListener("click", () => {
    releasePhoto();
    document.getElementById("photo").value = "";
    document.getElementById("photo-hint").textContent = "";
  });
  document.getElementById("report-form").addEventListener("submit", onSubmit);
  document.getElementById("thanks-another").addEventListener("click", resetReport);
}

function chip(name, value, label, aria) {
  return `<label class="chip"><input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(value)}" aria-label="${escapeHtml(aria)}"><span>${escapeHtml(label)}</span></label>`;
}

function setupList() {
  const select = document.getElementById("kind-filter");
  select.innerHTML = `<option value="">All types</option>${KINDS.map(kind => `<option value="${kind.id}">${escapeHtml(kind.label)}</option>`).join("")}`;
  const render = () => renderList();
  select.addEventListener("change", render);
  document.getElementById("from-filter").addEventListener("change", render);
  document.getElementById("to-filter").addEventListener("change", render);
  document.getElementById("clear-filters").addEventListener("click", () => {
    select.value = "";
    document.getElementById("from-filter").value = "";
    document.getElementById("to-filter").value = "";
    renderList();
  });
  document.getElementById("refresh").addEventListener("click", () => {
    const { client } = getSupabase();
    if (client) loadSightings(client);
  });
  document.getElementById("list").addEventListener("click", event => {
    const button = event.target.closest("[data-id]");
    if (button) focusSighting(button.getAttribute("data-id"));
  });
}

async function loadSightings(client) {
  const { data, error } = await client
    .from("sightings")
    .select(SIGHTING_COLUMNS)
    .eq("status", "approved")
    .order("seen_at", { ascending: false })
    .limit(500);
  if (error) {
    state.loadError = "Couldn't load sightings. Check your connection.";
  } else {
    state.sightings = data || [];
    state.loadError = "";
    drawPins();
  }
  renderList();
}

function drawPins() {
  if (!pins) return;
  pins.clearLayers();
  markerById.clear();
  for (const row of state.sightings) {
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const marker = L.marker([lat, lng], { icon: sightingIcon() });
    marker.bindPopup(popupHtml(row), { className: "bf-popup", maxWidth: 280, minWidth: 200 });
    marker.addTo(pins);
    if (row.id) markerById.set(String(row.id), marker);
  }
}

function sightingIcon() {
  return L.divIcon({
    className: "pin-wrap",
    html: '<div class="pin"><img alt="" src="footprint.svg"></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
}

function popupHtml(row) {
  const photo = safePhotoUrl(row.photo_url, supabaseUrl);
  const image = photo ? `<img class="pop-photo" src="${escapeHtml(photo)}" alt="Photo from this report">` : "";
  const name = row.display_name ? escapeHtml(row.display_name) : "Anonymous";
  const score = `${escapeHtml(confidenceLabel(row.confidence))} (${Number(row.confidence)} of 5)`;
  return `${image}
    <p class="pop-kicker">${escapeHtml(kindLabel(row.kind))}</p>
    <p class="pop-when">${escapeHtml(formatWhen(row.seen_at))}</p>
    <p class="pop-desc">${escapeHtml(row.description)}</p>
    <p class="pop-meta">${score}<br>${name}</p>`;
}

function renderList() {
  const list = document.getElementById("list");
  const count = document.getElementById("list-count");
  if (state.loadError) {
    count.textContent = "";
    list.innerHTML = `<p class="empty">${escapeHtml(state.loadError)}</p>`;
    return;
  }
  if (connectionProblem(window.BIGFOOT_CONFIG || {})) {
    count.textContent = "";
    list.innerHTML = '<p class="empty">Sightings will show here after the map is connected.</p>';
    return;
  }
  const rows = filterSightings(state.sightings, {
    kind: document.getElementById("kind-filter").value,
    from: document.getElementById("from-filter").value,
    to: document.getElementById("to-filter").value
  });
  count.textContent = rows.length === 1 ? "1 report" : `${rows.length} reports`;
  if (!rows.length) {
    list.innerHTML = '<p class="empty">No reports match. If you saw, heard, or found something, you can send a report.</p>';
    return;
  }
  list.innerHTML = rows.map(row => {
    const photo = safePhotoUrl(row.photo_url, supabaseUrl);
    const image = photo ? `<img src="${escapeHtml(photo)}" alt="" loading="lazy">` : "";
    return `<button type="button" class="card-btn" data-id="${escapeHtml(row.id)}">
      ${image}
      <span class="kicker">${escapeHtml(kindLabel(row.kind))}</span>
      <span class="when">${escapeHtml(formatWhen(row.seen_at))}</span>
      <span class="desc">${escapeHtml(excerpt(row.description))}</span>
      <span class="meta">${escapeHtml(confidenceLabel(row.confidence))} · ${escapeHtml(row.display_name || "Anonymous")}</span>
    </button>`;
  }).join("");
}

function focusSighting(id) {
  showView("map");
  const marker = markerById.get(String(id));
  if (!marker || !map) return;
  requestAnimationFrame(() => {
    map.invalidateSize();
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 8));
    marker.openPopup();
  });
}

function setDraft(lat, lng, recenter) {
  if (!map) return;
  state.draft = { lat, lng };
  const icon = L.divIcon({
    className: "pin-wrap",
    html: '<div class="draft-pin"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
  if (!draftMarker) {
    draftMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000, interactive: false }).addTo(map);
  } else {
    draftMarker.setLatLng([lat, lng]);
  }
  document.getElementById("location-status").textContent = `Pin placed at ${formatCoord(lat, lng)}.`;
  clearField("location");
  if (recenter) map.setView([lat, lng], Math.max(map.getZoom(), 11));
}

function useMyLocation() {
  const status = document.getElementById("location-status");
  if (!navigator.geolocation) {
    status.textContent = "This phone can't share location. You can tap the map instead.";
    return;
  }
  status.textContent = "Looking for you…";
  navigator.geolocation.getCurrentPosition(
    position => setDraft(position.coords.latitude, position.coords.longitude, true),
    error => { status.textContent = geolocationMessage(error?.code); },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

async function onPhotoChosen(event) {
  const file = event.target.files?.[0];
  releasePhoto();
  const hint = document.getElementById("photo-hint");
  if (!file) {
    hint.textContent = "";
    return;
  }
  hint.textContent = "Preparing photo…";
  try {
    state.photo = await compressImageFile(file);
    state.previewUrl = URL.createObjectURL(state.photo.blob);
    const preview = document.getElementById("photo-preview");
    preview.src = state.previewUrl;
    preview.hidden = false;
    document.getElementById("photo-clear").hidden = false;
    hint.textContent = "Photo ready.";
  } catch (error) {
    state.photo = null;
    event.target.value = "";
    hint.textContent = error.message || "Could not use that photo.";
  }
}

function releasePhoto() {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.photo = null;
  state.previewUrl = "";
  const preview = document.getElementById("photo-preview");
  preview.hidden = true;
  preview.removeAttribute("src");
  document.getElementById("photo-clear").hidden = true;
}

function readInput() {
  return {
    lat: state.draft?.lat,
    lng: state.draft?.lng,
    seen_at: document.getElementById("seen-at").value,
    kind: document.querySelector('input[name="kind"]:checked')?.value || "",
    description: document.getElementById("description").value,
    confidence: document.querySelector('input[name="confidence"]:checked')?.value || "",
    display_name: document.getElementById("display-name").value,
    honeypot: document.getElementById("bf-hp").value
  };
}

async function onSubmit(event) {
  event.preventDefault();
  if (state.busy) return;
  const validated = validateSighting(readInput());
  showFieldErrors(validated.errors);
  if (!validated.ok) {
    document.querySelector(".error:not([hidden]), .form-error:not([hidden])")?.scrollIntoView({ block: "nearest" });
    return;
  }
  const times = readTimestamps(localStorage);
  const limit = checkRateLimit(times);
  if (!limit.ok) {
    showFieldErrors({ form: rateLimitMessage(limit.reason) });
    return;
  }
  const { client, problem } = getSupabase();
  if (!client) {
    showFieldErrors({ form: submitBlockMessage(problem || "missing") });
    return;
  }

  state.busy = true;
  const button = document.getElementById("submit-report");
  button.disabled = true;
  button.textContent = "Sending…";
  try {
    const id = crypto.randomUUID();
    let photoUrl = null;
    if (state.photo) {
      const path = `${id}.jpg`;
      const upload = await client.storage.from("sighting-photos").upload(path, state.photo.blob, {
        contentType: "image/jpeg",
        upsert: false
      });
      if (upload.error) throw upload.error;
      photoUrl = client.storage.from("sighting-photos").getPublicUrl(path).data.publicUrl;
    }
    const inserted = await client.from("sightings").insert({
      id,
      ...validated.value,
      photo_url: photoUrl
    });
    if (inserted.error) throw inserted.error;
    writeTimestamps(localStorage, rememberSubmission(times));
    writeDisplayName(localStorage, validated.value.display_name || "");
    document.getElementById("report-form").hidden = true;
    document.getElementById("thanks").hidden = false;
  } catch (error) {
    showFieldErrors({ form: friendlyError(error) });
  } finally {
    state.busy = false;
    button.disabled = false;
    button.textContent = "Send report";
  }
}

function resetReport() {
  document.getElementById("report-form").hidden = false;
  document.getElementById("thanks").hidden = true;
  document.getElementById("description").value = "";
  document.getElementById("seen-at").value = nowLocalInput();
  document.getElementById("bf-hp").value = "";
  document.getElementById("photo").value = "";
  document.getElementById("photo-hint").textContent = "";
  document.getElementById("confidence-word").textContent = "Choose 1 (a guess) through 5 (very sure).";
  document.querySelectorAll('input[name="kind"], input[name="confidence"]').forEach(input => {
    input.checked = false;
  });
  releasePhoto();
  state.draft = null;
  if (draftMarker && map) {
    map.removeLayer(draftMarker);
    draftMarker = null;
  }
  document.getElementById("location-status").textContent = "No pin yet. Tap the map or use your location.";
  showFieldErrors({});
}

function showFieldErrors(errors) {
  document.querySelectorAll("[data-error-for]").forEach(el => {
    const message = errors[el.getAttribute("data-error-for")] || "";
    el.textContent = message;
    el.hidden = !message;
  });
  const formError = document.getElementById("form-error");
  formError.textContent = errors.form || "";
  formError.hidden = !errors.form;
}

function clearField(name) {
  const el = document.querySelector(`[data-error-for="${name}"]`);
  if (!el) return;
  el.textContent = "";
  el.hidden = true;
}
