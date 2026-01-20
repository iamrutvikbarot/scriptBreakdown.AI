import { analyzeScript } from "@/lib/ai-service";
import { extractTextFromGoogleDoc } from "@/lib/google-docs";
import { NextResponse } from "next/server";

function splitIntoParagraphs(text: string): string[][] {
  const splitted: string[] = text
    .split(/\n\s*\n/) // split on blank lines
    .map((p: string) => p.trim())
    .filter(Boolean);

  const arr: string[][] = [];
  let chunk: string[] = [];

  for (const paragraph of splitted) {
    chunk.push(paragraph);

    if (chunk.length === 5) {
      arr.push(chunk);
      chunk = [];
    }
  }

  if (chunk.length > 0) {
    arr.push(chunk);
  }

  return arr;
}

export async function POST(req: Request) {
  try {
    const { fileUrl, apiKey } = await req.json();

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: "No Google Doc URL provided" },
        { status: 400 },
      );
    }

    if (!fileUrl.includes("docs.google.com")) {
      return NextResponse.json(
        { success: false, error: "Invalid Google Doc URL" },
        { status: 400 },
      );
    }

    let scriptText = "";
    try {
      scriptText = await extractTextFromGoogleDoc(fileUrl);
    } catch (error) {
      console.error("Google Doc Extraction Failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to read Google Doc" },
        { status: 400 },
      );
    }

    if (!scriptText) {
      return NextResponse.json(
        { success: false, error: "No script text found in document" },
        { status: 400 },
      );
    }

    const chunks = splitIntoParagraphs(scriptText);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`,
            ),
          );
        };

        try {
          // Initial message
          sendEvent("start", {
            success: true,
            totalChunks: chunks.length,
            message: "Streaming analysis started...",
          });

          // Stream each analyzeScript response
          for (let i = 0; i < chunks.length; i++) {
            const text = chunks[i].join("\n");

            sendEvent("progress", {
              chunkIndex: i,
              status: "analyzing",
              message: `Analyzing chunk ${i + 1}/${chunks.length}`,
            });

            const analysis = await analyzeScript(text, apiKey);

            sendEvent("chunk", {
              chunkIndex: i,
              analysis,
            });
          }

          // Final message
          sendEvent("done", {
            success: true,
            message: "All chunks analyzed successfully.",
          });

          controller.close();
        } catch (err: any) {
          console.error("Streaming Error:", err);

          sendEvent("error", {
            success: false,
            message: err?.message || "AI Failed",
          });

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "AI Failed" },
      { status: 500 },
    );
  }
}
