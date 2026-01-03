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
    temperature: 0, // Keep 0 for maximum deterministic formatting
    top_p: 0.1,
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `
You are a Film Production AI specialized in extracting data from script text.

### CRITICAL INSTRUCTION
The script text contains character details **EMBEDDED inside action paragraphs**.
You must scan the sentences to find the specific character definition pattern.

### PARSING RULES

1. **SCENE HEADERS:**
   - Pattern: "INT./EXT. - LOCATION - TIME" (Allow for spaces like "INT .") INT./EXT. - LOCATION you have to consider this as location and time as a Time.
   - Example: "INT. - AIRPLANE - DAY"

2. **CHARACTER DEFINITIONS (EMBEDDED):**
   - Look for this EXACT pattern inside sentences:
     **NAME (Sex) (Age) (Build) (Wardrobe)**
   
   - **Scanning Logic:**
     - When you see a Capitalized Name followed immediately by a parenthesis, check for the sequence of 4 brackets.
     - **Name Cleaning:** If the name has a possessive (e.g., "APRIL'S"), remove the "'S" (Output: "APRIL").
     - **Bracket Mapping:**
       - (1st) = Sex
       - (2nd) = Age
       - (3rd) = Build (Capture full text, e.g., "big, strong, toxic")
       - (4th) = Wardrobe (Capture full text)

3. **CONTEXTUAL EXTRACTION:**
   - **Props:** Extract items mentioned in UPPERCASE or implied usage (e.g., "PHONE").
   - **Action:** Summarize what happens in the scene.

### OUTPUT FORMAT (VALID JSON ONLY):
Return a JSON object with a "scenes" array. Do not include markdown formatting (like \`\`\`json).

{
  "scenes": [
    {
      "scene_number": ${sceneIndex}, 
      "header_text": "Full header line",
      "int_ext": "INT/EXT",
      "location": "Location Name",
      "time_of_day": "DAY/NIGHT",
      "characters": [
        {
          "name": "NAME",
          "gender": "Sex",
          "age": "Age",
          "build": "Build",
          "wardrobe": "Wardrobe desc",
          "is_speaking": true/false
        }
      ],
      "props": ["item 1", "item 2"],
      "vehicles": [],
      "sfx": [],
      "vfx": [],
      "scene_summary": "Brief factual summary."
    }
  ]
}
        `,
      },
      {
        role: "user",
        content: `
Analyze the following script text. Ensure exact extraction of the "Name (Sex) (Age)..." format.

SCRIPT TEXT:
${text}
        `,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  return cleanAndParseJSON(raw);
}