// Pure helpers for the Bigfoot map. No browser globals required except atob
// (used only when a key is actually inspected). Safe to import from Node tests.

export const KINDS = [
  { id: "saw", label: "Saw it" },
  { id: "heard", label: "Heard it" },
  { id: "tracks", label: "Tracks" },
  { id: "smell", label: "Smell" },
  { id: "other", label: "Other" }
];

export const CONFIDENCE = [
  { value: 1, label: "Guess" },
  { value: 2, label: "Unsure" },
  { value: 3, label: "Possible" },
  { value: 4, label: "Fairly sure" },
  { value: 5, label: "Very sure" }
];

export const PHOTO_MAX_PX = 1600;
export const PHOTO_JPEG_QUALITY = 0.82;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

// Opening view only. The map does not set a maxBounds, so people can pan anywhere.
export const ALASKA_BOUNDS = [[51.15, -170.0], [71.5, -129.5]];
export const MAP_MAX_BOUNDS = null;

export const RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  max: 3,
  minGapMs: 30 * 1000
};

export const REPORT_TIMES_KEY = "bigfoot-report-times";
export const DISPLAY_NAME_KEY = "bigfoot-display-name";

export const SIGHTING_COLUMNS = "id, created_at, lat, lng, seen_at, kind, description, confidence, photo_url, display_name, status";

const KIND_IDS = new Set(KINDS.map(kind => kind.id));

export function kindLabel(id) {
  return KINDS.find(kind => kind.id === id)?.label || "Report";
}

export function confidenceLabel(value) {
  return CONFIDENCE.find(item => item.value === Number(value))?.label || "";
}

export function isPlaceholder(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  return /your[-_ ]?(project|anon|key|url)|paste[-_ ]?here|placeholder/i.test(text);
}

export function jwtRole(key) {
  try {
    const part = String(key || "").split(".")[1];
    if (!part) return null;
    const json = JSON.parse(decodeBase64Url(part));
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(segment) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

// anon / publishable keys are public. service_role and sb_secret_ must never be used here.
export function classifyKey(key) {
  const value = String(key || "").trim();
  if (!value || isPlaceholder(value)) return "empty";
  if (/^eyJ/.test(value)) {
    return jwtRole(value) === "service_role" ? "secret" : "anon";
  }
  if (/^sb_secret_/i.test(value) || /service[_-]?role/i.test(value)) return "secret";
  if (/^sb_publishable_/i.test(value)) return "publishable";
  return "unknown";
}

export function isConfigured(config) {
  const url = String(config?.SUPABASE_URL || "").trim();
  const key = String(config?.SUPABASE_ANON_KEY || "").trim();
  if (isPlaceholder(url) || isPlaceholder(key)) return false;
  const kind = classifyKey(key);
  if (kind === "secret" || kind === "empty") return false;
  if (kind === "unknown" && key.length < 20) return false;
  if (key.length < 20) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export function connectionProblem(config) {
  const key = String(config?.SUPABASE_ANON_KEY || "").trim();
  if (classifyKey(key) === "secret") return "service";
  if (!isConfigured(config)) return "missing";
  return null;
}

export function bannerMessage(problem) {
  if (problem === "service") {
    return "A secret key was pasted into the settings and was ignored. Use the public anon or publishable key. Reports can't be sent until that's fixed.";
  }
  if (problem === "library") {
    return "The connection library did not finish loading. Check your connection and refresh this page.";
  }
  return "Not connected yet. You can still look at the map. Reports can't be sent until the setup is finished.";
}

export function submitBlockMessage(problem) {
  if (problem === "service") {
    return "This report was not sent. A secret key was pasted by mistake. Use the public anon or publishable key.";
  }
  if (problem === "library") {
    return "This report was not sent because the connection library did not load. Refresh and try again.";
  }
  return "This map is not connected yet, so this report was not sent.";
}

export function rateLimitMessage(reason) {
  if (reason === "gap") return "Please wait a moment before sending another report.";
  return "You've sent a few reports in the last hour. Please wait before another one.";
}

export function geolocationMessage(code) {
  if (code === 1) return "Location is blocked on this phone. You can tap the map instead.";
  return "We couldn't find you. You can tap the map instead.";
}

export function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export function validateSighting(input, now = Date.now()) {
  if (String(input?.honeypot || "").trim()) {
    return { ok: false, spam: true, errors: { form: "Please reload the page and try again." }, value: null };
  }

  const errors = {};
  const lat = Number(input?.lat);
  const lng = Number(input?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    errors.location = "Tap the map or use your location so we know where this was.";
  }

  const seenRaw = String(input?.seen_at || "").trim();
  const seenMs = Date.parse(seenRaw);
  if (!seenRaw || Number.isNaN(seenMs)) {
    errors.seen_at = "Add the date and time.";
  } else if (seenMs > now + 5 * 60 * 1000) {
    errors.seen_at = "That time is in the future.";
  }

  const kind = String(input?.kind || "");
  if (!KIND_IDS.has(kind)) errors.kind = "Choose what you noticed.";

  const description = String(input?.description || "").trim();
  if (description.length < 8) errors.description = "Tell a little more — a sentence is enough.";
  else if (description.length > 2000) errors.description = "Please keep this under 2,000 characters.";

  const confidence = Number(input?.confidence);
  if (!Number.isInteger(confidence) || confidence < 1 || confidence > 5) {
    errors.confidence = "Choose how sure you are, from 1 to 5.";
  }

  const displayName = String(input?.display_name || "").trim();
  if (displayName.length > 80) errors.display_name = "That name is too long.";

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    spam: false,
    errors,
    value: ok ? {
      lat,
      lng,
      seen_at: new Date(seenMs).toISOString(),
      kind,
      description,
      confidence,
      display_name: displayName || null,
      status: "pending",
      honeypot: ""
    } : null
  };
}

export function checkRateLimit(timestamps, now = Date.now(), limits = RATE_LIMIT) {
  const recent = (Array.isArray(timestamps) ? timestamps : [])
    .filter(stamp => typeof stamp === "number" && Number.isFinite(stamp) && now - stamp >= 0 && now - stamp < limits.windowMs)
    .sort((a, b) => a - b);
  const last = recent.length ? recent[recent.length - 1] : null;
  if (last != null && now - last < limits.minGapMs) {
    return { ok: false, recent, reason: "gap", retryAt: last + limits.minGapMs };
  }
  if (recent.length >= limits.max) {
    return { ok: false, recent, reason: "window", retryAt: recent[0] + limits.windowMs };
  }
  return { ok: true, recent, reason: null, retryAt: null };
}

export function rememberSubmission(timestamps, now = Date.now(), limits = RATE_LIMIT) {
  const recent = checkRateLimit(timestamps, now, limits).recent.slice();
  recent.push(now);
  return recent;
}

export function readTimestamps(storage, key = REPORT_TIMES_KEY) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter(stamp => typeof stamp === "number") : [];
  } catch {
    return [];
  }
}

export function writeTimestamps(storage, timestamps, key = REPORT_TIMES_KEY) {
  try {
    storage.setItem(key, JSON.stringify(timestamps));
    return true;
  } catch {
    return false;
  }
}

export function readDisplayName(storage, key = DISPLAY_NAME_KEY) {
  try {
    return String(storage.getItem(key) || "");
  } catch {
    return "";
  }
}

export function writeDisplayName(storage, name, key = DISPLAY_NAME_KEY) {
  try {
    const value = String(name || "").trim();
    if (value) storage.setItem(key, value);
    else storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function fitDimensions(width, height, maxPx = PHOTO_MAX_PX) {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error("Invalid image size");
  }
  const scale = Math.min(1, maxPx / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale
  };
}

// Area-average downscale used to test the 1600px rule without a browser canvas.
export function downscaleRGBA(src, sw, sh, maxPx = PHOTO_MAX_PX) {
  const { width, height } = fitDimensions(sw, sh, maxPx);
  if (!(src instanceof Uint8ClampedArray) && !ArrayBuffer.isView(src)) {
    throw new Error("Image data is missing");
  }
  if (src.length < sw * sh * 4) throw new Error("Image data is too short");
  if (width === sw && height === sh) {
    return { width, height, pixels: new Uint8ClampedArray(src.slice(0, sw * sh * 4)) };
  }
  const out = new Uint8ClampedArray(width * height * 4);
  const xRatio = sw / width;
  const yRatio = sh / height;
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * yRatio);
    let y1 = Math.floor((y + 1) * yRatio);
    if (y1 <= y0) y1 = y0 + 1;
    if (y1 > sh) y1 = sh;
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * xRatio);
      let x1 = Math.floor((x + 1) * xRatio);
      if (x1 <= x0) x1 = x0 + 1;
      if (x1 > sw) x1 = sw;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * sw + xx) * 4;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          a += src[i + 3];
          count++;
        }
      }
      const o = (y * width + x) * 4;
      out[o] = Math.round(r / count);
      out[o + 1] = Math.round(g / count);
      out[o + 2] = Math.round(b / count);
      out[o + 3] = Math.round(a / count);
    }
  }
  return { width, height, pixels: out };
}

export async function compressImageFile(file, options = {}) {
  const maxPx = options.maxPx ?? PHOTO_MAX_PX;
  const quality = options.quality ?? PHOTO_JPEG_QUALITY;
  const maxBytes = options.maxBytes ?? PHOTO_MAX_BYTES;
  if (!file) throw new Error("Choose a photo.");
  const type = String(file.type || "");
  if (type && !type.startsWith("image/")) {
    throw new Error("Choose a photo (JPG, PNG, or WebP).");
  }

  const bitmap = await loadBitmap(file, options);
  try {
    const size = fitDimensions(bitmap.width, bitmap.height, maxPx);
    const canvas = options.createCanvas
      ? options.createCanvas(size.width, size.height)
      : makeCanvas(size.width, size.height);
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Could not compress that photo.");
    ctx.fillStyle = "#14261c";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(bitmap.image || bitmap, 0, 0, size.width, size.height);
    const blob = await canvasToJpeg(canvas, quality);
    if (blob.size > maxBytes) throw new Error("That photo is still too big. Try a different one.");
    return { blob, width: size.width, height: size.height, type: "image/jpeg", quality };
  } finally {
    if (typeof bitmap.close === "function") bitmap.close();
    if (bitmap.url) URL.revokeObjectURL(bitmap.url);
  }
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function loadBitmap(file, options) {
  if (typeof options.decode === "function") return options.decode(file);
  const createBitmap = options.createImageBitmap || globalThis.createImageBitmap;
  if (typeof createBitmap === "function") {
    try {
      return await createBitmap(file);
    } catch {
      throw new Error("Could not read that photo. Try a JPG, or take the picture again.");
    }
  }
  if (typeof document === "undefined") {
    throw new Error("Could not read that photo. Try a JPG, or take the picture again.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("unreadable"));
      el.src = url;
    });
    return { width: image.naturalWidth, height: image.naturalHeight, image, url, close() {} };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Could not read that photo. Try a JPG, or take the picture again.");
  }
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== "function") {
      reject(new Error("Could not compress that photo."));
      return;
    }
    canvas.toBlob(blob => {
      if (!blob) reject(new Error("Could not compress that photo."));
      else resolve(blob);
    }, "image/jpeg", quality);
  });
}

export function startOfLocalDay(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || "").trim());
  if (!match) return NaN;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0).getTime();
}

export function endOfLocalDay(dateStr) {
  const start = startOfLocalDay(dateStr);
  if (Number.isNaN(start)) return NaN;
  return start + 24 * 60 * 60 * 1000 - 1;
}

export function filterSightings(rows, filters = {}) {
  const kind = filters.kind && filters.kind !== "all" ? filters.kind : "";
  const fromMs = filters.from ? startOfLocalDay(filters.from) : NaN;
  const toMs = filters.to ? endOfLocalDay(filters.to) : NaN;
  if (!Number.isNaN(fromMs) && !Number.isNaN(toMs) && fromMs > toMs) return [];
  return (rows || []).filter(row => {
    if (kind && row.kind !== kind) return false;
    const when = Date.parse(row.seen_at);
    if (Number.isNaN(when)) return false;
    if (!Number.isNaN(fromMs) && when < fromMs) return false;
    if (!Number.isNaN(toMs) && when > toMs) return false;
    return true;
  }).sort((a, b) => Date.parse(b.seen_at) - Date.parse(a.seen_at));
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[ch]));
}

export function safePhotoUrl(url, supabaseUrl) {
  if (!url || !supabaseUrl) return null;
  try {
    const photo = new URL(url);
    const base = new URL(supabaseUrl);
    if (photo.protocol !== "https:") return null;
    if (photo.host !== base.host) return null;
    if (!photo.pathname.includes("/sighting-photos/")) return null;
    return photo.href;
  } catch {
    return null;
  }
}

export function photoObjectPath(url) {
  if (!url) return null;
  try {
    const photo = new URL(url);
    const marker = "/sighting-photos/";
    const index = photo.pathname.indexOf(marker);
    if (index === -1) return null;
    const path = decodeURIComponent(photo.pathname.slice(index + marker.length));
    if (!path || path.includes("..") || path.includes("/")) return null;
    return path;
  } catch {
    return null;
  }
}

export function formatWhen(iso, timeZone) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone
  }).format(date);
}

export function formatCoord(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
}

export function osmLink(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=12/${latitude}/${longitude}`;
}

export function excerpt(text, max = 160) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function isSchemaNotReady(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || error || "");
  return code === "PGRST205" || /schema cache|could not find the table|does not exist/i.test(message);
}

export function sightingsStatusMessage(error) {
  if (isSchemaNotReady(error)) {
    return "The database isn't ready yet. You can still look at the map. Reports will show here after the setup SQL is run in Supabase.";
  }
  const message = String(error?.message || error || "");
  if (/failed to fetch|networkerror|network/i.test(message)) {
    return "Couldn't load sightings. Check your connection.";
  }
  return "Couldn't load sightings. Check your connection and try again.";
}

export function friendlyError(error) {
  const message = String(error?.message || error || "");
  if (isSchemaNotReady(error)) {
    return "The database isn't ready yet. This can't be saved until the setup SQL is run in Supabase.";
  }
  if (/too many reports/i.test(message)) {
    return "Too many reports were sent just now. Please wait a few minutes and try again.";
  }
  if (/failed to fetch|networkerror|network/i.test(message)) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (/invalid api key|jwt|invalid token/i.test(message)) {
    return "The connection key was not accepted. Check the public key in config.js.";
  }
  return "Could not save this report. Please try again.";
}

export function boundsContain(bounds, lat, lng) {
  const [[south, west], [north, east]] = bounds;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export function nowLocalInput(date = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
