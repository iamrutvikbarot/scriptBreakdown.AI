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
  delay = 1000,
) {
  try {
    return await ai.models.generateContent(payload);
  } catch (error: any) {
    const status = error?.error?.code || error?.status;

    if (status === 503 && retries > 0) {
      console.warn(
        `Gemini overloaded. Retrying in ${delay}ms... (${retries} left)`,
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
  apiKey?: string,
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

                    Scene starts with "Ex: Format Check | Test by Color and RB"
                    → Only "Test by Color and RB" must always be categorized as ID not "Format Check".

                    1. The word Scene-<number> (e.g. Scene-1, Scene-2, etc) should be considered as SCENE_HEADER 

                    2. Also extract the components:
                      - Location → LOCATION
                      - Time → TIME
                    
                    3. If Line starts with INT/EXT and ends with DAY/NIGHT/AFTERNOON etc so everything from INT/EXT to whole sentence exculede DAY/NIGHT/AFTERNOON should be "LOCATION".
                      (e.g. "INT. - PARKING LOT - WITH LIZ AND MAXINE - DAY" where "LOCATION" should be "INT. - PARKING LOT - WITH LIZ AND MAXINE")

                    3. Actor handling (VERY IMPORTANT):
                      - Character names → ACTOR.
                      - Unnamed groups (e.g. GIRLS 1–2) → NON_SPEAKING.

                    4. If text appears inside parentheses "( )":
                      - Return the text WITH brackets.
                      - Categorize correctly (AGE, GENDER, ETHNICITY, WARDROBE, PROP, NOTE, etc.).
                      - Do NOT repeat parenthetical attributes if the ACTOR is not re-listed.

                    5. Script starts with "Note:":
                      - The entire paragraph must be categorized as NOTE.

                    6. VFX must ONLY include real visual effects:
                      explosions, CGI, fire, smoke, green screen, slow motion, special graphics, etc.

                      Normal character actions or movements must NOT be categorized as VFX.

                      Example:
                      - "John walks into the room" → do NOT extract.
                      - "Explosion destroys the car" → VFX.

                      Transitions (CONTINUOUS, LATER THAT DAY, MOMENTS LATER) → TRANSITION.
                      The Words before SCENE-<number> like (e.g. FADE IN, CUT TO, FLASH TO) should not be considered as TRANSITION
                      Sounds (SLAPS, bangs, crashes) → SFX.

                    7. Objects → PROP.
                      Vehicles → VEHICLE.
                      Furniture / room items → SET_DEC.
                    
                    8. The single word (lowercase in the brackets only) in the script which require makeover should be considered as MAKEUP
                      [e.g. (begger), (homeless), etc] lowercase only

                    9. Preserve original order exactly.
                      Do NOT invent or omit items.

                    10. Do NOT extract single characters or symbols.
                      Always extract complete words or phrases only.

                    11. Do NOT extract normal narrative action lines.
                      Extract only items that clearly match allowed categories.

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
