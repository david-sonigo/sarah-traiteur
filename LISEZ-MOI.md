# Site Sarah Traiteur by L'Italiano

## Ce qu'il y a dans le dossier
- `donnees.js` → **le seul fichier à modifier** : plats, prix, photos, téléphone, adresse, Instagram…
- `images/` → mettre ici les photos (plats, diaporama). `logo.svg` = le logo.
- `index.html` (accueil), `carte.html`, `commander.html`, `mentions-legales.html` → les pages.
- `styles.css` (couleurs et mise en page), `app.js` (fonctionnement), `vercel.json` (réglage Vercel).

## Mettre le site en ligne gratuitement (Vercel)
1. Crée un compte gratuit sur **github.com**.
2. Clique sur **New repository** → nom : `sarah-traiteur` → **Create repository**.
3. Clique sur **uploading an existing file**, glisse **tout le contenu** du dossier (pas le dossier lui-même), puis **Commit changes**.
4. Va sur **vercel.com** → **Sign up** → **Continue with GitHub**.
5. **Add New… → Project** → choisis `sarah-traiteur` → **Deploy**.
6. Ton site est en ligne à une adresse du type `sarah-traiteur.vercel.app`.

## Modifier le site plus tard
Sur GitHub, ouvre `donnees.js` → icône crayon → modifie → **Commit changes**.
Vercel met le site à jour tout seul en moins d'une minute.

Pour ajouter une photo : dans GitHub, ouvre le dossier `images` → **Add file → Upload files**,
puis écris son nom dans `donnees.js` (ex. `photo: "images/poulet.jpg"`).

## Nom de domaine (optionnel, ~10 €/an)
Achète `sarahtraiteur.fr` (OVH, IONOS…), puis dans Vercel : **Settings → Domains → Add**,
et suis les instructions affichées.

## Comment arrivent les commandes
Le client remplit son panier et ses coordonnées, puis le bouton ouvre **WhatsApp**
avec la commande déjà rédigée, envoyée au numéro indiqué dans `donnees.js`.

## Noms des photos des plats
Mets chaque photo dans le dossier `images/plats/`, en .jpg, avec exactement ce nom :

**Nos salades**
- Navets harissa → `navets-harissa.jpg`
- Aubergines confites → `aubergines-confites.jpg`
- Patate douce rôtie → `patate-douce-rotie.jpg`
- Betteraves → `betteraves.jpg`
- Carottes râpées → `carottes-rapees.jpg`
- Pommes de terre mayo → `pommes-de-terre-mayo.jpg`
- Pommes de terre harissa → `pommes-de-terre-harissa.jpg`
- Fèves au cumin → `feves-au-cumin.jpg`
- Caviar d'aubergine → `caviar-d-aubergine.jpg`
- Salade cuite → `salade-cuite.jpg`
- Carottes au cumin → `carottes-au-cumin.jpg`
- Œufs mayo → `oeufs-mayo.jpg`
- Coleslaw → `coleslaw.jpg`
- Salade de poivrons → `salade-de-poivrons.jpg`
- Méchouia → `mechouia.jpg`

**Nos poissons**
- Saumon à la marocaine → `saumon-a-la-marocaine.jpg`
- Saumon haïmi → `saumon-haimi.jpg`
- Filet de bar à la marocaine → `filet-de-bar-a-la-marocaine.jpg`
- Filet de perche à la marocaine → `filet-de-perche-a-la-marocaine.jpg`

**Nos plats**
- Pkaïla → `pkaila.jpg`
- Harissa (blé) → `harissa-ble.jpg`
- Langue de bœuf sauce forestière → `langue-de-boeuf-sauce-forestiere.jpg`
- Émincé de poulet caramélisé → `emince-de-poulet-caramelise.jpg`
- Boulettes tunisiennes à la sauce → `boulettes-tunisiennes-a-la-sauce.jpg`
- Bouillon de légumes → `bouillon-de-legumes.jpg`
- Poulet aux olives → `poulet-aux-olives.jpg`
- Bœuf bourguignon → `boeuf-bourguignon.jpg`
- Rôti de dinde sauce forestière → `roti-de-dinde-sauce-forestiere.jpg`

**Nos accompagnements seuls**
- Tagliatelles → `tagliatelles.jpg`
- Riz jaune → `riz-jaune.jpg`
- Pommes de terre au four → `pommes-de-terre-au-four.jpg`
- Haricots verts → `haricots-verts.jpg`
- Couscous → `couscous.jpg`
- Légumes sautés → `legumes-sautes.jpg`
- Fenouil artichaut → `fenouil-artichaut.jpg`

**Nos suppléments**
- Hallot → `hallot.jpg`
- Babka → `babka.jpg`
- Croquant → `croquant.jpg`
- Boulou → `boulou.jpg`
- Cake marbré → `cake-marbre.jpg`

**Nos desserts by Sarah Traiteur**
- Fondant au chocolat → `fondant-au-chocolat.jpg`
- Cookie noisette / chocolat → `cookie-noisette-chocolat.jpg`
- Verrine opéra → `verrine-opera.jpg`
- Verrine tarte au citron → `verrine-tarte-au-citron.jpg`
- Verrine fraisier → `verrine-fraisier.jpg`
- Verrine mousse au chocolat → `verrine-mousse-au-chocolat.jpg`
- Lot de 4 verrines → `lot-de-4-verrines.jpg`

Une photo manquante n’est pas grave : le plat garde le visuel par défaut.

**Desserts by Shana Pâtisserie (3 gâteaux de la semaine)**
- Gâteau n°1 → `shana-1.jpg` · Gâteau n°2 → `shana-2.jpg` · Gâteau n°3 → `shana-3.jpg`
- Chaque semaine : change le nom et le prix dans `donnees.js`, et remplace les 3 photos.

## Récap des préparations (page cachée, pour la cuisine)
Adresse : `tonsite.fr/preparation` (elle n'apparaît pas dans le menu du site).
1. Dans WhatsApp, copie les messages de commande reçus (appui long → Copier ; tu peux en sélectionner plusieurs).
2. Colle-les tous dans la grande case de la page, puis clique sur « Faire le récap ».
3. Le site additionne tout : quantités par plat, accompagnements, salades des formules, hallot, croquants…
   et liste les clients (retrait ou livraison, adresse, paiement, total).
