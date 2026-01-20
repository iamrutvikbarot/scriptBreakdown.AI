// src/lib/ai-service.ts
import { GoogleGenAI } from "@google/genai";

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
/* 3. Main Script Analysis Function                                   */
/* ------------------------------------------------------------------ */

async function generateWithRetry(
  ai: any,
  payload: any,
  retries = 5,
  delay = 1000
) {
  try {
    return await ai.models.generateContent(payload);
  } catch (error: any) {
    const status = error?.error?.code || error?.status;

    if (status === 503 && retries > 0) {
      console.warn(
        `Gemini overloaded. Retrying in ${delay}ms... (${retries} left)`
      );
      await new Promise((res) => setTimeout(res, delay));
      return generateWithRetry(ai, payload, retries - 1, delay * 2);
    }

    throw error;
  }
}

export function parseLLMJson(data: string) {
  if (data === "") {
    throw new Error("AI response not available.");
  }

  // Remove ```json and ``` wrappers
  const raw = data
    .replace(/```json\s*/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse JSON:", raw);
    throw err;
  }
}

export async function analyzeScript(
  text: string,
  apiKey?: string
): Promise<ScriptData> {
  const ai = new GoogleGenAI({
    apiKey: apiKey || process.env.GEMINI_API_KEY!,
  });

  const prompt = `Return ONLY a valid JSON array.
                  Each item must contain:
                  - text
                  - category

                  Allowed categories ONLY:
                  SCENE_HEADER, TRANSITION, TIME, LOCATION, PROD_LOC,
                  ACTOR, NON_SPEAKING, AGE, BUILD, ETHNICITY, GENDER,
                  MAKEUP, PROP, QUANTITY, WARDROBE, SFX, VFX, SET_DEC,
                  STUNT, VEHICLE, NOTE, ID, INT_EXT

                  RULES:
                  Scene starts with "Ex: Format Check | Test by Color and RB" where "Test by Color and RB" should always considered as SCENE_HEADER. 

                  1. Any full scene line like:
                    "EXT. - STREET - DAY",
                    "INT. - HOSPITAL ROOM - NIGHT",
                    "CUT TO - SCENE 1 - YEARS EARLIER"
                    MUST be returned as SCENE_HEADER (entire line).

                  2. Also extract scene parts separately:
                    INT./EXT. → INT_EXT
                    Location → LOCATION
                    Time → TIME
                    Scene numbers → ID

                  3. Script starts with "Note:" then the whole paragraph should considered as "NOTE" category

                  4. If text appears inside parentheses "( )",
                    return the text WITH brackets and categorize correctly.

                  5. Character names in CAPS → ACTOR.
                    Unnamed groups (e.g. GIRLS 1-2) → NON_SPEAKING.

                  6. Camera directions → VFX.
                    Transitions → TRANSITION.
                    Sounds → SFX.

                  7. Objects → PROP.
                    Vehicles → VEHICLE.
                    Furniture/room items → SET_DEC.

                  8. Preserve order. Do not invent or omit items.
                  Note: Do not get single character or symbols (Ex: ".", "..." etc.)
                  always get whole word. Ex: "Hello", "Girl" etc.

                  Script:
                  ${text}
                  `;

  const completion = await generateWithRetry(ai, {
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const raw = completion.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  return parseLLMJson(raw);
}
