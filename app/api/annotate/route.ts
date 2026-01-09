import { highlightEntities } from "@/lib/google-docs";
import { NextResponse } from "next/server";

function transformScene(
  data: Array<{ text: string; category: string }>,
  sceneNumber: number
) {
  const actors: string[] = [];
  const props: string[] = [];
  const wardrobe: string[] = [];
  const vehicles: string[] = [];
  const vfx: string[] = [];
  const sfx: string[] = [];
  const setDec: string[] = [];
  const additionalScheduling: string[] = [];
  const nonSpeakingRoles: string[] = [];

  const castDetails = {
    age: [] as string[],
    gender: [] as string[],
    build: [] as string[],
    ethnicity: [] as string[],
  };

  let intExt: "" | "INT" | "EXT" = "";
  let sceneLocation = "";
  let timeOfDay = "";
  let sceneTransition = "";

  data.forEach(({ text, category }) => {
    switch (category) {
      case "ACTOR":
        actors.push(text);
        break;
      case "PROP":
        props.push(text);
        break;
      case "WARDROBE":
        wardrobe.push(text);
        break;
      case "VEHICLE":
        vehicles.push(text);
        break;
      case "VFX":
        vfx.push(text);
        break;
      case "SFX":
        sfx.push(text);
        break;
      case "SET_DEC":
        setDec.push(text);
        break;
      case "INT_EXT":
        intExt = text as "INT" | "EXT";
        break;
      case "LOCATION":
        sceneLocation = text;
        break;
      case "TIME":
        timeOfDay = text;
        break;
      case "TRANSITION":
        sceneTransition = text;
        break;
      case "AGE":
        castDetails.age.push(text);
        break;
      case "GENDER":
        castDetails.gender.push(text);
        break;
      case "NON_SPEAKING":
        nonSpeakingRoles.push(text);
        break;
      case "NOTE":
        additionalScheduling.push(text);
        break;
    }
  });

  return {
    scene_number: sceneNumber,
    int_ext: intExt,
    scene_location: sceneLocation,
    prod_location: "",
    time_of_day: timeOfDay,
    scene_transition: sceneTransition,
    scene_summary: "",
    props,
    item_quantity: [],
    actors,
    non_speaking_roles: nonSpeakingRoles,
    wardrobe,
    set_dec: setDec,
    vehicles,
    stunts: [],
    sfx,
    vfx,
    makeup: [],
    additional_scheduling: additionalScheduling,
    cast_details: castDetails,
    breakdown_name: "",
    scene_length: "",
  };
}

export async function POST(req: Request) {
  try {
    const { docId, scriptData } = await req.json();

    const scenes = scriptData.map((sceneTokens: any, index: number) =>
      transformScene(sceneTokens, index + 1)
    );

    const scriptDatas = { scenes };

    if (!docId || !scriptDatas) {
      return NextResponse.json(
        { error: "Missing docId or scriptData" },
        { status: 400 }
      );
    }

    console.log("Line 123>>>script final data to be annotate", scriptDatas);

    await highlightEntities(docId, scriptDatas);

    return NextResponse.json({ success: true, message: "Annotation complete" });
  } catch (error) {
    console.error("Annotation API Error:", error);
    return NextResponse.json(
      { error: "Failed to annotate document", details: error },
      { status: 500 }
    );
  }
}
