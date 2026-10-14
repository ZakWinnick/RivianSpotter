/* Static maintenance UI: repository editing happens on GitHub. */
(() => {
  // Remove retired credentials from this device without reading their values.
  const oldKeys = ['rivianAdminGitHubToken', 'rivianAdminAuth', 'rivianAdminAuthTime', 'rivianAdminToken', 'adminToken', 'githubToken'];
  for (const storageName of ['localStorage', 'sessionStorage']) {
    try { for (const key of oldKeys) window[storageName].removeItem(key); } catch (_) { /* Storage may be disabled. */ }
  }
})();
