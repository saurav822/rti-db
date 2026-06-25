#!/usr/bin/env python3
"""
Scrapes all Ministry → Public Authority mappings from rtionline.gov.in.

Needs a valid session URL (from after OTP verification).
Run once — saves output to portal_authorities.json.

Usage:
    python scrape_authorities.py "<session_url>"

Example:
    python scrape_authorities.py "https://rtionline.gov.in/request/request.php?emailchk=...&&cellchk=...&&urletoken=...&&time=1"
"""

import json
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

if len(sys.argv) < 2:
    print("Usage: python scrape_authorities.py \"<session_url>\"")
    sys.exit(1)

URL = sys.argv[1]
OUT = Path(__file__).parent / "portal_authorities.json"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)   # headless — no window needed
    page = browser.new_page(viewport={"width": 1280, "height": 900})

    print(f"Opening form…")
    page.goto(URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("networkidle", timeout=15000)

    # Read all ministry options
    ministry_opts = page.query_selector_all("select[name='MinistryId'] option")
    ministries = []
    for opt in ministry_opts:
        val   = opt.get_attribute("value") or ""
        label = opt.text_content().strip()
        if val and val != "0":   # skip --Select-- and "All Ministries"
            ministries.append({"id": val, "label": label})

    print(f"Found {len(ministries)} ministries. Scraping public authorities…\n")

    results = []
    failed  = []

    for i, ministry in enumerate(ministries, 1):
        mid   = ministry["id"]
        mlabel = ministry["label"]
        print(f"  [{i:3}/{len(ministries)}] {mlabel[:60]}", end="  ", flush=True)

        try:
            # Select ministry
            page.select_option("select[name='MinistryId']", value=mid)

            # Wait for DepartmentId to populate (AJAX)
            # Poll until options appear or timeout
            deadline = time.time() + 8
            dept_opts = []
            while time.time() < deadline:
                opts = page.query_selector_all("select[name='DepartmentId'] option")
                non_empty = [o for o in opts if o.get_attribute("value")]
                if non_empty:
                    dept_opts = non_empty
                    break
                time.sleep(0.3)

            authorities = []
            for opt in dept_opts:
                val   = opt.get_attribute("value") or ""
                label = opt.text_content().strip()
                if val:
                    authorities.append({"id": val, "label": label})

            print(f"→ {len(authorities)} authorities")

            results.append({
                "ministry_id":    mid,
                "ministry_label": mlabel,
                "authorities":    authorities,
            })

            # Reset DepartmentId for next iteration
            page.select_option("select[name='MinistryId']", value="")
            time.sleep(0.2)

        except Exception as e:
            print(f"→ ERROR: {e}")
            failed.append({"ministry_id": mid, "ministry_label": mlabel, "error": str(e)})

    browser.close()

# Save output
output = {
    "source":   "rtionline.gov.in — scraped via Playwright",
    "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    "total_ministries": len(results),
    "total_authorities": sum(len(r["authorities"]) for r in results),
    "ministries": results,
}
if failed:
    output["failed"] = failed

OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False))

print(f"\n{'='*60}")
print(f"  Done!")
print(f"  Ministries scraped : {len(results)}")
print(f"  Total authorities  : {output['total_authorities']}")
if failed:
    print(f"  Failed             : {len(failed)}")
print(f"  Saved to           : {OUT}")
print(f"{'='*60}\n")
