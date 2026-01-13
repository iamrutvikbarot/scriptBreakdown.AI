import { analyzeScript } from "@/lib/ai-service";
import { extractTextFromGoogleDoc } from "@/lib/google-docs";
import { splitScriptIntoScenes } from "@/lib/script-splitter";
import { NextResponse } from "next/server";

function splitIntoParagraphs(text: string): string[][] {
  const splitted: string[] = text
    .split(/\n\s*\n/) // split on blank lines
    .map((p: string) => p.trim())
    .filter(Boolean); // remove empty paragraphs

  const arr: string[][] = [];
  let chunk: string[] = [];

  for (const paragraph of splitted) {
    chunk.push(paragraph);

    if (chunk.length === 10) {
      arr.push(chunk);
      chunk = [];
    }
  }

  // push remaining paragraphs
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
        { status: 400 }
      );
    }

    if (!fileUrl.includes("docs.google.com")) {
      return NextResponse.json(
        { success: false, error: "Invalid Google Doc URL" },
        { status: 400 }
      );
    }

    let scriptText = "";
    try {
      scriptText = await extractTextFromGoogleDoc(fileUrl);
    } catch (error) {
      console.error("Google Doc Extraction Failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to read Google Doc" },
        { status: 400 }
      );
    }

    if (!scriptText) {
      return NextResponse.json(
        { success: false, error: "No script text found in document" },
        { status: 400 }
      );
    }

    const result = splitIntoParagraphs(scriptText);

    const results = [];

    for (const chunk in result) {
      let text = result[chunk].join("\n");
      const analysis = await analyzeScript(text, apiKey);
      results.push(analysis);
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "AI Failed" },
      { status: 500 }
    );
  }
}
