const seriesList = document.getElementById('seriesList');
const emptyState = document.getElementById('emptyState');
const calendarList = document.getElementById('calendarList');
const calendarEmpty = document.getElementById('calendarEmpty');

const detailOverlay = document.getElementById('detailOverlay');
const detailContent = document.getElementById('detailContent');
const addOverlay = document.getElementById('addOverlay');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// ---------- Navigation entre les vues ----------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`view-${tab.dataset.view}`).classList.add('active');
    if (tab.dataset.view === 'calendrier') loadCalendar();
  });
});

// ---------- Vue "À suivre" ----------
async function loadSeries() {
  const res = await fetch('/api/series');
  const data = await res.json();

  seriesList.innerHTML = '';
  emptyState.hidden = data.length > 0;

  for (const s of data) {
    const card = document.createElement('div');
    card.className = 'series-card';
    card.addEventListener('click', () => openDetail(s.id));

    const poster = s.poster_path
      ? `https://image.tmdb.org/t/p/w300${s.poster_path}`
      : '';

    const chip = s.next_episode
      ? `<span class="next-chip">S${pad(s.next_episode.season_number)}E${pad(s.next_episode.episode_number)}</span>`
      : `<span class="next-chip done">✓ à jour</span>`;

    const pct = s.total_count > 0 ? Math.round((s.watched_count / s.total_count) * 100) : 0;

    card.innerHTML = `
      ${poster ? `<img class="series-poster" src="${poster}" alt="${s.name}" />` : '<div class="series-poster"></div>'}
      <div class="series-body">
        <p class="series-name">${escapeHtml(s.name)}</p>
        ${chip}
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;
    seriesList.appendChild(card);
  }
}

// ---------- Vue "Calendrier" ----------
async function loadCalendar() {
  const res = await fetch('/api/calendar');
  const data = await res.json();

  calendarList.innerHTML = '';
  calendarEmpty.hidden = data.length > 0;

  for (const ep of data) {
    const row = document.createElement('div');
    row.className = 'calendar-row';
    row.innerHTML = `
      <div class="calendar-date">${formatDate(ep.air_date)}</div>
      <div class="calendar-info">
        <div class="calendar-series">${escapeHtml(ep.series_name)}</div>
        <div class="calendar-episode">S${pad(ep.season_number)}E${pad(ep.episode_number)}${ep.episode_name ? ' — ' + escapeHtml(ep.episode_name) : ''}</div>
      </div>
    `;
    calendarList.appendChild(row);
  }
}

// ---------- Détail d'une série ----------
async function openDetail(id) {
  const res = await fetch(`/api/series/${id}`);
  const s = await res.json();

  const poster = s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : '';

  let seasonsHtml = '';
  for (const season of s.seasons) {
    let episodesHtml = '';
    for (const ep of season.episodes) {
      episodesHtml += `
        <div class="episode-row">
          <input type="checkbox" class="episode-checkbox" ${ep.watched ? 'checked' : ''}
                 data-episode-id="${ep.id}" data-series-id="${s.id}" />
          <span class="episode-code">S${pad(season.season_number)}E${pad(ep.episode_number)}</span>
          <span class="episode-name ${ep.watched ? 'watched' : ''}">${escapeHtml(ep.name || '')}</span>
          <span class="episode-date">${ep.air_date ? formatDate(ep.air_date) : '—'}</span>
        </div>
      `;
    }
    seasonsHtml += `
      <div class="season-block">
        <div class="season-title">Saison ${season.season_number}</div>
        ${episodesHtml}
      </div>
    `;
  }

  detailContent.innerHTML = `
    <div class="detail-header">
      ${poster ? `<img src="${poster}" alt="${s.name}" />` : ''}
      <div>
        <p class="detail-title">${escapeHtml(s.name)}</p>
        <p class="detail-status">${s.status || ''}</p>
      </div>
    </div>
    ${seasonsHtml}
    <div class="detail-actions">
      <button class="btn-remove" id="removeSeries">Retirer cette série</button>
    </div>
  `;

  detailContent.querySelectorAll('.episode-checkbox').forEach((box) => {
    box.addEventListener('change', async () => {
      const seriesId = box.dataset.seriesId;
      const episodeId = box.dataset.episodeId;
      await fetch(`/api/series/${seriesId}/episodes/${episodeId}/toggle`, { method: 'POST' });
      box.nextElementSibling.nextElementSibling.classList.toggle('watched', box.checked);
      loadSeries(); // rafraîchit le "prochain épisode" sur la carte
    });
  });

  document.getElementById('removeSeries').addEventListener('click', async () => {
    if (!confirm(`Retirer "${s.name}" de la liste ?`)) return;
    await fetch(`/api/series/${s.id}`, { method: 'DELETE' });
    detailOverlay.hidden = true;
    loadSeries();
  });

  detailOverlay.hidden = false;
}

document.getElementById('closeDetail').addEventListener('click', () => {
  detailOverlay.hidden = true;
});

// ---------- Ajout d'une série ----------
document.getElementById('openAdd').addEventListener('click', () => {
  addOverlay.hidden = false;
  searchInput.value = '';
  searchResults.innerHTML = '';
  searchInput.focus();
});
document.getElementById('closeAdd').addEventListener('click', () => {
  addOverlay.hidden = true;
});

let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (!q) { searchResults.innerHTML = ''; return; }
  searchTimeout = setTimeout(async () => {
    const res = await fetch(`/api/series/search?q=${encodeURIComponent(q)}`);
    const results = await res.json();
    searchResults.innerHTML = '';
    for (const r of results) {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      const poster = r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : '';
      const year = r.first_air_date ? r.first_air_date.slice(0, 4) : '';
      item.innerHTML = `
        ${poster ? `<img class="search-result-poster" src="${poster}" />` : '<div class="search-result-poster"></div>'}
        <div>
          <div class="search-result-name">${escapeHtml(r.name)}</div>
          <div class="search-result-year">${year}</div>
        </div>
      `;
      item.addEventListener('click', async () => {
        const res2 = await fetch('/api/series', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdb_id: r.tmdb_id }),
        });
        if (res2.ok) {
          addOverlay.hidden = true;
          loadSeries();
        } else {
          const err = await res2.json();
          alert(err.error || "Erreur lors de l'ajout");
        }
      });
      searchResults.appendChild(item);
    }
  }, 350);
});

// ---------- Utilitaires ----------
function pad(n) { return String(n).padStart(2, '0'); }
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function formatDate(dateStr) {
  // PostgreSQL peut renvoyer soit "2024-05-01" soit "2024-05-01T00:00:00.000Z"
  // selon le driver. On ne garde que les 10 premiers caractères (YYYY-MM-DD)
  // pour éviter de construire une date invalide en concaténant deux fois l'heure.
  const datePart = String(dateStr).slice(0, 10);
  const d = new Date(datePart + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

loadSeries();
