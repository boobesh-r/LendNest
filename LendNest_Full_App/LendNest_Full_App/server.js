const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const ITEMS_FILE = path.join(DATA, "items.json");
const BOOKINGS_FILE = path.join(DATA, "bookings.json");

function ensureFile(file, initial) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(initial, null, 2));
}
ensureFile(ITEMS_FILE, [
  { id: 1, name: "Mirrorless Camera", category: "Electronics", price: 650, area: "Adyar", emoji: "📷", description: "A compact camera for trips, events and weekend projects.", available: true },
  { id: 2, name: "Cordless Drill Kit", category: "Tools", price: 180, area: "Thiruvanmiyur", emoji: "🛠️", description: "A handy drill set for simple home improvement tasks.", available: true },
  { id: 3, name: "Badminton Racket Set", category: "Sports", price: 120, area: "Palavakkam", emoji: "🏸", description: "Two rackets for a friendly game at the court.", available: true },
  { id: 4, name: "Portable Projector", category: "Electronics", price: 400, area: "Besant Nagar", emoji: "📽️", description: "Make movie night or a small presentation more fun.", available: true },
  { id: 5, name: "Camping Tent", category: "Home", price: 300, area: "Adyar", emoji: "⛺", description: "A lightweight tent for a weekend outdoor adventure.", available: true },
  { id: 6, name: "Toolbox Set", category: "Tools", price: 150, area: "Velachery", emoji: "🧰", description: "A basic set of tools for everyday fixes.", available: true }
]);
ensureFile(BOOKINGS_FILE, []);

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return []; }
}
function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}
function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options": "nosniff" });
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}
function bodyJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch { reject(new Error("Invalid JSON")); }
    });
  });
}
function cleanText(value, max = 120) {
  return String(value || "").trim().replace(/[|\\r\\n]/g, " ").slice(0, max);
}
function makeId(list, start) {
  return list.reduce((m, x) => Math.max(m, Number(x.id) || 0), start - 1) + 1;
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return send(res, 200, { ok: true, app: "LendNest" });
    }
    if (req.method === "GET" && url.pathname === "/api/items") {
      return send(res, 200, readJson(ITEMS_FILE));
    }
    if (req.method === "POST" && url.pathname === "/api/items") {
      const body = await bodyJson(req);
      const name = cleanText(body.name, 70);
      const category = cleanText(body.category, 40);
      const area = cleanText(body.area, 60);
      const price = Number(body.price);
      if (!name || !category || !area || !Number.isInteger(price) || price < 1 || price > 1000000) {
        return send(res, 400, { error: "Enter a name, category, pickup area, and valid daily price." });
      }
      const items = readJson(ITEMS_FILE);
      const item = {
        id: makeId(items, 1), name, category, area, price,
        emoji: cleanText(body.emoji || "📦", 8),
        description: cleanText(body.description || "A useful item available to rent.", 180),
        available: true
      };
      items.unshift(item);
      writeJson(ITEMS_FILE, items);
      return send(res, 201, item);
    }
    if (req.method === "GET" && url.pathname === "/api/bookings") {
      return send(res, 200, readJson(BOOKINGS_FILE));
    }
    if (req.method === "POST" && url.pathname === "/api/bookings") {
      const body = await bodyJson(req);
      const itemId = Number(body.itemId);
      const days = Number(body.days);
      const renterName = cleanText(body.renterName, 60);
      const items = readJson(ITEMS_FILE);
      const item = items.find(x => x.id === itemId && x.available);
      if (!item) return send(res, 404, { error: "That item was not found." });
      if (!renterName) return send(res, 400, { error: "Enter a display name." });
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        return send(res, 400, { error: "Choose between 1 and 365 rental days." });
      }
      const bookings = readJson(BOOKINGS_FILE);
      const booking = {
        id: makeId(bookings, 1001),
        itemId: item.id,
        itemName: item.name,
        renterName,
        days,
        total: item.price * days,
        pickupCode: "DEMO-" + Math.random().toString(10).slice(2, 8),
        status: "Demo request — unpaid",
        createdAt: new Date().toISOString()
      };
      bookings.unshift(booking);
      writeJson(BOOKINGS_FILE, bookings);
      return send(res, 201, booking);
    }

    if (req.method === "GET") {
      const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
      const file = path.normalize(path.join(PUBLIC, requested));
      if (!file.startsWith(PUBLIC + path.sep) && file !== path.join(PUBLIC, "index.html")) {
        return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
      }
      fs.readFile(file, (err, content) => {
        if (err) return send(res, 404, "Not found", "text/plain; charset=utf-8");
        const ext = path.extname(file).toLowerCase();
        const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
        send(res, 200, content, types[ext] || "application/octet-stream");
      });
      return;
    }
    send(res, 404, { error: "Not found" });
  } catch (err) {
    send(res, 400, { error: err.message || "Something went wrong." });
  }
});
server.listen(PORT, "127.0.0.1", () => {
  console.log(`\nLendNest is running at http://localhost:${PORT}`);
  console.log("Keep this window open while using the app.");
  console.log("Press Ctrl+C to stop the server.\n");
});
