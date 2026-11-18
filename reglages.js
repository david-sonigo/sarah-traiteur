/* Réglages faits dans l'admin (prix, plats, photos, fermeture des commandes).
   Ils sont rangés dans Google et appliqués par-dessus donnees.js à chaque visite.
   Normalement, pas besoin de modifier ce fichier. */

// Copie de la carte d'origine (avant les modifications de l'admin)
const CARTE_ORIGINE = JSON.parse(JSON.stringify(CARTE));
const CLE_REGLAGES = "sarah-reglages";
const FRAICHEUR_REGLAGES = 10 * 60 * 1000; // 10 minutes

function appliquerReglages(r) {
  r = r || {};
  const modifs = r.plats || {}, nouveaux = Array.isArray(r.nouveaux) ? r.nouveaux : [];
  CARTE.forEach((cat) => {
    const ajouts = nouveaux.filter((n) => n.cat === cat.ancre).map((n) => Object.assign({}, n));
    cat.plats = cat.plats.concat(ajouts)
      .map((p) => {
        const m = modifs[p.id];
        if (!m) return p;
        const q = Object.assign({}, p);
        ["nom", "unite", "description", "photo"].forEach((k) => { if (typeof m[k] === "string") q[k] = m[k]; });
        if (typeof m.prix === "number" && m.prix >= 0) q.prix = m.prix;
        if (m.masque) q.masque = true;
        return q;
      })
      .filter((p) => !p.masque);
  });
  INFOS.fermeture = r.fermeture && r.fermeture.fermee ? r.fermeture : null;
}

function chargerReglages(demarrer) {
  let cache = null, lance = false;
  try { cache = JSON.parse(localStorage.getItem(CLE_REGLAGES)); } catch (e) { cache = null; }
  const go = (r) => { if (lance) return; lance = true; appliquerReglages(r); demarrer(); };
  const memoriser = (r) => { try { localStorage.setItem(CLE_REGLAGES, JSON.stringify({ t: Date.now(), r })); } catch (e) { /* ignoré */ } };
  const recent = cache && cache.r && Date.now() - cache.t < FRAICHEUR_REGLAGES;
  // Seules la carte et la page commande ont besoin des prix à jour avant de s'afficher.
  // Les autres pages (accueil…) s'affichent tout de suite.
  const attendre = ["carte", "commander"].includes(document.body.dataset.page) && !recent;
  if (!attendre) go(cache && cache.r ? cache.r : {});
  if (recent || !INFOS.urlCommandes) { go(cache && cache.r ? cache.r : {}); return; }
  const minuteur = attendre ? setTimeout(() => go(cache && cache.r ? cache.r : {}), 2500) : null;
  fetch(INFOS.urlCommandes + "?action=reglages")
    .then((x) => x.json())
    .then((j) => { const r = (j && j.reglages) || {}; memoriser(r); clearTimeout(minuteur); go(r); })
    .catch(() => { clearTimeout(minuteur); go(cache && cache.r ? cache.r : {}); });
}
