#!/usr/bin/env python3
"""
Semi-automatic RTI filer for rtionline.gov.in (Central Government only).

Setup:
    pip install -r requirements.txt
    playwright install chromium

Usage:
    # File from a saved draft (recommended):
    python autofill.py --draft-id <uuid> --backend http://localhost:3001

    # File from inline JSON:
    python autofill.py --json '{
        "subject": "...",
        "information_sought": "...",
        "department": "Ministry of Finance"
    }'

    # Probe mode — pause before each step so you can inspect selectors:
    python autofill.py --draft-id <uuid> --backend http://localhost:3001 --probe

Required env vars (set in .env or export):
    RTI_NAME        Full name (e.g. "Rahul Sharma")
    RTI_EMAIL       Email address
    RTI_PHONE       10-digit mobile number
    RTI_ADDRESS     Postal address (street, city, PIN)
    RTI_PIN         6-digit PIN code (can be included in RTI_ADDRESS too)

Human checkpoints — browser stays open, you interact directly:
    1. CAPTCHA  — solve in the visible browser, then press Enter here
    2. OTP      — enter OTP received on phone in the browser, then press Enter
    3. Payment  — complete ₹10 payment in browser, then press Enter
"""

import argparse
import json
import os
import sys
import time
import textwrap
from pathlib import Path

import base64
import email as email_lib
import imaplib
import json
import re
import requests
from dotenv import load_dotenv
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

import selectors_rtionline as S

# Load pre-scraped ministry → authority mapping
_AUTH_FILE = Path(__file__).parent / "portal_authorities.json"
_AUTHORITIES_DB = {}
if _AUTH_FILE.exists():
    _raw = json.loads(_AUTH_FILE.read_text())
    for m in _raw.get("ministries", []):
        _AUTHORITIES_DB[m["ministry_id"]] = {
            "label":       m["ministry_label"],
            "authorities": m["authorities"],   # list of {id, label}
        }

# ── Load env ──────────────────────────────────────────────────────────────────
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path, override=True)

RTI_NAME            = os.getenv("RTI_NAME", "")
RTI_EMAIL           = os.getenv("RTI_EMAIL", "")
RTI_PHONE           = os.getenv("RTI_PHONE", "")
RTI_ADDRESS         = os.getenv("RTI_ADDRESS", "")
RTI_PIN             = os.getenv("RTI_PIN", "")
RTI_CITY            = os.getenv("RTI_CITY", "")
RTI_STATE           = os.getenv("RTI_STATE", "")
RTI_GENDER          = os.getenv("RTI_GENDER", "M")
RTI_STATUS          = os.getenv("RTI_STATUS", "U")
RTI_CITIZENSHIP     = os.getenv("RTI_CITIZENSHIP", "I")
RTI_BPL             = os.getenv("RTI_BPL", "N")
RTI_COUNTRY         = os.getenv("RTI_COUNTRY", "001")
RTI_PUBLIC_AUTHORITY = os.getenv("RTI_PUBLIC_AUTHORITY", "")

GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")


# ── Helpers ───────────────────────────────────────────────────────────────────

def hr(char="─"):
    print(char * 60)

def step(n, msg):
    hr()
    print(f"  STEP {n}: {msg}")
    hr()

def warn(msg):
    print(f"\n  ⚠  {msg}\n")

def ok(msg):
    print(f"\n  ✓  {msg}\n")

def pause(prompt):
    """Human checkpoint — emits __PAUSE__ marker for UI, waits for stdin."""
    hr("═")
    print(f"\n  👤 HUMAN CHECKPOINT\n     {prompt}\n")
    hr("═")
    sys.stdout.write(f"__PAUSE__:{prompt}\n")
    sys.stdout.flush()
    try:
        sys.stdin.readline()
    except KeyboardInterrupt:
        print("\nAborted by user.")
        sys.exit(0)

def dump_inputs(page):
    """Print all input/textarea/select elements on the page — for debugging selector mismatches."""
    print("\n  ── Inputs found on page ──────────────────────────────")
    els = page.query_selector_all("input, textarea, select")
    for el in els:
        tag  = el.evaluate("e => e.tagName.toLowerCase()")
        name = el.get_attribute("name") or ""
        id_  = el.get_attribute("id") or ""
        typ  = el.get_attribute("type") or ""
        vis  = el.is_visible()
        print(f"    <{tag}> name={name!r:20} id={id_!r:20} type={typ!r:10} visible={vis}")
    print("  ──────────────────────────────────────────────────────\n")

def fill(page, selector, value, *, timeout=8000, probe=False):
    """
    Try each comma-separated selector. Uses fill() first; falls back to
    triple-click + type() for password-type fields (e.g. the mobile field
    on rtionline.gov.in which is inexplicably type=password).
    Dumps all inputs if nothing matched, to help fix selectors.
    """
    if not value:
        return False
    for sel in [s.strip() for s in selector.split(",")]:
        try:
            page.fill(sel, value, timeout=timeout)
            if probe:
                print(f"      → filled: {sel!r}")
            return True
        except Exception:
            # fallback: click to focus, select all, type
            try:
                el = page.query_selector(sel)
                if el and el.is_visible():
                    el.click(click_count=3)  # select-all
                    el.type(value)
                    if probe:
                        print(f"      → typed (fallback): {sel!r}")
                    return True
            except Exception:
                continue
    warn(f"Could not fill field — tried: {selector[:80]}")
    dump_inputs(page)
    return False

def select_option_fuzzy(page, selector, target_text, *, timeout=5000, probe=False):
    """Select <option> whose text contains target_text (case-insensitive)."""
    for sel in [s.strip() for s in selector.split(",")]:
        try:
            el = page.wait_for_selector(sel, timeout=timeout, state="visible")
            if el:
                options = el.query_selector_all("option")
                for opt in options:
                    text = opt.text_content().strip().upper()
                    if target_text.upper() in text:
                        value = opt.get_attribute("value")
                        el.select_option(value=value)
                        if probe:
                            print(f"      → selected: {text!r} (value={value!r})")
                        return True
                warn(f"No option matching '{target_text}' in {sel}")
                return False
        except PlaywrightTimeout:
            continue
    warn(f"Could not find select: {selector[:60]}")
    return False

def click(page, selector, *, timeout=5000):
    for sel in [s.strip() for s in selector.split(",")]:
        try:
            el = page.wait_for_selector(sel, timeout=timeout, state="visible")
            if el:
                el.click()
                return True
        except PlaywrightTimeout:
            continue
    warn(f"Could not find button: {selector[:60]}")
    return False

def fetch_draft(backend_url: str, draft_id: str) -> dict:
    url = f"{backend_url.rstrip('/')}/api/file-rti/drafts/{draft_id}"
    print(f"  Fetching draft from {url} …")
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.json()

def extract_name_parts(full_name: str):
    parts = full_name.strip().split(None, 1)
    first = parts[0] if parts else ""
    last  = parts[1] if len(parts) > 1 else ""
    return first, last

def resolve_ministry_id(department: str) -> str:
    """Return the exact MinistryId option value for a department string."""
    if not department:
        return ""
    if department in S.MINISTRY_ID_MAP:
        return S.MINISTRY_ID_MAP[department]
    dept_upper = department.upper()
    for key, val in S.MINISTRY_ID_MAP.items():
        if key.upper() in dept_upper or dept_upper in key.upper():
            return val
    return ""

def resolve_state_code(state: str) -> str:
    """Return the exact stateId option value for a state name."""
    if not state:
        return "XX"
    if state in S.STATE_CODE_MAP:
        return S.STATE_CODE_MAP[state]
    state_upper = state.upper()
    for key, val in S.STATE_CODE_MAP.items():
        if key.upper() in state_upper or state_upper in key.upper():
            return val
    return "XX"  # No State fallback


# ── Gemini CAPTCHA solver ─────────────────────────────────────────────────────

def solve_captcha_with_gemini(page) -> str:
    """
    Screenshots the CAPTCHA image, sends it to Gemini via REST API (no SDK),
    and returns the CAPTCHA text. Falls back to manual if anything fails.
    """
    if not GEMINI_API_KEY:
        warn("GEMINI_API_KEY not set in .env — falling back to manual CAPTCHA.")
        return ""

    CAPTCHA_IMG_SELECTORS = [
        "img[src*='captcha' i]",
        "img[src*='security' i]",
        "img[alt*='captcha' i]",
        "img[alt*='security' i]",
        "td img",
        "table img",
    ]

    captcha_el = None
    for sel in CAPTCHA_IMG_SELECTORS:
        try:
            el = page.query_selector(sel)
            if el and el.is_visible():
                captcha_el = el
                break
        except Exception:
            continue

    if not captcha_el:
        warn("Could not locate CAPTCHA image — falling back to manual.")
        return ""

    try:
        print("  Screenshotting CAPTCHA image…")
        img_bytes = captcha_el.screenshot()
        img_b64 = base64.b64encode(img_bytes).decode("utf-8")

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        )
        payload = {
            "contents": [{
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": img_b64,
                        }
                    },
                    {
                        "text": (
                            "This is a CAPTCHA security image from a government website. "
                            "Read the alphanumeric characters shown in the image exactly. "
                            "The characters are case-insensitive. "
                            "Return ONLY the characters — no spaces, no punctuation, no explanation."
                        )
                    }
                ]
            }]
        }

        resp = requests.post(url, json=payload, timeout=15)
        resp.raise_for_status()
        captcha_text = (
            resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            .strip()
            .replace(" ", "")
        )
        ok(f"Gemini read CAPTCHA as: {captcha_text!r}")
        return captcha_text

    except Exception as e:
        warn(f"Gemini CAPTCHA solve failed: {e}")
        return ""


# ── Gmail OTP fetcher ─────────────────────────────────────────────────────────

def fetch_otp_from_gmail(gmail_user: str, poll_interval: int = 4, timeout: int = 40,
                         initial_wait: int = 10) -> str:
    """
    Connects to Gmail via IMAP, waits initial_wait seconds for the new OTP email
    to arrive, then polls only for messages that weren't in the inbox before the
    wait — so stale/old OTP emails are never picked up.

    Requires GMAIL_APP_PASSWORD in .env.
    Returns the OTP string, or "" if not found within timeout.
    """
    if not GMAIL_APP_PASSWORD:
        warn("GMAIL_APP_PASSWORD not set in .env — falling back to manual OTP entry.")
        return ""

    print(f"  Connecting to Gmail ({gmail_user}) via IMAP…")
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com", 993)
        mail.login(gmail_user, GMAIL_APP_PASSWORD)
        mail.select("inbox")
    except Exception as e:
        warn(f"Gmail login failed: {e}")
        warn("Check GMAIL_APP_PASSWORD in .env — generate at myaccount.google.com/apppasswords")
        return ""

    ok("Gmail connected.")

    # Snapshot existing message IDs so we never pick up an old OTP
    try:
        _, data = mail.search(None, '(OR FROM "noreply-dopt@gov.in" SUBJECT "OTP for submit request")')
        existing_ids = set(data[0].split())
    except Exception:
        existing_ids = set()

    print(f"  Waiting {initial_wait}s for new OTP email to arrive…")
    for i in range(initial_wait, 0, -1):
        print(f"  Starting in {i}s…", end="\r")
        time.sleep(1)
    print()

    deadline = time.time() + timeout
    checked_ids = set(existing_ids)  # start with pre-existing IDs already skipped

    while time.time() < deadline:
        remaining = int(deadline - time.time())
        print(f"  Polling inbox for new OTP… ({remaining}s remaining)", end="\r")

        try:
            mail.select("inbox")  # re-select to force Gmail to refresh seen IDs
            _, data = mail.search(None, '(OR FROM "noreply-dopt@gov.in" SUBJECT "OTP for submit request")')
            ids = data[0].split()

            for msg_id in reversed(ids):  # newest first
                if msg_id in checked_ids:
                    continue
                checked_ids.add(msg_id)

                _, msg_data = mail.fetch(msg_id, "(RFC822)")
                raw = msg_data[0][1]
                msg = email_lib.message_from_bytes(raw)

                plain_body = ""
                html_body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        ct = part.get_content_type()
                        if ct == "text/plain" and not plain_body:
                            plain_body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                        elif ct == "text/html" and not html_body:
                            html_body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                else:
                    ct = msg.get_content_type()
                    raw_body = msg.get_payload(decode=True).decode("utf-8", errors="ignore")
                    if ct == "text/html":
                        html_body = raw_body
                    else:
                        plain_body = raw_body

                # Strip HTML tags from html_body so regex can scan it
                stripped_html = re.sub(r'<[^>]+>', ' ', html_body) if html_body else ""
                body = plain_body or stripped_html

                match = re.search(r'OTP is[:\s]+(\d{4,8})', body, re.IGNORECASE)
                if not match:
                    match = re.search(r'\b(\d{6})\b', body)
                if match:
                    otp = match.group(1)
                    mail.logout()
                    print()
                    ok(f"OTP found in Gmail: {otp}")
                    return otp

        except Exception as e:
            warn(f"IMAP poll error: {e}")
            break

        time.sleep(poll_interval)

    print()
    try:
        mail.logout()
    except Exception:
        pass

    warn(f"OTP not found in Gmail within {timeout}s — falling back to manual entry.")
    return ""


# ── Main filler ───────────────────────────────────────────────────────────────

def run(draft: dict, probe: bool = False, no_captcha_ai: bool = False, auto_confirm: bool = False):
    # Draft values take priority; fall back to .env
    name    = draft.get("applicant_name")    or RTI_NAME
    phone   = draft.get("applicant_phone")   or RTI_PHONE
    address = draft.get("applicant_address") or RTI_ADDRESS
    email   = RTI_EMAIL   # always from env (portal login email)
    pin     = draft.get("applicant_pincode") or RTI_PIN

    # Gender: map our stored label ("Male"/"Female"/"Other") to portal codes (M/F/T)
    _GENDER_MAP = {"Male": "M", "Female": "F", "Other": "T"}
    raw_gender  = draft.get("applicant_gender") or RTI_GENDER
    gender_code = _GENDER_MAP.get(raw_gender, raw_gender.upper()[:1] if raw_gender else "M")

    # Applicant state: prefer draft field over RTI_STATE env
    applicant_state_val = draft.get("applicant_state") or RTI_STATE

    subject          = draft.get("draft_subject") or draft.get("subject", "")
    info_sought      = draft.get("draft_information_sought") or draft.get("information_sought", "")
    full_application = draft.get("draft_body") or draft.get("full_application", "")
    department       = draft.get("detected_dept") or draft.get("department", "")

    # IDs from Gemini two-step classification (preferred over fuzzy text match)
    draft_ministry_id   = draft.get("ministry_id")
    draft_authority_id  = draft.get("authority_id")
    draft_ministry_label  = draft.get("ministry_label", "")
    draft_authority_label = draft.get("authority_label", "")

    # Use full application if info_sought is empty
    body_text = info_sought if info_sought.strip() else full_application

    # Validate required fields
    missing = []
    if not name:    missing.append("RTI_NAME")
    if not email:   missing.append("RTI_EMAIL")
    if not phone:   missing.append("RTI_PHONE")
    if not address: missing.append("RTI_ADDRESS")
    if not subject: missing.append("subject (from draft)")
    if not body_text: missing.append("information sought (from draft)")
    if missing:
        print(f"\n  ✗ Missing required fields: {', '.join(missing)}")
        print("  Set them in .env or check the draft.\n")
        sys.exit(1)

    # Use exact draft ID if available, fall back to fuzzy text match
    ministry_id         = draft_ministry_id or resolve_ministry_id(department)
    state_code          = resolve_state_code(draft.get("detected_state", ""))
    applicant_state_code = resolve_state_code(applicant_state_val)
    first, last = extract_name_parts(name)
    full_name   = name  # form uses single Name field

    print(f"""
  Summary of what will be auto-filled:
  ─────────────────────────────────────
  Name        : {name}
  Gender      : {raw_gender or '(not set)'} → {gender_code}
  Email       : {email}
  Phone       : {phone}
  Address     : {address[:60]}{'…' if len(address) > 60 else ''}
  PIN Code    : {pin or '(not set)'}
  Appl. State : {applicant_state_val or '(not set)'} → {applicant_state_code}
  Ministry    : {department} → ID {ministry_id or '(not mapped — select manually)'}
  Authority   : {draft_authority_label or '(not classified — will auto-pick or use env)'} → ID {draft_authority_id or '(none)'}
  RTI State   : {draft.get("detected_state","")} → code {state_code}
  Subject     : {subject[:70]}{'…' if len(subject) > 70 else ''}
  Body        : {len(body_text)} characters
  ─────────────────────────────────────
""")
    if not auto_confirm:
        confirm = input("  Proceed? [y/N] ").strip().lower()
        if confirm != "y":
            print("  Aborted.")
            sys.exit(0)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False, slow_mo=150)
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        # Auto-accept any JS confirm/alert dialogs (e.g. "Make Payment" confirmation popup)
        page.on("dialog", lambda dialog: dialog.accept())

        try:
            # ── Navigate to email-check landing page ──────────────────────────
            step(1, f"Opening {S.PORTAL_URL}")
            page.goto(S.PORTAL_URL, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_load_state("networkidle", timeout=15000)

            if probe:
                pause("PROBE: Email check page loaded. URL: " + page.url)

            # ── Step 0: Landing page — fill Email + Mobile, pause for CAPTCHA ──
            # "Online RTI Request Form": Email Id, Mobile Number, Security code
            step(2, "Auto-filling Email and Mobile Number on landing page")

            # Fill Email
            email_filled = fill(page, S.LANDING_EMAIL, email, probe=probe)
            if not email_filled:
                warn("Email field not found. Showing all inputs:")
                dump_inputs(page)
                pause("Manually fill your email in the browser, then press Enter.")

            # Fill Mobile
            mobile_filled = fill(page, S.LANDING_MOBILE, phone, probe=probe)
            if not mobile_filled:
                warn("Mobile field not found. Showing all inputs:")
                dump_inputs(page)
                pause("Manually fill your mobile number in the browser, then press Enter.")

            if email_filled and mobile_filled:
                ok("Email and Mobile filled automatically.")

            # CAPTCHA — try Gemini first, fall back to manual
            step(3, "Solving CAPTCHA with Gemini")

            for attempt in range(1, 6):  # up to 5 auto-attempts
                captcha_text = "" if no_captcha_ai else solve_captcha_with_gemini(page)

                if not captcha_text:
                    pause("Type the security code in the browser, click Submit there, then press Continue here.")
                    # Wait for browser to leave the landing page (handles both: user submitted
                    # before pressing Continue, or presses Continue first then submits)
                    try:
                        page.wait_for_function(
                            "() => !window.location.href.includes('email_check')",
                            timeout=30000
                        )
                        page.wait_for_load_state("networkidle", timeout=15000)
                    except Exception:
                        pass
                    break  # exit retry loop

                # Fill captcha input field
                captcha_filled = fill(page, S.LANDING_CAPTCHA_INPUT, captcha_text, probe=probe)
                if not captcha_filled:
                    warn("Could not fill CAPTCHA input — fill it manually in the browser.")
                    pause("Type the CAPTCHA in the browser, click Submit there, then press Continue here.")
                    try:
                        page.wait_for_function(
                            "() => !window.location.href.includes('email_check')",
                            timeout=30000
                        )
                        page.wait_for_load_state("networkidle", timeout=15000)
                    except Exception:
                        pass
                    break

                # Click Submit
                submitted = False
                for sel in [s.strip() for s in S.LANDING_SUBMIT.split(",")]:
                    try:
                        page.click(sel, timeout=3000)
                        submitted = True
                        break
                    except Exception:
                        continue
                if not submitted:
                    pause("Could not auto-click Submit — click it manually, then press Enter.")
                    break

                page.wait_for_load_state("networkidle", timeout=20000)

                # Check if we're still on the same page (wrong CAPTCHA → page reloads)
                still_on_landing = page.query_selector(S.LANDING_CAPTCHA_INPUT) is not None
                if not still_on_landing:
                    ok(f"CAPTCHA accepted! Now on: {page.url}")
                    break
                else:
                    warn(f"CAPTCHA attempt {attempt} wrong — retrying with fresh screenshot…")
                    time.sleep(1)  # let new captcha image load
            else:
                # All 3 auto-attempts failed
                pause("Gemini couldn't solve CAPTCHA after 3 tries. Type it in the browser, click Submit there, then press Continue here.")
                try:
                    page.wait_for_function(
                        "() => !window.location.href.includes('email_check')",
                        timeout=30000
                    )
                    page.wait_for_load_state("networkidle", timeout=15000)
                except Exception:
                    pass

            # ── OTP page (Request_Check_Otp.php) ─────────────────────────────
            # Portal sends OTP to email after landing page CAPTCHA — verify before main form
            if "otp" in page.url.lower():
                step(3, "OTP verification — fetching from Gmail")

                otp = fetch_otp_from_gmail(email)

                if otp:
                    otp_filled = fill(page, S.OTP_INPUT, otp, probe=probe)
                    if otp_filled:
                        ok(f"OTP {otp!r} filled.")
                        # Click submit/verify
                        submitted_otp = False
                        for sel in [s.strip() for s in S.BTN_VERIFY_OTP.split(",")]:
                            try:
                                page.click(sel, timeout=3000)
                                submitted_otp = True
                                break
                            except Exception:
                                continue
                        if not submitted_otp:
                            pause("Click the OTP Submit button in the browser, then press Enter.")
                    else:
                        warn("Could not fill OTP field — please enter it manually.")
                        pause("Enter OTP in the browser, then press Enter.")
                        if not click(page, S.BTN_VERIFY_OTP, timeout=5000):
                            pause("Click the OTP Submit button in the browser, then press Enter.")
                else:
                    # Gmail failed — manual OTP entry
                    pause(f"OTP sent to {email} — enter it in the browser, then press Enter.")
                    if not click(page, S.BTN_VERIFY_OTP, timeout=5000):
                        pause("Click the OTP Submit button in the browser, then press Enter.")

                page.wait_for_load_state("networkidle", timeout=20000)
                ok(f"OTP step done. Now on: {page.url}")

            if probe:
                pause("PROBE: After OTP step. Current URL: " + page.url)

            # ── Personal Details ──────────────────────────────────────────────
            step(4, "Filling personal details")

            if probe:
                dump_inputs(page)
                pause("PROBE: About to fill personal details.")

            # Email pre-filled from OTP — just confirm
            fill(page, S.FIELD_CONFIRM_EMAIL, email, probe=probe)
            fill(page, S.FIELD_NAME, full_name, probe=probe)

            # Gender from draft (preferred) or env
            gender_selector = {
                "M": S.RADIO_GENDER_MALE,
                "F": S.RADIO_GENDER_FEMALE,
                "T": S.RADIO_GENDER_THIRD,
            }.get(gender_code, S.RADIO_GENDER_MALE)
            try:
                page.check(gender_selector)
            except Exception:
                pass

            # Full address into address1 only
            fill(page, S.FIELD_ADDRESS1, address, probe=probe)
            fill(page, S.FIELD_PINCODE, pin, probe=probe)
            fill(page, S.FIELD_PHONE, phone, probe=probe)

            # Country, Status, Literacy from env
            country_sel = f"input[name='chkCountry'][value='{RTI_COUNTRY}']"
            status_sel  = f"input[name='status'][value='{RTI_STATUS.upper()}']"
            try:
                page.check(country_sel)
                page.check(status_sel)
                page.check(S.RADIO_LITERATE)
            except Exception:
                pass

            # Applicant's home state from draft (preferred) or env
            try:
                page.select_option(S.FIELD_STATE, value=applicant_state_code)
                ok(f"Applicant state: {applicant_state_val} → {applicant_state_code}")
            except Exception:
                warn(f"Could not set state to {applicant_state_code!r}")

            if probe:
                pause("PROBE: Personal details filled — check browser.")

            # ── RTI Details ───────────────────────────────────────────────────
            step(5, "Filling RTI details — Ministry, Public Authority, Description")

            # Ministry dropdown (select by exact value ID)
            if ministry_id:
                try:
                    page.select_option(S.FIELD_MINISTRY, value=ministry_id)
                    ok(f"Ministry selected: {department} (ID={ministry_id})")
                    # Wait for DepartmentId (Public Authority) to populate via AJAX
                    time.sleep(2)
                    # Try to select first non-empty option in DepartmentId
                    try:
                        # Look up authorities from pre-scraped JSON — no AJAX wait needed
                        known = _AUTHORITIES_DB.get(ministry_id, {}).get("authorities", [])

                        if not known:
                            warn("No authorities in local DB — waiting for AJAX…")
                            time.sleep(3)
                            opts = page.query_selector_all(f"{S.FIELD_DEPARTMENT} option")
                            known = [
                                {"id": o.get_attribute("value"), "label": o.text_content().strip()}
                                for o in opts if o.get_attribute("value")
                            ]

                        if draft_authority_id:
                            # Use exact ID from draft (classified by Gemini)
                            page.select_option(S.FIELD_DEPARTMENT, value=draft_authority_id)
                            ok(f"Public Authority selected by draft ID: {draft_authority_label!r} (ID={draft_authority_id})")

                        else:
                            # No draft ID — show available options and wait for manual selection
                            if known:
                                warn("No authority ID in draft. Available authorities for this ministry:")
                                for a in known:
                                    print(f"    [{a['id']:6}] {a['label']}")
                            else:
                                warn("No authority ID in draft and no local authority data found.")
                            pause("Select the correct Public Authority in the browser, then press Enter to continue.")

                    except Exception as e:
                        warn(f"Could not select Public Authority: {e}")
                        pause("Choose Public Authority in browser, then press Enter.")
                except Exception as e:
                    warn(f"Could not select Ministry: {e}")
                    pause("Choose Ministry in browser, then press Enter.")
            else:
                warn(f"Ministry not mapped for: {department!r}")
                pause("Choose Ministry and Public Authority in browser, then press Enter.")

            # Citizenship and BPL from env
            try:
                page.select_option(S.FIELD_CITIZENSHIP, value=RTI_CITIZENSHIP)
                page.select_option(S.FIELD_BPL, value=RTI_BPL)
            except Exception:
                pass

            # RTI body text (max 3000 chars)
            body_trimmed = body_text[:3000]
            fill(page, S.FIELD_DESCRIPTION, body_trimmed, probe=probe)
            ok(f"RTI description filled ({len(body_trimmed)} chars)")

            if probe:
                pause("PROBE: RTI details filled — check browser.")

            # ── Form CAPTCHA — solve with Gemini ──────────────────────────────
            step(6, "Solving form CAPTCHA with Gemini")

            # Temporarily override selectors to use the form's captcha image
            _orig_img_sel = S.LANDING_CAPTCHA_INPUT
            S.LANDING_CAPTCHA_INPUT = S.FORM_CAPTCHA_INPUT  # reuse solver

            for attempt in range(1, 6):  # up to 5 auto-attempts
                captcha_text = "" if no_captcha_ai else solve_captcha_with_gemini(page)

                if not captcha_text:
                    pause("Type the CAPTCHA in the browser, click Submit there, then press Continue here.")
                    try:
                        page.wait_for_function(
                            "() => !window.location.href.includes('request.php')",
                            timeout=30000
                        )
                        page.wait_for_load_state("networkidle", timeout=15000)
                    except Exception:
                        pass
                    break

                fill(page, S.FORM_CAPTCHA_INPUT, captcha_text, probe=probe)

                # Click submit
                submitted = False
                for sel in [s.strip() for s in S.BTN_SUBMIT_FORM.split(",")]:
                    try:
                        page.click(sel, timeout=3000)
                        submitted = True
                        break
                    except Exception:
                        continue
                if not submitted:
                    pause("Click Submit in the browser, then press Enter.")
                    break

                page.wait_for_load_state("networkidle", timeout=20000)

                # If still on same page, CAPTCHA was wrong — retry
                if page.query_selector(S.FORM_CAPTCHA_INPUT):
                    warn(f"CAPTCHA attempt {attempt} wrong — retrying…")
                    time.sleep(1)
                else:
                    ok(f"Form submitted! Now on: {page.url}")
                    break
            else:
                pause("Gemini failed 3 times. Type CAPTCHA in browser, click Submit there, then press Continue here.")
                try:
                    page.wait_for_function(
                        "() => !window.location.href.includes('request.php')",
                        timeout=30000
                    )
                    page.wait_for_load_state("networkidle", timeout=15000)
                except Exception:
                    pass
                ok(f"Form submitted! Now on: {page.url}")

            S.LANDING_CAPTCHA_INPUT = _orig_img_sel  # restore

            # ── OTP ───────────────────────────────────────────────────────────
            if "otp" in page.url.lower() or page.query_selector(S.OTP_INPUT):
                step(6, "OTP — fetching from Gmail automatically")

                otp = fetch_otp_from_gmail(email)

                if otp:
                    # Auto-fill OTP in browser
                    otp_filled = fill(page, S.OTP_INPUT, otp, probe=probe)
                    if not otp_filled:
                        warn("Could not fill OTP field — please enter it manually in the browser.")
                        pause("Enter OTP in the browser, then press Enter here.")
                    else:
                        ok(f"OTP {otp!r} filled automatically.")
                        if probe:
                            pause("PROBE: OTP filled — about to click Verify.")
                        if not click(page, S.BTN_VERIFY_OTP, timeout=5000):
                            pause("Click 'Verify OTP' in the browser, then press Enter.")
                else:
                    # Gmail fetch failed — fall back to manual
                    pause(f"OTP sent to {email} — enter it in the browser, then press Enter.")
                    if not click(page, S.BTN_VERIFY_OTP, timeout=5000):
                        pause("Click 'Verify OTP' in the browser, then press Enter.")

                page.wait_for_load_state("networkidle", timeout=20000)
            else:
                ok("No OTP step detected — continuing.")

            # ── Payment ───────────────────────────────────────────────────────
            step(8, "Payment checkpoint (₹10)")
            page.wait_for_load_state("networkidle", timeout=20000)
            print(f"\n  Current URL: {page.url}\n")
            pause(
                "Complete the ₹10 payment in the browser\n"
                "     (select payment mode, enter card/UPI details, etc.),\n"
                "     then press Enter here once you see the confirmation."
            )

            page.wait_for_load_state("networkidle", timeout=30000)

            hr("═")
            print("\n  ✅ RTI FILED SUCCESSFULLY!\n")
            hr("═")

            pause("Press Enter to close the browser.")

        except KeyboardInterrupt:
            print("\n\nAborted by user.")
        except Exception as e:
            warn(f"Unexpected error: {e}")
            print("  The browser is still open — you can continue manually.")
            pause("Press Enter to close the browser (or Ctrl+C to keep it open).")
        finally:
            browser.close()


# ── CLI entry point ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Semi-automatic RTI filer for rtionline.gov.in",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Set these env vars in .env (copy from .env.example):
              RTI_NAME, RTI_EMAIL, RTI_PHONE, RTI_ADDRESS, RTI_PIN
        """)
    )
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--draft-id", metavar="UUID",
                     help="Fetch draft from RTI Commons backend by ID")
    src.add_argument("--json", metavar="JSON",
                     help="Inline JSON string with draft fields")

    parser.add_argument("--backend", default="http://localhost:3001",
                        help="RTI Commons backend URL (default: http://localhost:3001)")
    parser.add_argument("--probe", action="store_true",
                        help="Pause at each step for selector inspection")
    parser.add_argument("--no-captcha-ai", action="store_true", dest="no_captcha_ai",
                        help="Skip Gemini CAPTCHA solving — type CAPTCHA manually in the browser")
    parser.add_argument("--yes", action="store_true",
                        help="Skip the Proceed? confirmation prompt (used when launched from UI)")

    args = parser.parse_args()

    if args.draft_id:
        draft = fetch_draft(args.backend, args.draft_id)
    else:
        draft = json.loads(args.json)

    print(f"""
╔══════════════════════════════════════════════╗
║  RTI Commons — Semi-Automatic Filer v0.1     ║
║  Portal: rtionline.gov.in (Central Govt)     ║
╚══════════════════════════════════════════════╝
""")
    run(draft, probe=args.probe, no_captcha_ai=args.no_captcha_ai, auto_confirm=args.yes)


if __name__ == "__main__":
    main()
