import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Chýba SMTP konfigurácia. Nastavte SMTP_HOST, SMTP_PORT, SMTP_USER a SMTP_PASS (pozri .env.example).",
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendSigningEmail(opts: {
  to: string;
  signerName: string;
  documentName: string;
  signingUrl: string;
}) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const greetingName = opts.signerName ? ` ${opts.signerName}` : "";

  await getTransporter().sendMail({
    from,
    to: opts.to,
    subject: `Žiadosť o podpis dokumentu: ${opts.documentName}`,
    text: [
      `Dobrý deň${greetingName},`,
      "",
      `boli ste požiadaní o podpísanie dokumentu "${opts.documentName}".`,
      "",
      "Dokument otvoríte a podpíšete cez tento odkaz:",
      opts.signingUrl,
      "",
      "Odkaz je určený iba pre vás, nezdieľajte ho s nikým iným.",
    ].join("\n"),
    html: `
      <p>Dobrý deň${greetingName},</p>
      <p>boli ste požiadaní o podpísanie dokumentu <strong>${escapeHtml(opts.documentName)}</strong>.</p>
      <p>
        <a href="${opts.signingUrl}"
           style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;
                  border-radius:6px;text-decoration:none;font-family:sans-serif">
          Podpísať dokument
        </a>
      </p>
      <p style="font-family:sans-serif;color:#6b7280;font-size:13px">
        Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:<br />
        <a href="${opts.signingUrl}">${opts.signingUrl}</a>
      </p>
      <p style="font-family:sans-serif;color:#6b7280;font-size:13px">
        Odkaz je určený iba pre vás, nezdieľajte ho s nikým iným.
      </p>
    `,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
