// Clicking the toolbar icon opens the filler in a full tab. Toolbar popups close
// whenever focus moves (for example to devtools), so a tab is more reliable.
//
// It also injects content.js into the clicked tab before opening the filler.
// A tab that was already open before the extension loaded never got the
// declarative content script, so this guarantees it's present without
// asking the citizen to reload the RTI Online tab first.
const api = typeof browser !== "undefined" ? browser : chrome;

api.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.startsWith("https://rtionline.gov.in/")) {
    try {
      await api.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    } catch (err) {
      // Already injected, or the page blocked it — the filler will report
      // "could not reach the form" if it's genuinely missing.
    }
  }

  const params = new URLSearchParams({ tab: String(tab.id) });
  api.tabs.create({ url: api.runtime.getURL(`popup.html?${params.toString()}`) });
});
