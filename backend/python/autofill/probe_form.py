#!/usr/bin/env python3
"""
Probe script — opens the RTI request form and dumps:
  - All input/textarea fields (name, id, type, value)
  - All select dropdowns with every option (value + label)

Usage:
    python probe_form.py "<form_url>"

Example:
    python probe_form.py "https://rtionline.gov.in/request/request.php?emailchk=...&&cellchk=...&&urletoken=...&&time=1"
"""

import sys
import time
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2:
    print("Usage: python probe_form.py \"<url>\"")
    sys.exit(1)

URL = sys.argv[1]

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, slow_mo=100)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.goto(URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("networkidle", timeout=15000)
    time.sleep(1)

    print(f"\n{'═'*70}")
    print(f"  URL: {page.url}")
    print(f"  Title: {page.title()}")
    print(f"{'═'*70}\n")

    # ── All input / textarea fields ───────────────────────────────────────
    print("── INPUTS & TEXTAREAS ──────────────────────────────────────────────\n")
    fields = page.query_selector_all("input, textarea")
    for f in fields:
        tag   = f.evaluate("e => e.tagName.toLowerCase()")
        name  = f.get_attribute("name") or ""
        id_   = f.get_attribute("id") or ""
        typ   = f.get_attribute("type") or "text"
        val   = f.get_attribute("value") or ""
        vis   = f.is_visible()
        cur   = ""
        try:
            cur = f.input_value() or ""
        except Exception:
            pass
        print(f"  <{tag}> name={name!r:30} id={id_!r:25} type={typ!r:12} visible={str(vis):5}  value={cur!r}")

    # ── All select dropdowns with options ─────────────────────────────────
    print(f"\n── SELECT DROPDOWNS ────────────────────────────────────────────────\n")
    selects = page.query_selector_all("select")
    for sel in selects:
        name  = sel.get_attribute("name") or ""
        id_   = sel.get_attribute("id") or ""
        vis   = sel.is_visible()
        opts  = sel.query_selector_all("option")
        print(f"  <select> name={name!r:30} id={id_!r:25} visible={vis}")
        for opt in opts:
            val   = opt.get_attribute("value") or ""
            label = opt.text_content().strip()
            sel_  = "✓" if opt.get_attribute("selected") else " "
            print(f"    [{sel_}] value={val!r:30}  label={label!r}")
        print()

    # ── Radio buttons ──────────────────────────────────────────────────────
    print(f"\n── RADIO BUTTONS ───────────────────────────────────────────────────\n")
    radios = page.query_selector_all("input[type='radio']")
    for r in radios:
        name  = r.get_attribute("name") or ""
        val   = r.get_attribute("value") or ""
        chk   = "✓" if r.is_checked() else " "
        vis   = r.is_visible()
        print(f"  [{chk}] name={name!r:25} value={val!r:20} visible={vis}")

    print(f"\n{'═'*70}\n")
    input("  Done — press Enter to close the browser.")
    browser.close()
