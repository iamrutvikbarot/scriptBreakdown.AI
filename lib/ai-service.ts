// src/lib/ai-service.ts
import OpenAI from "openai";

/* ------------------------------------------------------------------ */
/* 1. Data Contract (DO NOT CHANGE)                                    */
/* ------------------------------------------------------------------ */

export interface ScriptData {
  scenes: {
    scene_number: number;
    int_ext: "INT" | "EXT" | "";
    scene_location: string;
    prod_location: string;
    time_of_day: string;
    scene_transition: string;
    scene_summary: string;

    props: string[];
    item_quantity: string[];
    wardrobe: string[];
    set_dec: string[];
    vehicles: string[];
    stunts: string[];
    sfx: string[];
    vfx: string[];

    actors: string[];
    non_speaking_roles: string[];

    cast_details: {
      age: string[];
      build: string[];
      ethnicity: string[];
      gender: string[];
    };

    makeup: string[];
    scene_length: string;
    additional_scheduling: string[];
    breakdown_name: string;
  }[];
}

/* ------------------------------------------------------------------ */
/* 2. Safe JSON Extraction Helper                                     */
/* ------------------------------------------------------------------ */

function cleanAndParseJSON(rawText: string): ScriptData {
  try {
    const firstOpen = rawText.indexOf("{");
    const lastClose = rawText.lastIndexOf("}");

    if (firstOpen === -1 || lastClose === -1) {
      throw new Error("No JSON object found in AI response");
    }

    const jsonString = rawText.substring(firstOpen, lastClose + 1);
    return JSON.parse(jsonString) as ScriptData;
  } catch (error) {
    console.error("❌ Failed to parse AI response:");
    console.error(rawText);
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* 3. NVIDIA Script Analysis Function                                  */
/* ------------------------------------------------------------------ */


export async function analyzeScript(text: string, sceneIndex: number = 1): Promise<ScriptData> {
  const client = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY,
  });

  const completion = await client.chat.completions.create({
    model: "meta/llama-3.1-70b-instruct",
    temperature: 0,
    top_p: 0.1,
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `
You are a professional Film Script Breakdown Assistant used in real-world film production.

RULES:
- Analyze ONLY the provided scene text.
- This text is likely a single scene or a fragment.
- START scene numbering at ${sceneIndex} (or use the scene number found in the header if explicit).
- NEVER guess, infer, or invent information
- If data is missing, return empty arrays or empty strings
- Output VALID JSON ONLY
- No explanations, no markdown, no extra text
        `,
      },
      {
        role: "user",
        content: `
Extract a detailed film production breakdown from the scene text below.

BREAKDOWN DEFINITIONS (STRICT):

- Scene: Starts at every INT/EXT or explicit scene heading
- Scene Transition: CUT TO, FADE IN, FADE OUT, DISSOLVE
- Time Of Day: DAY, NIGHT, EVENING, MORNING
- Scene Location: Story location in script
- Prod Location: Physical shoot location if stated
- INT/EXT: Use exactly "INT" or "EXT"
- Actor: Speaking characters only
- Non Speaking Roles: Mentioned characters without dialogue
- Cast Age: Only if explicitly stated
- Cast Build: Only if explicitly stated
- Cast Ethnicity: Only if explicitly stated
- Cast Gender: Only if explicitly stated
- Makeup: Explicit makeup requirements
- Props: Handheld or interacted objects
- Item Quantity: Quantity ONLY if stated
- Wardrobe: Explicit clothing mentions
- Set Dec: Background or set elements
- Vehicle: Any vehicles mentioned
- Stunt: Physical actions requiring coordination
- SFX: Practical sound effects
- VFX: Post-production visual effects
- Scene Length: Duration ONLY if stated
- Scene Summary: One factual sentence only
- Additional Scheduling: Weather, night shoot, kids, animals, crowd
- Breakdown Name: Scene-specific identifier if stated

OUTPUT FORMAT (STRICT JSON):

{
  "scenes": [
    {
      "scene_number": 1,
      "int_ext": "INT",
      "scene_location": "",
      "prod_location": "",
      "time_of_day": "",
      "scene_transition": "",
      "scene_summary": "",

      "props": [],
      "item_quantity": [],
      "wardrobe": [],
      "set_dec": [],
      "vehicles": [],
      "stunts": [],
      "sfx": [],
      "vfx": [],

      "actors": [],
      "non_speaking_roles": [],

      "cast_details": {
        "age": [],
        "build": [],
        "ethnicity": [],
        "gender": []
      },

      "makeup": [],
      "scene_length": "",
      "additional_scheduling": [],
      "breakdown_name": ""
    }
  ]
}

IMPORTANT:
- Absolute accuracy over completeness
- Output JSON ONLY

SCRIPT TEXT:
${text}
        `,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  return cleanAndParseJSON(raw);
}