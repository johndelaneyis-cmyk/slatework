// src/lib/markdown.js — shared, escaped-by-default markdown renderer.
// Loaded ahead of every page-*.js module that needs it; exposes
// `window.Slatework.renderMarkdown(md)` and `window.Slatework.escapeHtml(s)`.
//
// Eliminates 100+ LOC of divergent renderMarkdown duplicates that lived
// across page-marking, page-lesson-plan, page-worksheet, page-cefr.
// Closes Section E #6 of 2026-05-08 audit.
//
// Supports: headers (## … ######), unordered lists (`- `), ordered lists
// (`1. `), inline bold (`**…**`), inline italic (`*…*`), paragraphs.
// All AI-output content is HTML-escaped before any markdown pattern is
// applied — `<script>alert(1)</script>**bold**` becomes
// `<p>&lt;script&gt;alert(1)&lt;/script&gt;<strong>bold</strong></p>`.

(function () {
  'use strict';
  const SW = (window.Slatework = window.Slatework || {});

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inlineMd(s) {
    // s is already HTML-escaped; safe to apply markdown markers.
    return escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  function renderMarkdown(md) {
    if (!md) return '';
    const lines = String(md).split('\n');
    let html = '';
    let listType = null; // 'ul' | 'ol' | null
    const closeList = () => { if (listType) { html += '</' + listType + '>'; listType = null; } };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { closeList(); html += '\n'; continue; }
      if (line.startsWith('###### ')) { closeList(); html += '<h6>' + inlineMd(line.slice(7)) + '</h6>'; }
      else if (line.startsWith('##### ')) { closeList(); html += '<h5>' + inlineMd(line.slice(6)) + '</h5>'; }
      else if (line.startsWith('#### ')) { closeList(); html += '<h4>' + inlineMd(line.slice(5)) + '</h4>'; }
      else if (line.startsWith('### ')) { closeList(); html += '<h3>' + inlineMd(line.slice(4)) + '</h3>'; }
      else if (line.startsWith('## ')) { closeList(); html += '<h2>' + inlineMd(line.slice(3)) + '</h2>'; }
      else if (line.startsWith('# ')) { closeList(); html += '<h1>' + inlineMd(line.slice(2)) + '</h1>'; }
      else if (line.startsWith('- ')) {
        if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
        html += '<li>' + inlineMd(line.slice(2)) + '</li>';
      }
      else if (/^\d+\.\s/.test(line)) {
        if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
        html += '<li>' + inlineMd(line.replace(/^\d+\.\s/, '')) + '</li>';
      }
      else { closeList(); html += '<p>' + inlineMd(line) + '</p>'; }
    }
    closeList();
    return html;
  }

  SW.renderMarkdown = renderMarkdown;
  SW.escapeHtml = escapeHtml;
})();
