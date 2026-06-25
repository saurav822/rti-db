#!/usr/bin/env python3
"""
Semi-automatic RTI filer for rtionline.delhi.gov.in (Delhi State portal).

Mirrors autofill.py (central) with three Delhi-specific changes:
  1. CAPTCHA is read straight from the DOM (#capVal) — no Gemini OCR.
  2. Public Authority is a single-level select[name='MinistryId'] (221 Delhi
     departments from delhi_authorities.json) — no Ministry->Department AJAX.
  3. Authority is resolved from .env (RTI_DELHI_AUTHORITY_ID / RTI_DELHI_AUTHORITY)
     or from a draft's authority_id/authority_label when present.

Setup:
    pip install -r requirements.txt
    playwright install chromium

Usage:
    # From a saved draft:
    python autofill_delhi.py --draft-id <uuid> --backend http://localhost:3001

    # From inline JSON:
    python autofill_delhi.py --json '{"subject":"...","information_sought":"...","authority_label":"Transport Department"}'

    # Probe mode — pause before each step to inspect selectors:
    python autofill_delhi.py --draft-id <uuid> --probe

Required env (backend/python/autofill/.env):
    RTI_NAME, RTI_EMAIL, RTI_PHONE, RTI_ADDRESS, RTI_PIN
Delhi authority (pick one):
    RTI_DELHI_AUTHORITY_ID   exact MinistryId value, e.g. "172"
    RTI_DELHI_AUTHORITY      name to fuzzy-match, e.g. "Transport Department"

Human checkpoints (browser stays open):
    1. OTP      — if the portal emails one (auto-fetched from Gmail if configured)
    2. Payment  — complete the fee in the browser, then press Enter
"""

import argparse
import json
import os
import sys
import time
import textwrap
import difflib
from pathlib import Path

import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

import selectors_delhi as S

# Reuse the central script's Gmail OTP fetcher + small UI helpers
from autofill import (
    hr, step, warn, ok, pause,
    dump_inputs, fill, select_option_fuzzy, click,
    fetch_draft, extract_name_parts,
    fetch_otp_from_gmail,
)

# ── Load Delhi authority list ──────────────────────────────────────────────────
_AUTH_FILE = Path(__file__).parent / "delhi_authorities.json"
_AUTHORITIES = []
if _AUTH_FILE.exists():
    _AUTHORITIES = json.loads(_AUTH_FILE.read_text()).get("authorities", [])

# ── Load env ──────────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent / ".env", override=True)

RTI_NAME            = os.getenv("RTI_NAME", "")
RTI_EMAIL           = os.getenv("RTI_EMAIL", "")
RTI_PHONE           = os.getenv("RTI_PHONE", "")
RTI_ADDRESS         = os.getenv("RTI_ADDRESS", "")
RTI_PIN             = os.getenv("RTI_PIN", "")
RTI_STATE           = os.getenv("RTI_STATE", "Delhi")
RTI_GENDER          = os.getenv("RTI_GENDER", "M")
RTI_STATUS          = os.getenv("RTI_STATUS", "U")
RTI_CITIZENSHIP     = os.getenv("RTI_CITIZENSHIP", "I")
RTI_BPL             = os.getenv("RTI_BPL", "N")
RTI_COUNTRY         = os.getenv("RTI_COUNTRY", "001")
RTI_DELHI_AUTHORITY_ID = os.getenv("RTI_DELHI_AUTHORITY_ID", "")
RTI_DELHI_AUTHORITY    = os.getenv("RTI_DELHI_AUTHORITY", "")


# ── Authority resolution (single level) ─────────────────────────────────────────

def resolve_authority(authority_id: str, authority_label: str):
    """
    Return (id, label) for the Delhi Public Authority dropdown.
    Priority: explicit id -> fuzzy name match against delhi_authorities.json.
    """
    by_id = {a["id"]: a["label"] for a in _AUTHORITIES}
    if authority_id and authority_id in by_id:
        return authority_id, by_id[authority_id]

    if authority_label:
        target = authority_label.strip().lower()
        # exact / substring first
        for a in _AUTHORITIES:
            if a["label"].strip().lower() == target:
                return a["id"], a["label"]
        for a in _AUTHORITIES:
            lbl = a["label"].strip().lower()
            if target in lbl or lbl in target:
                return a["id"], a["label"]
        # fuzzy fallback
        labels = [a["label"] for a in _AUTHORITIES]
        match = difflib.get_close_matches(authority_label, labels, n=1, cutoff=0.6)
        if match:
            a = next(x for x in _AUTHORITIES if x["label"] == match[0])
            return a["id"], a["label"]

    return "", ""


# ── Client-side CAPTCHA reader ──────────────────────────────────────────────────

def read_client_captcha(page, value_selector: str, *, retries: int = 3) -> str:
    """
    Delhi's captcha answer lives in a readonly input (#capVal) injected by
    captcha.php. Read it straight from the DOM — no OCR needed.
    """
    for _ in range(retries):
        for sel in [s.strip() for s in value_selector.split(",")]:
            try:
                el = page.query_selector(sel)
                if el:
                    val = (el.input_value() or el.get_attribute("value") or "").strip()
                    if val:
                        return val
            except Exception:
                continue
        time.sleep(0.6)  # captcha.php loads via AJAX on window.onload
    return ""


def solve_and_submit_captcha(page, input_sel, value_sel, submit_sel, leave_url_substr,
                             probe=False):
    """
    Read captcha from DOM, fill the input, click submit, wait to leave the page.
    Falls back to a manual pause if the answer can't be read.
    """
    answer = read_client_captcha(page, value_sel)
    if not answer:
        warn("Could not read client-side captcha from DOM — falling back to manual.")
        pause("Type the CAPTCHA in the browser, click Submit there, then press Continue here.")
        try:
            page.wait_for_function(
                f"() => !window.location.href.includes('{leave_url_substr}')",
                timeout=30000,
            )
            page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass
        return

    ok(f"Captcha read from DOM: {answer!r}")
    fill(page, input_sel, answer, probe=probe)

    submitted = False
    for sel in [s.strip() for s in submit_sel.split(",")]:
        try:
            page.click(sel, timeout=3000)
            submitted = True
            break
        except Exception:
            continue
    if not submitted:
        pause("Could not auto-click Submit — click it in the browser, then press Enter.")
        return

    try:
        page.wait_for_load_state("networkidle", timeout=20000)
    except Exception:
        pass


# ── Main filler ────────────────────────────────────────────────────────────────

def run(draft: dict, probe: bool = False, auto_confirm: bool = False):
    name    = draft.get("applicant_name")    or RTI_NAME
    phone   = draft.get("applicant_phone")   or RTI_PHONE
    address = draft.get("applicant_address") or RTI_ADDRESS
    email   = RTI_EMAIL
    pin     = draft.get("applicant_pincode") or RTI_PIN

    _GENDER_MAP = {"Male": "M", "Female": "F", "Other": "T"}
    raw_gender  = draft.get("applicant_gender") or RTI_GENDER
    gender_code = _GENDER_MAP.get(raw_gender, (raw_gender or "M").upper()[:1])

    applicant_state_val = draft.get("applicant_state") or RTI_STATE

    subject     = draft.get("draft_subject") or draft.get("subject", "")
    info_sought = draft.get("draft_information_sought") or draft.get("information_sought", "")
    full_body   = draft.get("draft_body") or draft.get("full_application", "")
    body_text   = info_sought if info_sought.strip() else full_body

    # Authority: draft IDs (if classified) > env
    authority_id, authority_label = resolve_authority(
        draft.get("authority_id") or RTI_DELHI_AUTHORITY_ID,
        draft.get("authority_label") or RTI_DELHI_AUTHORITY,
    )

    missing = []
    if not name:    missing.append("RTI_NAME")
    if not email:   missing.append("RTI_EMAIL")
    if not phone:   missing.append("RTI_PHONE")
    if not address: missing.append("RTI_ADDRESS")
    if not subject: missing.append("subject (from draft)")
    if not body_text: missing.append("information sought (from draft)")
    if missing:
        print(f"\n  ✗ Missing required fields: {', '.join(missing)}\n")
        sys.exit(1)

    print(f"""
  Summary of what will be auto-filled (Delhi portal):
  ───────────────────────────────────────────────────
  Name        : {name}
  Gender      : {raw_gender or '(default)'} → {gender_code}
  Email       : {email}
  Phone       : {phone}
  Address     : {address[:60]}{'…' if len(address) > 60 else ''}
  PIN Code    : {pin or '(not set)'}
  Appl. State : {applicant_state_val or '(not set)'}
  Authority   : {authority_label or '(NOT RESOLVED — set RTI_DELHI_AUTHORITY[_ID])'} (ID {authority_id or '—'})
  Subject     : {subject[:70]}{'…' if len(subject) > 70 else ''}
  Body        : {len(body_text)} characters
  ───────────────────────────────────────────────────
""")
    if not authority_id:
        warn("No Delhi Public Authority resolved — you'll be asked to pick it manually in the browser.")
    if not auto_confirm:
        if input("  Proceed? [y/N] ").strip().lower() != "y":
            print("  Aborted.")
            sys.exit(0)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False, slow_mo=150)
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        page.on("dialog", lambda dialog: dialog.accept())

        try:
            # ── Landing page ────────────────────────────────────────────────
            step(1, f"Opening {S.PORTAL_URL}")
            page.goto(S.PORTAL_URL, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_load_state("networkidle", timeout=15000)
            if probe:
                pause("PROBE: Landing page loaded. URL: " + page.url)

            step(2, "Filling Email + Mobile on landing page")
            if not fill(page, S.LANDING_EMAIL, email, probe=probe):
                dump_inputs(page)
                pause("Fill your email in the browser, then press Enter.")
            if not fill(page, S.LANDING_MOBILE, phone, probe=probe):
                dump_inputs(page)
                pause("Fill your mobile in the browser, then press Enter.")

            step(3, "Reading client-side CAPTCHA + submitting")
            solve_and_submit_captcha(
                page, S.LANDING_CAPTCHA_INPUT, S.LANDING_CAPTCHA_VALUE,
                S.LANDING_SUBMIT, "email_check", probe=probe,
            )
            ok(f"Now on: {page.url}")

            # ── Optional OTP page ───────────────────────────────────────────
            if "otp" in page.url.lower() or page.query_selector(S.OTP_INPUT):
                step(4, "OTP verification — fetching from Gmail")
                otp = fetch_otp_from_gmail(email)
                if otp and fill(page, S.OTP_INPUT, otp, probe=probe):
                    ok(f"OTP {otp!r} filled.")
                    if not click(page, S.BTN_VERIFY_OTP, timeout=5000):
                        pause("Click the OTP submit button in the browser, then press Enter.")
                else:
                    pause(f"Enter the OTP sent to {email} in the browser, then press Enter.")
                    click(page, S.BTN_VERIFY_OTP, timeout=5000)
                page.wait_for_load_state("networkidle", timeout=20000)
                ok(f"OTP step done. Now on: {page.url}")

            if probe:
                dump_inputs(page)
                pause("PROBE: On main form. About to fill personal details.")

            # ── Personal details ────────────────────────────────────────────
            step(5, "Filling personal details")
            fill(page, S.FIELD_CONFIRM_EMAIL, email, probe=probe)
            fill(page, S.FIELD_NAME, name, probe=probe)

            gender_sel = {
                "M": S.RADIO_GENDER_MALE,
                "F": S.RADIO_GENDER_FEMALE,
                "T": S.RADIO_GENDER_THIRD,
            }.get(gender_code, S.RADIO_GENDER_MALE)
            try:
                page.check(gender_sel)
            except Exception:
                pass

            fill(page, S.FIELD_ADDRESS1, address, probe=probe)
            fill(page, S.FIELD_PINCODE, pin, probe=probe)
            fill(page, S.FIELD_PHONE, phone, probe=probe)

            try:
                page.check(f"input[name='chkCountry'][value='{RTI_COUNTRY}']")
                page.check(f"input[name='status'][value='{RTI_STATUS.upper()}']")
                page.check(S.RADIO_LITERATE)
            except Exception:
                pass

            # Applicant home state — by code then fuzzy label
            state_code = S.STATE_CODE_MAP.get(applicant_state_val, "")
            state_done = False
            if state_code:
                try:
                    page.select_option(S.FIELD_STATE, value=state_code)
                    state_done = True
                except Exception:
                    pass
            if not state_done and applicant_state_val:
                state_done = select_option_fuzzy(page, S.FIELD_STATE, applicant_state_val, probe=probe)
            if state_done:
                ok(f"Applicant state set: {applicant_state_val}")

            if probe:
                pause("PROBE: Personal details filled — check the browser.")

            # ── RTI details ─────────────────────────────────────────────────
            step(6, "Filling Public Authority + RTI description")
            if authority_id:
                try:
                    page.select_option(S.FIELD_AUTHORITY, value=authority_id)
                    ok(f"Public Authority: {authority_label} (ID={authority_id})")
                except Exception as e:
                    warn(f"Could not select authority by ID ({e}); trying fuzzy by label.")
                    if not select_option_fuzzy(page, S.FIELD_AUTHORITY, authority_label, probe=probe):
                        pause("Select the Public Authority in the browser, then press Enter.")
            else:
                warn("No authority resolved — choose it manually.")
                pause("Select the Public Authority in the browser, then press Enter.")

            try:
                page.select_option(S.FIELD_CITIZENSHIP, value=RTI_CITIZENSHIP)
                page.select_option(S.FIELD_BPL, value=RTI_BPL)
            except Exception:
                pass

            body_trimmed = body_text[:3000]
            fill(page, S.FIELD_DESCRIPTION, body_trimmed, probe=probe)
            ok(f"RTI description filled ({len(body_trimmed)} chars)")

            if probe:
                pause("PROBE: RTI details filled — check the browser.")

            # ── Form CAPTCHA + submit ───────────────────────────────────────
            step(7, "Reading form CAPTCHA + submitting")
            solve_and_submit_captcha(
                page, S.FORM_CAPTCHA_INPUT, S.FORM_CAPTCHA_VALUE,
                S.BTN_SUBMIT_FORM, "request.php", probe=probe,
            )
            ok(f"Form submitted! Now on: {page.url}")

            # ── Optional OTP after form ─────────────────────────────────────
            if "otp" in page.url.lower() or page.query_selector(S.OTP_INPUT):
                step(8, "OTP — fetching from Gmail")
                otp = fetch_otp_from_gmail(email)
                if otp and fill(page, S.OTP_INPUT, otp, probe=probe):
                    ok(f"OTP {otp!r} filled.")
                    if not click(page, S.BTN_VERIFY_OTP, timeout=5000):
                        pause("Click 'Verify OTP' in the browser, then press Enter.")
                else:
                    pause(f"Enter the OTP sent to {email} in the browser, then press Enter.")
                    click(page, S.BTN_VERIFY_OTP, timeout=5000)
                page.wait_for_load_state("networkidle", timeout=20000)

            # ── Payment ─────────────────────────────────────────────────────
            step(9, "Payment checkpoint (₹10)")
            page.wait_for_load_state("networkidle", timeout=20000)
            print(f"\n  Current URL: {page.url}\n")
            pause(
                "Complete the ₹10 payment in the browser\n"
                "     (select payment mode, enter card/UPI details, etc.),\n"
                "     then press Enter here once you see the confirmation."
            )
            page.wait_for_load_state("networkidle", timeout=30000)

            hr("═")
            print("\n  ✅ DELHI RTI FILED SUCCESSFULLY!\n")
            hr("═")
            pause("Press Enter to close the browser.")

        except KeyboardInterrupt:
            print("\n\nAborted by user.")
        except Exception as e:
            warn(f"Unexpected error: {e}")
            print("  The browser is still open — continue manually.")
            pause("Press Enter to close the browser (or Ctrl+C to keep it open).")
        finally:
            browser.close()


# ── CLI ─────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Semi-automatic RTI filer for rtionline.delhi.gov.in",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Env (backend/python/autofill/.env):
              RTI_NAME, RTI_EMAIL, RTI_PHONE, RTI_ADDRESS, RTI_PIN
              RTI_DELHI_AUTHORITY_ID  or  RTI_DELHI_AUTHORITY
        """),
    )
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--draft-id", metavar="UUID", help="Fetch draft from backend by ID")
    src.add_argument("--json", metavar="JSON", help="Inline JSON with draft fields")
    parser.add_argument("--backend", default="http://localhost:3001")
    parser.add_argument("--probe", action="store_true", help="Pause at each step")
    parser.add_argument("--yes", action="store_true", help="Skip the Proceed? prompt")
    args = parser.parse_args()

    draft = fetch_draft(args.backend, args.draft_id) if args.draft_id else json.loads(args.json)

    print("""
╔══════════════════════════════════════════════╗
║  RTI Commons — Semi-Automatic Filer (Delhi)  ║
║  Portal: rtionline.delhi.gov.in              ║
╚══════════════════════════════════════════════╝
""")
    run(draft, probe=args.probe, auto_confirm=args.yes)


if __name__ == "__main__":
    main()
