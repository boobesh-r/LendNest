const $ = id => document.getElementById(id);
let items = [];
let bookings = [];
let activeCategory = "All";

const colors = { Electronics: "#e7e4ff", Tools: "#fff0d7", Sports: "#ddf7e9", Home: "#e0f2ff" };
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function money(n) { return "₹" + Number(n).toLocaleString("en-IN"); }
async function api(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").classList.remove("show"), 2800);
}
function openModal(title, body) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = body;
  $("overlay").classList.add("open");
}
function closeModal() { $("overlay").classList.remove("open"); }
async function refreshAll() {
  try {
    [items, bookings] = await Promise.all([api("/api/items"), api("/api/bookings")]);
    renderItems();
    renderBookings();
    $("itemCount").textContent = items.length;
    $("bookingCount").textContent = bookings.length;
  } catch (e) {
    $("itemGrid").innerHTML = `<div class="empty">Could not connect to the local server. Please restart it using RUN_LENDNEST.bat.<br><br>${escapeHtml(e.message)}</div>`;
  }
}
function renderItems() {
  const q = $("search").value.trim().toLowerCase();
  const shown = items.filter(x =>
    (activeCategory === "All" || x.category === activeCategory) &&
    [x.name, x.category, x.area, x.description].join(" ").toLowerCase().includes(q)
  );
  $("resultCount").textContent = `${shown.length} item${shown.length === 1 ? "" : "s"}`;
  if (!shown.length) {
    $("itemGrid").innerHTML = `<div class="empty">🔎<br><strong>No matching items</strong><p>Try another search or category.</p></div>`;
    return;
  }
  $("itemGrid").innerHTML = shown.map(x => `
    <article class="item-card">
      <div class="item-art" style="--tint:${escapeHtml(colors[x.category] || "#f1edff")}">
        <span class="tag">${escapeHtml(x.category)}</span><span>${escapeHtml(x.emoji || "📦")}</span>
      </div>
      <div class="item-body">
        <h3 class="item-title">${escapeHtml(x.name)}</h3>
        <div class="desc">${escapeHtml(x.description || "A useful item available to rent.")}</div>
        <div class="meta">📍 ${escapeHtml(x.area)}</div>
        <div class="price-row"><div class="price">${money(x.price)} <small>/ day</small></div>
        <button class="btn btn-sm" data-book="${x.id}">Book</button></div>
      </div>
    </article>`).join("");
  document.querySelectorAll("[data-book]").forEach(b => b.addEventListener("click", () => bookingForm(Number(b.dataset.book))));
}
function renderBookings() {
  if (!bookings.length) {
    $("bookingList").innerHTML = `<div class="empty">No bookings yet. Try booking an item above.</div>`;
    return;
  }
  $("bookingList").innerHTML = bookings.slice(0, 8).map(b => `
    <div class="booking-row">
      <div><strong>#${b.id} · ${escapeHtml(b.itemName)}</strong><small>${escapeHtml(b.renterName)} · ${b.days} day(s) · ${money(b.total)}</small></div>
      <span class="status">${escapeHtml(b.status)}</span>
    </div>`).join("");
}
function listingForm() {
  openModal("List an item", `
    <form id="listingForm">
      <div class="field"><label for="itemName">Item name</label><input id="itemName" maxlength="70" required placeholder="e.g. Tripod stand"></div>
      <div class="form-grid">
        <div class="field"><label for="category">Category</label><select id="category"><option>Electronics</option><option>Tools</option><option>Sports</option><option>Home</option></select></div>
        <div class="field"><label for="price">Price per day (₹)</label><input id="price" type="number" min="1" max="1000000" required placeholder="150"></div>
        <div class="field"><label for="area">Pickup area</label><input id="area" maxlength="60" required placeholder="e.g. Adyar"></div>
        <div class="field"><label for="emoji">Icon</label><select id="emoji"><option>📦</option><option>📷</option><option>🛠️</option><option>🏸</option><option>🎮</option><option>⛺</option><option>💻</option></select></div>
        <div class="field full"><label for="description">Description</label><textarea id="description" maxlength="180" placeholder="Describe the item and its condition"></textarea></div>
      </div>
      <button class="btn" style="width:100%">Save listing</button>
      <p class="fine">This demo stores listings on this computer. Do not enter a home address or sensitive details.</p>
    </form>`);
  $("listingForm").onsubmit = async e => {
    e.preventDefault();
    const body = {
      name: $("itemName").value,
      category: $("category").value,
      price: Number($("price").value),
      area: $("area").value,
      emoji: $("emoji").value,
      description: $("description").value
    };
    try {
      await api("/api/items", { method: "POST", body: JSON.stringify(body) });
      closeModal(); await refreshAll(); toast("Listing saved to the local backend.");
    } catch (err) { toast(err.message); }
  };
}
function bookingForm(id) {
  const item = items.find(x => x.id === id);
  if (!item) return;
  openModal("Request a booking", `
    <div style="display:flex;align-items:center;gap:12px;padding:13px;background:#f8f7ff;border-radius:13px;margin-bottom:16px">
      <span style="font-size:38px">${escapeHtml(item.emoji || "📦")}</span>
      <div><strong>${escapeHtml(item.name)}</strong><div class="fine">${escapeHtml(item.area)} · ${money(item.price)}/day</div></div>
    </div>
    <form id="bookingForm">
      <div class="field"><label for="renter">Your display name</label><input id="renter" maxlength="60" required placeholder="Enter a display name"></div>
      <div class="field"><label for="days">Rental days</label><input id="days" type="number" min="1" max="365" value="1" required></div>
      <div class="fine" id="estimate">Estimated total: ${money(item.price)}</div>
      <button class="btn" style="width:100%;margin-top:14px">Create demo booking</button>
      <p class="fine">No payment is collected. This is a booking request only.</p>
    </form>`);
  $("days").addEventListener("input", () => {
    const n = Math.max(1, Math.min(365, Number($("days").value) || 1));
    $("estimate").textContent = `Estimated total: ${money(item.price * n)}`;
  });
  $("bookingForm").onsubmit = async e => {
    e.preventDefault();
    try {
      const booking = await api("/api/bookings", { method: "POST", body: JSON.stringify({
        itemId: item.id, renterName: $("renter").value, days: Number($("days").value)
      })});
      openModal("Demo booking created", `
        <div class="success"><div class="success-icon">✓</div><h3>Booking #${booking.id}</h3>
          <p>${escapeHtml(booking.itemName)} · ${booking.days} day(s)</p>
          <h2>${money(booking.total)}</h2><p class="fine">Demo pickup code</p>
          <div class="demo-code">${escapeHtml(booking.pickupCode)}</div>
          <p class="fine">This code is for demonstration only. No payment was taken and it does not unlock a real locker.</p>
          <button class="btn" id="bookingDone" style="width:100%">Done</button>
        </div>`);
      $("bookingDone").onclick = closeModal;
      await refreshAll();
    } catch (err) { toast(err.message); }
  };
}
$("openListingTop").onclick = listingForm;
$("openListingHero").onclick = listingForm;
$("openListingSection").onclick = listingForm;
$("closeModal").onclick = closeModal;
$("overlay").addEventListener("click", e => { if (e.target === $("overlay")) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
$("search").addEventListener("input", renderItems);
$("chips").addEventListener("click", e => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  activeCategory = b.dataset.cat;
  document.querySelectorAll("[data-cat]").forEach(x => x.classList.toggle("active", x === b));
  renderItems();
});
$("refreshBookings").onclick = refreshAll;
refreshAll();
