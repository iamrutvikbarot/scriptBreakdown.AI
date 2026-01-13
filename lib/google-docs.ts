// src/lib/google-docs.ts
import { google, docs_v1 } from "googleapis";

/* ------------------------------------------------------------------ */
/* Auth Setup                                                          */
/* ------------------------------------------------------------------ */

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.googleClientEmail as string,
    private_key: process.env.googlePrivateKey?.replace(/\\n/g, "\n"),
  },
  scopes: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents",
  ],
});

const drive = google.drive({ version: "v3", auth });
const docs = google.docs({ version: "v1", auth });

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

interface TextSegment {
  val: string;
  startIndex: number;
  endIndex: number;
}

export interface HighlightItem {
  text: string;
  bgColor: string;
}

/* ------------------------------------------------------------------ */
/* Helper: Hex → Google RGB Color                                      */
/* ------------------------------------------------------------------ */

function hexToRgbColor(hex: string): RgbColor {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  return { red: r, green: g, blue: b };
}

/* ------------------------------------------------------------------ */
/* Highlight Entities in Google Doc                                    */
/* ------------------------------------------------------------------ */

export async function highlightEntities(
  docId: string,
  items: HighlightItem[]
): Promise<void> {
  try {
    const doc = await docs.documents.get({ documentId: docId });
    const content = doc.data.body?.content ?? [];

    const textSegments: TextSegment[] = [];

    content.forEach((element) => {
      if (element.paragraph) {
        element.paragraph.elements?.forEach((el) => {
          if (el.textRun?.content) {
            textSegments.push({
              val: el.textRun.content,
              startIndex: el.startIndex ?? 0,
              endIndex: el.endIndex ?? 0,
            });
          }
        });
      }
    });

    const requests: docs_v1.Schema$Request[] = [];

    const addHighlight = (text: string, bgColor: string): void => {
      if (!text || text.length < 2 || !bgColor) return;

      const target = text.trim();

      textSegments.forEach((seg) => {
        let cursor = 0;

        while (true) {
          const index = seg.val.indexOf(target, cursor);
          if (index === -1) break;

          const absStart = seg.startIndex + index;
          const absEnd = absStart + target.length;

          requests.push({
            updateTextStyle: {
              range: {
                startIndex: absStart,
                endIndex: absEnd,
              },
              textStyle: {
                backgroundColor: {
                  color: {
                    rgbColor: hexToRgbColor(bgColor),
                  },
                },
              },
              fields: "backgroundColor",
            },
          });

          cursor = index + 1;
        }
      });
    };

    /* -------------------------------------------------------------- */
    /* Apply Highlights                                                */
    /* -------------------------------------------------------------- */

    items.forEach(({ text, bgColor }) => {
      addHighlight(text, bgColor);
    });

    if (requests.length > 0) {
      console.log(`Sending ${requests.length} highlight requests...`);

      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: { requests },
      });
    }
  } catch (error) {
    console.error("Failed to highlight document:", error);
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Extract Raw Text from Google Doc                                    */
/* ------------------------------------------------------------------ */

export async function extractTextFromGoogleDoc(url: string): Promise<string> {
  try {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match?.[1]) {
      throw new Error("Invalid Google Doc URL");
    }

    const fileId = match[1];

    const response = await drive.files.export({
      fileId,
      mimeType: "text/plain",
    });

    if (!response.data) {
      throw new Error("Empty document");
    }

    return String(response.data);
  } catch (error) {
    console.error("Failed to read Google Doc:", error);
    throw new Error(
      "Could not access Google Doc. Check permissions (share with service account)."
    );
  }
}
