declare module 'pdfmake/build/pdfmake' {
  const pdfMake: {
    vfs: Record<string, string>
    fonts: Record<string, unknown>
    createPdf(documentDefinition: unknown): {
      download(filename?: string): void
      getBlob(cb: (blob: Blob) => void): void
      getBase64(cb: (data: string) => void): void
    }
  }
  export = pdfMake
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: { pdfMake: { vfs: Record<string, string> } }
  export = pdfFonts
}
