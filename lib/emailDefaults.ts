/**
 * Predvolený text emailu so žiadosťou o podpis. Používa sa na oboch stranách:
 * na predvyplnenie formulára v prehliadači aj na serveri, keď používateľ text
 * zmaže — aby sa nikdy neodoslal prázdny email.
 */

export function defaultEmailSubject(documentName: string) {
  return `Žiadosť o podpis dokumentu: ${documentName}`;
}

export function defaultEmailMessage(documentName: string) {
  return [
    "Dobrý deň,",
    "",
    `posielam Vám na podpis dokument "${documentName}".`,
    "Podpísať ho môžete cez odkaz nižšie.",
    "",
    "Ďakujem",
  ].join("\n");
}

export const EMAIL_SUBJECT_MAX = 200;
export const EMAIL_MESSAGE_MAX = 5000;
