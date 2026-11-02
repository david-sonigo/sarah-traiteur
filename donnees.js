/* =========================================================
   FICHIER À MODIFIER : toutes les infos du site sont ici.
   Change le texte entre guillemets, enregistre, et redéploie.
   ========================================================= */

const INFOS = {
  nom: "Sarah Traiteur",
  sousTitre: "by L'Italiano",
  // Numéro WhatsApp qui reçoit les commandes (format international, sans + ni espaces)
  whatsapp: "33699389765",
  telephoneAffiche: "06 99 38 97 65",
  contactCommandes: "David",
  email: "", // ex : "contact@sarahtraiteur.fr" (laisser vide pour ne pas l'afficher)
  instagram: "sarahtraiteurs", // sans le @ (laisser vide pour ne pas l'afficher)
  adresseRetrait: "Épinay-sur-Seine",
  livraison: true, // false = retrait uniquement
  // Villes où la livraison est gratuite (les autres : conditions par téléphone)
  villesLivraisonGratuite: ["Épinay-sur-Seine", "Enghien-les-Bains", "Deuil-la-Barre", "Saint-Gratien", "Montmorency", "Soisy-sous-Montmorency", "Groslay", "Saint-Brice-sous-Forêt", "Sarcelles", "Gennevilliers"],
  limiteCommande: "mercredi 20h",
  casher: "Cuisine casher — surveillance Lameadrine, viande Rav Katz",
};

/* Accompagnements proposés au choix avec chaque plat (obligatoire). */
const ACCOMPAGNEMENTS_AU_CHOIX = [
  "Tagliatelles",
  "Riz jaune",
  "Pommes de terre au four",
  "Haricots verts",
  "Couscous",
  "Légumes sautés",
  "Fenouil artichaut",
];

/* La carte.
   - prix  : nombre en euros (ex : 18.5), ou null pour afficher "Prix à venir".
   - photo : fichier dans le dossier "images" (ex : "images/poulet-olives.jpg"), ou "".
   - court : nom du bouton dans le menu en haut de la carte.
   - avecAccompagnement: true = le client doit choisir un accompagnement.
   - photoEntiere: true = la photo est affichée en entier (sans être recadrée).
   - choix: { nom: "le parfum", liste: [...] } = le client doit choisir une option pour ce produit. */

const CARTE = [
  {
    categorie: "Nos salades",
    ancre: "salades",
    court: "Salades",
    note: "300 ml",
    affichage: "cartes",
    plats: [
      { id: "s01", nom: "Navets harissa", prix: 6 },
      { id: "s02", nom: "Aubergines confites", prix: 6 },
      { id: "s03", nom: "Patate douce rôtie", prix: 6 },
      { id: "s04", nom: "Betteraves", prix: 6 },
      { id: "s05", nom: "Carottes râpées", prix: 6 },
      { id: "s06", nom: "Pommes de terre mayo", prix: 6 },
      { id: "s07", nom: "Pommes de terre harissa", prix: 6 },
      { id: "s08", nom: "Fèves au cumin", prix: 6 },
      { id: "s09", nom: "Caviar d'aubergine", prix: 6 },
      { id: "s10", nom: "Salade cuite", prix: 6 },
      { id: "s11", nom: "Carottes au cumin", prix: 6 },
      { id: "s12", nom: "Œufs mayo", prix: 6 },
      { id: "s13", nom: "Coleslaw", prix: 6 },
      { id: "s14", nom: "Salade de poivrons", prix: 6 },
      { id: "s15", nom: "Méchouia", prix: 6 },
    ],
  },
  {
    categorie: "Nos poissons",
    ancre: "poissons",
    court: "Poissons",
    note: "Pour 2 personnes",
    affichage: "cartes",
    plats: [
      { id: "f1", nom: "Saumon à la marocaine", prix: 18, photo: "" },
      { id: "f2", nom: "Saumon haïmi", prix: 18, photo: "" },
      { id: "f3", nom: "Filet de bar à la marocaine", prix: 18, photo: "" },
      { id: "f4", nom: "Filet de perche à la marocaine", prix: 18, photo: "" },
    ],
  },
  {
    categorie: "Nos plats",
    ancre: "plats",
    court: "Plats",
    note: "Pour 2 personnes · servis avec un accompagnement au choix",
    affichage: "cartes",
    avecAccompagnement: true,
    plats: [
      { id: "p1", nom: "Pkaïla", prix: 28, photo: "" },
      { id: "p2", nom: "Harissa (blé)", prix: 28, photo: "" },
      { id: "p3", nom: "Langue de bœuf sauce forestière", prix: 29, photo: "" },
      { id: "p4", nom: "Émincé de poulet caramélisé", prix: 28, photo: "" },
      { id: "p5", nom: "Boulettes tunisiennes à la sauce", prix: 23, photo: "" },
      { id: "p6", nom: "Bouillon de légumes", prix: 28, photo: "" },
      { id: "p7", nom: "Poulet aux olives", prix: 28, photo: "" },
      { id: "p8", nom: "Bœuf bourguignon", prix: 28, photo: "" },
      { id: "p9", nom: "Rôti de dinde sauce forestière", prix: 28, photo: "" },
    ],
  },
  {
    categorie: "Nos accompagnements seuls",
    ancre: "accompagnements",
    court: "Accompagnements",
    note: "Pour 2 personnes",
    affichage: "cartes",
    plats: [
      { id: "a1", nom: "Tagliatelles", prix: 12 },
      { id: "a2", nom: "Riz jaune", prix: 12 },
      { id: "a3", nom: "Pommes de terre au four", prix: 12 },
      { id: "a4", nom: "Haricots verts", prix: 12 },
      { id: "a5", nom: "Couscous", prix: 12 },
      { id: "a6", nom: "Légumes sautés", prix: 15 },
      { id: "a7", nom: "Fenouil artichaut", prix: 15 },
    ],
  },
  {
    categorie: "Nos suppléments",
    ancre: "supplements",
    court: "Suppléments",
    affichage: "cartes",
    plats: [
      { id: "x1", nom: "Hallot", prix: 3 },
      { id: "x2", nom: "Babka", unite: "4-5 pers.", prix: 15 },
      { id: "x3", nom: "Croquant", unite: "300 g", prix: 10, choix: { nom: "le parfum", liste: ["Nature", "Chocolat", "Noisette"] } },
      { id: "x4", nom: "Boulou", prix: 10 },
      { id: "x5", nom: "Cake marbré", prix: 7 },
    ],
  },
  {
    categorie: "Nos desserts by Sarah Traiteur",
    ancre: "desserts",
    court: "Desserts",
    affichage: "cartes",
    plats: [
      { id: "d1", nom: "Fondant au chocolat", unite: "2 pers.", prix: 7 },
      { id: "d2", nom: "Cookie géant", unite: "6 pers.", prix: 15, photo: "images/plats/cookie-noisette-chocolat.jpg", choix: { nom: "le parfum", liste: ["Noisette", "Chocolat"] } },
      { id: "d3", nom: "Verrine opéra", prix: 4 },
      { id: "d4", nom: "Verrine tarte au citron", prix: 4 },
      { id: "d5", nom: "Verrine fraisier", prix: 4 },
      { id: "d6", nom: "Verrine mousse au chocolat", prix: 4 },
      { id: "d7", nom: "Lot de 4 verrines", prix: 14, photoEntiere: true },
    ],
  },
  {
    categorie: "Desserts by Shana Pâtisserie",
    ancre: "shana",
    court: "Shana Pâtisserie",
    note: "3 gâteaux de la semaine, qui changent régulièrement.",
    affichage: "cartes",
    /* CHAQUE SEMAINE : change le nom, la taille (unite) et le prix des 3 gâteaux.
       Les photos sont toujours shana-1.jpg, shana-2.jpg et shana-3.jpg dans images/plats/
       (remplace simplement le fichier par la photo du nouveau gâteau). */
    plats: [
      { id: "sh1", nom: "Entremets praliné chocolat", unite: "6-8 pers.", prix: 50, photo: "images/plats/shana-1.jpg" },
      { id: "sh2", nom: "Roulé vanille fraise framboise", unite: "6-8 pers.", prix: 40, photo: "images/plats/shana-2.jpg" },
      { id: "sh3", nom: "Entremets exotique", unite: "6-8 pers.", prix: 50, photo: "images/plats/shana-3.jpg" },
    ],
  },
];

/* Photos du diaporama de la page d'accueil (dossier "images").
   Laisser [] pour afficher les visuels par défaut. Ex : ["images/slide1.jpg", "images/slide2.jpg"] */
const DIAPORAMA = ["images/accueil.jpg"];

/* =========================================================
   NOS FORMULES (prix fixe, tout en bas de la carte)
   - texte  : ce qui est affiché dans la liste de la formule
   - parmi  : où le client choisit → "poissons", "plats", "salades" (catégories de la carte)
              ou "x3" (le croquant : le client choisit le parfum)
   - nombre : combien il en choisit (ex. 7 salades)
   - inclus : élément compris d'office, sans choix
   ========================================================= */
const FORMULES = [
  {
    id: "fo4", nom: "Formule 4 personnes", prix: 155,
    composition: [
      { texte: "1 poisson au choix", label: "Poisson", parmi: "poissons", nombre: 1 },
      { texte: "1 plat au choix (+ accompagnement)", label: "Plat", parmi: "plats", nombre: 1 },
      { texte: "7 salades au choix", label: "Salades", parmi: "salades", nombre: 7 },
      { texte: "4 hallot", inclus: "4 hallot" },
      { texte: "1 croquant au choix", label: "Croquant", parmi: "x3", nombre: 1 },
      { texte: "1 bouteille de jus de raisin", inclus: "1 bouteille de jus de raisin" },
    ],
  },
  {
    id: "fo6", nom: "Formule 6 personnes", prix: 199,
    composition: [
      { texte: "1 poisson au choix", label: "Poisson", parmi: "poissons", nombre: 1 },
      { texte: "1 plat au choix (+ accompagnement)", label: "Plat", parmi: "plats", nombre: 1 },
      { texte: "7 salades au choix", label: "Salades", parmi: "salades", nombre: 7 },
      { texte: "5 hallot", inclus: "5 hallot" },
      { texte: "1 croquant au choix", label: "Croquant", parmi: "x3", nombre: 1 },
      { texte: "1 bouteille de jus de raisin", inclus: "1 bouteille de jus de raisin" },
    ],
  },
];
