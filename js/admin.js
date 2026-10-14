/* Route editing to GitHub, where sign-in and repository access are enforced. */
(() => {
  // Remove retired credentials from this device without reading their values.
  const oldKeys = ['rivianAdminGitHubToken', 'rivianAdminAuth', 'rivianAdminAuthTime', 'rivianAdminToken', 'adminToken', 'githubToken'];
  for (const storageName of ['localStorage', 'sessionStorage']) {
    try { for (const key of oldKeys) window[storageName].removeItem(key); } catch (_) { /* Storage may be disabled. */ }
  }
  // Fixed destination: query strings cannot choose a redirect target.
  window.location.replace('https://github.com/ZakWinnick/RivianSpotter/edit/main/data/locations.json');
})();
