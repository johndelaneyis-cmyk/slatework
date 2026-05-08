// src/lib/page-privacy.js
// Wires the Clear / Export / Import controls on /privacy.
(() => {
  const $ = (id) => document.getElementById(id);
  const status = $('profile-action-status');
  if (!status) return;
  const SW = window.Slatework;
  if (!SW || !SW.Profile) {
    status.textContent = 'Profile module failed to load.';
    return;
  }

  function setStatus(msg, ok) {
    status.textContent = msg;
    status.style.color = ok ? 'var(--ok)' : (ok === false ? 'var(--err)' : 'var(--ink-faint)');
  }

  $('profile-clear-btn').addEventListener('click', () => {
    if (!confirm('Wipe all tutor and student profiles from this browser? This cannot be undone.')) return;
    const ok = SW.Profile.clearAll();
    setStatus(ok ? 'All profiles cleared.' : 'Could not clear profiles (storage error).', ok);
  });

  $('profile-export-btn').addEventListener('click', () => {
    try {
      const data = SW.Profile.exportAsJson();
      const blob = new Blob([data], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'slatework-profiles-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('Exported.', true);
    } catch (err) {
      setStatus('Export failed.', false);
    }
  });

  const fileInput = $('profile-import-file');
  $('profile-import-btn').addEventListener('click', () => { fileInput.click(); });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = SW.Profile.importFromJson(reader.result);
      setStatus(ok ? 'Imported.' : 'Import failed (wrong shape or schema).', ok);
      fileInput.value = '';
    };
    reader.onerror = () => setStatus('Could not read file.', false);
    reader.readAsText(file);
  });
})();
