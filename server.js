const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ── In-memory DB (fresh on every server start) ──────────────────────────────

let db = {
  formTitle: "Client Satisfaction Measurement Form",
  session: "September 2026",
  respondent: {
    clientTypes: [
      { id: "citizen", label: "Citizen", short: "Citizen", count: 0 },
      { id: "business", label: "Business", short: "Business", count: 0 },
      { id: "government", label: "Government (Employee or another agency)", short: "Government", count: 0 },
    ],
    sex: [
      { id: "male", label: "Male", count: 0 },
      { id: "female", label: "Female", count: 0 },
    ],
    ages: [],       // numeric ages recorded via number input
    region: "",    // optional region input via text input
    services: {},   // { "Service Name": count } via text input
  },
  sectionA: [
    {
      id: "CC1",
      label: "Alin sa mga sumusunod ang naglalarawan sa iyong kaalaman sa CC?",
      options: [
        { id: "1", label: "1. Alam ko ang CC at nakita ko ito sa napuntahang opisina", count: 0 },
        { id: "2", label: "2. Alam ko ang CC pero hindi ko ito nakita sa napuntahang opisina", count: 0 },
        { id: "3", label: "3. Nalaman ko ang CC nang makita ko ito sa napuntahang opisina", count: 0 },
        { id: "4", label: "4. Hindi ko alam kung ano ang CC at wala akong nakita sa napuntahang opisina (Lagyan ng tsek ang 'N/A' sa CC2 at CC3 kapag ito ang iyong sagot)", count: 0 },
      ],
    },
    {
      id: "CC2",
      label: "Kung alam ang CC (Nag-tsek sa opsyon 1-3 sa CC1), masasabi mo ba na ang CC nang napuntahang opisina ay...",
      options: [
        { id: "1", label: "1. Madaling makita", count: 0 },
        { id: "2", label: "2. Medyo madaling makita", count: 0 },
        { id: "3", label: "3. Mahirap makita", count: 0 },
        { id: "4", label: "4. Hindi makita", count: 0 },
        { id: "5", label: "5. N/A", count: 0 },
      ],
    },
    {
      id: "CC3",
      label: "Kung alam ang CC (nag-tsek sa opsyon 1-3 sa CC1), gaano nakatulong ang CC sa transaksyon mo?",
      options: [
        { id: "1", label: "1. Sobrang nakatulong", count: 0 },
        { id: "2", label: "2. Nakatulong naman", count: 0 },
        { id: "3", label: "3. Hindi nakatulong", count: 0 },
        { id: "4", label: "4. N/A", count: 0 },
      ],
    },
  ],
  sectionB: [
    { id: "SQD0", label: "Nasiyahan ako sa serbisyo na aking natanggap sa napuntahan na tanggapan.", counts: [0, 0, 0, 0, 0], na: 0 },
    { id: "SQD1", label: "Makatwiran ang oras na aking ginugol para sa pagproseso ng aking transaksyon.", counts: [0, 0, 0, 0, 0], na: 0 },
    { id: "SQD2", label: "Ang opisina ay sumusunod sa mga kinakailangang dokumento at mga hakbang batay sa impormasyong ibinigay.", counts: [0, 0, 0, 0, 0], na: 0 },
    { id: "SQD3", label: "Ang mga hakbang sa pagproseso, kasama na ang pagbayad ay madali at simple lamang.", counts: [0, 0, 0, 0, 0], na: 0 },
    { id: "SQD4", label: "Mabilis at madali akong nakahanap ng impormasyon tungkol sa aking transaksyon mula sa opisina o sa website nito.", counts: [0, 0, 0, 0, 0], na: 0 },
    { id: "SQD5", label: "Nagbayad ako ng makatwirang halaga para sa aking transaksyon. Kung ang serbisyo ay ibinigay ng libre, maglagay ng tsek sa hanay ng N/A.", counts: [0, 0, 0, 0, 0], na: 0 },
    { id: "SQD6", label: "Pakiramdam ko ay patas ang opisina sa lahat, o \"walang palakasan\", sa aking transaksyon.", counts: [0, 0, 0, 0, 0], na: 0 },
    { id: "SQD7", label: "Magalang akong trinato ng mga tauhan, at (kung sakali ako ay humingi ng tulong) alam ko na sila ay handang tumulong sa akin.", counts: [0, 0, 0, 0, 0], na: 0 },
    { id: "SQD8", label: "Nakuha ko ang kinakailangan ko mula sa tanggapan ng gobyerno, kung tinanggihan man, ito ay sapat na ipinaliwanag sa akin.", counts: [0, 0, 0, 0, 0], na: 0 },
  ],
};

const undoStack = [];

const PHILIPPINE_REGIONS = [
  "National Capital Region (NCR)",
  "Cordillera Administrative Region (CAR)",
  "Region I - Ilocos Region",
  "Region II - Cagayan Valley",
  "Region III - Central Luzon",
  "Region IV-A - CALABARZON",
  "MIMAROPA Region",
  "Region V - Bicol Region",
  "Region VI - Western Visayas",
  "Negros Island Region (NIR)",
  "Region VII - Central Visayas",
  "Region VIII - Eastern Visayas",
  "Region IX - Zamboanga Peninsula",
  "Region X - Northern Mindanao",
  "Region XI - Davao Region",
  "Region XII - SOCCSKSARGEN",
  "Region XIII - Caraga",
  "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)",
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function totalForms() {
  // total forms based on the highest count of any respondent profile field
  const clientTypeTotal = db.respondent.clientTypes.reduce((s, t) => s + t.count, 0);
  const sexTotal = db.respondent.sex.reduce((s, x) => s + x.count, 0);
  const ageTotal = db.respondent.ages.length;
  const serviceTotal = Object.values(db.respondent.services).reduce((s, n) => s + n, 0);
  const regionTotal = db.respondent.region ? 1 : 0;
  return Math.max(clientTypeTotal, sexTotal, ageTotal, serviceTotal, regionTotal);
}

function totalTallies() {
  let total = 0;
  for (const q of db.sectionA) for (const o of q.options) total += o.count;
  for (const q of db.sectionB) {
    for (const c of q.counts) total += c;
    total += q.na;
  }
  return total;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pushUndo() {
  undoStack.push(deepClone(db));
  if (undoStack.length > 100) undoStack.shift();
}

// ── Rendering helpers ───────────────────────────────────────────────────────

function countSpan(id, val) {
  return `<span class="tally-count" id="${id}">${val}</span>`;
}

// Out-of-band total update so every tally keeps the header in sync
function oobTotal() {
  return `<span id="total-value" hx-swap-oob="true">${totalForms()}</span>`;
}

function renderRespondentPanel() {
  const serviceEntries = Object.entries(db.respondent.services).sort((a, b) => b[1] - a[1]);
  return `
    <div class="respondent-card">
      <div class="resp-line">
        <span class="resp-field-label">Client type:</span>
        ${db.respondent.clientTypes
          .map(
            (t) => `
          <button class="resp-chip"
            hx-post="/api/respondent/type/${t.id}"
            hx-target="#${t.id}-count-a"
            hx-swap="outerHTML">
            <i class="bi bi-square checkbox-ico"></i>
            <span class="option-label">${esc(t.label)}</span>
            ${countSpan(t.id + "-count-a", t.count)}
          </button>
        `
          )
          .join("")}
      </div>

      <div class="resp-line">
        <span class="resp-field-label">Sex:</span>
        ${db.respondent.sex
          .map(
            (s) => `
          <button class="resp-chip"
            hx-post="/api/respondent/sex/${s.id}"
            hx-target="#${s.id}-count-b"
            hx-swap="outerHTML">
            <i class="bi bi-square checkbox-ico"></i>
            <span class="option-label">${esc(s.label)}</span>
            ${countSpan(s.id + "-count-b", s.count)}
          </button>
        `
          )
          .join("")}
      </div>

      <div class="resp-line">
        <span class="resp-field-label">Region:</span>
        <div class="resp-input-row">
          <select id="region-input">
            <option value="">Select a Philippine region</option>
            ${PHILIPPINE_REGIONS.map((region) => `<option value="${esc(region)}"${db.respondent.region === region ? " selected" : ""}>${esc(region)}</option>`).join("")}
          </select>
          <button class="btn btn-primary btn-sm" type="button"
            hx-post="/api/respondent/region"
            hx-vals="js:{region:document.getElementById('region-input').value}"
            hx-target="#region-value"
            hx-swap="outerHTML">
            <i class="bi bi-check-lg"></i> Save
          </button>
        </div>
        <span id="region-value" class="resp-meta">${db.respondent.region ? `Selected: ${esc(db.respondent.region)}` : "No region selected"}</span>
      </div>

      <div class="resp-line">
        <span class="resp-field-label">Age:</span>
        <div class="resp-input-row">
          <input type="number" id="age-input" min="0" max="120" placeholder="e.g. 34">
          <button class="btn btn-primary btn-sm" type="button"
            hx-post="/api/respondent/age"
            hx-vals="js:{age:document.getElementById('age-input').value}"
            hx-target="#resp-ages"
            hx-swap="outerHTML"
            hx-on::after-request="document.getElementById('age-input').value=''">
            <i class="bi bi-plus-lg"></i> Add
          </button>
        </div>
        <span id="resp-ages" class="resp-meta">Age entries: ${db.respondent.ages.length}</span>

        <span class="resp-field-label service-label">Service Availed:</span>
        <div class="resp-input-row">
          <input type="text" id="service-input" placeholder="e.g. Issuance of Clearance">
          <button class="btn btn-primary btn-sm" type="button"
            hx-post="/api/respondent/service"
            hx-vals="js:{service:document.getElementById('service-input').value}"
            hx-target="#service-list"
            hx-swap="outerHTML"
            hx-on::after-request="document.getElementById('service-input').value=''">
            <i class="bi bi-plus-lg"></i> Add
          </button>
        </div>
      </div>

      <div class="resp-line resp-meta-line">
        <span id="service-list" class="resp-meta">
          ${serviceEntries.length === 0
            ? "Service entries: 0"
            : serviceEntries.map(([name, n]) => `${esc(name)}: ${n}`).join(" &middot; ")}
        </span>
      </div>
    </div>
  `;
}

function renderSectionA() {
  let html = `<section class="panel"><h2>SECTION A</h2>`;
  html += renderRespondentPanel();
  html += `<div class="section-a-questions">`;
  for (const q of db.sectionA) {
    html += `
      <div class="question-group">
        <div class="question-label"><span class="q-tag">${esc(q.id)}</span> ${esc(q.label)}</div>
        <div class="tally-options">
          ${q.options
            .map(
              (o) => `
            <button class="tally-btn"
              hx-post="/api/tally/a/${q.id}/${o.id}"
              hx-target="#${q.id}-${o.id}"
              hx-swap="outerHTML">
              <span class="option-label">${esc(o.label)}</span>
              ${countSpan(`${q.id}-${o.id}`, o.count)}
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }
  html += `</div></section>`;
  return html;
}

function renderSectionB() {
  const scale = [
    { n: "1", label: "Strongly Disagree" },
    { n: "2", label: "Disagree" },
    { n: "3", label: "Neither Agree nor Disagree" },
    { n: "4", label: "Agree" },
    { n: "5", label: "Strongly Agree" },
    { n: "", label: "N/A" },
  ];
  return `
    <section class="panel">
      <h2>SECTION B - RATING QUESTIONS</h2>
      <div class="rating-grid">
        <div class="rating-head">
          <span class="rating-head-lbl">Service Quality Dimensions</span>
          ${scale
            .map(
              (s) => `
            <span class="rating-head-col">
              <em>${s.n}</em>
              <span>${s.label}</span>
            </span>
          `
            )
            .join("")}
        </div>
        ${db.sectionB
          .map(
            (q) => `
          <div class="rating-row">
            <span class="rating-label" title="${esc(q.label)}">${esc(q.id)}. ${esc(q.label)}</span>
            ${q.counts
              .map(
                (c, i) => `
              <button class="rating-btn"
                hx-post="/api/tally/b/${q.id}/${i + 1}"
                hx-target="#${q.id}-r${i + 1}"
                hx-swap="outerHTML">
                ${countSpan(`${q.id}-r${i + 1}`, c)}
              </button>
            `
              )
              .join("")}
            <button class="rating-btn na-cell"
              hx-post="/api/tally/b/${q.id}/na"
              hx-target="#${q.id}-na"
              hx-swap="outerHTML">
              ${countSpan(`${q.id}-na`, q.na)}
            </button>
          </div>
        `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTallyBody() {
  return renderSectionA() + renderSectionB();
}

function renderSessionHeader() {
  return `
    <div class="session-info">
      <div class="session-info-left">
        <div class="sess-tag">ARTA &middot; CSM</div>
        <strong>${esc(db.formTitle)}</strong>
        <div class="session-label">Session: ${esc(db.session)}</div>
      </div>
      <div class="session-info-right">
        Total Forms: <strong id="total-value">${totalForms()}</strong>
      </div>
    </div>
  `;
}

// ── API Routes ──────────────────────────────────────────────────────────────

app.get("/api/state", (_req, res) => {
  res.json({ ...db, totalForms: totalForms(), totalTallies: totalTallies() });
});

// Respondent: client type tally
app.post("/api/respondent/type/:id", (req, res) => {
  const t = db.respondent.clientTypes.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).send("Client type not found");
  pushUndo();
  t.count++;
  res.send(countSpan(`${t.id}-count-a`, t.count) + oobTotal());
});

// Respondent: sex tally
app.post("/api/respondent/sex/:id", (req, res) => {
  const s = db.respondent.sex.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).send("Sex not found");
  pushUndo();
  s.count++;
  res.send(countSpan(`${s.id}-count-b`, s.count) + oobTotal());
});

// Respondent: age input
app.post("/api/respondent/age", (req, res) => {
  const age = parseInt(req.body.age);
  if (Number.isNaN(age) || age < 0 || age > 120) {
    return res.send(`<span id="resp-ages" class="resp-meta">Age entries: ${db.respondent.ages.length} (invalid input ignored)</span>`);
  }
  pushUndo();
  db.respondent.ages.push(age);
  res.send(`<span id="resp-ages" class="resp-meta">Age entries: ${db.respondent.ages.length}</span>`);
});

// Respondent: Philippine region selector
app.post("/api/respondent/region", (req, res) => {
  const region = String(req.body.region || "").trim();
  if (!PHILIPPINE_REGIONS.includes(region)) {
    return res.send(`<span id="region-value" class="resp-meta">${db.respondent.region ? `Selected: ${esc(db.respondent.region)}` : "No region selected"} (choose a valid region)</span>`);
  }
  pushUndo();
  db.respondent.region = region;
  res.send(`<span id="region-value" class="resp-meta">Selected: ${esc(region)}</span>` + oobTotal());
});

// Respondent: service availed input
app.post("/api/respondent/service", (req, res) => {
  const service = String(req.body.service || "").trim();
  if (!service) {
    return res.send(renderServiceMeta());
  }
  pushUndo();
  db.respondent.services[service] = (db.respondent.services[service] || 0) + 1;
  res.send(renderServiceMeta());
});

function renderServiceMeta() {
  const entries = Object.entries(db.respondent.services).sort((a, b) => b[1] - a[1]);
  return `<span id="service-list" class="resp-meta">
    ${entries.length === 0
      ? "Service entries: 0"
      : entries.map(([name, n]) => `${esc(name)}: ${n}`).join(" &middot; ")}
  </span>`;
}

// Section A tally
app.post("/api/tally/a/:questionId/:optionId", (req, res) => {
  const { questionId, optionId } = req.params;
  const q = db.sectionA.find((x) => x.id === questionId);
  const o = q && q.options.find((x) => x.id === optionId);
  if (!q || !o) return res.status(404).send("Not found");
  pushUndo();
  o.count++;
  res.send(countSpan(`${q.id}-${o.id}`, o.count) + oobTotal());
});

// Section B rating tally (1-5 or na)
app.post("/api/tally/b/:questionId/:rating", (req, res) => {
  const { questionId, rating } = req.params;
  const q = db.sectionB.find((x) => x.id === questionId);
  if (!q) return res.status(404).send("Not found");

  if (rating === "na") {
    pushUndo();
    q.na++;
    return res.send(countSpan(`${q.id}-na`, q.na) + oobTotal());
  }

  const idx = parseInt(rating) - 1;
  if (idx < 0 || idx > 4) return res.status(400).send("Invalid rating");
  pushUndo();
  q.counts[idx]++;
  res.send(countSpan(`${q.id}-r${idx + 1}`, q.counts[idx]) + oobTotal());
});

// Undo
app.post("/api/undo", (_req, res) => {
  if (undoStack.length === 0) return res.status(400).send("Nothing to undo");
  db = undoStack.pop();
  res.redirect("/");
});

// Undo last action as JSON so the UI can re-render
app.post("/api/undo-json", (_req, res) => {
  if (undoStack.length === 0) return res.status(400).json({ ok: false });
  db = undoStack.pop();
  res.json({ ok: true });
});

// Settings (title / session)
app.post("/api/settings", (req, res) => {
  const { formTitle, session } = req.body;
  pushUndo();
  if (formTitle !== undefined && String(formTitle).trim() !== "") db.formTitle = String(formTitle).trim();
  if (session !== undefined && String(session).trim() !== "") db.session = String(session).trim();
  res.redirect("/");
});

// Reset all tallies
app.post("/api/reset", (_req, res) => {
  pushUndo();
  for (const t of db.respondent.clientTypes) t.count = 0;
  for (const s of db.respondent.sex) s.count = 0;
  db.respondent.ages = [];
  db.respondent.region = "";
  db.respondent.services = {};
  for (const q of db.sectionA) for (const o of q.options) o.count = 0;
  for (const q of db.sectionB) {
    q.counts = [0, 0, 0, 0, 0];
    q.na = 0;
  }
  res.redirect("/");
});

// ── Pages ───────────────────────────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "tally.html"));
});

app.get("/summary", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "summary.html"));
});

// ── Fragments ───────────────────────────────────────────────────────────────

app.get("/api/tally-body", (_req, res) => res.send(renderTallyBody()));
app.get("/api/session-header", (_req, res) => res.send(renderSessionHeader()));

// Summary: Section A (respondent profile + CC)
app.get("/api/summary/a", (_req, res) => {
  let html = `<h2>SECTION A</h2>`;

  // Client type
  const ctTotal = db.respondent.clientTypes.reduce((s, t) => s + t.count, 0);
  html += `
    <div class="summary-question">
      <div class="summary-question-label">Client Type</div>
      <div class="summary-options">
        ${db.respondent.clientTypes
          .map((t) => {
            const pct = ctTotal ? Math.round((t.count / ctTotal) * 100) : 0;
            return `<div class="summary-option">${esc(t.label)}: ${t.count} (${pct}%)</div>`;
          })
          .join("")}
      </div>
    </div>`;

  // Region
  if (db.respondent.region) {
    html += `
      <div class="summary-question">
        <div class="summary-question-label">Region</div>
        <div class="summary-options">
          <div class="summary-option">${esc(db.respondent.region)}</div>
        </div>
      </div>`;
  }

  // Sex
  const sexTotal = db.respondent.sex.reduce((s, x) => s + x.count, 0);
  html += `
    <div class="summary-question">
      <div class="summary-question-label">Sex</div>
      <div class="summary-options">
        ${db.respondent.sex
          .map((s) => {
            const pct = sexTotal ? Math.round((s.count / sexTotal) * 100) : 0;
            return `<div class="summary-option">${esc(s.label)}: ${s.count} (${pct}%)</div>`;
          })
          .join("")}
      </div>
    </div>`;

  // Age
  const ages = db.respondent.ages;
  if (ages.length > 0) {
    const avg = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
    const min = Math.min(...ages);
    const max = Math.max(...ages);
    html += `
      <div class="summary-question">
        <div class="summary-question-label">Age</div>
        <div class="summary-options">
          <div class="summary-option">Recorded: ${ages.length}</div>
          <div class="summary-option">Average Age: ${avg}</div>
          <div class="summary-option">Range: ${min} - ${max}</div>
        </div>
      </div>`;
  }

  // Services
  const services = Object.entries(db.respondent.services).sort((a, b) => b[1] - a[1]);
  if (services.length > 0) {
    const svcTotal = services.reduce((s, [, n]) => s + n, 0);
    html += `
      <div class="summary-question">
        <div class="summary-question-label">Service Availed</div>
        <div class="summary-options">
          ${services
            .map(([name, n]) => {
              const pct = svcTotal ? Math.round((n / svcTotal) * 100) : 0;
              return `<div class="summary-option">${esc(name)}: ${n} (${pct}%)</div>`;
            })
            .join("")}
        </div>
      </div>`;
  }

  // CC questions
  for (const q of db.sectionA) {
    const total = q.options.reduce((s, o) => s + o.count, 0);
    html += `
      <div class="summary-question">
        <div class="summary-question-label">${esc(q.id)}. ${esc(q.label)}</div>
        <div class="summary-options">
          ${q.options
            .map((o) => {
              const pct = total ? Math.round((o.count / total) * 100) : 0;
              return `<div class="summary-option">${esc(o.label)}: ${o.count} (${pct}%)</div>`;
            })
            .join("")}
        </div>
      </div>`;
  }

  res.send(html);
});

// Summary: Section B (SQD likert table)
app.get("/api/summary/b", (_req, res) => {
  const ratings = [
    "1 Strongly Disagree",
    "2 Disagree",
    "3 Neither Agree nor Disagree",
    "4 Agree",
    "5 Strongly Agree",
    "N/A",
  ];

  let html = `
    <h2>SECTION B - RATING QUESTIONS</h2>
    <div class="summary-table-wrap">
      <table class="summary-table">
        <thead>
          <tr>
            <th>Service Quality Dimensions</th>
            ${ratings.map((r) => `<th>${esc(r)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>`;

  for (const q of db.sectionB) {
    const total = q.counts.reduce((s, c) => s + c, 0) + q.na;
    html += `
      <tr>
        <td class="row-header">${esc(q.id)}. ${esc(q.label)}</td>
        ${q.counts
          .map((c) => {
            const pct = total ? Math.round((c / total) * 100) : 0;
            return `<td>${c}<br><span class="pct">(${pct}%)</span></td>`;
          })
          .join("")}
        <td>${q.na}<br><span class="pct">(${total ? Math.round((q.na / total) * 100) : 0}%)</span></td>
      </tr>`;
  }

  html += `</tbody></table></div>`;
  res.send(html);
});

app.get("/api/summary/header", (_req, res) => {
  res.send(`
    <strong>${esc(db.formTitle)}</strong>
    <div>Total Forms: ${totalForms()}</div>
  `);
});

// ── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`HR Tally System running at http://localhost:${PORT}`);
});