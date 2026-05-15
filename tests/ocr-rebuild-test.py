"""
End-to-end test for the Vision-OCR line-break rebuild fix.

Generates three test PNGs that exercise the cases the fix targets:
  1. Mid-word soft wrap (Essie's reported failure): "having" → "hav\ning"
  2. Hyphenated wrap: "running" → "run-\nning"
  3. Real paragraph break (must be preserved as \n)

Posts each to the deployed /api/ocr endpoint and prints the returned text
so we can verify the symbol-rebuild path produces single-line tokens
instead of broken-across-newlines fragments.
"""

import base64
import io
import json
import urllib.request

from PIL import Image, ImageDraw, ImageFont

# Use a font that ships with Windows — Arial is universal. Fall back to default.
def get_font(size=28):
    for candidate in ["arial.ttf", "Arial.ttf", "C:/Windows/Fonts/arial.ttf"]:
        try:
            return ImageFont.truetype(candidate, size=size)
        except Exception:
            continue
    return ImageFont.load_default()

def make_png(lines, width=400, line_height=42):
    """Draw `lines` (list of strings) onto a white PNG, one per line."""
    height = line_height * len(lines) + 40
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    font = get_font(28)
    for i, line in enumerate(lines):
        draw.text((20, 20 + i * line_height), line, fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def post_ocr(png_bytes, label):
    b64 = base64.b64encode(png_bytes).decode("ascii")
    payload = json.dumps({"image_data": b64, "image_mime": "image/png"}).encode("utf-8")
    req = urllib.request.Request(
        "https://slatework.tools/api/ocr",
        data=payload,
        headers={
            "Content-Type": "application/json",
            # CF Browser Integrity Check blocks the default Python-urllib UA
            # with error 1010. Use a realistic browser signature.
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Origin": "https://slatework.tools",
            "Referer": "https://slatework.tools/marking",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read().decode("utf-8")
            data = json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(body)
        except Exception:
            data = {"raw": body, "status": e.code}
    print(f"\n=== {label} ===")
    if "text" in data:
        # Show with explicit \n so we see whether line breaks survived.
        rendered = data["text"].replace("\n", "\\n\n")
        print("RETURNED TEXT (\\n = real newline):")
        print(rendered)
        print(f"\nchar_count={data.get('char_count', len(data.get('text','')))}")
        print(f"contains_newline={'YES' if chr(10) in data['text'] else 'NO'}")
        if "_diag" in data:
            print(f"break_types={data['_diag']}")
    else:
        print("NON-TEXT RESPONSE:")
        print(json.dumps(data, indent=2)[:600])

# Case 1: Essie's reported failure — soft wrap mid-word
case1 = make_png([
    "we ar hav",
    "ing a great class",
])

# Case 2: Hyphenated wrap — Vision should drop the hyphen
case2 = make_png([
    "the lesson was inter-",
    "esting and fun",
])

# Case 3: Real paragraph break — should produce \n in output
case3 = make_png([
    "First sentence here.",
    "",
    "Second paragraph.",
])

post_ocr(case1, "CASE 1 — mid-word soft wrap (the Essie case)")
post_ocr(case2, "CASE 2 — hyphenated line wrap")
post_ocr(case3, "CASE 3 — two paragraphs with blank line")
