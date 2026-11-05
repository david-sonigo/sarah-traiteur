/* Fonctionnement du site — normalement, pas besoin de modifier ce fichier.
   Les textes, plats et prix se changent dans donnees.js */

(function () {
  const euros = (n) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const echapper = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tousLesPlats = CARTE.flatMap((c) => c.plats.map((p) => ({
    ...p,
    choix: p.choix || (c.avecAccompagnement ? { nom: "l'accompagnement", liste: ACCOMPAGNEMENTS_AU_CHOIX, ajout: true } : null),
  })));
  const trouverPlat = (id) => tousLesPlats.find((p) => p.id === id);
  const page = document.body.dataset.page;
  const categorieDe = {};
  CARTE.forEach((c) => c.plats.forEach((p) => (categorieDe[p.id] = c.court || c.categorie)));

  /* ---------- Envoi au service des commandes (Google Sheets), pour la page admin ---------- */
  function envoyerAuService(donnees) {
    if (!INFOS.urlCommandes) return;
    try {
      fetch(INFOS.urlCommandes, { method: "POST", mode: "no-cors", keepalive: true,
        headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(donnees) }).catch(() => {});
    } catch (e) { /* jamais bloquant pour le client */ }
  }
  // Compteur de visites (pas sur les pages internes, ni sur les appareils marqués « ne pas me compter » dans l'admin)
  (function compterVisite() {
    if (!["accueil", "carte", "commander", "mentions"].includes(page)) return;
    let visiteur = "";
    try {
      if (localStorage.getItem("sarah-admin-ne-pas-compter")) return;
      visiteur = localStorage.getItem("sarah-visiteur");
      if (!visiteur) { visiteur = Math.random().toString(36).slice(2, 12); localStorage.setItem("sarah-visiteur", visiteur); }
    } catch (e) { visiteur = "anonyme"; }
    // D'où vient le visiteur (seulement pour la première page de sa visite) et sur quel appareil
    let entree = false;
    try { entree = !sessionStorage.getItem("sarah-session"); sessionStorage.setItem("sarah-session", "1"); } catch (e) { entree = true; }
    const params = new URLSearchParams(location.search), ref = document.referrer.toLowerCase();
    let source = (params.get("utm_source") || params.get("src") || "").toLowerCase();
    if (!source) {
      if (!ref || ref.includes(location.hostname)) source = "direct";
      else if (/instagram/.test(ref)) source = "instagram";
      else if (/facebook|fb\./.test(ref)) source = "facebook";
      else if (/whatsapp|wa\.me/.test(ref)) source = "whatsapp";
      else if (/google\./.test(ref)) source = "google";
      else if (/tiktok/.test(ref)) source = "tiktok";
      else if (/snapchat/.test(ref)) source = "snapchat";
      else { try { source = new URL(document.referrer).hostname.replace(/^www\./, ""); } catch (e) { source = "autre"; } }
    }
    if (/instagram/i.test(navigator.userAgent) && source === "direct") source = "instagram";
    if (/FBAN|FBAV/i.test(navigator.userAgent) && source === "direct") source = "facebook";
    const appareil = /iPad|Tablet/i.test(navigator.userAgent) ? "tablette" : (/Mobi|Android|iPhone/i.test(navigator.userAgent) ? "téléphone" : "ordinateur");
    envoyerAuService({ action: "visite", page, visiteur, source, appareil, entree });
  })();

  /* ---------- Panier (gardé dans le navigateur du client) ----------
     - panier     : produits simples        { id: quantité }
     - selections : produits avec un choix  { id: ["Riz jaune", "Couscous", ""] }  (une case par plat, "" = pas encore choisi) */
  const CLE = "sarah-traiteur-panier-v3";
  const LES_FORMULES = typeof FORMULES !== "undefined" ? FORMULES : [];
  const trouverFormule = (id) => LES_FORMULES.find((f) => f.id === id);
  let panier = {}, selections = {}, formules = [];
  try {
    const d = JSON.parse(localStorage.getItem(CLE)) || {};
    panier = d.panier || {}; selections = d.selections || {}; formules = Array.isArray(d.formules) ? d.formules : [];
  } catch (e) { panier = {}; selections = {}; formules = []; }
  formules = formules.filter((x) => x && trouverFormule(x.id) && Array.isArray(x.details));
  Object.keys(panier).forEach((id) => { const p = trouverPlat(id); if (!p || p.choix || !(panier[id] > 0)) delete panier[id]; });
  Object.keys(selections).forEach((id) => {
    const p = trouverPlat(id);
    if (!p || !p.choix || !Array.isArray(selections[id])) { delete selections[id]; return; }
    selections[id] = selections[id].map((v) => (p.choix.liste.includes(v) ? v : ""));
    if (!selections[id].length) delete selections[id];
  });

  function sauver() {
    try { localStorage.setItem(CLE, JSON.stringify({ panier, selections, formules })); } catch (e) { /* navigation privée : on ignore */ }
    majBadge();
  }
  /* Le site se souvient du client (sur son appareil) : coordonnées + dernière commande */
  const CLE_CLIENT = "sarah-traiteur-client", CLE_DERNIERE = "sarah-traiteur-derniere";
  const lireJSON = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } };
  const ecrireJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* navigation privée */ } };
  function recommanderHtml() {
    const d = lireJSON(CLE_DERNIERE), client = lireJSON(CLE_CLIENT);
    if (!d || !d.contenu) return "";
    const quand = d.date ? new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "";
    return `<div class="recommander">
      <p>${client && client.prenom ? `Bon retour ${echapper(client.prenom)} !` : "Bon retour !"}
        <small>Votre dernière commande${quand ? ` du ${quand}` : ""} : ${d.n} article${d.n > 1 ? "s" : ""}${d.total ? " · " + euros(d.total) : ""}</small></p>
      <button type="button" class="bouton" id="bouton-recommander">Recommander la même chose</button>
    </div>`;
  }
  function brancherRecommander() {
    const b = document.getElementById("bouton-recommander");
    if (!b) return;
    b.addEventListener("click", () => {
      const d = lireJSON(CLE_DERNIERE);
      ecrireJSON(CLE, d.contenu);
      location.reload();
    });
  }
  const nbArticles = () =>
    Object.values(panier).reduce((a, b) => a + b, 0) + Object.values(selections).reduce((a, l) => a + l.length, 0) + formules.length;

  /* Lignes du panier, prêtes à afficher : les plats identiques avec le même choix sont regroupés */
  function lignesPanier() {
    const lignes = [];
    for (const [id, q] of Object.entries(panier)) { const p = trouverPlat(id); lignes.push({ nom: p.nom, q, prix: p.prix, ref: { t: "simple", id } }); }
    for (const [id, liste] of Object.entries(selections)) {
      const p = trouverPlat(id), compte = new Map();
      liste.filter(Boolean).forEach((v) => compte.set(v, (compte.get(v) || 0) + 1));
      for (const [v, q] of compte) {
        const nom = p.choix.ajout ? `${p.nom} + ${v}` : `${p.nom} (${v.toLowerCase()})`;
        lignes.push({ nom, q, prix: p.prix, ref: { t: "sel", id, v } });
      }
    }
    formules.forEach((x, i) => { const f = trouverFormule(x.id); lignes.push({ nom: f.nom, q: 1, prix: f.prix, details: x.details, ref: { t: "formule", i } }); });
    return lignes;
  }
  /* Plats dont le client n'a pas encore choisi tous les accompagnements / parfums */
  const incomplets = () => Object.entries(selections)
    .map(([id, l]) => ({ plat: trouverPlat(id), manque: l.filter((v) => !v).length }))
    .filter((x) => x.manque > 0);
  const phraseManque = (x) => `${x.plat.nom} : ${x.manque} ${x.plat.choix.ajout ? "accompagnement" : "choix"}${x.manque > 1 ? "s" : ""} à choisir`;

  function totalPanier() {
    let total = 0, complet = true;
    for (const [id, q] of Object.entries(panier)) { const p = trouverPlat(id); if (p.prix == null) complet = false; else total += p.prix * q; }
    for (const [id, l] of Object.entries(selections)) { const p = trouverPlat(id); if (p.prix == null) complet = false; else total += p.prix * l.length; }
    formules.forEach((x) => { total += trouverFormule(x.id).prix; });
    return { total, complet };
  }
  function changer(id, delta) {
    panier[id] = Math.max(0, (panier[id] || 0) + delta);
    if (panier[id] === 0) delete panier[id];
    sauver();
  }

  /* ---------- En-tête et pied de page communs ---------- */
  function lien(href, texte, cle, extra = "") {
    return `<a href="${href}" ${page === cle ? 'aria-current="page"' : ""} ${extra}>${texte}</a>`;
  }
  document.getElementById("entete").innerHTML = `
    <header class="entete"><span class="bsd" lang="he" dir="rtl">בס׳ד</span><div class="conteneur">
      <a class="marque" href="index.html"><img src="images/logo.png" alt=""><span>${echapper(INFOS.nom)}</span></a>
      <nav class="nav" aria-label="Navigation principale">
        ${lien("index.html", "Accueil", "accueil", 'class="cacher-mobile"')}
        ${lien("carte.html", "La carte", "carte")}
        <a href="commander.html" class="panier-lien" ${page === "commander" ? 'aria-current="page"' : ""}>Commander<span class="badge" id="badge" hidden>0</span></a>
      </nav>
    </div></header>`;

  const reseaux = [
    `<li><a href="https://wa.me/${INFOS.whatsapp}" target="_blank" rel="noopener">WhatsApp : ${echapper(INFOS.telephoneAffiche)}</a></li>`,
    `<li><a href="tel:+${INFOS.whatsapp}">Appeler ${echapper(INFOS.contactCommandes)}</a></li>`,
    INFOS.email ? `<li><a href="mailto:${echapper(INFOS.email)}">${echapper(INFOS.email)}</a></li>` : "",
    INFOS.instagram ? `<li><a href="https://instagram.com/${echapper(INFOS.instagram)}" target="_blank" rel="noopener">Instagram @${echapper(INFOS.instagram)}</a></li>` : "",
  ].join("");

  document.getElementById("pied").innerHTML = `
    <footer class="pied"><div class="conteneur">
      <div class="grille-pied">
        <div>
          <img class="logo-pied" src="images/logo.png" alt="${echapper(INFOS.nom)}">
          <p>${echapper(INFOS.casher)}.</p>
        </div>
        <div>
          <h4>Contact & commandes</h4>
          <ul>${reseaux}</ul>
        </div>
        <div>
          <h4>Retrait & livraison</h4>
          <ul>
            <li>Retrait à ${echapper(INFOS.adresseRetrait)}${INFOS.livraison ? " ou livraison" : ""}</li>
            ${INFOS.livraison && (INFOS.villesLivraisonGratuite || []).length ? `<li>Livraison gratuite : ${INFOS.villesLivraisonGratuite.map(echapper).join(", ")}</li><li>Autres villes : conditions par téléphone</li>` : ""}
            <li>Commande avant le ${echapper(INFOS.limiteCommande)}</li>
            <li>Paiement par virement ou à la réception</li>
          </ul>
        </div>
      </div>
      <div class="bas">
        <span>© ${new Date().getFullYear()} ${echapper(INFOS.nom)} ${echapper(INFOS.sousTitre)}</span>
        <a href="mentions-legales.html">Mentions légales</a>
      </div>
    </div></footer>`;

  function majBadge() {
    const b = document.getElementById("badge");
    const n = nbArticles();
    b.textContent = n; b.hidden = n === 0;
    const barre = document.getElementById("barre-panier");
    if (barre) {
      barre.classList.toggle("visible", n > 0);
      const { total, complet } = totalPanier();
      document.getElementById("barre-texte").textContent =
        `${n} article${n > 1 ? "s" : ""}` + (complet && n ? ` · ${euros(total)}` : "");
    }
  }

  /* ---------- Accueil : diaporama ---------- */
  if (page === "accueil") {
    const zone = document.getElementById("diapos");
    const points = document.getElementById("points");
    const sources = DIAPORAMA.length ? DIAPORAMA : [null, null, null];
    zone.innerHTML = sources.map((src, i) =>
      `<div class="diapo ${src ? "photo" : "d" + ((i % 3) + 1)} ${i === 0 ? "active" : ""}" ${src ? `style="background-image:url('${encodeURI(src)}')"` : ""}></div>`
    ).join("");
    points.innerHTML = sources.map((_, i) => `<button type="button" aria-label="Photo ${i + 1}" class="${i === 0 ? "active" : ""}"></button>`).join("");
    points.hidden = sources.length < 2;
    const diapos = zone.children, boutons = points.children;
    let actuelle = 0, minuteur;
    const montrer = (i) => {
      diapos[actuelle].classList.remove("active"); boutons[actuelle].classList.remove("active");
      actuelle = (i + diapos.length) % diapos.length;
      diapos[actuelle].classList.add("active"); boutons[actuelle].classList.add("active");
    };
    const demarrer = () => { clearInterval(minuteur); minuteur = setInterval(() => montrer(actuelle + 1), 5000); };
    [...boutons].forEach((b, i) => b.addEventListener("click", () => { montrer(i); demarrer(); }));
    demarrer();
    document.querySelectorAll("[data-limite]").forEach((el) => (el.textContent = INFOS.limiteCommande));
    document.querySelectorAll("[data-casher]").forEach((el) => (el.textContent = INFOS.casher));

    /* Bouton « Commander » qui suit le client quand il descend dans la page */
    const flottant = document.createElement("a");
    flottant.href = "carte.html"; flottant.className = "bouton commander-flottant"; flottant.textContent = "Commander";
    document.body.appendChild(flottant);
    const actionsHeros = document.querySelector(".heros .actions");
    if (actionsHeros && "IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => flottant.classList.toggle("visible", !e.isIntersecting)).observe(actionsHeros);
    } else flottant.classList.add("visible");
  }

  /* ---------- La carte ---------- */
  if (page === "carte") {
    document.getElementById("limite").textContent = INFOS.limiteCommande;
    if (!nbArticles()) { document.getElementById("recommander").innerHTML = recommanderHtml(); brancherRecommander(); }
    const zone = document.getElementById("carte");
    const prixHtml = (p) => `<div class="prix">${p.prix == null ? "Prix à venir" : euros(p.prix)}${p.unite ? `<small>${echapper(p.unite)}</small>` : ""}</div>`;
    const compteur = (cle, nom) => `
      <div class="compteur">
        <button type="button" data-moins="${echapper(cle)}" aria-label="Retirer ${echapper(nom)}">−</button>
        <output data-q="${echapper(cle)}">${panier[cle] || 0}</output>
        <button type="button" data-plus="${echapper(cle)}" aria-label="Ajouter ${echapper(nom)}">+</button>
      </div>`;
    /* Une liste déroulante par plat commandé : le nombre d'accompagnements suit toujours le nombre de plats */
    const selectionsHtml = (p) => (selections[p.id] || []).map((v, i) => `
      <label class="sel-ligne">
        <span>${p.choix.ajout ? "Plat" : "N°"} ${i + 1}</span>
        <select data-sel="${p.id}" data-i="${i}" class="${v ? "" : "a-choisir"}">
          <option value="">Choisir ${echapper(p.choix.nom)}…</option>
          ${p.choix.liste.map((a) => `<option ${a === v ? "selected" : ""}>${echapper(a)}</option>`).join("")}
        </select>
      </label>`).join("");
    const compteurChoix = (p) => `
      <div class="compteur">
        <button type="button" data-moins-sel="${p.id}" aria-label="Retirer un ${echapper(p.nom)}">−</button>
        <output id="qs-${p.id}">${(selections[p.id] || []).length}</output>
        <button type="button" data-plus-sel="${p.id}" aria-label="Ajouter un ${echapper(p.nom)}">+</button>
      </div>`;
    function majCarteChoix(p, focusDernier) {
      document.getElementById("qs-" + p.id).textContent = (selections[p.id] || []).length;
      const zoneSel = document.getElementById("sel-" + p.id);
      zoneSel.innerHTML = selectionsHtml(p);
      document.getElementById("err-" + p.id).textContent = "";
      if (focusDernier) { const s = zoneSel.querySelectorAll("select"); if (s.length) s[s.length - 1].focus({ preventScroll: true }); }
    }

    const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/œ/g, "oe").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const photoDe = (p) => p.photo || `images/plats/${slug(p.nom)}.jpg`;

    document.getElementById("menu-categories").innerHTML =
      (LES_FORMULES.length ? `<a href="#formules" data-ancre="formules" class="lien-formules">Formules</a>` : "") +
      CARTE.map((cat) => `<a href="#${cat.ancre}" data-ancre="${cat.ancre}">${echapper(cat.court || cat.categorie)}</a>`).join("");
    document.getElementById("menu-categories").addEventListener("click", (e) => {
      const a = e.target.closest("[data-ancre]");
      if (!a) return;
      e.preventDefault();
      document.getElementById(a.dataset.ancre).scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });

    function rendreCarte() {
      zone.innerHTML = CARTE.map((cat) => `
      <div class="categorie" id="${cat.ancre}">
        <h2>${echapper(cat.categorie)}</h2>
        ${cat.note ? `<p class="note">${echapper(cat.note)}</p>` : ""}
        ${cat.affichage === "liste"
          ? (cat.plats.length ? `<div class="liste">${cat.plats.map((p) => `
              <div class="ligne-plat">
                <div class="ligne-nom">${echapper(p.nom)}${p.unite ? ` <small>${echapper(p.unite)}</small>` : ""}</div>
                <div class="ligne-prix">${p.prix == null ? "—" : euros(p.prix)}</div>
                ${compteur(p.id, p.nom)}
              </div>`).join("")}</div>` : "")
          : `<div class="grille">${cat.plats.map((p) => `
            <article class="plat">
              <div class="plat-photo" style="--img:url('${encodeURI(photoDe(p))}')">
                <span class="monogramme" aria-hidden="true">S</span>
                <img src="${encodeURI(photoDe(p))}" alt="${echapper(p.nom)}" loading="lazy">
              </div>
              <div class="plat-corps">
                <h3>${echapper(p.nom)}</h3>
                ${p.description ? `<p class="desc">${echapper(p.description)}</p>` : ""}
                ${trouverPlat(p.id).choix ? `
                  <div class="plat-bas">${prixHtml(p)}${compteurChoix(trouverPlat(p.id))}</div>
                  <div class="selections" id="sel-${p.id}">${selectionsHtml(trouverPlat(p.id))}</div>
                  <p class="erreur" id="err-${p.id}" role="alert"></p>
                ` : `<div class="plat-bas">${prixHtml(p)}${compteur(p.id, p.nom)}</div>`}
              </div>
            </article>`).join("")}</div>`}
      </div>`).join("");
      // Photo absente : on garde le visuel par défaut
      zone.querySelectorAll(".plat-photo img").forEach((img) => {
        if (img.complete && !img.naturalWidth) img.remove();
        else img.addEventListener("error", () => img.remove());
      });
    }
    rendreCarte();

    /* ---------- Nos formules ---------- */
    const etatF = {};          // choix en cours, par formule (non enregistré tant que pas ajouté)
    const nouvelEtat = () => ({ sel: {}, acc: {}, cpt: {} });
    function optionsDe(parmi) {
      const cat = CARTE.find((c) => c.ancre === parmi);
      if (cat) return { liste: cat.plats.map((p) => ({ val: p.id, nom: p.nom })), accomp: !!cat.avecAccompagnement };
      const p = trouverPlat(parmi);
      return { liste: (p && p.choix ? p.choix.liste : []).map((v) => ({ val: v, nom: v })), accomp: false };
    }
    function composerHtml(f) {
      const st = etatF[f.id];
      return f.composition.map((c, k) => {
        if (c.inclus) return `<div class="f-bloc f-inclus"><span class="f-label">Inclus</span><span>${echapper(c.inclus)}</span></div>`;
        const o = optionsDe(c.parmi);
        if (c.nombre === 1) {
          const v = st.sel[k] || "";
          return `<div class="f-bloc">
            <label class="f-label" for="f-${f.id}-${k}">${echapper(c.label)}</label>
            <select id="f-${f.id}-${k}" data-f="${f.id}" data-k="${k}" class="${v ? "" : "a-choisir"}">
              <option value="">Choisir…</option>
              ${o.liste.map((x) => `<option value="${echapper(x.val)}" ${x.val === v ? "selected" : ""}>${echapper(x.nom)}</option>`).join("")}
            </select>
            ${o.accomp && v ? `<select id="f-${f.id}-${k}-acc" data-f="${f.id}" data-k="${k}" data-acc="1" class="${st.acc[k] ? "" : "a-choisir"}" aria-label="Accompagnement">
              <option value="">Choisir l'accompagnement…</option>
              ${ACCOMPAGNEMENTS_AU_CHOIX.map((a) => `<option ${a === st.acc[k] ? "selected" : ""}>${echapper(a)}</option>`).join("")}
            </select>` : ""}
          </div>`;
        }
        const cpt = st.cpt[k] || {}, total = Object.values(cpt).reduce((a, b) => a + b, 0);
        return `<div class="f-bloc">
          <span class="f-label">${echapper(c.label)} <em class="${total === c.nombre ? "ok" : ""}">${total} / ${c.nombre}</em></span>
          <div class="f-salades">${o.liste.map((x) => `
            <div class="f-salade ${cpt[x.val] ? "prise" : ""}">
              <span>${echapper(x.nom)}</span>
              <div class="compteur mini">
                <button type="button" data-fm="${f.id}" data-k="${k}" data-v="${echapper(x.val)}" aria-label="Retirer ${echapper(x.nom)}">−</button>
                <output>${cpt[x.val] || 0}</output>
                <button type="button" data-fp="${f.id}" data-k="${k}" data-v="${echapper(x.val)}" aria-label="Ajouter ${echapper(x.nom)}" ${total >= c.nombre ? "disabled" : ""}>+</button>
              </div>
            </div>`).join("")}</div>
        </div>`;
      }).join("");
    }
    const dansPanierHtml = (f) => formules.map((x, i) => x.id !== f.id ? "" : `
      <div class="f-ajoutee">
        <div><strong>${echapper(f.nom)}</strong><span>${x.details.map(echapper).join(" · ")}</span></div>
        <button type="button" class="lien-retirer" data-f-retirer="${i}">Retirer</button>
      </div>`).join("");
    function rendreFormules() {
      if (!LES_FORMULES.length) return;
      let sec = document.getElementById("formules");
      if (!sec) { sec = document.createElement("div"); sec.className = "categorie"; sec.id = "formules"; zone.appendChild(sec); }
      sec.innerHTML = `
        <h2>Nos formules</h2>
        <p class="note">Un repas complet à prix fixe : composez-le en quelques choix.</p>
        <div class="formules">${LES_FORMULES.map((f) => `
          <article class="formule" id="carte-${f.id}">
            <div class="formule-tete"><h3>${echapper(f.nom)}</h3><span class="formule-prix">${euros(f.prix)}</span></div>
            <ul class="formule-contenu">${f.composition.map((c) => `<li>${echapper(c.texte)}</li>`).join("")}</ul>
            <button type="button" class="bouton" data-f-ouvrir="${f.id}">${etatF[f.id] ? "Fermer" : "Composer cette formule"}</button>
            ${etatF[f.id] ? `<div class="composer">${composerHtml(f)}
              <button type="button" class="bouton" data-f-ajouter="${f.id}">Ajouter la formule au panier</button>
              <p class="erreur" id="ferr-${f.id}" role="alert"></p></div>` : ""}
            <div class="f-panier">${dansPanierHtml(f)}</div>
          </article>`).join("")}</div>`;
    }
    rendreFormules();
    function rendreUneFormule(id, focusSel) {
      rendreFormules();
      if (focusSel) { const el = zone.querySelector(focusSel); if (el) el.focus({ preventScroll: true }); }
    }

    zone.addEventListener("click", (e) => {
      const ouvrir = e.target.closest("[data-f-ouvrir]");
      if (ouvrir) { const id = ouvrir.dataset.fOuvrir; etatF[id] = etatF[id] ? undefined : nouvelEtat(); if (!etatF[id]) delete etatF[id]; rendreUneFormule(id); return; }
      const fp = e.target.closest("[data-fp]"), fm = e.target.closest("[data-fm]");
      if (fp || fm) {
        const b = fp || fm, id = b.dataset[fp ? "fp" : "fm"], k = +b.dataset.k, v = b.dataset.v, f = trouverFormule(id);
        const cpt = (etatF[id].cpt[k] = etatF[id].cpt[k] || {});
        const total = Object.values(cpt).reduce((a, n) => a + n, 0);
        if (fp && total < f.composition[k].nombre) cpt[v] = (cpt[v] || 0) + 1;
        if (fm && cpt[v]) { cpt[v] -= 1; if (!cpt[v]) delete cpt[v]; }
        rendreUneFormule(id, `[data-${fp ? "fp" : "fm"}="${id}"][data-k="${k}"][data-v="${CSS.escape(v)}"]`);
        return;
      }
      const ajouter = e.target.closest("[data-f-ajouter]");
      if (ajouter) {
        const f = trouverFormule(ajouter.dataset.fAjouter), st = etatF[f.id], manque = [], details = [], inclus = [];
        f.composition.forEach((c, k) => {
          if (c.inclus) { inclus.push(c.inclus); return; }
          const o = optionsDe(c.parmi), nomDe = (v) => (o.liste.find((x) => x.val === v) || {}).nom;
          if (c.nombre === 1) {
            if (!st.sel[k]) { manque.push(c.label.toLowerCase()); return; }
            if (o.accomp && !st.acc[k]) { manque.push("l'accompagnement du plat"); return; }
            details.push(`${c.label} : ${nomDe(st.sel[k])}${o.accomp ? ` + ${st.acc[k]}` : ""}`);
          } else {
            const cpt = st.cpt[k] || {}, total = Object.values(cpt).reduce((a, n) => a + n, 0);
            if (total !== c.nombre) { manque.push(`${c.nombre - total} ${c.label.toLowerCase()}`); return; }
            details.push(`${c.label} : ` + Object.entries(cpt).map(([v, n]) => nomDe(v) + (n > 1 ? ` ×${n}` : "")).join(", "));
          }
        });
        if (manque.length) { document.getElementById("ferr-" + f.id).textContent = "Il reste à choisir : " + manque.join(", ") + "."; return; }
        if (inclus.length) details.push("Inclus : " + inclus.join(", "));
        formules.push({ id: f.id, details });
        delete etatF[f.id];
        sauver(); rendreUneFormule(f.id);
        document.getElementById("carte-" + f.id).scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
      const retirer = e.target.closest("[data-f-retirer]");
      if (retirer) { formules.splice(+retirer.dataset.fRetirer, 1); sauver(); rendreFormules(); }
    });
    zone.addEventListener("change", (e) => {
      const s = e.target.closest("[data-f]");
      if (!s) return;
      const st = etatF[s.dataset.f], k = +s.dataset.k;
      if (s.dataset.acc) st.acc[k] = s.value;
      else { st.sel[k] = s.value; if (!s.value) delete st.acc[k]; }
      rendreUneFormule(s.dataset.f, "#" + CSS.escape(s.id));
    });

    zone.addEventListener("click", (e) => {
      const plusSel = e.target.closest("[data-plus-sel]"), moinsSel = e.target.closest("[data-moins-sel]");
      if (plusSel || moinsSel) {
        const p = trouverPlat((plusSel || moinsSel).dataset[plusSel ? "plusSel" : "moinsSel"]);
        const l = selections[p.id] || [];
        if (plusSel) l.push("");
        else if (l.length) { const i = l.lastIndexOf(""); l.splice(i >= 0 ? i : l.length - 1, 1); }
        if (l.length) selections[p.id] = l; else delete selections[p.id];
        sauver(); majCarteChoix(p, !!plusSel);
        return;
      }
      const plus = e.target.closest("[data-plus]"), moins = e.target.closest("[data-moins]");
      const id = plus ? plus.dataset.plus : moins ? moins.dataset.moins : null;
      if (!id) return;
      changer(id, plus ? 1 : -1);
      zone.querySelector(`[data-q="${CSS.escape(id)}"]`).textContent = panier[id] || 0;
    });
    zone.addEventListener("change", (e) => {
      const s = e.target.closest("[data-sel]");
      if (!s) return;
      selections[s.dataset.sel][+s.dataset.i] = s.value;
      s.classList.toggle("a-choisir", !s.value);
      document.getElementById("err-" + s.dataset.sel).textContent = "";
      sauver();
    });

    /* Bouton « Valider ma commande » : on bloque tant qu'un plat n'a pas son accompagnement */
    document.querySelector("#barre-panier a").addEventListener("click", (e) => {
      const manques = incomplets();
      if (!manques.length) return;
      e.preventDefault();
      manques.forEach((x) => (document.getElementById("err-" + x.plat.id).textContent =
        `Choisissez ${x.plat.choix.nom} pour chaque ${x.plat.choix.ajout ? "plat" : "article"}.`));
      const premier = document.getElementById("sel-" + manques[0].plat.id).closest(".plat");
      premier.scrollIntoView({ behavior: "smooth", block: "center" });
      const sel = premier.querySelector("select.a-choisir"); if (sel) sel.focus({ preventScroll: true });
    });
  }

  /* ---------- Commander ---------- */
  if (page === "commander") {
    document.getElementById("limite").textContent = INFOS.limiteCommande;
    document.getElementById("adresse").textContent = INFOS.adresseRetrait;
    document.querySelectorAll("[data-ville]").forEach((el) => (el.textContent = INFOS.adresseRetrait));
    const blocAdresse = document.getElementById("bloc-adresse"), champAdresse = document.getElementById("adresse-livraison");
    const champVille = document.getElementById("ville"), infoLivraison = document.getElementById("info-livraison");
    const villes = INFOS.villesLivraisonGratuite || [];
    champVille.innerHTML = `<option value="">Choisir la ville…</option>` +
      villes.map((v) => `<option>${echapper(v)}</option>`).join("") + `<option value="Autre ville">Autre ville</option>`;
    const majVille = () => {
      if (!champVille.value) infoLivraison.textContent = `Livraison gratuite à ${villes.join(", ")}.`;
      else if (champVille.value === "Autre ville") infoLivraison.innerHTML = `Pour les autres villes, les conditions de livraison se voient par téléphone avec ${echapper(INFOS.contactCommandes)} : <strong>${echapper(INFOS.telephoneAffiche)}</strong>.`;
      else infoLivraison.innerHTML = `<strong>Livraison gratuite</strong> à ${echapper(champVille.value)}.`;
    };
    champVille.addEventListener("change", majVille); majVille();
    if (!INFOS.livraison) document.getElementById("choix-livraison").hidden = true;
    const champTel = document.getElementById("telephone");
    champTel.addEventListener("invalid", () => champTel.setCustomValidity(
      champTel.value.trim() ? "Numéro incorrect : entrez 10 chiffres, par exemple 06 12 34 56 78." : "Merci d'entrer votre numéro de téléphone."));
    champTel.addEventListener("input", () => champTel.setCustomValidity(""));
    const majMode = () => {
      const livraison = document.getElementById("mode-livraison").checked;
      blocAdresse.hidden = !livraison; champAdresse.required = livraison; champVille.required = livraison;
    };
    document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", majMode));
    // Coordonnées déjà remplies si le client a déjà commandé depuis cet appareil
    const client = lireJSON(CLE_CLIENT);
    if (client) {
      ["prenom", "nom", "email", "telephone"].forEach((k) => { if (client[k]) document.getElementById(k).value = client[k]; });
      if (client.mode === "Livraison" && INFOS.livraison) document.getElementById("mode-livraison").checked = true;
      if (client.ville) champVille.value = client.ville;
      if (client.adresse) champAdresse.value = client.adresse;
      if (client.paiement) { const r = document.querySelector(`input[name="paiement"][value="${CSS.escape(client.paiement)}"]`); if (r) r.checked = true; }
      majVille();
    }
    majMode();

    // Vendredis possibles : il faut commander avant le mercredi 20h de la même semaine
    const select = document.getElementById("date");
    const maintenant = new Date();
    const vendredis = [];
    const d = new Date(maintenant); d.setHours(12, 0, 0, 0);
    while (vendredis.length < 4) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 5) continue;
      const limite = new Date(d); limite.setDate(d.getDate() - 2); limite.setHours(20, 0, 0, 0);
      if (maintenant < limite) vendredis.push(new Date(d));
    }
    const isoDe = (v) => `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
    select.innerHTML = vendredis.map((v) => {
      const texte = v.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      return `<option value="${texte}" data-iso="${isoDe(v)}">${texte.charAt(0).toUpperCase() + texte.slice(1)}</option>`;
    }).join("");
    // Numéro de commande : le même tant que le client reste sur la page (un double envoi ne crée pas de doublon)
    const numero = "C" + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 4).toUpperCase();

    function afficherPanier() {
      const zone = document.getElementById("recap");
      const lignes = lignesPanier(), manques = incomplets();
      if (!lignes.length && !manques.length) {
        zone.innerHTML = `<p class="vide">Votre panier est vide.</p>${recommanderHtml()}<p style="margin-top:16px"><a class="bouton" href="carte.html">Voir la carte</a></p>`;
        brancherRecommander();
        return;
      }
      const { total, complet } = totalPanier();
      const attrs = (r) => `data-t="${r.t}" ${r.id ? `data-id="${echapper(r.id)}"` : ""} ${r.v ? `data-v="${echapper(r.v)}"` : ""} ${r.i != null ? `data-i="${r.i}"` : ""}`;
      zone.innerHTML = lignes.map((l) => `
        <div class="ligne-panier ligne-modif">
          <div class="lp-nom">${echapper(l.nom)}${l.details ? `<span class="details">${l.details.map(echapper).join("<br>")}</span>` : ""}</div>
          <div class="lp-actions">
            ${l.ref.t === "formule" ? `<span class="lp-q">× 1</span>` : `
            <div class="compteur mini">
              ${l.q > 1 ? `<button type="button" data-r="moins" ${attrs(l.ref)} aria-label="Retirer un ${echapper(l.nom)}">−</button>` : `<span class="moins-vide" aria-hidden="true"></span>`}
              <output>${l.q}</output>
              <button type="button" data-r="plus" ${attrs(l.ref)} aria-label="Ajouter un ${echapper(l.nom)}">+</button>
            </div>`}
            <span class="lp-prix">${l.prix == null ? "—" : euros(l.prix * l.q)}</span>
            <button type="button" class="lp-suppr" data-r="suppr" ${attrs(l.ref)} aria-label="Supprimer ${echapper(l.nom)}" title="Supprimer">×</button>
          </div>
        </div>`).join("") +
        (manques.length ? `<div class="alerte">${manques.map((x) => echapper(phraseManque(x))).join("<br>")}<br><a href="carte.html">Choisir sur la carte</a></div>` : "") +
        (complet ? `<div class="total"><span>Total</span><span>${euros(total)}</span></div>`
                 : `<p class="petit">Le total vous sera confirmé par ${echapper(INFOS.contactCommandes)}.</p>`) +
        `<p class="petit"><a href="carte.html">Modifier ma commande</a></p>`;
    }
    afficherPanier();

    /* Modifier la commande directement dans le récapitulatif */
    document.getElementById("recap").addEventListener("click", (e) => {
      const b = e.target.closest("[data-r]");
      if (!b) return;
      const { r, t, id, v, i } = b.dataset;
      // Le − ne supprime jamais : à 1, il faut passer par la croix
      if (r === "moins") {
        const q = t === "simple" ? (panier[id] || 0) : (selections[id] || []).filter((x) => x === v).length;
        if (q <= 1) return;
      }
      if (t === "simple") {
        if (r === "suppr") delete panier[id]; else { changer(id, r === "plus" ? 1 : -1); }
      } else if (t === "sel") {
        const l = selections[id] || [];
        if (r === "plus") l.push(v);
        else if (r === "moins") { const k = l.lastIndexOf(v); if (k >= 0) l.splice(k, 1); }
        else selections[id] = l.filter((x) => x !== v);
        if (!(selections[id] || l).length) delete selections[id]; else if (r !== "suppr") selections[id] = l;
      } else if (t === "formule" && r === "suppr") {
        formules.splice(+i, 1);
      }
      sauver(); afficherPanier();
    });

    document.getElementById("formulaire").addEventListener("submit", (e) => {
      e.preventDefault();
      const erreur = document.getElementById("erreur");
      const f = new FormData(e.target);
      if (!nbArticles()) { erreur.textContent = "Ajoutez au moins un plat depuis la carte."; return; }
      if (!vendredis.length) { erreur.textContent = "Aucune date disponible pour le moment."; return; }
      if (incomplets().length) { erreur.textContent = "Il manque des accompagnements : choisissez-les sur la carte avant d'envoyer."; return; }
      erreur.textContent = "";
      const { total, complet } = totalPanier();
      const lignes = lignesPanier().map((l) => `• ${l.nom} × ${l.q}${l.prix != null ? ` (${euros(l.prix * l.q)})` : ""}` +
        (l.details ? "\n" + l.details.map((d) => `   – ${d}`).join("\n") : ""));
      const message = [
        `Bonjour, je souhaite passer commande chez ${INFOS.nom} (n° ${numero}) :`,
        "",
        ...lignes,
        complet ? `Total : ${euros(total)}` : "",
        "",
        f.get("mode") === "Livraison" ? `Livraison : ${f.get("date")}` : `Retrait à ${INFOS.adresseRetrait} : ${f.get("date")}`,
        f.get("mode") === "Livraison" ? `Adresse : ${f.get("adresse")}, ${f.get("ville")}` + (f.get("ville") === "Autre ville" ? " (hors zone : conditions à voir par téléphone)" : " (livraison gratuite)") : "",
        `Paiement : ${f.get("paiement")}`,
        `Nom : ${f.get("prenom")} ${f.get("nom")}`,
        `Téléphone : ${f.get("telephone")}`,
        `E-mail : ${f.get("email")}`,
        f.get("remarque") ? `Remarque : ${f.get("remarque")}` : "",
      ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "").join("\n");
      const articles = lignesPanier().map((l) => {
        if (l.ref.t === "formule") return { t: "formule", nom: l.nom, q: 1, prix: l.prix, details: l.details };
        const p = trouverPlat(l.ref.id), a = { t: "plat", cat: categorieDe[l.ref.id], nom: p.nom, q: l.q, prix: p.prix };
        if (l.ref.v) { if (p.choix.ajout) a.accomp = l.ref.v; else a.choix = l.ref.v; }
        return a;
      });
      const optionDate = select.selectedOptions[0];
      envoyerAuService({ action: "commande", commande: {
        id: numero, vendredi: f.get("date"), vendrediISO: optionDate ? optionDate.dataset.iso : "",
        prenom: f.get("prenom"), nom: f.get("nom"), email: f.get("email"), telephone: f.get("telephone"), mode: f.get("mode"),
        ville: f.get("mode") === "Livraison" ? f.get("ville") : "", adresse: f.get("mode") === "Livraison" ? f.get("adresse") : "",
        paiement: f.get("paiement"), remarque: f.get("remarque") || "", total, complet, articles,
      } });
      ecrireJSON(CLE_CLIENT, { prenom: f.get("prenom"), nom: f.get("nom"), email: f.get("email"), telephone: f.get("telephone"),
        mode: f.get("mode"), ville: f.get("ville") || "", adresse: f.get("adresse") || "", paiement: f.get("paiement") });
      ecrireJSON(CLE_DERNIERE, { date: new Date().toISOString(), n: nbArticles(), total: complet ? total : 0, contenu: { panier, selections, formules } });
      window.open(`https://wa.me/${INFOS.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
      document.getElementById("merci").hidden = false;
    });
  }

  majBadge();
})();
