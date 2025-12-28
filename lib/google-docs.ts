// src/lib/google-docs.ts
import { google } from 'googleapis';

// Initialize Auth (Assumes you have env vars or a key file)
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

/**
 * Extracts raw text from a Google Doc URL
 */
export async function extractTextFromGoogleDoc(url: string): Promise<string> {
  try {
    // 1. Extract File ID from URL
    // Format: https://docs.google.com/document/d/FILE_ID/edit
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      throw new Error("Invalid Google Doc URL");
    }
    const fileId = match[1];

    // 2. Export the Doc as Plain Text
    const response = await drive.files.export({
      fileId: fileId,
      mimeType: 'text/plain',
    });

    if (!response.data) throw new Error("Empty document");
    
    // response.data is string | GaxiosResponse. We cast to string.
    return String(response.data);

  } catch (error) {
    console.error("Failed to read Google Doc:", error);
    throw new Error("Could not access Google Doc. Check permissions (Share with Service Account email).");
  }
}