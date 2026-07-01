export async function extractResumeText(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (lower.endsWith(".txt")) {
    return buffer.toString("utf-8").trim();
  }

  throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT file.");
}
