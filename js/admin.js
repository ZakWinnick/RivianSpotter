/* Static maintenance UI: repository editing happens on GitHub. */
(() => {
  // Remove retired credentials from this device without reading their values.
  const oldKeys = ['rivianAdminGitHubToken', 'rivianAdminAuth', 'rivianAdminAuthTime', 'rivianAdminToken', 'adminToken', 'githubToken'];
  for (const storageName of ['localStorage', 'sessionStorage']) {
    try { for (const key of oldKeys) window[storageName].removeItem(key); } catch (_) { /* Storage may be disabled. */ }
  }
  const list = document.getElementById('review-list');
  const status = document.getElementById('review-status');
  if (!list || !status) return;
  fetch('/data/locations.json', {cache: 'no-store'})
    .then(response => { if (!response.ok) throw new Error('inventory unavailable'); return response.json(); })
    .then(locations => {
      if (!Array.isArray(locations)) throw new Error('inventory invalid');
      const queue = locations.filter(place => place.verificationStatus === 'needs-review' || place.status === 'needs-review');
      status.textContent = queue.length ? `${queue.length} ${queue.length === 1 ? 'place needs' : 'places need'} review.` : 'No places are marked as needing review in the current inventory.';
      for (const place of queue) {
        const item = document.createElement('li');
        const name = document.createElement('strong');
        name.textContent = place.name || 'Unnamed place';
        item.append(name, document.createTextNode(` — ${[place.city, place.state, place.country].filter(Boolean).join(', ')}`));
        if (typeof place.notes === 'string' && place.notes) { const note = document.createElement('p'); note.textContent = place.notes; item.append(note); }
        const link = document.createElement('a');
        link.href = 'https://github.com/zakwinnick/RivianSpotter/edit/main/data/locations.json';
        link.textContent = `Review inventory entry ${place.id}`;
        item.append(document.createElement('br'), link); list.append(item);
      }
    }).catch(() => { status.textContent = 'The review queue could not load. Open the inventory on GitHub to review entries.'; });
})();
