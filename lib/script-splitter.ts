/**
 * Splits a raw screenplay text into:
 * 1) Heading/Preamble (everything before first SCENE line) as one chunk
 * 2) Each scene chunk starting from the SCENE line
 */
export function splitScriptIntoScenes(fullText: string): string[] {
  const text = fullText.trim();

  // Matches any full line that contains "SCENE <number>"
  const sceneMarkerRegex = /^\s*.*\bSCENE\s+\d+\b.*$/gim;

  const matches = [...text.matchAll(sceneMarkerRegex)];

  if (matches.length === 0) {
    // fallback: no SCENE markers found, return whole script
    return [text].filter(Boolean);
  }

  const scenes: string[] = [];

  // ✅ Add preamble/heading part (before SCENE 1)
  const firstSceneStartIndex = matches[0].index!;
  const preamble = text.slice(0, firstSceneStartIndex).trim();

  if (preamble) {
    scenes.push(preamble);
  }

  // ✅ Add all scenes (each including its SCENE marker line)
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const nextMatch = matches[i + 1];

    const start = currentMatch.index!;
    const end = nextMatch ? nextMatch.index! : text.length;

    const sceneContent = text.slice(start, end).trim();

    if (sceneContent) {
      scenes.push(sceneContent);
    }
  }

  return scenes;
}
