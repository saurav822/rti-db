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

// The portal shows a blocking alert()/confirm() when the Ministry dropdown
// changes, which freezes ALL page JS (including the AJAX call that
// populates the Public Authority dropdown) until a human clicks OK.
// content.js runs in an isolated JS world and can't reliably neutralise the
// page's own alert/confirm from there, so it asks the background script to
// run code in the page's actual MAIN world via chrome.scripting — the
// officially supported mechanism for this, not subject to the same CSP/
// Trusted Types edge cases as injecting a raw <script> tag.
function setPageDialogsSuppressed(tabId, suppressed) {
  return api.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (suppressed) => {
      if (suppressed) {
        window.__openrtiOrigAlert = window.__openrtiOrigAlert || window.alert;
        window.__openrtiOrigConfirm = window.__openrtiOrigConfirm || window.confirm;
        window.alert = function () {};
        window.confirm = function () { return true; };
      } else {
        if (window.__openrtiOrigAlert) { window.alert = window.__openrtiOrigAlert; delete window.__openrtiOrigAlert; }
        if (window.__openrtiOrigConfirm) { window.confirm = window.__openrtiOrigConfirm; delete window.__openrtiOrigConfirm; }
      }
    },
    args: [suppressed],
  });
}

// Selecting the Ministry/Public Authority dropdowns by setting .value and
// dispatching a native 'change' event (from the content script's isolated
// JS world) works for plain <select> elements, but this portal appears to
// wrap them with a jQuery-managed widget (note the "Search Public
// Authority" box) whose own change handling isn't reliably triggered by a
// synthetic native DOM event. Calling the page's own jQuery object's
// .trigger('change') runs through the exact same code path a real user
// interaction does, and selecting by the option's numeric value (not its
// visible text) matches how the existing admin Playwright automation
// reliably selects these same fields.
function selectViaPageJQuery(tabId, selector, value) {
  return api.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (selector, value) => {
      const $ = window.jQuery || window.$;
      if (!$) return { ok: false, reason: "jQuery not found on page" };
      const el = $(selector);
      if (!el.length) return { ok: false, reason: "element not found" };
      // .val() silently no-ops if no <option> with this value exists yet —
      // verify it actually applied rather than trusting a successful call.
      el.val(String(value));
      const applied = el.val() === String(value);
      if (!applied) return { ok: false, reason: `option value ${value} not found in dropdown yet` };
      el.trigger("change");
      return { ok: true };
    },
    args: [selector, value],
  }).then((results) => (results && results[0] && results[0].result) || { ok: false, reason: "no result" });
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "openrti-set-dialogs-suppressed" && sender.tab) {
    setPageDialogsSuppressed(sender.tab.id, !!message.suppressed)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the channel open for the async reply
  }
  if (message && message.type === "openrti-jquery-select" && sender.tab) {
    selectViaPageJQuery(sender.tab.id, message.selector, message.value)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  return false;
});
