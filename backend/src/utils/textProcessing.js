/**
 * Text chunking utility for creating overlapping chunks for RAG
 */

/**
 * Split text into overlapping chunks for vector embedding
 * @param {string} text - The source text to chunk
 * @param {number} chunkSize - Characters per chunk (default 800)
 * @param {number} overlap - Overlap between chunks (default 150)
 * @returns {Array<{content: string, index: number, pageRef: string}>}
 */
export const chunkText = (text, chunkSize = 800, overlap = 150) => {
  if (!text || text.trim().length === 0) return [];

  const cleanText = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    let chunkContent = cleanText.slice(start, end);

    // Try to break at sentence boundary
    if (end < cleanText.length) {
      const lastPeriod = chunkContent.lastIndexOf('. ');
      const lastNewline = chunkContent.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkSize * 0.6) {
        chunkContent = chunkContent.slice(0, breakPoint + 1);
      }
    }

    chunks.push({
      content: chunkContent.trim(),
      index: chunkIndex,
      // Estimate page number based on position (avg 3000 chars per page)
      pageRef: `p.${Math.floor(start / 3000) + 1}`,
    });

    chunkIndex++;
    start += chunkContent.length - overlap;
    if (start >= cleanText.length) break;
  }

  return chunks.filter(c => c.content.length > 50);
};

/**
 * Extract text from PDF buffer using pdf-parse
 */
export const extractTextFromPDF = async (buffer) => {
  try {
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info,
    };
  } catch (error) {
    console.error('PDF extraction error:', error.message);
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
};

/**
 * Extract plain text from uploaded text files
 */
export const extractTextFromFile = (buffer, mimetype) => {
  if (mimetype === 'text/plain' || mimetype === 'text/markdown') {
    return buffer.toString('utf-8');
  }
  // For other types, attempt UTF-8 decode
  return buffer.toString('utf-8');
};

/**
 * Calculate estimated reading time in minutes
 */
export const estimateReadingTime = (text) => {
  const words = text.split(/\s+/).length;
  return Math.ceil(words / 200);
};

/**
 * Sanitize filename for storage
 */
export const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
};
