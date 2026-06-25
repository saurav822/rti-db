#!/usr/bin/env python3
"""
Probe the Delhi RTI main form (request.php).

Auto-passes the landing page (Email + Mobile + client-side captcha read from
the DOM), pauses for OTP if the portal asks, then dumps every field on
request.php so the inferred selectors in selectors_delhi.py can be confirmed.

Usage:
    python probe_delhi.py                 # uses RTI_EMAIL / RTI_PHONE from .env
    python probe_delhi.py a@b.com 9999999999

Run once with a real email you can read OTP from.
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

import selectors_delhi as S

load_dotenv(Path(__file__).parent / ".env", override=True)

EMAIL = sys.argv[1] if len(sys.argv) > 1 else os.getenv("RTI_EMAIL", "")
PHONE = sys.argv[2] if len(sys.argv) > 2 else os.getenv("RTI_PHONE", "")

if not EMAIL or not PHONE:
    print("Need EMAIL and PHONE (args or RTI_EMAIL/RTI_PHONE in .env).")
    sys.exit(1)


def dump(page):
    print(f"\n{'═'*70}\n  URL: {page.url}\n  Title: {page.title()}\n{'═'*70}\n")
    print("── INPUTS & TEXTAREAS ──────────────────────────────────────────────\n")
    for f in page.query_selector_all("input, textarea"):
        tag = f.evaluate("e => e.tagName.toLowerCase()")
        name = f.get_attribute("name") or ""
        idd = f.get_attribute("id") or ""
        typ = f.get_attribute("type") or "text"
        vis = f.is_visible()
        try:
            cur = f.input_value() or ""
        except Exception:
            cur = ""
        print(f"  <{tag}> name={name!r:28} id={idd!r:22} type={typ!r:10} vis={str(vis):5} value={cur!r}")

    print("\n── SELECT DROPDOWNS ────────────────────────────────────────────────\n")
    for sel in page.query_selector_all("select"):
        name = sel.get_attribute("name") or ""
        idd = sel.get_attribute("id") or ""
        opts = sel.query_selector_all("option")
        print(f"  <select> name={name!r:28} id={idd!r:22} ({len(opts)} options)")
        for opt in opts[:15]:
            print(f"      value={opt.get_attribute('value')!r:14} label={opt.text_content().strip()!r}")
        if len(opts) > 15:
            print(f"      ... ({len(opts)-15} more)")
        print()

    print("── RADIO BUTTONS ───────────────────────────────────────────────────\n")
    for r in page.query_selector_all("input[type='radio']"):
        print(f"  name={r.get_attribute('name')!r:22} value={r.get_attribute('value')!r:16} vis={r.is_visible()}")
    print(f"\n{'═'*70}\n")


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, slow_mo=120)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.on("dialog", lambda d: d.accept())

    print(f"Opening {S.PORTAL_URL}")
    page.goto(S.PORTAL_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("networkidle", timeout=15000)

    page.fill(S.LANDING_EMAIL.split(",")[0], EMAIL)
    page.fill(S.LANDING_MOBILE.split(",")[0], PHONE)

    # Read client-side captcha from the DOM
    answer = ""
    for _ in range(4):
        el = page.query_selector(S.LANDING_CAPTCHA_VALUE.split(",")[0])
        if el:
            answer = (el.input_value() or el.get_attribute("value") or "").strip()
        if answer:
            break
        time.sleep(0.6)
    print(f"Captcha read from DOM: {answer!r}")
    if answer:
        page.fill(S.LANDING_CAPTCHA_INPUT.split(",")[0], answer)
        try:
            page.click(S.LANDING_SUBMIT.split(",")[0], timeout=3000)
        except Exception:
            pass
        page.wait_for_load_state("networkidle", timeout=20000)

    print(f"\nAfter landing submit → {page.url}")
    if "otp" in page.url.lower() or page.query_selector(S.OTP_INPUT):
        input("OTP page detected. Enter OTP + submit in the browser, then press Enter here…")
        page.wait_for_load_state("networkidle", timeout=20000)

    dump(page)
    input("Probe complete — press Enter to close the browser.")
    browser.close()
