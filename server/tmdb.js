// Petit client pour l'API TMDB (The Movie Database).
// Doc : https://developer.themoviedb.org/reference/intro/getting-started

const BASE_URL = 'https://api.themoviedb.org/3';

function apiKeyParam() {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY manquante dans les variables d\'environnement');
  return `api_key=${key}`;
}

async function tmdbFetch(pathname) {
  const url = `${BASE_URL}${pathname}${pathname.includes('?') ? '&' : '?'}${apiKeyParam()}&language=fr-FR`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Erreur TMDB (${res.status}) sur ${pathname} : ${body}`);
  }
  return res.json();
}

// Recherche de séries par nom (pour la barre de recherche du dashboard)
async function searchSeries(query) {
  const data = await tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}`);
  return (data.results || []).map((r) => ({
    tmdb_id: r.id,
    name: r.name,
    poster_path: r.poster_path,
    first_air_date: r.first_air_date,
    overview: r.overview,
  }));
}

// Détails d'une série (statut, nombre de saisons)
async function getSeriesDetails(tmdbId) {
  const data = await tmdbFetch(`/tv/${tmdbId}`);
  return {
    tmdb_id: data.id,
    name: data.name,
    poster_path: data.poster_path,
    status: data.status,
    seasons: (data.seasons || []).filter((s) => s.season_number > 0), // on ignore les "Spéciaux" (saison 0)
  };
}

// Détails d'une saison précise : renvoie la liste des épisodes avec leurs dates
async function getSeasonEpisodes(tmdbId, seasonNumber) {
  const data = await tmdbFetch(`/tv/${tmdbId}/season/${seasonNumber}`);
  return (data.episodes || []).map((ep) => ({
    season_number: ep.season_number,
    episode_number: ep.episode_number,
    name: ep.name,
    air_date: ep.air_date || null,
  }));
}

// Récupère TOUS les épisodes de toutes les saisons d'une série
async function getAllEpisodes(tmdbId, seasons) {
  const all = [];
  for (const season of seasons) {
    const eps = await getSeasonEpisodes(tmdbId, season.season_number);
    all.push(...eps);
  }
  return all;
}

module.exports = { searchSeries, getSeriesDetails, getAllEpisodes, getSeasonEpisodes };
