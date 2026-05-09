# Section C — Quality (A11y / Perf / CWV / Best Practices) (2026-05-09)

**A11y:** 9.5/10 (vs 9.4)
**Perf/CWV:** 9.2/10 (vs 9.0)
**Best practices:** 9.6/10 (vs 9.5)
**Combined:** 9.4/10

## Sub-scores
| Sub-dim | Score | Note |
|---|---|---|
| 1. Profile dialog a11y | 9.5 | Native `<dialog>` + `showModal()` (`profile-ui.js:217,351`), `aria-labelledby="profile-editor-title"` (`:159`), focus moves to first input on open (`:218,352`), Esc/backdrop close are free with native dialog. No focus-trap polyfill needed. |
| 2. Strip a11y | 10 | `<aside role="region" aria-label="Tutor profile" / "Current student">` (`profile-ui.js:86,111`); `<label class="visually-hidden" for="student-picker">` on the select (`:112`). |
| 3. CEFR Don't-know expander | 10 | Real `<fieldset>`/`<legend>` per question (`profile-ui.js:397-411`), unique `id`s with `<label for>`, distinct `name` per group, `setBtn.disabled` until all 3 answered. Textbook radio-group. |
| 4. Slideshow keyboard nav | 9.5 | Arrow L/R, Space, Enter, PageUp/Dn, Home, End all wired (`slideshow-render.js:218-223`); root has `tabindex="0"` and `:focus-visible` ring (`styles.css:2471`). `aria-roledescription="slideshow"` + `aria-live="polite"` counter (`slideshow-render.js:100,106`). Missing only an Esc handler to close/clear the host — minor. |
| 5. Touch targets ≥44×44 | 8 | Generic `.btn` is 44px (`styles.css:1074`), but `.student-strip-edit/.student-strip-quick` lock `min-height:38px` (`:2275`); `.tutor-strip-edit` is `min-height:0` btn-link (`:2252`); `<summary>` on cefr-quick-check / adjust-for-today has no padding floor — mobile thumb-tap area below WCAG 2.5.8 (24px) only by coincidence. |
| 6. LCP impact (profile-mount) | 10 | `#profile-mount` ships as 3 empty `<div>`s (`lesson-plan.html:108-112`); strips render only if `Profile.getTutor()`/`getStudents()` populated — zero render-blocking, zero layout impact on first paint. |
| 7. CLS sources | 9.5 | Twemoji bundle (107 SVGs, 499K total) lazy-loaded via `SlideshowImages.resolve` only after `#ext-slideshow` click; PptxGenJS injected on first export click only (`slideshow-export.js:27-37`). `loading="lazy" decoding="async"` on slide imgs (`slideshow-render.js:84-85`). `.slideshow-stage { min-height:320px }` reserves space (`styles.css:2494`). No font swap CLS regression detected. |
| 8. INP on dialog/form | 9.5 | `dialog.showModal()` is single synchronous paint; form submit writes to localStorage only — no main-thread blocking. Profile-strip rerender clears `container.innerHTML` then re-appends ~10 nodes — sub-frame. |
| 9. Asset weight | 9 | Per-page JS unchanged (defer-loaded `<script>` tags `lesson-plan.html:245-251`). Twemoji bundle is opt-in (slideshow only). PptxGenJS lazy via unpkg with SRI. CSS now 68K (+~2K for new selectors at `styles.css:2240-2553`). Acceptable. |
| 10. Cache hygiene | 10 | `_headers` adds `/assets/illustrations/young-learner/*` immutable rule (`_headers:33-34`). 6 cache bumps to `?v=24` is normal launch churn; URL-versioning is correct given `immutable` directive on `/src/lib/*`. |
| 11. CSP / security headers | 9.5 | Strict CSP retained: no `'unsafe-inline'`, no `'unsafe-eval'`. `unpkg.com` + `cdnjs.cloudflare.com` already on script-src/connect-src for PptxGenJS lazy-load. Trusted Types still deferred (per memory) — fine for this audit. |
| 12. Reduced-motion | 9.5 | Explicit `@media (prefers-reduced-motion: reduce)` killing slideshow-slide transitions (`styles.css:2550-2553`); base CSS uses `display:none/grid` (no transition) — defense in depth. |
| 13. Color contrast on new selectors | 9 | `.tutor-strip` / `.student-strip` use `--ink-2` on `--surface-2` (token-driven, baseline-tested in prior audit). `.profile-empty-link` uses `--ink-muted` on transparent with dashed `--line-strong` — needs spot-check at 0.875rem. Hover state correctly switches to `--accent`. |

## Findings
### Critical
- _None._ The new architecture is shipped with a11y-first primitives (native dialog, fieldset, role="region").

### Important
- **Touch targets undersized** — `.student-strip-edit/.student-strip-quick` (`styles.css:2275` `min-height:38px`) and `.tutor-strip-edit` btn-link (`:2252`) sit below 44px. Bump to 44px on the strip controls; the ghost link can stay text-link if it only appears in desktop strips, but verify on mobile (≤640px).
- **Slideshow Esc to close not wired** — `slideshow-render.js:218-223` handles arrows/Space/Home/End but not `Escape`. Power users will expect Esc to clear the slideshow host or unfocus.
- **`<summary>` tap area** — `details.cefr-quick-check > summary` and `details.adjust-for-today > summary` (`styles.css:2380,2399`) set only `cursor:pointer` and `font-size:0.875rem`. At default line-height that's ~22px tall — under 24px AA SC 2.5.8 minimum and well under 44px AAA. Add `padding: 8px 0` to the summaries.
- **Audience labels not escHtml'd** — `slideshow-render.js:97` builds `<option>` markup with raw `AUDIENCE_LABELS[a]`. Currently a static map so safe, but a future "Other" entry from response data would inject. Cheap fix: run `escHtml(AUDIENCE_LABELS[a] || a)`.

### Nice-to-have
- **Visible-name = accessible-name** — slideshow prev/next buttons display only `←` / `→` glyphs with `aria-label="Previous/Next slide"` (`slideshow-render.js:108-109`). Voice-control users saying "Click previous slide" works (aria-label match), but adding a `<span class="visually-hidden">Previous slide</span>` would harden it.
- **Hardcoded audience array duplication** — `slideshow-render.js:139` and `:272` both list `['young_learner','teen','adult','exam_prep']`. Lift to module constant.
- **`dialog.innerHTML = ''` on close** — works, but Chrome <105 may flash. Consider `dialog.replaceChildren()` for marginal INP win (~1ms).
- **`style.css` size** — 68K uncompressed. Could split per-page-bundle but Brotli compresses to ~12K — not worth the build complexity yet.

## Top 3 ship-now
1. Bump `.student-strip-edit/.student-strip-quick/.tutor-strip-edit` and the two `<details>` summaries to ≥44px tap height (`styles.css:2252,2275,2380,2399`). 4-line CSS edit.
2. Add `Escape` handler to slideshow root in `slideshow-render.js:218-223` to clear/close the host.
3. Wrap `escHtml()` around `AUDIENCE_LABELS[a]` in `slideshow-render.js:97` for defence-in-depth.
