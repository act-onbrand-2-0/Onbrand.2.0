declare module 'pdf-parse' {
  interface PdfData {
    numpages: number;
    numrender: number;
    info: {
      PDFFormatVersion?: string;
      IsAcroFormPresent?: boolean;
      IsXFAPresent?: boolean;
      Title?: string;
      Author?: string;
      Subject?: string;
      Keywords?: string;
      Creator?: string;
      Producer?: string;
      CreationDate?: string;
      ModDate?: string;
      [key: string]: unknown;
    };
    metadata: {
      _metadata?: Record<string, unknown>;
      [key: string]: unknown;
    } | null;
    text: string;
    version: string;
  }

  interface PdfOptions {
    pagerender?: (pageData: { pageIndex: number; [key: string]: unknown }) => string;
    max?: number;
    version?: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: PdfOptions): Promise<PdfData>;

  export = pdfParse;
}
