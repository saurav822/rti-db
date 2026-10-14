// Runs in a full tab opened by background.js. Reads the copied OpenRTI payload
// from the clipboard and asks the RTI Online tab (id passed in the URL) to fill the form.
const button = document.getElementById("fill");
const reportEl = document.getElementById("report");
const api = typeof browser !== "undefined" ? browser : chrome;

function show(html) {
  reportEl.innerHTML = html;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderReport(report) {
  const filled = report.filled.map((f) => `<div class="ok">✓ ${escapeHtml(f)}</div>`).join("");
  const skipped = report.skipped.map((s) => `<div class="note">– ${escapeHtml(s)} (empty, skipped)</div>`).join("");
  const failed = report.failed.map((f) => `<div class="bad">✗ ${escapeHtml(f.field)}: ${escapeHtml(f.reason)}</div>`).join("");
  show(`${filled}${skipped}${failed}`);
}

const targetTabId = Number(new URLSearchParams(window.location.search).get("tab"));

button.addEventListener("click", async () => {
  show("Reading copied data…");

  let payload;
  try {
    payload = JSON.parse(await navigator.clipboard.readText());
  } catch (err) {
    show(`<div class="bad">Could not read clipboard data. Copy the form data from openrti first.</div>`);
    return;
  }

  if (!targetTabId) {
    show(`<div class="warn">Open the RTI Online form in a tab, then click the OpenRTI icon while that tab is open.</div>`);
    return;
  }

  show("Filling the form…");
  try {
    const report = await api.tabs.sendMessage(targetTabId, { type: "openrti-fill", payload });
    renderReport(report);
  } catch (err) {
    show(`<div class="bad">Could not reach the RTI Online form. Reload that tab and try again.</div>`);
  }
});
