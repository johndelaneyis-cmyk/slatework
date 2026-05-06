"""Real-browser QA pass on every Slatework page at desktop + mobile.
Captures screenshots, console errors, layout issues, network failures.
Reads only — never modifies the site.

Run locally against wrangler dev: `python tests/qa.py http://localhost:8788`
Run against production: `python tests/qa.py https://slatework.tools`
"""

from playwright.sync_api import sync_playwright
import json
import sys
from pathlib import Path

DEFAULT_HOST = "http://localhost:8788"
HOST = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_HOST

PAGES = [
    "/",
    "/setup.html", "/tax.html", "/insurance.html",
    "/rates.html", "/payments.html",
    "/contract.html",
    "/lesson-plan.html", "/cefr.html", "/worksheet.html", "/marking.html",
    "/about.html", "/privacy.html", "/terms.html"
]

VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "mobile":  {"width": 390,  "height": 844},
}

OUT = Path(__file__).resolve().parent.parent / ".claude" / "qa-screenshots"
OUT.mkdir(exist_ok=True, parents=True)

findings = []

def add(page, viewport, severity, kind, msg):
    findings.append({
        "page": page, "viewport": viewport,
        "severity": severity, "kind": kind, "msg": msg
    })

def slug(p):
    return "home" if p == "/" else p.strip("/").replace("/", "-").replace(".html", "")

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    for vp_name, vp in VIEWPORTS.items():
        ctx = browser.new_context(viewport=vp)
        for p in PAGES:
            page = ctx.new_page()
            console_errors = []
            page.on("pageerror", lambda e, P=p, V=vp_name: add(P, V, "high", "pageerror", str(e)))
            page.on("console", lambda m, P=p, V=vp_name: console_errors.append(m) if m.type == "error" else None)
            try:
                resp = page.goto(HOST + p, wait_until="networkidle", timeout=15000)
                if resp is None or resp.status >= 400:
                    add(p, vp_name, "high", "http", f"status {resp.status if resp else 'no response'}")
                    continue
                page.screenshot(path=str(OUT / f"{slug(p)}-{vp_name}.png"), full_page=True)
                # Layout sanity: check footer exists
                if not page.query_selector("footer.site-footer"):
                    add(p, vp_name, "medium", "layout", "site-footer not found")
                # Console errors
                for m in console_errors:
                    add(p, vp_name, "medium", "console", m.text)
            except Exception as e:
                add(p, vp_name, "high", "exception", str(e)[:200])
            finally:
                page.close()
        ctx.close()
    browser.close()

# Write findings
report = OUT / "findings.json"
report.write_text(json.dumps(findings, indent=2))

# Summary
high = sum(1 for f in findings if f["severity"] == "high")
med  = sum(1 for f in findings if f["severity"] == "medium")
print(f"QA pass complete. {high} high, {med} medium findings. Report: {report}")
print(f"Screenshots: {OUT}")
sys.exit(1 if high > 0 else 0)
