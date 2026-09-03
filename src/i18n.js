/**
 * Minimal internationalisation: two dictionaries, picked once from the
 * browser locale. No library, no async loading, no language switcher — the
 * app is used by two people whose phones already know their language.
 *
 * Only user-facing strings live here. Everything else in the codebase,
 * including these keys, is English.
 *
 * Note that default aisle names are *data*, not interface: they are copied
 * into the list document when it is created. A list created in French keeps
 * its French aisle names for whoever opens it, which is what you want — both
 * people are looking at the same shelves.
 */

const en = {
  htmlLang: "en",
  dateLocale: "en-GB",
  defaultListName: "Groceries",
  defaultAisles: [
    "Fruit & veg",
    "Bakery",
    "Meat & fish",
    "Dairy",
    "Pantry",
    "Frozen",
    "Drinks",
    "Household",
  ],
  noAisle: "No aisle",
  loading: "Opening…",
  copy: "Copy",
  copied: "Copied",
  close: "Close",
  cancel: "Cancel",
  save: "Save",
  remove: "Delete",
  back: "Back",

  onboarding: {
    title: "One list, two phones.",
    blurb: "This name shows next to the items you check off. Nothing else is stored.",
    label: "Your first name",
    placeholder: "Alex",
    submit: "Continue",
  },

  home: {
    greeting: (name) => `Hello ${name}.`,
    blurb: "Create a list, send the link, fill it in together.",
    newList: "New list",
    newListPlaceholder: "This week's groceries",
    create: "Create",
    joinList: "Join a list",
    open: "Open",
    notFound: "No list has that code. Check the hyphens.",
    unreachable: "The database isn't responding. Try again in a moment.",
    yourLists: "Your lists",
    leaveList: (name) => `Leave ${name}`,
    leaveTitle: "Leave this list?",
    leaveBody: (name) =>
      `“${name}” is removed from your lists on this phone. It still exists and the other person keeps their access — you can rejoin any time with its code.`,
    leaveConfirm: "Leave list",
    leaveLastMember: (name) =>
      `You're the only member of “${name}”. Leaving would abandon it with nobody attached — open it and delete it instead if you're done with it.`,
    signedInAs: (name) => `Signed in as ${name}.`,
    changeName: "Change name",
  },

  list: {
    backToLists: "Lists",
    backToHome: "Back to home",
    manageAisles: "Manage aisles",
    shareList: "Share list",
    deleteList: "Delete list",
    renameList: "Rename list",
    itemsLeft: (n) => (n === 1 ? "item to pick up" : "items to pick up"),
    checkedCount: (done, total) => ` · ${done}/${total} checked`,
    members: (n) => (n > 1 ? `${n} people` : "just you"),
    saving: "Saving…",
    saveFailed: "Offline — change not saved",
    deleteFailed: "Delete failed — database unreachable",
    emptyTitle: "Nothing to buy yet.",
    emptyBlurb: "Add a first item at the bottom of the screen.",
    completedTitle: "List completed",
    completedBody: (completedOn, purgeOn, days) =>
      `Marked done on ${completedOn}. The code and all its data are erased for good on ${purgeOn}, in ${days} days.`,
    reopen: "Reopen list",
    deleteNow: "Delete now",
  },

  item: {
    check: (name) => `Check off ${name}`,
    uncheck: (name) => `Uncheck ${name}`,
    edit: (name) => `Edit ${name}`,
    remove: (name) => `Delete ${name}`,
    takenBy: (name) => `taken by ${name}`,
    quantity: "Quantity",
    addPlaceholder: "Add an item",
    add: "Add",
    aisle: "Aisle",
  },

  aisles: {
    title: "Aisles",
    blurb:
      "Aisles show in list order. Deleting one keeps its items: they move to “No aisle”.",
    colour: "Aisle colour",
    colourNamed: (hue) => `Colour ${hue}`,
    rename: (name) => `Rename ${name}`,
    remove: (name) => `Delete ${name}`,
    addLabel: "Add an aisle",
    addPlaceholder: "Baby, pet food…",
    add: "Add",
    confirmTitle: "Delete this aisle?",
    confirmBody: (count) =>
      `${count} item(s) move to “No aisle”. The aisle disappears for everyone.`,
    keep: "Keep aisle",
    confirmDelete: "Delete aisle",
  },

  share: {
    modalTitle: "Share list",
    title: "Share with one person",
    blurb:
      "Anyone who opens this link joins the list with exactly your rights: add, edit, delete, finish.",
    link: "Link",
    orCode: "Or read out the code",
    send: "Send…",
    text: (slug) => `Our list: ${slug}`,
  },

  done: {
    modalTitle: "List completed",
    title: "Everything is checked.",
    body: (slug, purgeOn) =>
      `You can mark the list as done. The code ${slug} stops working and all its data is erased for good on ${purgeOn}.`,
    confirm: "Mark list as done",
    keepEditing: "Keep editing",
  },

  destroy: {
    modalTitle: "Delete list",
    title: "Delete permanently?",
    body: (slug) =>
      `The code ${slug}, its items and its aisles are erased right away, for both of you. This cannot be undone.`,
    confirm: "Delete now",
  },

  errors: {
    unreachableTitle: "Database unreachable.",
    unreachableBody:
      "The list could not be loaded. Check your connection, then reload the page.",
    purgedTitle: "This list has been deleted.",
    purgedBody: "It was marked done more than 7 days ago. Its data is gone.",
    missingTitle: "This list does not exist.",
    missingBody: "The code may be wrong, or the list was deleted.",
  },

  config: {
    title: "The Supabase connection is missing.",
    blurb: (count) =>
      count > 1
        ? "The app cannot start without these variables:"
        : "The app cannot start without this variable:",
    devTitle: "In development",
    devBody:
      "Copy .env.example to .env, fill in the project URL and the anon key (Supabase dashboard, Project Settings → API), then restart the dev server.",
    prodTitle: "In production",
    prodBody:
      "These variables are read at build time, not at startup: set them with your host, then rebuild.",
  },
};

const fr = {
  htmlLang: "fr",
  dateLocale: "fr-FR",
  defaultListName: "Courses",
  defaultAisles: [
    "Fruits & légumes",
    "Boulangerie",
    "Boucherie & poisson",
    "Crèmerie",
    "Épicerie",
    "Surgelés",
    "Boissons",
    "Entretien & hygiène",
  ],
  noAisle: "Sans rayon",
  loading: "Ouverture…",
  copy: "Copier",
  copied: "Copié",
  close: "Fermer",
  cancel: "Annuler",
  save: "Enregistrer",
  remove: "Supprimer",
  back: "Retour",

  onboarding: {
    title: "Une liste, deux téléphones.",
    blurb:
      "Ce prénom apparaîtra à côté des articles que vous cochez. Rien d'autre n'est enregistré.",
    label: "Votre prénom",
    placeholder: "Camille",
    submit: "Continuer",
  },

  home: {
    greeting: (name) => `Bonjour ${name}.`,
    blurb: "Créez une liste, envoyez le lien, remplissez-la à deux.",
    newList: "Nouvelle liste",
    newListPlaceholder: "Courses de la semaine",
    create: "Créer",
    joinList: "Rejoindre une liste",
    open: "Ouvrir",
    notFound: "Aucune liste ne porte ce code. Vérifiez les tirets.",
    unreachable: "La base ne répond pas. Réessayez dans un instant.",
    yourLists: "Vos listes",
    leaveList: (name) => `Quitter ${name}`,
    leaveTitle: "Quitter cette liste ?",
    leaveBody: (name) =>
      `« ${name} » est retirée de vos listes sur ce téléphone. Elle continue d'exister et l'autre personne garde son accès — vous pouvez la rejoindre à tout moment avec son code.`,
    leaveConfirm: "Quitter la liste",
    leaveLastMember: (name) =>
      `Vous êtes la seule personne sur « ${name} ». La quitter l'abandonnerait sans personne dessus — ouvrez-la plutôt et supprimez-la si vous n'en avez plus besoin.`,
    signedInAs: (name) => `Connecté en tant que ${name}.`,
    changeName: "Changer de prénom",
  },

  list: {
    backToLists: "Listes",
    backToHome: "Revenir à l'accueil",
    manageAisles: "Gérer les rayons",
    shareList: "Partager la liste",
    deleteList: "Supprimer la liste",
    renameList: "Renommer la liste",
    itemsLeft: (n) => (n === 1 ? "article à prendre" : "articles à prendre"),
    checkedCount: (done, total) => ` · ${done}/${total} cochés`,
    members: (n) => (n > 1 ? `${n} personnes` : "vous seul"),
    saving: "Enregistrement…",
    saveFailed: "Hors ligne — modification non enregistrée",
    deleteFailed: "Suppression impossible — base injoignable",
    emptyTitle: "Rien à acheter pour l'instant.",
    emptyBlurb: "Ajoutez un premier article en bas de l'écran.",
    completedTitle: "Liste terminée",
    completedBody: (completedOn, purgeOn, days) =>
      `Marquée terminée le ${completedOn}. Le code et toutes les données seront définitivement supprimés le ${purgeOn}, dans ${days} jours.`,
    reopen: "Rouvrir la liste",
    deleteNow: "Supprimer maintenant",
  },

  item: {
    check: (name) => `Cocher ${name}`,
    uncheck: (name) => `Décocher ${name}`,
    edit: (name) => `Modifier ${name}`,
    remove: (name) => `Supprimer ${name}`,
    takenBy: (name) => `pris par ${name}`,
    quantity: "Quantité",
    addPlaceholder: "Ajouter un article",
    add: "Ajouter",
    aisle: "Rayon",
  },

  aisles: {
    title: "Rayons",
    blurb:
      "L'ordre des rayons est celui de la liste. Supprimer un rayon ne supprime pas ses articles : ils passent en « Sans rayon ».",
    colour: "Couleur du rayon",
    colourNamed: (hue) => `Couleur ${hue}`,
    rename: (name) => `Renommer ${name}`,
    remove: (name) => `Supprimer ${name}`,
    addLabel: "Ajouter un rayon",
    addPlaceholder: "Bébé, animalerie…",
    add: "Ajouter",
    confirmTitle: "Supprimer ce rayon ?",
    confirmBody: (count) =>
      `${count} article(s) passeront en « Sans rayon ». Le rayon disparaîtra pour tout le monde.`,
    keep: "Garder le rayon",
    confirmDelete: "Supprimer le rayon",
  },

  share: {
    modalTitle: "Partager la liste",
    title: "Partager avec une personne",
    blurb:
      "Qui ouvre ce lien rejoint la liste avec exactement les mêmes droits que vous : ajouter, modifier, supprimer, terminer.",
    link: "Lien",
    orCode: "Ou dictez le code",
    send: "Envoyer…",
    text: (slug) => `Notre liste : ${slug}`,
  },

  done: {
    modalTitle: "Liste terminée",
    title: "Tout est coché.",
    body: (slug, purgeOn) =>
      `Vous pouvez marquer la liste comme terminée. Le code ${slug} cessera de fonctionner et l'ensemble des données sera définitivement supprimé le ${purgeOn}.`,
    confirm: "Marquer la liste terminée",
    keepEditing: "Continuer à modifier",
  },

  destroy: {
    modalTitle: "Supprimer la liste",
    title: "Supprimer définitivement ?",
    body: (slug) =>
      `Le code ${slug}, les articles et les rayons seront effacés immédiatement, pour vous deux. C'est irréversible.`,
    confirm: "Supprimer maintenant",
  },

  errors: {
    unreachableTitle: "Base injoignable.",
    unreachableBody:
      "La liste n'a pas pu être chargée. Vérifiez votre connexion, puis rechargez la page.",
    purgedTitle: "Cette liste a été supprimée.",
    purgedBody:
      "Elle avait été marquée terminée il y a plus de 7 jours. Ses données sont effacées.",
    missingTitle: "Cette liste n'existe pas.",
    missingBody: "Le code est peut-être erroné, ou la liste a été supprimée.",
  },

  config: {
    title: "Il manque la connexion à Supabase.",
    blurb: (count) =>
      count > 1
        ? "L'application ne peut pas démarrer sans ces variables :"
        : "L'application ne peut pas démarrer sans cette variable :",
    devTitle: "En développement",
    devBody:
      "Copiez .env.example vers .env, renseignez l'URL du projet et la clé anon (tableau de bord Supabase, Project Settings → API), puis relancez le serveur de développement.",
    prodTitle: "En production",
    prodBody:
      "Ces variables sont lues au moment du build, pas au démarrage : définissez-les chez votre hébergeur, puis relancez le build.",
  },
};

const dictionaries = { en, fr };

/** Browser language, narrowed to a dictionary we actually ship. */
const locale =
  typeof navigator !== "undefined" && String(navigator.language || "").toLowerCase().startsWith("fr")
    ? "fr"
    : "en";

export const t = dictionaries[locale];
