// OpenRTI portal filler. Runs on rtionline.gov.in only (see manifests).
// Fills the main RTI form from a payload the citizen copied from our site.
// Deliberately never fills CAPTCHA, OTP, email, mobile, attachments or payment.
(function () {
  // Avoid attaching a second listener if the tab already had this script
  // injected (declaratively on page load, and again on demand by the icon
  // click for tabs that were already open before the extension loaded).
  if (window.__openrtiContentLoaded) return;
  window.__openrtiContentLoaded = true;

  const PAYLOAD_VERSION = "openrti-portal-v1";

  const SELECTORS = {
    ministry: "select[name='MinistryId']",
    department: "select[name='DepartmentId']",
    name: "input[name='Name']",
    confirmEmail: "input[name='ConfirmEmail']",
    address1: "input[name='address1']",
    pincode: "input[name='pincode']",
    phone: "input[name='phone']",
    state: "select[name='stateId']",
    description: "textarea[name='Description']",
    bpl: "select[name='BPL']",
    gender: {
      M: "input[name='gender'][value='M']",
      F: "input[name='gender'][value='F']",
      T: "input[name='gender'][value='T']",
    },
  };

  // The portal's own page script shows a blocking alert()/confirm() when the
  // Ministry dropdown changes ("Your request will be filed with ..."). While
  // that's open, ALL page JavaScript is frozen — including the AJAX call
  // that populates the Public Authority dropdown — so our fill would hang
  // until a human clicks OK. Content scripts run in an isolated JS world and
  // don't share `window` with the page, so neutralising alert/confirm has to
  // happen in the page's actual MAIN world. We ask the background script to
  // do that via chrome.scripting (world: "MAIN") — the officially supported
  // mechanism for this, which isn't subject to the same CSP/Trusted Types
  // edge cases as injecting a raw <script> tag — then restore them
  // afterward so normal portal behaviour still works for anything the
  // citizen does manually later.
  function setPageDialogsSuppressed(suppressed) {
    return chrome.runtime.sendMessage({ type: "openrti-set-dialogs-suppressed", suppressed }).catch(() => {});
  }
  function suppressPageDialogs() { return setPageDialogsSuppressed(true); }
  function restorePageDialogs() { return setPageDialogsSuppressed(false); }

  // Select by the option's numeric value, through the page's own jQuery
  // instance — see the comment above selectViaPageJQuery in background.js
  // for why this is needed instead of a native dispatchEvent.
  async function selectByValueViaJQuery(selector, value) {
    try {
      const result = await chrome.runtime.sendMessage({ type: "openrti-jquery-select", selector, value });
      return !!(result && result.ok);
    } catch {
      return false;
    }
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitFor(selector, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  }

  // AJAX-populated selects gain options after the parent changes.
  async function waitForOptions(select, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (select && select.options.length > 1) return true;
      await sleep(200);
    }
    return false;
  }

  function setValue(el, value) {
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
  }

  function normalise(text) {
    return (text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  // Picks the option whose label matches the target best. Returns true on success.
  function selectByText(select, target) {
    const wanted = normalise(target);
    if (!wanted) return false;
    let best = null;
    let bestScore = 0;
    for (const option of select.options) {
      const label = normalise(option.textContent);
      if (!label) continue;
      if (label === wanted) {
        best = option;
        break;
      }
      if (label.includes(wanted) || wanted.includes(label)) {
        const score = Math.min(label.length, wanted.length);
        if (score > bestScore) {
          best = option;
          bestScore = score;
        }
      }
    }
    if (!best) return false;
    select.value = best.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  async function fillPortalForm(payload) {
    const report = { filled: [], skipped: [], failed: [] };

    if (!payload || payload.version !== PAYLOAD_VERSION) {
      report.failed.push({ field: "payload", reason: "Not an OpenRTI form payload" });
      return report;
    }

    const applicant = payload.applicant || {};

    await suppressPageDialogs();
    try {

    const ministry = await waitFor(SELECTORS.ministry);
    const authorityText = payload.authority || payload.department;

    // Prefer selecting by the option's numeric value through the page's own
    // jQuery — this is the same mechanism admin's Python automation uses,
    // and (unlike a synthetic native 'change' event) reliably triggers
    // whatever JS widget the portal wraps around these dropdowns. Selecting
    // by value also needs no AJAX/options wait, since this population turns
    // out to be synchronous client-side filtering, not a network call.
    let ministryOk = false;
    if (ministry && payload.ministry_id) {
      ministryOk = await selectByValueViaJQuery(SELECTORS.ministry, payload.ministry_id);
      console.log("[OpenRTI] Ministry selected via jQuery by value:", payload.ministry_id, "→", ministryOk);
    }
    if (!ministryOk && ministry && payload.department) {
      ministryOk = selectByText(ministry, payload.department);
      console.log("[OpenRTI] Ministry selected via text fallback:", ministryOk);
    }

    if (ministryOk) {
      report.filled.push("Ministry");

      const department = await waitFor(SELECTORS.department);
      let authorityOk = false;
      if (department && payload.authority_id) {
        // The option may not exist in the DOM the instant the Ministry
        // change event fires — retry for a few seconds rather than giving
        // up on the first attempt.
        const start = Date.now();
        while (!authorityOk && Date.now() - start < 8000) {
          authorityOk = await selectByValueViaJQuery(SELECTORS.department, payload.authority_id);
          if (!authorityOk) await sleep(400);
        }
        console.log("[OpenRTI] Public Authority selected via jQuery by value:", payload.authority_id, "→", authorityOk);
      }
      if (!authorityOk && department) {
        // Fallback: wait for options then match by text (handles the case
        // where we don't have an authority_id, or jQuery selection failed).
        const gotOptions = await waitForOptions(department, 20000);
        console.log(
          "[OpenRTI] Public Authority options loaded:", gotOptions,
          "| looking for:", authorityText,
          "| available:", Array.from(department.options).map((o) => o.textContent.trim())
        );
        authorityOk = gotOptions && authorityText && selectByText(department, authorityText);
      }

      if (authorityOk) {
        report.filled.push("Public Authority");
      } else {
        report.failed.push({ field: "Public Authority", reason: "No matching public authority. Choose it manually." });
      }
    } else {
      report.failed.push({ field: "Ministry", reason: "No matching ministry. Choose it manually." });
    }

    // Applicant is never below the poverty line through this flow — always "No".
    const bpl = await waitFor(SELECTORS.bpl, 4000);
    if (bpl) {
      setValue(bpl, "N");
      report.filled.push("Below Poverty Line");
    } else {
      report.failed.push({ field: "Below Poverty Line", reason: "Field not found on this page" });
    }

    const textFields = [
      ["Name", SELECTORS.name, applicant.name],
      ["Confirm Email", SELECTORS.confirmEmail, applicant.email],
      ["Address", SELECTORS.address1, applicant.address],
      ["PIN code", SELECTORS.pincode, applicant.pincode],
      ["Phone", SELECTORS.phone, applicant.phone],
      ["Description", SELECTORS.description, payload.description],
    ];

    for (const [label, selector, value] of textFields) {
      if (!value) {
        report.skipped.push(label);
        continue;
      }
      const el = await waitFor(selector, 4000);
      if (el) {
        setValue(el, value);
        report.filled.push(label);
      } else {
        report.failed.push({ field: label, reason: "Field not found on this page" });
      }
    }

    if (applicant.state) {
      const stateSelect = await waitFor(SELECTORS.state, 4000);
      if (stateSelect && selectByText(stateSelect, applicant.state)) {
        report.filled.push("State");
      } else {
        report.failed.push({ field: "State", reason: "No matching state. Choose it manually." });
      }
    } else {
      report.skipped.push("State");
    }

    const genderKey = (applicant.gender || "").toUpperCase().charAt(0);
    if (genderKey && SELECTORS.gender[genderKey]) {
      const radio = await waitFor(SELECTORS.gender[genderKey], 4000);
      if (radio) {
        radio.click();
        report.filled.push("Gender");
      } else {
        report.failed.push({ field: "Gender", reason: "Gender option not found" });
      }
    } else {
      report.skipped.push("Gender");
    }

    } finally {
      await restorePageDialogs();
    }

    return report;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === "openrti-fill") {
      fillPortalForm(message.payload).then(sendResponse);
      return true; // keep the channel open for the async reply
    }
    return false;
  });

  function summariseReport(report) {
    const lines = [];
    if (report.filled.length) lines.push(`Filled: ${report.filled.join(", ")}`);
    if (report.skipped.length) lines.push(`Skipped (empty): ${report.skipped.join(", ")}`);
    if (report.failed.length) lines.push(`Could not fill — please check manually: ${report.failed.map((f) => f.field).join(", ")}`);
    if (lines.length === 0) lines.push("Nothing to fill.");
    lines.push("Please read and verify every field before submitting, then fill the CAPTCHA manually and submit yourself.");
    return lines.join("\n\n");
  }

  // Automatically prompt to fill once the actual filing form (Ministry
  // dropdown) has loaded — this is the signal that the citizen has already
  // logged in, accepted the portal's terms and reached the request page.
  (async function autoPrompt() {
    const ministry = await waitFor(SELECTORS.ministry, 15000);
    if (!ministry) return; // not the filing page (or it never loaded)

    let payload;
    try {
      const clip = await navigator.clipboard.readText();
      payload = JSON.parse(clip);
    } catch {
      return; // nothing usable on the clipboard — stay silent, don't interrupt the citizen
    }
    if (!payload || payload.version !== PAYLOAD_VERSION) return;

    const wantsFill = confirm(
      "Fill this RTI form using the draft you copied from RTIgram?\n\nYou will still need to enter the CAPTCHA and complete submission/payment yourself."
    );
    if (!wantsFill) return;

    const report = await fillPortalForm(payload);
    alert(summariseReport(report));
  })();
})();
