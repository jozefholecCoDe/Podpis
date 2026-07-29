import nodemailer from "nodemailer";
import { defaultEmailMessage, defaultEmailSubject } from "./emailDefaults";

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

/**
 * Address the signing request is sent *from*, and therefore the default
 * address the finished document is returned to.
 */
export function getDefaultOwnerEmail() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "";
}

export async function sendSigningEmail(opts: {
  to: string;
  documentName: string;
  signingUrl: string;
  /** vlastný predmet; ak chýba, použije sa predvolený */
  subject?: string;
  /** vlastný text správy; odkaz na podpis sa pripája automaticky pod ňu */
  message?: string;
}) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = opts.subject?.trim() || defaultEmailSubject(opts.documentName);
  const message = opts.message?.trim() || defaultEmailMessage(opts.documentName);

  await getTransporter().sendMail({
    from,
    to: opts.to,
    subject,
    text: [
      message,
      "",
      "Dokument otvoríte a podpíšete cez tento odkaz:",
      opts.signingUrl,
      "",
      "Odkaz je určený iba pre vás, nezdieľajte ho s nikým iným.",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(message)}</div>
      <p style="margin-top:20px">
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

export async function sendSignedDocumentEmail(opts: {
  to: string;
  documentName: string;
  signedByName: string;
  signedAt: Date;
  documentUrl: string;
  pdfBytes: Uint8Array;
  attachmentFilename: string;
}) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const signedAtLabel = opts.signedAt.toLocaleString("sk-SK");
  const signedBy = opts.signedByName || "podpisujúcim";

  await getTransporter().sendMail({
    from,
    to: opts.to,
    subject: `Podpísaný dokument: ${opts.documentName}`,
    text: [
      "Dobrý deň,",
      "",
      `dokument "${opts.documentName}" bol podpísaný (${signedBy}, ${signedAtLabel}).`,
      "Podpísaný dokument nájdete v prílohe tohto emailu.",
      "",
      "Stiahnuť ho môžete aj tu:",
      opts.documentUrl,
    ].join("\n"),
    html: `
      <p>Dobrý deň,</p>
      <p>
        dokument <strong>${escapeHtml(opts.documentName)}</strong> bol podpísaný
        (${escapeHtml(signedBy)}, ${escapeHtml(signedAtLabel)}).
        Podpísaný dokument nájdete v prílohe tohto emailu.
      </p>
      <p style="font-family:sans-serif;color:#6b7280;font-size:13px">
        Stiahnuť ho môžete aj tu:<br />
        <a href="${opts.documentUrl}">${opts.documentUrl}</a>
      </p>
    `,
    attachments: [
      {
        filename: opts.attachmentFilename,
        content: Buffer.from(opts.pdfBytes),
        contentType: "application/pdf",
      },
    ],
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
