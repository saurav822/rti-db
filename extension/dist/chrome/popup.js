// Runs in a full tab opened by background.js. Reads the copied OpenRTI payload
// from the clipboard and asks the RTI Online tab (id passed in the URL) to fill the form.
const button = document.getElementById("fill");
const reportEl = document.getElementById("report");
const api = typeof browser !== "undefined" ? browser : chrome;

function clear() {
  reportEl.textContent = "";
}

function showText(text) {
  clear();
  reportEl.textContent = text;
}

function addLine(className, text) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  reportEl.appendChild(div);
}

function renderReport(report) {
  clear();
  report.filled.forEach((f) => addLine("ok", `✓ ${f}`));
  report.skipped.forEach((s) => addLine("note", `– ${s} (empty, skipped)`));
  report.failed.forEach((f) => addLine("bad", `✗ ${f.field}: ${f.reason}`));
}

const targetTabId = Number(new URLSearchParams(window.location.search).get("tab"));

button.addEventListener("click", async () => {
  showText("Reading copied data…");

  let payload;
  try {
    payload = JSON.parse(await navigator.clipboard.readText());
  } catch (err) {
    clear();
    addLine("bad", "Could not read clipboard data. Copy the form data from rtigram.com first.");
    return;
  }

  if (!targetTabId) {
    clear();
    addLine("warn", "Open the RTI Online form in a tab, then click the RTIgram Autofill icon while that tab is open.");
    return;
  }

  showText("Filling the form…");
  try {
    const report = await api.tabs.sendMessage(targetTabId, { type: "openrti-fill", payload });
    renderReport(report);
  } catch (err) {
    clear();
    addLine("bad", "Could not reach the RTI Online form. Reload that tab and try again.");
  }
});
