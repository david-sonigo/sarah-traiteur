/* Page admin : commandes, récap cuisine, chiffre d'affaires et visites.
   Les données viennent du Google Sheets (via INFOS.urlCommandes dans donnees.js). */
(function () {
  const $ = (s) => document.querySelector(s);
  const euros = (n) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const ech = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const demo = new URLSearchParams(location.search).has("demo");
  const CLE_MDP = "sarah-admin-mdp", CLE_EMAIL = "sarah-admin-email";
  const lire = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* ignoré */ } };

  // Tout appareil qui ouvre la page admin n'est plus jamais compté dans les visites
  ecrire("sarah-admin-ne-pas-compter", "1");
  let tirages = [];
  let mdp = lire(CLE_MDP) || "", email = lire(CLE_EMAIL) || "", commandes = [], visites = [], vendrediChoisi = null;

  /* ---------- Appels au service Google ---------- */
  async function appel(action, extra) {
    if (demo) return donneesDemo(action, extra);
    if (!INFOS.urlCommandes) throw new Error("config");
    const r = await fetch(INFOS.urlCommandes, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ action, email, mdp }, extra || {})) });
    return r.json();
  }

  async function charger() {
    $("#maj-info").textContent = "Chargement…";
    try {
      const r = await appel("lister");
      if (!r.ok) {
        if (r.erreur === "mdp") { deconnecter("E-mail ou mot de passe incorrect."); return; }
        throw new Error(r.erreur);
      }
      commandes = r.commandes || []; visites = r.visites || []; tirages = r.tirages || [];
      if (r.tableur) { $("#lien-tableur").href = r.tableur; $("#lien-tableur").hidden = false; }
      $("#connexion").hidden = true; $("#espace").hidden = false;
      try { sessionStorage.setItem("sarah-admin-session", "1"); } catch (e) { /* ignoré */ }
      $("#maj-info").textContent = "Mis à jour à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) +
        ` · ${commandes.length} commande${commandes.length > 1 ? "s" : ""} au total`;
      remplirVendredis(); afficher();
    } catch (e) {
      const msg = e.message === "config"
        ? "Le service des commandes n'est pas encore branché (urlCommandes vide dans donnees.js)."
        : "Impossible de joindre le service des commandes. Vérifie ta connexion puis réessaie.";
      if ($("#espace").hidden) { $("#connexion").hidden = false; $("#erreur-connexion").textContent = msg; }
      else $("#maj-info").textContent = msg;
    }
  }

  function deconnecter(message) {
    mdp = ""; ecrire(CLE_MDP, null);
    try { sessionStorage.removeItem("sarah-admin-session"); } catch (e) { /* ignoré */ }
    if (email) $("#email-admin").value = email;
    $("#espace").hidden = true; $("#connexion").hidden = false;
    $("#erreur-connexion").textContent = message || "";
  }

  $("#connexion").addEventListener("submit", (e) => {
    e.preventDefault();
    email = $("#email-admin").value.trim(); mdp = $("#mdp").value;
    ecrire(CLE_EMAIL, email); ecrire(CLE_MDP, mdp);
    $("#erreur-connexion").textContent = "";
    charger();
  });
  $("#deconnexion").addEventListener("click", () => deconnecter());
  $("#actualiser").addEventListener("click", charger);
  $("#imprimer").addEventListener("click", () => window.print());

  /* ---------- Onglets ---------- */
  document.querySelector(".onglets").addEventListener("click", (e) => {
    const b = e.target.closest("[data-onglet]"); if (!b) return;
    document.querySelectorAll("[data-onglet]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    document.querySelectorAll("[data-panneau]").forEach((p) => (p.hidden = p.dataset.panneau !== b.dataset.onglet));
  });

  /* ---------- Choix du vendredi ---------- */
  const aujourdHui = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const joliDate = (iso) => {
    if (!iso) return "Date inconnue";
    const t = new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  function remplirVendredis() {
    const dates = [...new Set(commandes.map((c) => c.vendrediISO).filter(Boolean))].sort().reverse();
    if (!vendrediChoisi || (vendrediChoisi !== "toutes" && !dates.includes(vendrediChoisi))) {
      const aVenir = dates.filter((d) => d >= aujourdHui()).sort();
      vendrediChoisi = aVenir[0] || dates[0] || "toutes";
    }
    $("#choix-vendredi").innerHTML = dates.map((d) => `<option value="${d}" ${d === vendrediChoisi ? "selected" : ""}>${joliDate(d)}${d >= aujourdHui() ? "" : " (passé)"}</option>`).join("") +
      `<option value="toutes" ${vendrediChoisi === "toutes" ? "selected" : ""}>Toutes les commandes</option>`;
  }
  $("#choix-vendredi").addEventListener("change", (e) => { vendrediChoisi = e.target.value; afficher(); });

  const nomComplet = (c) => [c.prenom, c.nom].filter(Boolean).join(" ");
  const duVendredi = () => commandes.filter((c) => vendrediChoisi === "toutes" || c.vendrediISO === vendrediChoisi);
  const actives = (liste) => liste.filter((c) => c.statut !== "Annulée");

  function afficher() {
    afficherResume(); afficherCuisine(); afficherCommandes(); afficherCA(); afficherClients(); afficherTirage(); afficherVisites();
  }

  /* ---------- Résumé ---------- */
  function afficherResume() {
    const toutes = duVendredi(), l = actives(toutes);
    const ca = l.reduce((a, c) => a + c.total, 0), encaisse = l.filter((c) => c.paye === "Oui").reduce((a, c) => a + c.total, 0);
    const livraisons = l.filter((c) => c.mode === "Livraison");
    const nouvelles = l.filter((c) => c.statut === "Nouvelle").length;
    const titre = vendrediChoisi === "toutes" ? "Toutes les commandes" : joliDate(vendrediChoisi);
    $('[data-panneau="resume"]').innerHTML = `
      <h2>${ech(titre)}</h2>
      <div class="chiffres-admin">
        <div><strong>${l.length}</strong><span>commande${l.length > 1 ? "s" : ""}</span></div>
        <div><strong>${euros(ca)}</strong><span>chiffre d'affaires</span></div>
        <div><strong>${euros(encaisse)}</strong><span>déjà payé</span></div>
        <div><strong>${euros(ca - encaisse)}</strong><span>reste à encaisser</span></div>
        <div><strong>${l.length - livraisons.length}</strong><span>retrait${l.length - livraisons.length > 1 ? "s" : ""}</span></div>
        <div><strong>${livraisons.length}</strong><span>livraison${livraisons.length > 1 ? "s" : ""}</span></div>
        <div><strong>${l.length ? euros(ca / l.length) : "—"}</strong><span>panier moyen</span></div>
        <div><strong>${nouvelles}</strong><span>à confirmer</span></div>
      </div>
      ${toutes.length - l.length ? `<p class="petit-texte" style="margin-top:10px">${toutes.length - l.length} commande(s) annulée(s), non comptée(s).</p>` : ""}
      ${livraisons.length ? `<div class="bloc" style="margin-top:20px"><h3>Livraisons</h3><ul>${livraisons.map((c) =>
        `<li><span>${ech(nomComplet(c))} · ${ech(c.adresse)}, ${ech(c.ville)}</span><a href="tel:${ech(c.telephone)}">${ech(c.telephone)}</a></li>`).join("")}</ul></div>` : ""}
      ${!l.length ? `<p class="message" style="margin-top:16px">Aucune commande pour cette date pour l'instant.</p>` : ""}`;
  }

  /* ---------- Récap cuisine : on additionne tout, y compris le contenu des formules ---------- */
  const categories = CARTE.map((c) => c.court || c.categorie);
  const platParNom = {};
  CARTE.forEach((c) => c.plats.forEach((p) => (platParNom[p.nom.toLowerCase()] = { cat: c.court || c.categorie, nom: p.nom })));

  function recapCuisine(liste) {
    const r = new Map();
    const ajouter = (cat, nom, q) => {
      if (!r.has(cat)) r.set(cat, new Map());
      const m = r.get(cat); m.set(nom, (m.get(nom) || 0) + q);
    };
    const ACC = "Accompagnements des plats", INCLUS = "Inclus dans les formules", FORM = "Formules";
    liste.forEach((c) => (c.articles || []).forEach((a) => {
      if (a.t === "remise") return;
      const q = Number(a.q) || 1;
      if (a.t === "formule") {
        ajouter(FORM, a.nom, q);
        const formule = (typeof FORMULES !== "undefined" ? FORMULES : []).find((f) => f.nom === a.nom);
        (a.details || []).forEach((d) => {
          const k = d.indexOf(" : "); if (k < 0) return;
          const label = d.slice(0, k), reste = d.slice(k + 3);
          if (label === "Inclus") {
            reste.split(", ").forEach((x) => {
              const m = x.match(/^(\d+)\s+(.+)$/), n = m ? +m[1] : 1, nom = m ? m[2] : x;
              const p = platParNom[nom.toLowerCase()];
              if (p) ajouter(p.cat, p.nom, n * q); else ajouter(INCLUS, nom.charAt(0).toUpperCase() + nom.slice(1), n * q);
            });
            return;
          }
          const comp = formule && formule.composition.find((x) => x.label === label);
          const catCarte = comp && CARTE.find((x) => x.ancre === comp.parmi);
          if (catCarte) {
            const cat = catCarte.court || catCarte.categorie;
            if (catCarte.avecAccompagnement) {
              const [plat, acc] = reste.split(" + ");
              ajouter(cat, plat, q); if (acc) ajouter(ACC, acc, q);
            } else {
              reste.split(", ").forEach((x) => { const m = x.match(/^(.*) ×(\d+)$/); ajouter(cat, m ? m[1] : x, (m ? +m[2] : 1) * q); });
            }
          } else if (comp) {
            // Choix d'un parfum d'un produit précis (ex. le croquant)
            const p = CARTE.flatMap((x) => x.plats.map((pl) => ({ pl, cat: x.court || x.categorie }))).find((x) => x.pl.id === comp.parmi);
            if (p) ajouter(p.cat, `${p.pl.nom} (${reste.toLowerCase()})`, q); else ajouter(label, reste, q);
          } else ajouter(label, reste, q);
        });
        return;
      }
      ajouter(a.cat || "Autres", a.choix ? `${a.nom} (${String(a.choix).toLowerCase()})` : a.nom, q);
      if (a.accomp) ajouter(ACC, a.accomp, q);
    }));
    const ordre = [FORM, ...categories.flatMap((c) => (c === "Plats" ? [c, ACC] : [c])), INCLUS];
    return [...r.entries()].sort((a, b) => (ordre.indexOf(a[0]) + 1 || 99) - (ordre.indexOf(b[0]) + 1 || 99));
  }

  function afficherCuisine() {
    const l = actives(duVendredi());
    const recap = recapCuisine(l);
    const titre = vendrediChoisi === "toutes" ? "Toutes les commandes" : joliDate(vendrediChoisi);
    $('[data-panneau="cuisine"]').innerHTML = `
      <h2>À préparer · ${ech(titre)}</h2>
      <p class="petit-texte" style="margin:-4px 0 16px">${l.length} commande${l.length > 1 ? "s" : ""} (hors annulées). Le contenu des formules est déjà compté dans chaque catégorie.</p>
      ${recap.length ? `<div class="blocs">${recap.map(([cat, m]) => `
        <div class="bloc"><h3>${ech(cat)}</h3><ul>${[...m.entries()].sort((a, b) => b[1] - a[1]).map(([nom, n]) =>
          `<li><span>${ech(nom)}</span><b>${n}</b></li>`).join("")}</ul></div>`).join("")}</div>`
        : `<p class="message">Rien à préparer pour cette date.</p>`}`;
  }

  /* ---------- Commandes une par une ---------- */
  function ligneArticle(a) {
    if (a.t === "formule") return `<li>${ech(a.nom)} × 1 <span style="float:right">${euros(a.prix)}</span>${(a.details || []).map((d) => `<small>– ${ech(d)}</small>`).join("")}</li>`;
    if (a.t === "remise") return `<li>${ech(a.nom)} <span style="float:right">${euros(a.prix)}</span></li>`;
    const nom = (a.accomp ? `${a.nom} + ${a.accomp}` : a.choix ? `${a.nom} (${String(a.choix).toLowerCase()})` : a.nom)
      + (a.date ? ` — le ${new Date(a.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}` : "");
    return `<li>${ech(nom)} × ${a.q}${a.prix != null ? ` <span style="float:right">${euros(a.prix * a.q)}</span>` : ""}</li>`;
  }
  function afficherCommandes() {
    const l = duVendredi().slice().sort((a, b) => String(a.recu).localeCompare(String(b.recu)));
    const tel = (t) => String(t || "").replace(/[^\d+]/g, "");
    const wa = (t) => { const n = tel(t); return n.startsWith("0") ? "33" + n.slice(1) : n.replace("+", ""); };
    $('[data-panneau="commandes"]').innerHTML = `
      <h2>Commandes (${l.length})</h2>
      ${l.length ? `<div class="cmds">${l.map((c) => `
        <article class="cmd ${c.statut === "Annulée" ? "annulee" : ""}" data-id="${ech(c.id)}">
          <div class="cmd-haut">
            <h3>${ech(nomComplet(c))}
              <span class="pastille ${c.statut === "Confirmée" ? "ok" : c.statut === "Annulée" ? "non" : ""}">${ech(c.statut)}</span>
              <span class="pastille ${c.paye === "Oui" ? "ok" : "non"}">${c.paye === "Oui" ? "Payée" : "Non payée"}</span></h3>
            <span class="montant">${euros(c.total)}${c.complet === "non" ? " *" : ""}</span>
          </div>
          <p class="infos">
            N° ${ech(c.id)} · reçue le ${ech(c.recu)}<br>
            <a href="tel:${ech(tel(c.telephone))}">${ech(c.telephone)}</a>${c.email ? ` · <a href="mailto:${ech(c.email)}">${ech(c.email)}</a>` : ""} · <a href="https://wa.me/${ech(wa(c.telephone))}" target="_blank" rel="noopener">WhatsApp</a><br>
            ${c.mode === "Livraison" ? `Livraison : ${ech(c.adresse)}, ${ech(c.ville)}${c.ville === "Autre ville" ? " (hors zone)" : ""}` : "Retrait à " + ech(INFOS.adresseRetrait)}
            · ${ech(c.vendredi)} · Paiement : ${ech(c.paiement)}
          </p>
          <ul>${(c.articles || []).map(ligneArticle).join("")}</ul>
          ${c.remarque ? `<p class="remarque"><strong>Remarque :</strong> ${ech(c.remarque)}</p>` : ""}
          <div class="etats">
            <button type="button" data-champ="statut" data-valeur="${c.statut === "Confirmée" ? "Nouvelle" : "Confirmée"}" aria-pressed="${c.statut === "Confirmée"}">✓ Confirmée</button>
            <button type="button" class="paye" data-champ="paye" data-valeur="${c.paye === "Oui" ? "Non" : "Oui"}" aria-pressed="${c.paye === "Oui"}">€ Payée</button>
            <button type="button" class="annule" data-champ="statut" data-valeur="${c.statut === "Annulée" ? "Nouvelle" : "Annulée"}" aria-pressed="${c.statut === "Annulée"}">Annulée</button>
          </div>
        </article>`).join("")}</div>` : `<p class="message">Aucune commande pour cette date.</p>`}
      <p class="petit-texte" style="margin-top:12px">« Nouvelle » = enregistrée sur le site : vérifie que tu as bien reçu le message WhatsApp, puis clique sur « Confirmée ».</p>`;
  }
  $('[data-panneau="commandes"]').addEventListener("click", async (e) => {
    const b = e.target.closest("[data-champ]"); if (!b) return;
    const id = b.closest("[data-id]").dataset.id, { champ, valeur } = b.dataset;
    const c = commandes.find((x) => x.id === id); if (!c) return;
    const avant = c[champ]; c[champ] = valeur; afficher();
    try { const r = await appel("maj", { id, champ, valeur }); if (!r.ok) throw new Error(r.erreur); }
    catch (err) { c[champ] = avant; afficher(); alert("La modification n'a pas pu être enregistrée. Réessaie."); }
  });

  /* ---------- Chiffre d'affaires ---------- */
  function afficherCA() {
    const l = actives(commandes);
    const parVendredi = new Map(), parMois = new Map();
    l.forEach((c) => {
      const v = c.vendrediISO || "?", m = (c.vendrediISO || "?").slice(0, 7);
      [[parVendredi, v], [parMois, m]].forEach(([map, k]) => {
        const x = map.get(k) || { n: 0, ca: 0, paye: 0 };
        x.n++; x.ca += c.total; if (c.paye === "Oui") x.paye += c.total; map.set(k, x);
      });
    });
    const nomMois = (k) => k === "?" ? "?" : new Date(k + "-15T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const tableau = (map, libelle, nom) => `
      <div class="tableau"><table><thead><tr><th>${libelle}</th><th>Commandes</th><th>Chiffre d'affaires</th><th>Payé</th></tr></thead><tbody>
      ${[...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([k, x]) =>
        `<tr><td>${ech(nom(k))}</td><td class="n">${x.n}</td><td class="n">${euros(x.ca)}</td><td class="n">${euros(x.paye)}</td></tr>`).join("") || `<tr><td colspan="4">Aucune commande</td></tr>`}
      </tbody></table></div>`;
    const total = l.reduce((a, c) => a + c.total, 0);
    $('[data-panneau="ca"]').innerHTML = `
      <h2>Chiffre d'affaires</h2>
      <div class="chiffres-admin" style="margin-bottom:20px">
        <div><strong>${euros(total)}</strong><span>depuis le début</span></div>
        <div><strong>${l.length}</strong><span>commandes</span></div>
        <div><strong>${l.length ? euros(total / l.length) : "—"}</strong><span>panier moyen</span></div>
      </div>
      <h3 style="font-family:var(--serif);font-weight:500;font-size:1.4rem;color:var(--brun);margin:6px 0 10px">Par mois</h3>
      ${tableau(parMois, "Mois", nomMois)}
      <h3 style="font-family:var(--serif);font-weight:500;font-size:1.4rem;color:var(--brun);margin:22px 0 10px">Par vendredi</h3>
      ${tableau(parVendredi, "Vendredi", joliDate)}
      <p class="petit-texte" style="margin-top:10px">Les commandes annulées ne sont pas comptées.</p>`;
  }

  /* ---------- Fichier clients (toutes les commandes, regroupées par client) ---------- */
  let recherche = "";
  function listeClients() {
    const clients = new Map();
    commandes.slice().sort((a, b) => String(a.recu).localeCompare(String(b.recu))).forEach((c) => {
      const cle = (String(c.telephone || "").replace(/\D/g, "").replace(/^33/, "0")) || String(c.email || "").toLowerCase() || nomComplet(c).toLowerCase();
      const x = clients.get(cle) || { commandes: 0, total: 0, premiere: c.recu };
      // Les coordonnées les plus récentes remplacent les anciennes
      ["prenom", "nom", "email", "telephone"].forEach((k) => { if (c[k]) x[k] = c[k]; });
      if (c.mode === "Livraison" && c.adresse) { x.adresse = c.adresse; x.ville = c.ville; }
      if (c.statut !== "Annulée") { x.commandes++; x.total += c.total; }
      x.derniere = c.recu;
      clients.set(cle, x);
    });
    return [...clients.values()].sort((a, b) => String(b.derniere).localeCompare(String(a.derniere)));
  }
  function afficherClients() {
    const tous = listeClients();
    const q = recherche.trim().toLowerCase();
    const l = q ? tous.filter((c) => [c.prenom, c.nom, c.email, c.telephone, c.adresse, c.ville].join(" ").toLowerCase().includes(q)) : tous;
    const panneau = $('[data-panneau="clients"]');
    panneau.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <h2 style="margin:0">Clients (${tous.length})</h2>
        <div class="outils">
          <input type="search" id="recherche-client" placeholder="Rechercher un client…" value="${ech(recherche)}" style="font:inherit;padding:10px 12px;border:1px solid #dccdb4;border-radius:10px;background:var(--blanc);min-width:220px">
          <button type="button" class="bouton petit" id="telecharger-clients">Télécharger le fichier clients</button>
        </div>
      </div>
      ${l.length ? `<div class="tableau"><table><thead><tr><th>Client</th><th>E-mail</th><th>Téléphone</th><th>Adresse complète</th><th>Commandes</th><th>Total dépensé</th><th>Dernière commande</th></tr></thead><tbody>
        ${l.map((c) => `<tr>
          <td><strong>${ech([c.prenom, c.nom].filter(Boolean).join(" "))}</strong></td>
          <td>${c.email ? `<a href="mailto:${ech(c.email)}">${ech(c.email)}</a>` : "—"}</td>
          <td><a href="tel:${ech(String(c.telephone || "").replace(/[^\d+]/g, ""))}">${ech(c.telephone)}</a></td>
          <td>${c.adresse ? `${ech(c.adresse)}, ${ech(c.ville)}` : `<span class="petit-texte">Retrait</span>`}</td>
          <td class="n">${c.commandes}</td><td class="n">${euros(c.total)}</td><td>${ech(String(c.derniere).slice(0, 10).split("-").reverse().join("/"))}</td>
        </tr>`).join("")}</tbody></table></div>`
        : `<p class="message">${tous.length ? "Aucun client ne correspond à la recherche." : "Pas encore de client : ils apparaîtront ici dès la première commande."}</p>`}
      <p class="petit-texte" style="margin-top:10px">Le fichier téléchargé s'ouvre avec Excel ou Numbers.</p>`;
    const champ = $("#recherche-client");
    champ.addEventListener("input", () => { recherche = champ.value; afficherClients(); const c = $("#recherche-client"); c.focus(); c.setSelectionRange(c.value.length, c.value.length); });
    $("#telecharger-clients").addEventListener("click", () => telechargerClients(tous));
  }
  function telechargerClients(clients) {
    const cell = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const lignes = [["Prénom", "Nom", "E-mail", "Téléphone", "Adresse", "Ville", "Nombre de commandes", "Total dépensé (€)", "Première commande", "Dernière commande"]]
      .concat(clients.map((c) => [c.prenom, c.nom, c.email, c.telephone, c.adresse, c.ville, c.commandes, c.total.toFixed(2).replace(".", ","),
        String(c.premiere).slice(0, 10), String(c.derniere).slice(0, 10)]));
    const csv = "\ufeff" + lignes.map((l) => l.map(cell).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `clients-sarah-traiteur-${aujourdHui()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- Tirage au sort du mois ---------- */
  const TIRAGE = INFOS.tirage || { montantParPoint: 50, lot: "un dessert au choix" };
  const cleClient = (c) => (String(c.telephone || "").replace(/\D/g, "").replace(/^33/, "0")) || String(c.email || "").toLowerCase() || nomComplet(c).toLowerCase();
  const moisDe = (c) => String(c.recu).slice(0, 7);
  const nomMoisLong = (k) => { const t = new Date(k + "-15T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
  let moisTirage = null, lotTirage = TIRAGE.lot, tirageEnCours = false;
  function participantsDu(mois) {
    const parClient = new Map();
    commandes.filter((c) => moisDe(c) === mois && c.statut === "Confirmée").forEach((c) => {
      const k = cleClient(c), x = parClient.get(k) || { nom: nomComplet(c), telephone: c.telephone, email: c.email, commandes: 0, total: 0, points: 0 };
      x.commandes++; x.total += c.total; x.points += Math.floor(c.total / TIRAGE.montantParPoint); parClient.set(k, x);
    });
    return [...parClient.values()].sort((a, b) => b.points - a.points);
  }
  function tirer(liste) {
    const total = liste.reduce((a, p) => a + p.points, 0);
    const alea = new Uint32Array(1); crypto.getRandomValues(alea);
    let n = alea[0] % total;
    for (const p of liste) { if (n < p.points) return p; n -= p.points; }
    return liste[liste.length - 1];
  }
  function afficherTirage() {
    const d = new Date(), courant = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const prec = new Date(d.getFullYear(), d.getMonth() - 1, 15), precedent = `${prec.getFullYear()}-${String(prec.getMonth() + 1).padStart(2, "0")}`;
    const moisListe = [...new Set([courant, precedent, ...commandes.map(moisDe).filter((m) => /^\d{4}-\d{2}$/.test(m))])].sort().reverse();
    if (!moisTirage) moisTirage = tirages.some((t) => t.mois === precedent) ? courant : precedent;
    const participants = participantsDu(moisTirage).filter((p) => p.points > 0);
    const sansPoint = participantsDu(moisTirage).filter((p) => p.points === 0).length;
    const enAttente = commandes.filter((c) => moisDe(c) === moisTirage && c.statut === "Nouvelle").length;
    const totalPoints = participants.reduce((a, p) => a + p.points, 0);
    const deja = tirages.find((t) => t.mois === moisTirage);
    const wa = (t) => { const n = String(t || "").replace(/[^\d+]/g, ""); return n.startsWith("0") ? "33" + n.slice(1) : n.replace("+", ""); };
    const messageGagnant = (g, lot) => `Bonjour ${String(g).split(" ")[0]} ! 🎉 Bonne nouvelle : vous avez gagné le tirage au sort Sarah Traiteur du mois de ${nomMoisLong(moisTirage).toLowerCase()} ! Vous remportez ${lot}, offert lors de votre prochaine commande. Merci pour votre fidélité !`;
    $('[data-panneau="tirage"]').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <h2 style="margin:0">Tirage au sort</h2>
        <div class="outils"><select id="mois-tirage">${moisListe.map((m) => `<option value="${m}" ${m === moisTirage ? "selected" : ""}>${nomMoisLong(m)}${m === courant ? " (en cours)" : ""}</option>`).join("")}</select></div>
      </div>
      <p class="petit-texte">1 point par tranche de ${TIRAGE.montantParPoint} € par commande · seules les commandes <strong>confirmées</strong> du mois comptent · plus un client a de points, plus il a de chances.</p>
      ${enAttente ? `<p class="remarque" style="margin-top:10px;background:#fbf0e6;border-radius:8px;padding:8px 12px">⚠️ ${enAttente} commande(s) de ce mois sont encore « Nouvelle » : confirme-les dans l'onglet Commandes pour qu'elles comptent.</p>` : ""}
      <div class="chiffres-admin" style="margin-top:14px">
        <div><strong>${participants.length}</strong><span>participant${participants.length > 1 ? "s" : ""}</span></div>
        <div><strong>${totalPoints}</strong><span>points au total</span></div>
        <div><strong>${sansPoint}</strong><span>client(s) sous ${TIRAGE.montantParPoint} €</span></div>
      </div>
      ${deja ? `
        <div class="gagnant">
          <div>Gagnant du mois de ${ech(nomMoisLong(moisTirage).toLowerCase())}</div>
          <div class="nom-gagnant">🎉 ${ech(deja.gagnant)}</div>
          <div>${ech(deja.lot)} · ${ech(deja.points)} point(s) sur ${ech(deja.totalPoints)} · tiré le ${ech(String(deja.date).slice(0, 10).split("-").reverse().join("/"))}</div>
          <div class="actions-gagnant">
            <a class="bouton" target="_blank" rel="noopener" href="https://wa.me/${ech(wa(deja.telephone))}?text=${encodeURIComponent(messageGagnant(deja.gagnant, deja.lot))}">Prévenir sur WhatsApp</a>
            <a class="bouton contour" href="tel:${ech(String(deja.telephone).replace(/[^\d+]/g, ""))}">Appeler ${ech(deja.telephone)}</a>
          </div>
        </div>` : `
        <div class="bloc" style="margin-top:18px">
          <h3>Lancer le tirage de ${ech(nomMoisLong(moisTirage).toLowerCase())}</h3>
          <label for="lot-tirage" class="petit-texte">Lot à gagner</label>
          <input id="lot-tirage" value="${ech(lotTirage)}" style="width:100%;font:inherit;padding:10px 12px;border:1px solid #dccdb4;border-radius:10px;background:var(--blanc);margin:6px 0 12px">
          ${moisTirage === courant ? `<p class="petit-texte" style="margin-bottom:10px">⚠️ Ce mois n'est pas terminé : attends le début du mois prochain pour tirer au sort.</p>` : ""}
          <button type="button" class="bouton" id="lancer-tirage" ${participants.length && !tirageEnCours ? "" : "disabled"}>🎲 Lancer le tirage au sort</button>
          <p class="petit-texte" style="margin-top:8px">Le résultat est enregistré tout de suite et ne peut pas être refait (c'est plus juste pour les clients).</p>
          <div id="zone-gagnant"></div>
        </div>`}
      <div class="bloc" style="margin-top:18px"><h3>Participants de ${ech(nomMoisLong(moisTirage).toLowerCase())}</h3>
        ${participants.length ? `<div class="tableau"><table><thead><tr><th>Client</th><th>Commandes</th><th>Total</th><th>Points</th><th>Chances</th></tr></thead><tbody>
          ${participants.map((p) => `<tr><td><strong>${ech(p.nom)}</strong><br><span class="petit-texte">${ech(p.telephone)}</span></td><td class="n">${p.commandes}</td><td class="n">${euros(p.total)}</td><td class="n">${p.points}</td><td class="n">${Math.round((p.points / totalPoints) * 100)} %</td></tr>`).join("")}
          </tbody></table></div>` : `<p class="message">Pas encore de participant ce mois-ci.</p>`}
      </div>
      ${tirages.length ? `<div class="bloc" style="margin-top:18px"><h3>Anciens gagnants</h3><ul>${tirages.slice().sort((a, b) => b.mois.localeCompare(a.mois)).map((t) =>
        `<li><span>${ech(nomMoisLong(t.mois))} · <strong>${ech(t.gagnant)}</strong> · ${ech(t.lot)}</span><b>${ech(t.points)} pt</b></li>`).join("")}</ul></div>` : ""}`;
    $("#mois-tirage").addEventListener("change", (e) => { moisTirage = e.target.value; afficherTirage(); });
    const champLot = $("#lot-tirage"); if (champLot) champLot.addEventListener("input", () => (lotTirage = champLot.value));
    const bouton = $("#lancer-tirage");
    if (bouton) bouton.addEventListener("click", async () => {
      if (moisTirage === courant && !confirm("Le mois n'est pas terminé. Lancer quand même le tirage ?")) return;
      tirageEnCours = true; bouton.disabled = true;
      const gagnant = tirer(participants), lot = (lotTirage || TIRAGE.lot).trim();
      const zone = $("#zone-gagnant");
      // Petite animation : les noms défilent avant d'afficher le gagnant
      let i = 0; const debut = Date.now();
      await new Promise((fin) => { const tour = () => {
        zone.innerHTML = `<div class="gagnant roule"><div>Tirage en cours…</div><div class="nom-gagnant">${ech(participants[i++ % participants.length].nom)}</div></div>`;
        if (Date.now() - debut < 2600) setTimeout(tour, 60 + (Date.now() - debut) / 20); else fin(); }; tour(); });
      const tirage = { mois: moisTirage, gagnant: gagnant.nom, telephone: gagnant.telephone, email: gagnant.email, lot, points: gagnant.points, totalPoints, participants: participants.length };
      try {
        const r = await appel("tirage", { tirage });
        if (!r.ok) throw new Error(r.erreur);
        tirages.push(Object.assign({ date: aujourdHui() }, tirage));
      } catch (e) {
        tirageEnCours = false;
        zone.innerHTML = `<p class="erreur-admin" style="margin-top:12px">${e.message === "deja" ? "Ce mois a déjà été tiré au sort." : "Le tirage n'a pas pu être enregistré. Vérifie ta connexion et réessaie."}</p>`;
        bouton.disabled = false; return;
      }
      tirageEnCours = false; afficherTirage();
    });
  }

  /* ---------- Statistiques de passage ---------- */
  let periode = "jour", toutesVilles = false; // par défaut : la vue « Aujourd'hui »
  const LIB_PAGES = { accueil: "Accueil", carte: "La carte", commander: "Page commande", mentions: "Mentions légales" };
  const LIB_SOURCES = { direct: "Accès direct / lien", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp", google: "Google", tiktok: "TikTok", snapchat: "Snapchat" };
  function barres(entrees, total) {
    if (!entrees.length) return `<p class="message">Pas encore de données.</p>`;
    const max = Math.max(1, ...entrees.map((x) => x[1]));
    return `<ul class="barres">${entrees.map(([nom, n]) => `
      <li><span class="b-nom">${ech(nom)}</span><span class="b-barre"><i style="width:${(n / max) * 100}%"></i></span>
      <b>${n}</b>${total ? `<small>${Math.round((n / total) * 100)} %</small>` : ""}</li>`).join("")}</ul>`;
  }
  let jourChoisi = null; // "AAAA-MM-JJ" quand on regarde un seul jour
  function afficherVisites() {
    const jours = new Map(visites.map((v) => [v.date, v]));
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const decaler = (jourIso, n) => { const d = new Date(jourIso + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
    const derniers = (n) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return iso(d); });
    const auj = iso(new Date()), hier = decaler(auj, -1);
    const modeJour = periode === "jour";
    if (modeJour && !jourChoisi) jourChoisi = auj;
    const dates = modeJour ? [jourChoisi] : derniers(periode), donnees = dates.map((d) => jours.get(d)).filter(Boolean);
    const union = (listes) => new Set(listes.flat()).size;
    const visiteurs = union(donnees.map((j) => j.ids || []));
    const pagesVues = donnees.reduce((a, j) => a + (j.pages || 0), 0);
    const parPage = {}, sources = {}, appareils = {}, villes = {}, heures = new Array(24).fill(0), semaine = new Array(7).fill(0);
    donnees.forEach((j) => {
      Object.entries(j.parPage || {}).forEach(([p, ids]) => (parPage[p] = (parPage[p] || []).concat(ids)));
      Object.entries(j.appareils || {}).forEach(([a, ids]) => (appareils[a] = (appareils[a] || []).concat(ids)));
      Object.entries(j.villes || {}).forEach(([v, ids]) => { if (!/\([A-Z]{2}\)$/.test(v)) villes[v] = (villes[v] || []).concat(ids); });
      Object.entries(j.sources || {}).forEach(([s, n]) => (sources[s] = (sources[s] || 0) + n));
      (j.heures || []).forEach((n, h) => (heures[h] += n));
      semaine[(new Date(j.date + "T12:00:00").getDay() + 6) % 7] += (j.ids || []).length;
    });
    const vuPage = (p) => union([parPage[p] || []]);
    const debut = dates[0], fin = dates[dates.length - 1];
    const nbCommandes = actives(commandes).filter((c) => { const d = String(c.recu).slice(0, 10); return d >= debut && d <= fin; }).length;
    const totalSources = Object.values(sources).reduce((a, b) => a + b, 0);
    const maxJour = Math.max(1, ...dates.map((d) => ((jours.get(d) || {}).ids || []).length));
    const nomsJours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const joliJour = (d) => { const t = new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); };
    const libelle = modeJour ? (jourChoisi === auj ? "aujourd'hui" : jourChoisi === hier ? "hier" : "ce jour") : `${periode} j`;
    const bouton = (cle, texte, actif) => `<button type="button" class="bouton petit ${actif ? "" : "secondaire"}" data-periode="${cle}">${texte}</button>`;
    $('[data-panneau="visites"]').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <h2 style="margin:0">Statistiques de passage</h2>
        <div class="outils">
          ${bouton("auj", "Aujourd'hui", modeJour && jourChoisi === auj)}${bouton("hier", "Hier", modeJour && jourChoisi === hier)}
          <input type="date" id="choix-jour" max="${auj}" value="${modeJour ? jourChoisi : ""}" title="Choisir un jour" style="font:inherit;padding:8px 10px;border:1px solid #dccdb4;border-radius:10px;background:var(--blanc)">
          ${[7, 30, 90].map((n) => bouton(n, `${n} jours`, n === periode)).join("")}
          <button type="button" class="bouton petit" id="aller-villes">📍 Villes</button>
        </div>
      </div>
      ${modeJour ? `<div class="outils" style="justify-content:center;margin:4px 0 14px">
          <button type="button" class="bouton petit secondaire" id="jour-avant" aria-label="Jour précédent">◀</button>
          <strong style="font-family:var(--serif);font-size:1.5rem;color:var(--brun);min-width:240px;text-align:center">${ech(joliJour(jourChoisi))}</strong>
          <button type="button" class="bouton petit secondaire" id="jour-apres" aria-label="Jour suivant" ${jourChoisi >= auj ? "disabled" : ""}>▶</button>
        </div>` : ""}
      <div class="chiffres-admin">
        <div><strong>${visiteurs}</strong><span>visiteurs (${libelle})</span></div>
        <div><strong>${pagesVues}</strong><span>pages vues (${libelle})</span></div>
        <div><strong>${visiteurs ? (pagesVues / visiteurs).toFixed(1).replace(".", ",") : "—"}</strong><span>pages par visiteur</span></div>
        <div><strong>${vuPage("carte")}</strong><span>ont regardé la carte</span></div>
        <div><strong>${nbCommandes}</strong><span>commandes (${libelle})</span></div>
        <div><strong>${visiteurs ? ((nbCommandes / visiteurs) * 100).toFixed(1).replace(".", ",") + " %" : "—"}</strong><span>visiteurs qui commandent</span></div>
      </div>

      ${modeJour ? `
      <div class="bloc" style="margin-top:20px">
        <h3>Heures de passage · ${ech(joliJour(jourChoisi).toLowerCase())}</h3>
        <div class="graphe">${heures.map((n, h) => `<div style="height:${(n / Math.max(1, ...heures)) * 100}%" title="${h} h – ${h + 1} h : ${n} page${n > 1 ? "s" : ""} vue${n > 1 ? "s" : ""}"></div>`).join("")}</div>
        <div class="graphe-legende"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>23 h</span></div>
      </div>` : `
      <div class="bloc" style="margin-top:20px">
        <h3>Visiteurs par jour <span class="petit-texte">(clique sur une barre pour voir ce jour en détail)</span></h3>
        <div class="graphe">${dates.map((d) => { const v = ((jours.get(d) || {}).ids || []).length;
          return `<div data-jour="${d}" style="height:${(v / maxJour) * 100}%;cursor:pointer" title="${new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} : ${v} visiteur${v > 1 ? "s" : ""}"></div>`; }).join("")}</div>
        <div class="graphe-legende"><span>${new Date(dates[0] + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span><span>aujourd'hui</span></div>
      </div>`}
      ${!visiteurs ? `<p class="message" style="margin-top:14px">Aucune visite enregistrée pour ${modeJour ? "ce jour" : "cette période"}.</p>` : ""}

      <div class="blocs" style="margin-top:18px">
        <div class="bloc"><h3>Parcours des visiteurs</h3>${barres([
          ["Sont venus sur le site", visiteurs], ["Ont regardé la carte", vuPage("carte")],
          ["Sont allés sur « Commander »", vuPage("commander")], ["Ont envoyé une commande", nbCommandes]], visiteurs)}
          <p class="petit-texte" style="margin-top:8px">Montre à quelle étape les clients s'arrêtent.</p></div>
        <div class="bloc"><h3>D'où ils viennent</h3>${barres(Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([s, n]) => [LIB_SOURCES[s] || s, n]), totalSources)}
          <p class="petit-texte" style="margin-top:8px">Astuce : sur Instagram, mets le lien <b>sarahtraiteur.fr/?src=instagram</b> pour qu'il soit bien reconnu.</p></div>
        <div class="bloc" id="bloc-villes"><h3>Villes des visiteurs</h3>
          ${(() => { const l = Object.entries(villes).map(([v, ids]) => [v, union([ids])]).sort((a, b) => b[1] - a[1]);
            const avecVille = l.reduce((a, x) => a + x[1], 0);
            return barres(toutesVilles ? l : l.slice(0, 8), avecVille) +
              (l.length > 8 ? `<button type="button" class="bouton petit secondaire" id="toutes-villes" style="margin-top:12px">${toutesVilles ? "Voir moins" : `Voir toutes les villes (${l.length})`}</button>` : ""); })()}
          <p class="petit-texte" style="margin-top:8px">Ville approximative, devinée grâce au réseau internet du visiteur. Sur la 4G/5G, elle peut indiquer une grande ville proche (ex. Paris) au lieu de la vraie ville.</p></div>
        <div class="bloc"><h3>Téléphone ou ordinateur</h3>${barres(Object.entries(appareils).map(([a, ids]) => [a.charAt(0).toUpperCase() + a.slice(1), union([ids])]).sort((a, b) => b[1] - a[1]), visiteurs)}</div>
        <div class="bloc"><h3>Pages les plus vues</h3>${barres(Object.keys(parPage).map((p) => [LIB_PAGES[p] || p, vuPage(p)]).sort((a, b) => b[1] - a[1]))}
          <p class="petit-texte" style="margin-top:8px">Nombre de visiteurs différents par page.</p></div>
        ${modeJour ? "" : `<div class="bloc"><h3>Jours de passage</h3>${barres(nomsJours.map((n, i) => [n, semaine[i]]))}</div>
        <div class="bloc"><h3>Heures de passage</h3>
          <div class="graphe" style="height:120px">${heures.map((n, h) => `<div style="height:${(n / Math.max(1, ...heures)) * 100}%" title="${h} h – ${h + 1} h : ${n} page${n > 1 ? "s" : ""} vue${n > 1 ? "s" : ""}"></div>`).join("")}</div>
          <div class="graphe-legende"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>23 h</span></div></div>`}
      </div>
      <p class="petit-texte" style="margin-top:14px">Un « visiteur » = un téléphone ou un ordinateur différent. Seules les visites depuis la France sont comptées (les robots et les visites à l'étranger sont ignorés). Tes propres visites ne sont jamais comptées.</p>`;
    const montrerJour = (d) => { periode = "jour"; jourChoisi = d; afficherVisites(); };
    $("#aller-villes").addEventListener("click", () => $("#bloc-villes").scrollIntoView({ behavior: "smooth", block: "center" }));
    const bv = $("#toutes-villes"); if (bv) bv.addEventListener("click", () => { toutesVilles = !toutesVilles; afficherVisites(); $("#bloc-villes").scrollIntoView({ block: "nearest" }); });
    document.querySelectorAll("[data-periode]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.periode;
      if (k === "auj") montrerJour(auj); else if (k === "hier") montrerJour(hier); else { periode = +k; afficherVisites(); }
    }));
    $("#choix-jour").addEventListener("change", (e) => { if (e.target.value) montrerJour(e.target.value); });
    document.querySelectorAll("[data-jour]").forEach((b) => b.addEventListener("click", () => montrerJour(b.dataset.jour)));
    const av = $("#jour-avant"), ap = $("#jour-apres");
    if (av) av.addEventListener("click", () => montrerJour(decaler(jourChoisi, -1)));
    if (ap) ap.addEventListener("click", () => montrerJour(decaler(jourChoisi, 1)));
  }

  /* ---------- Données d'exemple (admin.html?demo) pour voir la page sans le Google Sheets ---------- */
  function donneesDemo(action) {
    if (action !== "lister") return { ok: true };
    const v = new Date(); v.setDate(v.getDate() + ((5 - v.getDay() + 7) % 7 || 7));
    const vISO = `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
    const vTxt = v.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const p = { t: "plat" };
    const c = (id, nomComplet, tel, mode, ville, adresse, paiement, articles, statut, paye, remarque) => ({
      prenom: nomComplet.split(" ")[1], nom: nomComplet.split(" ")[0], email: nomComplet.split(" ")[1].toLowerCase() + "." + nomComplet.split(" ")[0].toLowerCase() + "@gmail.com",
      id, recu: vISO.replace(/\d\d$/, (j) => String(+j - 3).padStart(2, "0")) + " 18:2" + id.slice(-1), vendredi: vTxt, vendrediISO: vISO,
      telephone: tel, mode, ville, adresse, paiement, remarque: remarque || "", complet: "oui", statut, paye, articles,
      total: articles.reduce((a, x) => a + x.prix * x.q, 0) });
    const commandesDemo = [
      c("CDEMO1", "Cohen Rachel", "06 11 22 33 44", "Retrait", "", "", "Virement", [
        { ...p, cat: "Plats", nom: "Poulet aux olives", accomp: "Riz jaune", q: 2, prix: 28 },
        { ...p, cat: "Salades", nom: "Carottes au cumin", q: 2, prix: 6 },
        { ...p, cat: "Salades", nom: "Méchouia", q: 1, prix: 6 },
        { ...p, cat: "Suppléments", nom: "Hallot", q: 3, prix: 3 }], "Confirmée", "Oui"),
      c("CDEMO2", "Benhamou David", "07 55 44 33 22", "Livraison", "Sarcelles", "12 rue des Lilas, 95200", "À la réception", [
        { t: "formule", nom: "Formule 6 personnes", q: 1, prix: 199, details: ["Poisson : Saumon haïmi", "Plat : Bœuf bourguignon + Couscous",
          "Salades : Navets harissa ×2, Betteraves, Méchouia ×2, Coleslaw, Salade cuite", "Croquant : Chocolat", "Inclus : 5 hallot, 1 bouteille de jus de raisin"] },
        { ...p, cat: "Desserts", nom: "Cookie géant", choix: "Noisette", q: 1, prix: 15 }], "Nouvelle", "Non", "Sonner à l'interphone 3B"),
      c("CDEMO3", "Attal Sarah", "06 98 76 54 32", "Retrait", "", "", "Virement", [
        { ...p, cat: "Poissons", nom: "Saumon à la marocaine", q: 1, prix: 18 },
        { ...p, cat: "Plats", nom: "Pkaïla", accomp: "Couscous", q: 1, prix: 28 },
        { ...p, cat: "Shana Pâtisserie", nom: "Entremets praliné chocolat", q: 1, prix: 50 }], "Nouvelle", "Non"),
    ];
    // Commandes confirmées du mois dernier, pour essayer le tirage au sort
    const pm = new Date(); pm.setDate(1); pm.setMonth(pm.getMonth() - 1);
    const pmISO = (j) => `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
    [["Cohen Rachel", "06 11 22 33 44", 132], ["Benhamou David", "07 55 44 33 22", 214], ["Attal Sarah", "06 98 76 54 32", 96], ["Cohen Rachel", "06 11 22 33 44", 64], ["Levy Nathan", "06 45 45 45 45", 38]]
      .forEach(([n, tel, total], k) => commandesDemo.push({ id: "CPM" + k, recu: pmISO(4 + k * 5) + " 19:00", vendredi: "", vendrediISO: pmISO(6 + k * 5),
        prenom: n.split(" ")[1], nom: n.split(" ")[0], email: "", telephone: tel, mode: "Retrait", ville: "", adresse: "", paiement: "Virement",
        remarque: "", complet: "oui", statut: "Confirmée", paye: "Oui", articles: [], total }));
    const srcs = ["direct", "instagram", "instagram", "instagram", "whatsapp", "google", "facebook"];
    const visitesDemo = Array.from({ length: 90 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (89 - i));
      const n = 5 + Math.round(10 * Math.abs(Math.sin(i / 3))) + (d.getDay() === 3 ? 12 : d.getDay() === 2 ? 6 : 0);
      const ids = Array.from({ length: n }, (_, k) => "v" + ((i * 7 + k) % 260));
      const sources = {}; ids.forEach((x, k) => { const s = srcs[(k + i) % srcs.length]; sources[s] = (sources[s] || 0) + 1; });
      const heures = new Array(24).fill(0); ids.forEach((x, k) => { heures[[9, 12, 13, 18, 20, 21, 21, 22, 19, 11][(k + i) % 10]] += 3; });
      return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        pages: n * 3, ids, sources, heures,
        parPage: { accueil: ids, carte: ids.slice(0, Math.round(n * .7)), commander: ids.slice(0, Math.round(n * .25)), mentions: ids.slice(0, 1) },
        appareils: { "téléphone": ids.slice(0, Math.round(n * .8)), ordinateur: ids.slice(Math.round(n * .8)) },
        villes: ids.reduce((o, x, k) => { const v = ["Épinay-sur-Seine", "Paris", "Sarcelles", "Enghien-les-Bains", "Deuil-la-Barre", "Saint-Gratien", "Montmorency", "Gennevilliers", "Saint-Denis", "Argenteuil", "Créteil", "Tel Aviv (IL)"][(k * 5 + i) % 12]; (o[v] = o[v] || []).push(x); return o; }, {}) };
    });
    return { ok: true, commandes: commandesDemo, visites: visitesDemo };
  }

  // Onglet « Tirage au sort » caché tant que le tirage est désactivé dans donnees.js
  if (!(INFOS.tirage && INFOS.tirage.actif)) { const o = document.querySelector('[data-onglet="tirage"]'); if (o) o.hidden = true; }

  /* ---------- Démarrage ---------- */
  if (email) $("#email-admin").value = email;
  if (demo || (mdp && email)) charger(); else $("#connexion").hidden = false;
})();
