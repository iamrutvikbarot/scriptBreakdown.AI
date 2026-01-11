import { analyzeScript } from "@/lib/ai-service";
import { extractTextFromGoogleDoc } from "@/lib/google-docs";
import { splitScriptIntoScenes } from "@/lib/script-splitter";
import { NextResponse } from "next/server";

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

    // 2. Split into scenes
    const scenes = splitScriptIntoScenes(scriptText);

    const results = [];

    for (const scene of scenes) {
      const analysis = await analyzeScript(scene, 1, apiKey);
      results.push(analysis);
    }

    return NextResponse.json({
      success: true,
      sceneCount: scenes.length,
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
