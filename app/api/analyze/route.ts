import { analyzeScript } from '@/lib/ai-service';
import { extractTextFromGoogleDoc } from '@/lib/google-docs';
import { splitScriptIntoScenes } from '@/lib/script-splitter';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, fileUrl } = await req.json();

    let scriptText = text;

    // 1. Handle Google Doc URL
    if (fileUrl) {
      if (!fileUrl.includes('docs.google.com')) {
        return NextResponse.json({ success: false, error: "Invalid Google Doc URL" }, { status: 400 });
      }
      try {
        scriptText = await extractTextFromGoogleDoc(fileUrl);
      } catch (error) {
        console.error("Google Doc Extraction Failed:", error);
        return NextResponse.json({ success: false, error: "Failed to read Google Doc" }, { status: 400 });
      }
    }

    if (!scriptText) {
      return NextResponse.json({ success: false, error: "No script text provided" }, { status: 400 });
    }

    // 2. Split into scenes
    const scenes = splitScriptIntoScenes(scriptText);
    console.log(`Split script into ${scenes.length} scenes.`);

    // 3. Create a ReadableStream
    const encoder = new TextEncoder();

    // Create a TransformStream to handle the streaming response
    const customStream = new ReadableStream({
      async start(controller) {

        // Notify client about total estimated scenes (optional, but good for progress)
        // controller.enqueue(encoder.encode(JSON.stringify({ type: 'meta', total: scenes.length }) + '\n'));

        // Process scenes sequentially
        for (let i = 0; i < scenes.length; i++) {
          const sceneContent = scenes[i];
          try {
            // Analyze single scene
            // We pass i+1 as the starting index for this chunk
            const result = await analyzeScript(sceneContent, i + 1);

            // Check if result has scenes (it should)
            if (result.scenes && result.scenes.length > 0) {
              // Usually it returns 1 scene, but just in case it split internally:
              for (const scene of result.scenes) {
                // Send each scene object as a separate JSON line
                controller.enqueue(encoder.encode(JSON.stringify(scene) + '\n'));
              }
            }
          } catch (err) {
            console.error(`Error analyzing scene ${i + 1}:`, err);
            // Optionally send an error chunk?
          }
        }

        controller.close();
      }
    });

    // 4. Return the stream
    return new NextResponse(customStream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "AI Failed" }, { status: 500 });
  }
}