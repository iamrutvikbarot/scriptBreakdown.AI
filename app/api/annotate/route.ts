import { highlightEntities } from "@/lib/google-docs";
import { NextResponse } from "next/server";

const CATEGORY_COLORS = {
  SCENE_HEADER: "#fff2cc",
  TRANSITION: "#9900ff",
  TIME: "#f4cccc",
  LOCATION: "#c9daf8",
  PROD_LOC: "#d59f69",
  ACTOR: "#00ff00",
  NON_SPEAKING: "#b6d7a8",
  AGE: "#fce5cd",
  BUILD: "#d0e0e3",
  ETHNICITY: "#980000",
  GENDER: "#e6b8af",
  MAKEUP: "#ff00ff",
  PROP: "#ffff00",
  QUANTITY: "#0000ff",
  WARDROBE: "#ead1dc",
  SFX: "#cfe2f3",
  VFX: "#00ffff",
  SET_DEC: "#d9d2e9",
  STUNT: "#ff9900",
  VEHICLE: "#4a86e8",
  NOTE: "#ff0000",
  ID: "#ea9999",
  INT_EXT: "#b4a7d6",
};

export async function POST(req: Request) {
  try {
    const { docId, scriptData } = await req.json();

    const scenes = scriptData?.flat(Infinity);

    console.log("Line 36...", scenes);

    if (!docId || !scenes) {
      return NextResponse.json(
        { error: "Missing docId or scriptData" },
        { status: 400 },
      );
    }

    const fullItems = scenes.map((item: any) => ({
      text: item.text,
      category: item.category,
      bgColor: CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS],
    }));

    await highlightEntities(docId, fullItems);

    return NextResponse.json({ success: true, message: "Annotation complete" });
  } catch (error) {
    console.error("Annotation API Error:", error);
    return NextResponse.json(
      { error: "Failed to annotate document", details: error },
      { status: 500 },
    );
  }
}
