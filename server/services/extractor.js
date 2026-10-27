const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extracts plain text from uploaded file buffer based on mimetype and extension
 */
async function extractTextFromFile(buffer, originalname, mimetype) {
  if (!buffer || !buffer.length) {
    throw new Error('Empty file buffer received');
  }

  const ext = (originalname.split('.').pop() || '').toLowerCase();

  // 1. Plain text / Markdown
  if (mimetype.includes('text') || ext === 'txt' || ext === 'md') {
    return buffer.toString('utf8');
  }

  // 2. Word documents (.docx)
  if (ext === 'docx' || mimetype.includes('wordprocessingml')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // 3. PDF documents (.pdf)
  if (ext === 'pdf' || mimetype.includes('pdf')) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  throw new Error(`Unsupported file type: .${ext}. Please upload a .txt, .docx, or .pdf file.`);
}

module.exports = {
  extractTextFromFile
};
