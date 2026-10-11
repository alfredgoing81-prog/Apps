import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  ALASKA_BOUNDS,
  MAP_MAX_BOUNDS,
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_PX,
  bannerMessage,
  boundsContain,
  checkRateLimit,
  classifyKey,
  compressImageFile,
  connectionProblem,
  downscaleRGBA,
  escapeHtml,
  excerpt,
  filterSightings,
  fitDimensions,
  formatCoord,
  formatWhen,
  friendlyError,
  isSchemaNotReady,
  sightingsStatusMessage,
  isConfigured,
  photoObjectPath,
  rateLimitMessage,
  readTimestamps,
  rememberSubmission,
  safePhotoUrl,
  submitBlockMessage,
  validEmail,
  validateSighting,
  writeTimestamps
} from "./logic.js";

function jwt(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${body}.signature`;
}

const anonKey = jwt({ role: "anon", ref: "abcd" });
const serviceKey = jwt({ role: "service_role", ref: "abcd" });
const url = "https://abcdabcd.supabase.co";

test("placeholders and empty settings are not connected", () => {
  assert.equal(connectionProblem({}), "missing");
  assert.equal(connectionProblem({ SUPABASE_URL: "", SUPABASE_ANON_KEY: "" }), "missing");
  assert.equal(connectionProblem({
    SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
    SUPABASE_ANON_KEY: "YOUR_ANON_KEY"
  }), "missing");
  assert.equal(isConfigured({ SUPABASE_URL: "http://example.com", SUPABASE_ANON_KEY: anonKey }), false);
  assert.equal(isConfigured({ SUPABASE_URL: url, SUPABASE_ANON_KEY: "short" }), false);
});

test("anon and publishable keys count as connected", () => {
  assert.equal(classifyKey(anonKey), "anon");
  assert.equal(isConfigured({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey }), true);
  assert.equal(connectionProblem({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey }), null);
  const publishable = "sb_publishable_example_public_key";
  assert.equal(classifyKey(publishable), "publishable");
  assert.equal(isConfigured({ SUPABASE_URL: url, SUPABASE_ANON_KEY: publishable }), true);
});

test("secret keys are refused", () => {
  assert.equal(classifyKey(serviceKey), "secret");
  assert.equal(connectionProblem({ SUPABASE_URL: url, SUPABASE_ANON_KEY: serviceKey }), "service");
  assert.equal(isConfigured({ SUPABASE_URL: url, SUPABASE_ANON_KEY: serviceKey }), false);
  assert.equal(classifyKey("sb_secret_do_not_paste"), "secret");
  assert.equal(connectionProblem({ SUPABASE_URL: url, SUPABASE_ANON_KEY: "sb_secret_do_not_paste" }), "service");
  assert.match(bannerMessage("service"), /secret key/i);
  assert.match(submitBlockMessage("service"), /not sent/i);
});

test("a report needs a place, a time, a type, a description, and a 1 to 5 score", () => {
  const now = Date.parse("2026-10-11T18:00:00.000Z");
  const result = validateSighting({}, now);
  assert.equal(result.ok, false);
  assert.equal(result.spam, false);
  assert.ok(result.errors.location);
  assert.ok(result.errors.seen_at);
  assert.ok(result.errors.kind);
  assert.ok(result.errors.description);
  assert.ok(result.errors.confidence);
});

test("a complete report is accepted and stored as pending", () => {
  const now = Date.parse("2026-10-11T18:00:00.000Z");
  const result = validateSighting({
    lat: "70.132",
    lng: "-143.623",
    seen_at: "2020-01-15T12:00:00.000Z",
    kind: "tracks",
    description: "  Large tracks crossed the gravel bar.  ",
    confidence: "4",
    display_name: "  Alfred  ",
    honeypot: ""
  }, now);
  assert.equal(result.ok, true);
  assert.equal(result.value.kind, "tracks");
  assert.equal(result.value.confidence, 4);
  assert.equal(result.value.description, "Large tracks crossed the gravel bar.");
  assert.equal(result.value.display_name, "Alfred");
  assert.equal(result.value.status, "pending");
  assert.equal(result.value.honeypot, "");
  assert.equal(result.value.lat, 70.132);
  assert.equal(result.value.lng, -143.623);
  assert.equal(Number.isNaN(Date.parse(result.value.seen_at)), false);
});

test("future times, unknown types, short notes, and a filled honeypot are rejected", () => {
  const now = Date.parse("2026-10-11T18:00:00.000Z");
  const future = validateSighting({
    lat: 70,
    lng: -143,
    seen_at: "2099-01-01T00:00:00.000Z",
    kind: "saw",
    description: "I saw something tall.",
    confidence: 3
  }, now);
  assert.equal(future.ok, false);
  assert.match(future.errors.seen_at, /future/i);

  const badKind = validateSighting({
    lat: 70,
    lng: -143,
    seen_at: "2020-01-15T12:00:00.000Z",
    kind: "alien",
    description: "I saw something tall.",
    confidence: 3
  }, now);
  assert.match(badKind.errors.kind, /noticed/i);

  const short = validateSighting({
    lat: 70,
    lng: -143,
    seen_at: "2020-01-15T12:00:00.000Z",
    kind: "smell",
    description: "nope",
    confidence: 0
  }, now);
  assert.match(short.errors.description, /sentence/i);
  assert.match(short.errors.confidence, /1 to 5/);

  const spam = validateSighting({
    lat: 70,
    lng: -143,
    seen_at: "2020-01-15T12:00:00.000Z",
    kind: "saw",
    description: "I saw something tall.",
    confidence: 5,
    honeypot: "https://spam.example"
  }, now);
  assert.equal(spam.spam, true);
  assert.equal(spam.ok, false);
});

test("the phone rate limit allows three reports an hour and blocks a quick repeat", () => {
  const now = 1_000_000_000_000;
  assert.equal(checkRateLimit([], now).ok, true);
  const once = rememberSubmission([], now);
  assert.equal(checkRateLimit(once, now + 10_000).ok, false);
  assert.equal(checkRateLimit(once, now + 10_000).reason, "gap");
  assert.match(rateLimitMessage("gap"), /wait a moment/i);

  const stamps = [now, now + 60_000, now + 120_000];
  const blocked = checkRateLimit(stamps, now + 180_000);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "window");
  assert.equal(checkRateLimit(stamps, now + 60 * 60 * 1000 + 1).ok, true);
});

test("report times survive bad storage", () => {
  const bag = new Map();
  const storage = {
    getItem: key => bag.get(key) ?? null,
    setItem: (key, value) => bag.set(key, value)
  };
  assert.deepEqual(readTimestamps(storage), []);
  assert.equal(writeTimestamps(storage, [10, 20]), true);
  assert.deepEqual(readTimestamps(storage), [10, 20]);
  bag.set("bigfoot-report-times", "not-json");
  assert.deepEqual(readTimestamps(storage), []);
  assert.deepEqual(readTimestamps({ getItem() { throw new Error("blocked"); } }), []);
});

test("fitDimensions caps the long edge at 1600 and does not enlarge", () => {
  assert.deepEqual(fitDimensions(3200, 1600, PHOTO_MAX_PX), { width: 1600, height: 800, scale: 0.5 });
  assert.deepEqual(fitDimensions(800, 2000).width, 640);
  assert.deepEqual(fitDimensions(800, 2000).height, 1600);
  assert.deepEqual(fitDimensions(400, 300), { width: 400, height: 300, scale: 1 });
  assert.throws(() => fitDimensions(0, 10), /Invalid image size/);
});

test("downscaleRGBA shrinks pixel data and keeps a solid color", () => {
  const sw = 4;
  const sh = 2;
  const src = new Uint8ClampedArray(sw * sh * 4);
  for (let i = 0; i < src.length; i += 4) {
    src[i] = 200;
    src[i + 1] = 40;
    src[i + 2] = 20;
    src[i + 3] = 255;
  }
  const scaled = downscaleRGBA(src, sw, sh, 2);
  assert.deepEqual([scaled.width, scaled.height], [2, 1]);
  assert.ok(scaled.pixels.length < src.length);
  assert.equal(scaled.pixels[0], 200);
  assert.equal(scaled.pixels[3], 255);

  const wide = new Uint8ClampedArray(3200 * 10 * 4);
  const wideOut = downscaleRGBA(wide, 3200, 10, 1600);
  assert.equal(wideOut.width, 1600);
  assert.equal(wideOut.height, 5);
});

test("compressImageFile draws at the capped size and exports a jpeg", async () => {
  let drawn = null;
  let blobType = "";
  let quality = null;
  const result = await compressImageFile({ type: "image/png", name: "tracks.png" }, {
    createImageBitmap: async () => ({ width: 4000, height: 2000, close() {} }),
    createCanvas: () => ({
      width: 0,
      height: 0,
      getContext() {
        return {
          fillStyle: "",
          fillRect() {},
          drawImage(_src, _x, _y, w, h) { drawn = { w, h }; }
        };
      },
      toBlob(callback, type, q) {
        blobType = type;
        quality = q;
        callback(new Blob([new Uint8Array(32)], { type }));
      }
    })
  });
  assert.deepEqual(drawn, { w: 1600, h: 800 });
  assert.equal(blobType, "image/jpeg");
  assert.equal(quality, PHOTO_JPEG_QUALITY);
  assert.equal(result.width, 1600);
  assert.equal(result.height, 800);
  assert.equal(result.type, "image/jpeg");
});

test("compressImageFile rejects non-photos and blobs that are still too big", async () => {
  await assert.rejects(
    () => compressImageFile({ type: "text/plain" }),
    /Choose a photo/
  );
  await assert.rejects(
    () => compressImageFile({ type: "image/jpeg" }, {
      maxBytes: 10,
      createImageBitmap: async () => ({ width: 20, height: 10, close() {} }),
      createCanvas: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ fillStyle: "", fillRect() {}, drawImage() {} }),
        toBlob(callback, type) {
          callback(new Blob([new Uint8Array(50)], { type }));
        }
      })
    }),
    /too big/
  );
});

test("list filters by type and local date, newest first", () => {
  const rows = [
    { kind: "saw", seen_at: new Date(2026, 9, 10, 9, 0).toISOString(), description: "early" },
    { kind: "tracks", seen_at: new Date(2026, 9, 11, 21, 30).toISOString(), description: "night tracks" },
    { kind: "saw", seen_at: new Date(2026, 9, 11, 8, 0).toISOString(), description: "morning" }
  ];
  const filtered = filterSightings(rows, { kind: "saw", from: "2026-10-11", to: "2026-10-11" });
  assert.deepEqual(filtered.map(row => row.description), ["morning"]);
  const allDay = filterSightings(rows, { from: "2026-10-11", to: "2026-10-11" });
  assert.deepEqual(allDay.map(row => row.description), ["night tracks", "morning"]);
  assert.deepEqual(filterSightings(rows, { from: "2026-10-12", to: "2026-10-01" }), []);
});

test("the opening bounds cover Alaska, including Kaktovik, and the map is not locked", () => {
  const places = {
    kaktovik: [70.1319, -143.623],
    utqiagvik: [71.2906, -156.7886],
    fairbanks: [64.8378, -147.7164],
    anchorage: [61.2181, -149.9003],
    nome: [64.5011, -165.4064],
    juneau: [58.3019, -134.4197],
    ketchikan: [55.3422, -131.6461],
    dutchHarbor: [53.8898, -166.5422]
  };
  for (const [name, [lat, lng]] of Object.entries(places)) {
    assert.equal(boundsContain(ALASKA_BOUNDS, lat, lng), true, name);
  }
  assert.equal(MAP_MAX_BOUNDS, null);
});

test("photos from other sites are not shown, and text is escaped", () => {
  const base = "https://abcdabcd.supabase.co";
  const good = `${base}/storage/v1/object/public/sighting-photos/abc.jpg`;
  assert.equal(safePhotoUrl(good, base), good);
  assert.equal(safePhotoUrl("javascript:alert(1)", base), null);
  assert.equal(safePhotoUrl("https://evil.example/sighting-photos/a.jpg", base), null);
  assert.equal(photoObjectPath(good), "abc.jpg");
  assert.equal(photoObjectPath(`${base}/storage/v1/object/public/sighting-photos/../secret.jpg`), null);
  assert.equal(escapeHtml(`<img alt="x" onload='alert(1)'>`), "&lt;img alt=&quot;x&quot; onload=&#39;alert(1)&#39;&gt;");
  assert.equal(excerpt("a".repeat(20), 10).endsWith("…"), true);
});

test("dates and errors are readable", () => {
  const when = formatWhen("2026-10-11T18:05:00.000Z", "UTC");
  assert.match(when, /Oct 11, 2026/);
  assert.match(when, /6:05/);
  assert.equal(formatCoord(70.1319, -143.623), "70.132, -143.623");
  const missingTable = {
    code: "PGRST205",
    message: "Could not find the table 'public.sightings' in the schema cache"
  };
  assert.equal(isSchemaNotReady(missingTable), true);
  assert.match(sightingsStatusMessage(missingTable), /database isn't ready yet/i);
  assert.match(sightingsStatusMessage(missingTable), /look at the map/i);
  assert.match(friendlyError(missingTable), /setup SQL/i);
  assert.match(friendlyError({ message: "Too many reports right now." }), /wait a few minutes/i);
  assert.match(friendlyError({ message: "Failed to fetch" }), /connection/i);
  assert.equal(validEmail("alfred@example.com"), true);
  assert.equal(validEmail("not-an-email"), false);
  assert.match(bannerMessage("missing"), /Not connected yet/);
});
