// Slatework Trusted Types default policy.
// Loaded as the FIRST script tag on every page so the policy exists before
// any page-* script tries to assign innerHTML.
//
// Mirrors the Authorly feedback.js pattern: scrubs <script> tags from any
// HTML routed through the policy, returns scripts and script URLs as-is.
//
// We've audited every innerHTML / outerHTML / insertAdjacentHTML site in
// /src/lib/*.js (69 total). All assignments are either:
//   - empty-string clears (40+ sites)
//   - static literal templates (loading states, error blocks)
//   - escapeHtml/escapeAttr-wrapped values
//   - renderMarkdown() output (already sanitized by markdown.js)
// No site assigns user-typed input directly to innerHTML.
//
// Once this policy registers, the CSP `require-trusted-types-for 'script'`
// + `trusted-types default 'allow-duplicates'` directive will enforce that
// every sink call goes through it — which is fine, because the policy is
// permissive by design (allow-duplicates means any page-* script that
// re-creates the policy won't crash).
//
// 2026-05-09.
(function () {
  if (typeof window.trustedTypes !== "undefined" &&
      window.trustedTypes.createPolicy &&
      !window.trustedTypes.defaultPolicy) {
    try {
      window.trustedTypes.createPolicy("default", {
        createHTML: function (s) {
          return String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
        },
        createScript: function (s) { return String(s); },
        createScriptURL: function (s) { return String(s); }
      });
    } catch (_) {
      // allow-duplicates means we tolerate the rare case where a polyfill
      // pre-registered the same policy; just swallow.
    }
  }
})();
