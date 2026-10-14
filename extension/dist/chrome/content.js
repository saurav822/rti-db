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

    const ministry = await waitFor(SELECTORS.ministry);
    const authorityText = payload.authority || payload.department;
    if (ministry && payload.department && selectByText(ministry, payload.department)) {
      report.filled.push("Ministry");
      const department = await waitFor(SELECTORS.department);
      if ((await waitForOptions(department)) && authorityText && selectByText(department, authorityText)) {
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

    return report;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === "openrti-fill") {
      fillPortalForm(message.payload).then(sendResponse);
      return true; // keep the channel open for the async reply
    }
    return false;
  });
})();
