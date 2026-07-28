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
  sentAt?: string;
  signedAt?: string;
  signedByName?: string;
};
