/* ==========================================================================
   SIMPELM — Core: API client, Auth, UI helpers (toast, spinner, modal),
             Navbar render, Table helper (search + pagination).
   Dipakai oleh seluruh halaman.
   ========================================================================== */

/* ---------------------------------------------------------------------------
   1) STORAGE — sesi pengguna
--------------------------------------------------------------------------- */
const Session = {
  KEY: "simpelm_session",
  get() {
    try {
      const s = JSON.parse(localStorage.getItem(this.KEY) || "null");
      if (!s) return null;
      if (s.expiresAt && Date.now() > s.expiresAt) { this.clear(); return null; }
      return s;
    } catch (_) { return null; }
  },
  set(data) {
    const expiresAt = Date.now() + CONFIG.SESSION_HOURS * 3600 * 1000;
    localStorage.setItem(this.KEY, JSON.stringify({ ...data, expiresAt }));
  },
  clear() { localStorage.removeItem(this.KEY); },
  token() { const s = this.get(); return s ? s.token : null; },
  role() { const s = this.get(); return s ? s.role : null; },
  isLoggedIn() { return !!this.get(); }
};

/* ---------------------------------------------------------------------------
   2) API CLIENT — komunikasi ke Google Apps Script
   Catatan CORS: gunakan Content-Type text/plain agar tidak memicu preflight.
   Token sesi dikirim dalam body (bukan header) untuk alasan yang sama.
--------------------------------------------------------------------------- */
const API = {
  _cache: {},

  async call(action, params = {}, { auth = false, cacheMinutes = 0 } = {}) {
    if (!CONFIG.GAS_URL || CONFIG.GAS_URL.startsWith("GANTI")) {
      throw new Error("GAS_URL belum dikonfigurasi. Edit assets/js/config.js.");
    }
    const payload = { action, ...params };
    if (auth) {
      const token = Session.token();
      if (!token) throw new Error("Sesi tidak ditemukan. Silakan login kembali.");
      payload.token = token;
    }

    // Cache khusus GET publik
    const cacheKey = action + JSON.stringify(params);
    if (cacheMinutes > 0) {
      const hit = this._cache[cacheKey];
      if (hit && Date.now() - hit.t < cacheMinutes * 60000) return hit.data;
      const ls = this._lsGet(cacheKey, cacheMinutes);
      if (ls) return ls;
    }

    let res;
    try {
      res = await fetch(CONFIG.GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow"
      });
    } catch (e) {
      throw new Error("Gagal terhubung ke server. Periksa koneksi internet Anda.");
    }

    let json;
    try { json = await res.json(); }
    catch (_) { throw new Error("Respons server tidak valid."); }

    if (!json.ok) {
      if (json.code === "AUTH") { Session.clear(); }
      throw new Error(json.error || "Terjadi kesalahan pada server.");
    }

    if (cacheMinutes > 0) {
      this._cache[cacheKey] = { t: Date.now(), data: json.data };
      this._lsSet(cacheKey, json.data);
    }
    return json.data;
  },

  invalidate() { this._cache = {}; },

  _lsGet(key, minutes) {
    try {
      const raw = JSON.parse(localStorage.getItem("simpelm_cache_" + key) || "null");
      if (raw && Date.now() - raw.t < minutes * 60000) return raw.data;
    } catch (_) {}
    return null;
  },
  _lsSet(key, data) {
    try { localStorage.setItem("simpelm_cache_" + key, JSON.stringify({ t: Date.now(), data })); } catch (_) {}
  }
};

/* ---------------------------------------------------------------------------
   3) UI — spinner, toast, modal
--------------------------------------------------------------------------- */
const UI = {
  _spinnerEl: null,
  _toastWrap: null,

  init() {
    if (!document.querySelector(".spinner-overlay")) {
      const o = document.createElement("div");
      o.className = "spinner-overlay";
      o.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(o);
    }
    this._spinnerEl = document.querySelector(".spinner-overlay");
    if (!document.querySelector(".toast-wrap")) {
      const t = document.createElement("div");
      t.className = "toast-wrap";
      document.body.appendChild(t);
    }
    this._toastWrap = document.querySelector(".toast-wrap");
  },

  loading(on) { this._spinnerEl && this._spinnerEl.classList.toggle("show", !!on); },

  toast(msg, type = "info", ms = 3000) {
    const el = document.createElement("div");
    el.className = "toast " + type;
    const ico = type === "success" ? "✓" : type === "error" ? "!" : "i";
    el.innerHTML = `<span class="t-ico">${ico}</span><span class="t-msg"></span>`;
    el.querySelector(".t-msg").textContent = msg;
    this._toastWrap.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(30px)"; el.style.transition = ".3s"; setTimeout(() => el.remove(), 320); }, ms);
  },

  // Modal konfirmasi -> Promise<boolean>
  confirm(message, { title = "Konfirmasi", okLabel = "Hapus", danger = true } = {}) {
    return new Promise((resolve) => {
      const ov = document.createElement("div");
      ov.className = "modal-overlay show";
      ov.innerHTML = `
        <div class="modal confirm">
          <div class="modal-head"><h3></h3><button class="modal-close">&times;</button></div>
          <div class="modal-body"><p class="conf-msg" style="font-size:15px;color:#3d4a57;"></p></div>
          <div class="modal-foot">
            <button class="btn btn-ghost btn-sm" data-act="cancel">Batal</button>
            <button class="btn ${danger ? "btn-danger" : "btn-primary"} btn-sm" data-act="ok"></button>
          </div>
        </div>`;
      ov.querySelector("h3").textContent = title;
      ov.querySelector(".conf-msg").textContent = message;
      ov.querySelector('[data-act="ok"]').textContent = okLabel;
      const close = (val) => { ov.remove(); resolve(val); };
      ov.querySelector(".modal-close").onclick = () => close(false);
      ov.querySelector('[data-act="cancel"]').onclick = () => close(false);
      ov.querySelector('[data-act="ok"]').onclick = () => close(true);
      ov.addEventListener("click", (e) => { if (e.target === ov) close(false); });
      document.body.appendChild(ov);
    });
  }
};

/* ---------------------------------------------------------------------------
   4) NAVBAR — render konsisten + state login + menu per-role
--------------------------------------------------------------------------- */
const NAV_PUBLIC = [
  { href: "index.html", label: "Beranda" },
  { href: "bimtek.html", label: "Bimtek" },
  { href: "pendampingan.html", label: "Pendampingan" },
  { href: "kkg.html", label: "Jadwal KKG" },
  { href: "modul-ajar.html", label: "Modul Ajar" }
];

// Menu privat per role
const NAV_PRIVATE = {
  super_admin: [{ href: "dashboard.html", label: "Dashboard" }, { href: "akun.html", label: "Kelola Akun" }],
  admin:       [{ href: "dashboard.html", label: "Dashboard" }],
  pengawas:    [],
  kkg_sekolah: []
};

function renderNavbar() {
  const host = document.getElementById("navbar");
  if (!host) return;
  const s = Session.get();
  const current = location.pathname.split("/").pop() || "index.html";

  let links = NAV_PUBLIC.map(l =>
    `<a href="${l.href}" class="${l.href === current ? "active" : ""}">${l.label}</a>`).join("");

  if (s) {
    (NAV_PRIVATE[s.role] || []).forEach(l => {
      links += `<a href="${l.href}" class="${l.href === current ? "active" : ""}">${l.label}</a>`;
    });
  }

  let right;
  if (s) {
    const r = CONFIG.ROLES[s.role] || { label: s.role, badge: "admin" };
    right = `
      <div class="nav-user">
        <span class="role-badge ${r.badge}">${r.label}</span>
        <a href="profil.html" class="${current === "profil.html" ? "active" : ""}">${escapeHtml(s.nama || "Profil")}</a>
        <a class="nav-logout" id="btnLogout">Keluar</a>
      </div>`;
  } else {
    right = `<a href="login.html" class="btn-login">Masuk</a>`;
  }

  host.className = "navbar";
  host.innerHTML = `
    <div class="container nav-inner">
      <a href="index.html" class="brand">
        <span class="brand-logo">SP</span>
        <span class="brand-text"><strong>SIMPELM</strong><span>${CONFIG.INSTANSI}</span></span>
      </a>
      <nav class="nav-links" id="navLinks">${links}${right}</nav>
      <button class="nav-toggle" id="navToggle" aria-label="Menu"><span></span><span></span><span></span></button>
    </div>`;

  document.getElementById("navToggle").onclick = () =>
    document.getElementById("navLinks").classList.toggle("open");
  const lo = document.getElementById("btnLogout");
  if (lo) lo.onclick = logout;
}

function renderFooter() {
  const f = document.getElementById("footer");
  if (!f) return;
  f.className = "app-footer";
  f.innerHTML = `
    <div class="container">
      <span>© ${new Date().getFullYear()} ${CONFIG.INSTANSI}. Seluruh hak cipta dilindungi.</span>
      <span class="src">Dasar: Kepmendikdasmen No. 126/P/2025</span>
    </div>`;
}

/* ---------------------------------------------------------------------------
   5) AUTH helpers
--------------------------------------------------------------------------- */
async function logout() {
  const token = Session.token();
  Session.clear();
  API.invalidate();
  try { if (token) await API.call("logout", { token }); } catch (_) {}
  location.href = "index.html";
}

// Panggil di halaman privat. allowed = array role yang boleh akses.
function requireAuth(allowed) {
  const s = Session.get();
  if (!s) { location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop()); return null; }
  if (allowed && !allowed.includes(s.role)) {
    document.body.innerHTML =
      '<div style="min-height:60vh;display:grid;place-items:center;text-align:center;padding:40px">' +
      '<div><h2 style="color:#1A3A5C">Akses Ditolak</h2>' +
      '<p style="color:#5b6876;margin:10px 0 20px">Peran Anda tidak memiliki akses ke halaman ini.</p>' +
      '<a class="btn btn-primary" href="index.html">Kembali ke Beranda</a></div></div>';
    return null;
  }
  return s;
}

/* ---------------------------------------------------------------------------
   6) TABLE helper — pencarian teks + pagination (maks 20/halaman)
--------------------------------------------------------------------------- */
class DataTable {
  /* opts: { mount, columns:[{key,label,render?}], rows, pageSize, searchKeys, emptyText } */
  constructor(opts) {
    this.opts = Object.assign({ pageSize: CONFIG.PAGE_SIZE, searchKeys: null, emptyText: "Belum ada data." }, opts);
    this.rows = opts.rows || [];
    this.filtered = this.rows;
    this.page = 1;
    this.query = "";
    this.mount = typeof opts.mount === "string" ? document.querySelector(opts.mount) : opts.mount;
    this.render();
  }
  setRows(rows) { this.rows = rows || []; this.applyFilter(); }
  search(q) { this.query = (q || "").toLowerCase().trim(); this.page = 1; this.applyFilter(); }
  applyFilter() {
    const keys = this.opts.searchKeys;
    this.filtered = !this.query ? this.rows : this.rows.filter(r => {
      const hay = keys ? keys.map(k => r[k]).join(" ") : Object.values(r).join(" ");
      return String(hay).toLowerCase().includes(this.query);
    });
    const maxPage = Math.max(1, Math.ceil(this.filtered.length / this.opts.pageSize));
    if (this.page > maxPage) this.page = maxPage;
    this.render();
  }
  render() {
    const { columns, pageSize, emptyText } = this.opts;
    if (!this.filtered.length) {
      this.mount.innerHTML = emptyStateHTML(emptyText);
      return;
    }
    const start = (this.page - 1) * pageSize;
    const slice = this.filtered.slice(start, start + pageSize);
    const head = columns.map(c => `<th>${c.label}</th>`).join("");
    const body = slice.map(r => "<tr>" + columns.map(c => {
      const val = c.render ? c.render(r) : escapeHtml(r[c.key] ?? "");
      return `<td>${val}</td>`;
    }).join("") + "</tr>").join("");

    const total = this.filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    let pages = "";
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - this.page) > 1) {
        if (i === 3 || i === totalPages - 2) pages += `<span style="padding:6px 4px">…</span>`;
        continue;
      }
      pages += `<button class="page-btn ${i === this.page ? "active" : ""}" data-page="${i}">${i}</button>`;
    }

    this.mount.innerHTML = `
      <div class="table-wrap">
        <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
        <div class="pagination">
          <span>Menampilkan ${start + 1}–${Math.min(start + pageSize, total)} dari ${total} data</span>
          <div class="pages">
            <button class="page-btn" data-page="${this.page - 1}" ${this.page === 1 ? "disabled" : ""}>‹</button>
            ${pages}
            <button class="page-btn" data-page="${this.page + 1}" ${this.page === totalPages ? "disabled" : ""}>›</button>
          </div>
        </div>
      </div>`;

    this.mount.querySelectorAll(".page-btn[data-page]").forEach(b => {
      b.addEventListener("click", () => {
        const p = parseInt(b.dataset.page, 10);
        if (p >= 1 && p <= totalPages) { this.page = p; this.render(); }
      });
    });
  }
}

/* ---------------------------------------------------------------------------
   7) HELPERS
--------------------------------------------------------------------------- */
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return escapeHtml(v);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function isValidUrl(u) { return /^https:\/\/.+/i.test((u || "").trim()); }
function emptyStateHTML(text, sub = "") {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 17v-6h6v6M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
    <h3>${escapeHtml(text)}</h3>${sub ? `<p>${escapeHtml(sub)}</p>` : ""}</div>`;
}
function linkPill(url, label) {
  if (!url) return "";
  return `<a class="link-pill" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
}
function optionList(arr, selected) {
  return arr.map(v => `<option value="${escapeHtml(v)}" ${v === selected ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
}
function qs(name) { return new URLSearchParams(location.search).get(name); }

/* ---------------------------------------------------------------------------
   8) BOOT — auto init pada setiap halaman
--------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  UI.init();
  renderNavbar();
  renderFooter();
});
