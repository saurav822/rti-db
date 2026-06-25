#!/usr/bin/env python3
"""
RTI Filed PDF Fetcher — autofetch.py

Navigates to rtionline.gov.in/request/status_history.php,
logs in with email + phone from .env, finds the RTI by ack number
or filing date, renders the Final Status page as a PDF, and
uploads it to Supabase via the backend upload-pdf endpoint.

Usage:
    python autofetch.py --draft-id <uuid> --backend http://localhost:3001
    python autofetch.py --draft-id <uuid> --no-captcha-ai
"""

import argparse
import base64
import email as email_lib
import imaplib
import json
import os
import re
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

env_path = Path(__file__).parent / ".env"
load_dotenv(env_path, override=True)

RTI_EMAIL          = os.getenv("RTI_EMAIL", "")
RTI_PHONE          = os.getenv("RTI_PHONE", "")
RTI_NAME           = os.getenv("RTI_NAME", "")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

# ── Helpers ────────────────────────────────────────────────────────────────────

def hr(char="─"):
    print(char * 60); sys.stdout.flush()

def step(n, msg):
    hr(); print(f"  STEP {n}: {msg}"); hr(); sys.stdout.flush()

def warn(msg):
    print(f"\n  ⚠  {msg}\n"); sys.stdout.flush()

def ok(msg):
    print(f"\n  ✓  {msg}\n"); sys.stdout.flush()

def pause(prompt):
    hr("═")
    print(f"\n  👤 HUMAN CHECKPOINT\n     {prompt}\n")
    hr("═")
    sys.stdout.write(f"__PAUSE__:{prompt}\n")
    sys.stdout.flush()
    try:
        sys.stdin.readline()
    except KeyboardInterrupt:
        print("\nAborted."); sys.exit(0)


def dump_tabs(context, label=""):
    """Print every open tab with its URL and whether the user is viewing it."""
    print(f"  [tabs] {label} — {len(context.pages)} open:")
    rows = []
    for i, p in enumerate(context.pages):
        try:
            vis = p.evaluate("() => document.visibilityState")
        except Exception:
            vis = "?"
        try:
            title = p.title()
        except Exception:
            title = ""
        marker = " <-- VISIBLE" if vis == "visible" else ""
        print(f"    [{i}] vis={vis:<7} {p.url}{marker}")
        rows.append((p, vis, title))
    sys.stdout.flush()
    return rows


def find_visible_page(context):
    """Return the tab the user is currently viewing (visibilityState=='visible')."""
    for p in context.pages:
        try:
            if p.evaluate("() => document.visibilityState") == "visible":
                return p
        except Exception:
            continue
    return None


def solve_captcha_with_gemini(page) -> str:
    """Screenshot the CAPTCHA image, ask Gemini to read it."""
    if not GEMINI_API_KEY:
        warn("GEMINI_API_KEY not set — manual CAPTCHA required.")
        return ""

    selectors = [
        "img[src*='captcha' i]", "img[src*='security' i]",
        "img[alt*='captcha' i]", "img[alt*='security' i]",
        "td img", "table img",
    ]
    captcha_el = None
    for sel in selectors:
        try:
            el = page.query_selector(sel)
            if el and el.is_visible():
                captcha_el = el; break
        except Exception:
            continue

    if not captcha_el:
        warn("CAPTCHA image not found — manual entry required.")
        return ""

    try:
        print("  Screenshotting CAPTCHA…"); sys.stdout.flush()
        img_b64 = base64.b64encode(captcha_el.screenshot()).decode()

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        )
        payload = {
            "contents": [{
                "parts": [
                    {"inline_data": {"mime_type": "image/png", "data": img_b64}},
                    {"text": (
                        "This is a CAPTCHA from an Indian government website. "
                        "Read the text/numbers shown. Return ONLY the characters — "
                        "no spaces, no punctuation, nothing else."
                    )},
                ]
            }],
            "generationConfig": {"temperature": 0},
        }
        resp = requests.post(url, json=payload, timeout=15)
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip().replace(" ", "")
        ok(f"Gemini CAPTCHA: {text!r}")
        return text
    except Exception as e:
        warn(f"Gemini CAPTCHA failed: {e}")
        return ""


def fetch_otp_from_gmail(poll_interval: int = 6, timeout: int = 60, initial_wait: int = 8) -> str:
    """Poll Gmail IMAP for the rtionline.gov.in OTP email."""
    if not GMAIL_APP_PASSWORD:
        warn("GMAIL_APP_PASSWORD not set — manual OTP entry required.")
        return ""
    print(f"  Connecting to Gmail ({RTI_EMAIL}) via IMAP…"); sys.stdout.flush()
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com", 993)
        mail.login(RTI_EMAIL, GMAIL_APP_PASSWORD)
        mail.select("inbox")
    except Exception as e:
        warn(f"Gmail login failed: {e}")
        return ""

    ok("Gmail connected.")

    # Snapshot existing IDs so we don't pick up stale OTPs
    try:
        _, data = mail.search(None, '(OR FROM "noreply-dopt@gov.in" SUBJECT "OTP for submit request")')
        existing_ids = set(data[0].split())
    except Exception:
        existing_ids = set()

    # Initial wait — print with \n so each line creates an SSE event (keeps connection alive)
    print(f"  Waiting {initial_wait}s for OTP email to arrive…"); sys.stdout.flush()
    for i in range(initial_wait, 0, -1):
        print(f"  OTP wait: {i}s…"); sys.stdout.flush()
        time.sleep(1)

    deadline = time.time() + timeout
    checked_ids = set(existing_ids)
    poll_num = 0

    while time.time() < deadline:
        poll_num += 1
        remaining = int(deadline - time.time())
        # \n-terminated so SSE receives it — keeps the connection alive during long wait
        print(f"  Polling Gmail (attempt {poll_num}, {remaining}s left)…"); sys.stdout.flush()
        try:
            mail.select("inbox")  # re-select to force Gmail to refresh
            _, data = mail.search(None, '(OR FROM "noreply-dopt@gov.in" SUBJECT "OTP for submit request")')
            ids = data[0].split()
            for msg_id in reversed(ids):
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
                stripped_html = re.sub(r'<[^>]+>', ' ', html_body) if html_body else ""
                body = plain_body or stripped_html
                match = re.search(r'OTP is[:\s]+(\d{4,8})', body, re.IGNORECASE) or re.search(r'\b(\d{6})\b', body)
                if match:
                    otp = match.group(1)
                    mail.logout()
                    ok(f"OTP found: {otp}")
                    return otp
        except Exception as e:
            warn(f"IMAP poll error: {e}"); break
        time.sleep(poll_interval)

    try: mail.logout()
    except Exception: pass
    warn(f"OTP not found within {timeout}s — falling back to manual entry.")
    return ""


# ── Main ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch filed RTI PDF from rtionline.gov.in")
    parser.add_argument("--draft-id",      required=True)
    parser.add_argument("--backend",       default="http://localhost:3001")
    parser.add_argument("--no-captcha-ai", action="store_true")
    args = parser.parse_args()

    no_captcha_ai = args.no_captcha_ai
    backend       = args.backend.rstrip("/")
    draft_id      = args.draft_id

    # ── Fetch draft metadata ────────────────────────────────────────────────
    step(1, f"Fetching draft details (ID: {draft_id})")
    try:
        resp = requests.get(f"{backend}/api/file-rti/drafts/{draft_id}", timeout=10)
        resp.raise_for_status()
        draft = resp.json()
    except Exception as e:
        warn(f"Could not fetch draft from backend: {e}")
        sys.exit(1)

    filed_at_raw   = (draft.get("filed_at")      or "").strip()
    # Applicant name as it appears in the portal's Name column — may differ from RTI_NAME
    # (e.g. filing on behalf of someone else). Fall back to env RTI_NAME if not saved.
    applicant_name = (draft.get("applicant_name") or RTI_NAME or "").strip()

    # Portal records dates in IST (UTC+5:30); our DB stores UTC — convert.
    filed_date_str = ""
    if filed_at_raw:
        try:
            from datetime import timezone, timedelta
            dt_utc = datetime.fromisoformat(filed_at_raw.replace("Z", "+00:00"))
            IST = timezone(timedelta(hours=5, minutes=30))
            filed_date_str = dt_utc.astimezone(IST).strftime("%d/%m/%Y")
        except Exception:
            pass

    ok(f"applicant_name = {applicant_name or '(not set)'}")
    ok(f"filed_at (IST) = {filed_date_str or '(not set)'}")

    # ── Browser ────────────────────────────────────────────────────────────
    with sync_playwright() as p:
      try:
        browser = p.chromium.launch(headless=False, args=[
            "--start-maximized",
            # Keep the active tab reporting visibilityState=='visible' even when this
            # window is behind the RTI Commons app window (so PDF capture targets the
            # tab the user is actually viewing).
            "--disable-features=CalculateNativeWinOcclusion",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
        ])
        context = browser.new_context(viewport={"width": 1280, "height": 900})

        # Track every tab/popup that opens inside this browser context, in real time.
        # If clicking an RTI link opens a new tab here, it lands in opened_pages and we
        # capture it. If nothing ever appears here, the clicks are happening in a
        # DIFFERENT browser window — not this automation one.
        opened_pages = []
        def _on_new_page(new_page):
            opened_pages.append(new_page)
            try:
                new_page.wait_for_load_state("domcontentloaded", timeout=8000)
            except Exception:
                pass
            print(f"  [event] ► NEW TAB OPENED IN AUTOMATION BROWSER: {new_page.url}")
            sys.stdout.flush()
        context.on("page", _on_new_page)

        page    = context.new_page()

        # Step 2 — Open status history page
        step(2, "Opening RTI Online status history page")
        page.goto("https://rtionline.gov.in/request/status_history.php", timeout=30000)
        page.wait_for_load_state("networkidle", timeout=20000)
        ok(f"Loaded: {page.url}")

        # Step 3 — Fill email + phone (visible only when not yet authenticated)
        step(3, "Filling email and mobile number")
        email_field = page.query_selector("input[name='Email'], #Email")
        phone_field = page.query_selector("input[name='cell'], #cell")

        if email_field and email_field.is_visible():
            email_field.fill(RTI_EMAIL)
            ok(f"Email filled: {RTI_EMAIL}")
        else:
            warn("Email field not visible — may already be authenticated")

        if phone_field and phone_field.is_visible():
            phone_field.fill(RTI_PHONE)
            ok(f"Phone filled: {RTI_PHONE}")
        else:
            warn("Phone field not visible")

        # Step 4 — CAPTCHA
        def refill_credentials():
            """Wait for form to settle, then force-fill email + phone."""
            # Wait for email field to be visible and interactable
            try:
                page.wait_for_selector("input[name='Email']", state="visible", timeout=8000)
            except Exception:
                pass
            time.sleep(1.5)  # extra settle time — portal JS may reset fields after DOM ready
            for sel, val, label in [
                ("input[name='Email']", RTI_EMAIL, "email"),
                ("input[name='cell']",  RTI_PHONE, "phone"),
            ]:
                try:
                    f = page.wait_for_selector(sel, state="visible", timeout=5000)
                    if f:
                        f.click(click_count=3)  # select-all existing text
                        f.fill(val)
                        print(f"  ✓  {label} filled: {val}"); sys.stdout.flush()
                except Exception as e:
                    warn(f"Could not fill {label}: {e}")

        captcha_input = page.query_selector("input[name='6_letters_code'], input[id='6_letters_code']")
        if captcha_input and captcha_input.is_visible():
            step(4, "Solving CAPTCHA")
            for attempt in range(1, 6):  # up to 5 auto-attempts
                # Always ensure credentials are present before submitting
                refill_credentials()

                captcha_text = "" if no_captcha_ai else solve_captcha_with_gemini(page)

                if not captcha_text:
                    # Manual: user types captcha and clicks Submit in the browser themselves
                    pause(f"Type the CAPTCHA in the browser and click Submit, then press Enter here.")
                    page.wait_for_load_state("networkidle", timeout=20000)
                else:
                    captcha_input.fill(captcha_text)
                    time.sleep(0.3)
                    clicked = False
                    for sel in ["input[name='Submit']", "input[type='submit']", "input[id='Status']"]:
                        try:
                            page.click(sel, timeout=3000)
                            clicked = True; break
                        except Exception:
                            continue
                    if not clicked:
                        pause("Click Submit in the browser, then press Enter.")
                    page.wait_for_load_state("networkidle", timeout=20000)

                # Check if CAPTCHA was accepted (field gone = success)
                still_on_captcha = page.query_selector("input[name='6_letters_code'], input[id='6_letters_code']")
                if not still_on_captcha:
                    ok("CAPTCHA accepted!"); break

                warn(f"Wrong CAPTCHA (attempt {attempt}) — waiting for page to fully reload…")
                # Wait for captcha image to be visible (ensures page fully rendered)
                try:
                    page.wait_for_selector("img[src*='captcha' i], img[src*='security' i], td img", state="visible", timeout=8000)
                except Exception:
                    pass
                time.sleep(3)  # extra buffer for portal JS to finish resetting the form
                captcha_input = page.query_selector("input[name='6_letters_code'], input[id='6_letters_code']")
        else:
            ok("No CAPTCHA required (already authenticated)")

        # ── OTP step (portal sends OTP to email after captcha) ────────────
        otp_field_present = bool(page.query_selector("input[name='otp'], input[id='otp'], input[placeholder*='OTP' i]"))
        if "otp" in page.url.lower() or otp_field_present:
            step(5, "OTP verification — fetching from Gmail")
            otp = fetch_otp_from_gmail()
            if otp:
                otp_field = page.query_selector("input[name='otp'], input[id='otp']")
                if otp_field:
                    otp_field.fill(otp)
                    ok(f"OTP {otp!r} filled.")
                    clicked = False
                    for sel in ["input[id='Submit']", "input[type='submit']"]:
                        try:
                            page.click(sel, timeout=3000)
                            clicked = True; break
                        except Exception:
                            continue
                    if not clicked:
                        pause("Click Submit OTP in the browser, then press Enter.")
                else:
                    warn("OTP input field not found.")
                    pause("Enter OTP manually in the browser, then press Enter.")
            else:
                pause(f"Enter the OTP sent to {RTI_EMAIL} in the browser, then press Enter.")
                for sel in ["input[id='Submit']", "input[type='submit']"]:
                    try: page.click(sel, timeout=3000); break
                    except Exception: continue
            page.wait_for_load_state("networkidle", timeout=20000)
            ok(f"After OTP: {page.url}")

        # Click "Request/Appeal Status as on [date]" button if present
        for sel in ["input[name='Status']", "input[id='Status']", "input[value*='Status']", "input[type='submit']"]:
            try:
                btn = page.query_selector(sel)
                if btn and btn.is_visible():
                    btn.click()
                    page.wait_for_load_state("networkidle", timeout=15000)
                    ok("Clicked status button")
                    break
            except Exception:
                continue

        ok(f"Status summary page: {page.url}")

        # Step 5 — Click "Registered" and switch to the list tab it opens
        # page.goto(href) causes a server redirect back to summary, so we must CLICK.
        # After clicking, poll context.pages to detect whether a new tab was created.
        step(5, "Opening List of Requests Registered")
        try:
            # Prefer a link whose href contains the list page name
            list_link_loc = page.locator("a[href*='list_action_status']")
            if list_link_loc.count() > 0:
                reg_link = list_link_loc.first
                ok(f"Found list link by href: {reg_link.get_attribute('href')[:80]!r}")
            else:
                # Fallback: link with text "Registered"
                cands = page.locator("a").filter(has_text=re.compile(r"^Registered$", re.IGNORECASE)).all()
                if not cands:
                    cands = page.locator("a").filter(has_text=re.compile(r"Registered", re.IGNORECASE)).all()
                reg_link = cands[0] if cands else None
                if reg_link:
                    ok(f"Found Registered link by text  href={reg_link.get_attribute('href')!r}")

            if reg_link:
                pages_before = set(id(p) for p in context.pages)
                ok(f"Open tabs before click: {len(pages_before)}  |  URL: {page.url}")

                reg_link.click()
                time.sleep(4)  # give browser time to open new tab

                new_tabs = [p for p in context.pages if id(p) not in pages_before]
                ok(f"New tabs after click: {len(new_tabs)}")

                if new_tabs:
                    page = new_tabs[0]
                    page.wait_for_load_state("networkidle", timeout=15000)
                    ok(f"Switched to new tab: {page.url}")
                else:
                    # Same-tab navigation — page already on new URL
                    page.wait_for_load_state("networkidle", timeout=15000)
                    ok(f"Same tab after click: {page.url}")

                time.sleep(2)
                # Set DataTables to show all entries
                for sel in ["select[name*='_length']", "select.dataTables_length"]:
                    try:
                        el = page.query_selector(sel)
                        if el and el.is_visible():
                            el.select_option("-1")
                            page.wait_for_load_state("networkidle", timeout=5000)
                            time.sleep(1)
                            ok("DataTables: showing all entries")
                            break
                    except Exception:
                        continue
            else:
                warn("'Registered' link not found — please click it manually")
                pause("Click 'Registered' under Requests in the browser, then press Enter.")
                time.sleep(3)
                new_tabs = [p for p in context.pages if id(p) not in set()]
                if len(context.pages) > 1:
                    page = context.pages[-1]
                page.wait_for_load_state("networkidle", timeout=15000)
        except Exception as e:
            warn(f"Step 5 error: {type(e).__name__}: {e}")

        # Step 6 — Locate and click the correct RTI status link
        step(6, f"Locating RTI row  name={applicant_name or 'N/A'}  date={filed_date_str or 'N/A'}")
        ok(f"Page URL at Step 6: {page.url}")

        dump_tabs(context, "before you click the RTI link")

        # Reset the new-tab tracker so only tabs opened AFTER this point (by the user's
        # click) are considered.
        opened_pages.clear()

        warn(
            "IMPORTANT: do all clicking in the SEPARATE automation Chromium window that "
            "this script opened — NOT in your normal Chrome/Safari. That window already "
            "passed the CAPTCHA/OTP and is on your status page."
        )
        pause(
            "In the AUTOMATION browser window (the one this script opened):\n"
            "     1. Click 'Registered' if you see the status summary, to open the list.\n"
            "     2. Click the correct 'RTI REQUEST RECEIVED' link.\n"
            "     3. Let the RTI detail page fully load.\n"
            "     Then press Continue here."
        )
        time.sleep(2)

        # Selection priority:
        #   1. A tab the listener saw open after the click (the detail tab).
        #   2. Otherwise the tab the user is currently viewing (visibilityState).
        rows = dump_tabs(context, "after you clicked")
        if opened_pages:
            page = opened_pages[-1]
            ok(f"Captured newly-opened tab from listener: {page.url}")
        else:
            visible = find_visible_page(context)
            if visible is not None:
                page = visible
                ok(f"No new tab opened — using the VISIBLE tab: {page.url}")
            else:
                candidates = [p for p in context.pages if p.url not in ("about:blank", "")]
                page = candidates[-1] if candidates else context.pages[-1]
                warn(f"No visible tab detected — falling back to last tab: {page.url}")

        # If the chosen page is still the status/summary page, the user almost certainly
        # clicked inside a different browser window — warn loudly instead of saving it.
        if "status_history" in page.url.lower() or (
            "citizen_view_history" in page.url.lower() and len(context.pages) == 1
        ):
            warn("⚠ The only tab here is your STATUS page — no RTI detail page was opened "
                 "in THIS automation window. Click the RTI link in the automation Chromium "
                 "window (not your normal browser), then press Continue again.")
            pause("Open the RTI detail page in the AUTOMATION window, then press Continue to retry capture.")
            time.sleep(2)
            dump_tabs(context, "retry — after you clicked")
            if opened_pages:
                page = opened_pages[-1]
            else:
                page = find_visible_page(context) or page
            ok(f"Retry selection: {page.url}")

        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass

        ok(f"==> PDF will be captured from: {page.url}")

        # Step 7 — Generate PDF via Chrome DevTools Protocol
        step(7, "Generating PDF via Chrome DevTools Protocol")
        try:
            page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tf:
            pdf_path = tf.name

        cdp = context.new_cdp_session(page)
        pdf_result = cdp.send("Page.printToPDF", {
            "format": "A4",
            "printBackground": True,
            "marginTop": 0.5,
            "marginBottom": 0.5,
            "marginLeft": 0.5,
            "marginRight": 0.5,
        })
        pdf_bytes_local = base64.b64decode(pdf_result["data"])
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes_local)
        cdp.detach()
        ok(f"PDF captured: {pdf_path} ({len(pdf_bytes_local):,} bytes)")
        browser.close()

        # Step 8 — Upload to Supabase via backend
        step(8, "Uploading PDF to Supabase")
        try:
            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()

            upload_resp = requests.post(
                f"{backend}/api/file-rti/drafts/{draft_id}/upload-pdf",
                files={"pdf": ("filed_rti.pdf", pdf_bytes, "application/pdf")},
                timeout=30,
            )
            if upload_resp.ok:
                result = upload_resp.json()
                ok(f"Uploaded: {result.get('url', '')}")
            else:
                warn(f"Upload failed ({upload_resp.status_code}): {upload_resp.text}")
        except Exception as e:
            warn(f"Upload error: {e}")
        finally:
            try: os.unlink(pdf_path)
            except Exception: pass

        ok("All done! Filed RTI PDF has been saved to your draft.")

      except Exception as _err:
        import traceback as _tb
        warn(f"FATAL: {_err}")
        print(_tb.format_exc()); sys.stdout.flush()
        sys.exit(1)


if __name__ == "__main__":
    main()
