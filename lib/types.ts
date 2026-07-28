export type SignatureBox = {
  /** 0-indexed page number the signature belongs on */
  page: number;
  /** normalized (0-1) position of the box, measured from the top-left of the page */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DocumentStatus = "draft" | "pending" | "signed";

export type DocumentRecord = {
  id: string;
  token: string;
  originalFilename: string;
  createdAt: string;
  status: DocumentStatus;
  signatureBox?: SignatureBox;
  signerName?: string;
  signerEmail?: string;
  /** where the finished document is mailed back to once it has been signed */
  ownerEmail?: string;
  sentAt?: string;
  signedAt?: string;
  signedByName?: string;
  /** when the signed PDF was successfully mailed back to `ownerEmail` */
  signedEmailSentAt?: string;
  /** why mailing the signed PDF back failed, if it did */
  signedEmailError?: string;
};
