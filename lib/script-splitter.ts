/**
 * Splits a raw screenplay text into individual scenes.
 * It looks for standard scene headings like INT. EXT. I/E.
 */
export function splitScriptIntoScenes(fullText: string): string[] {
    // Regex to find scene headers. 
    // Matches start of line (or file), optional whitespace, then INT/EXT keywords, 
    // followed by typical location/time info.
    // We utilize a lookahead or just standard split.

    // A robust regex for modern screenplays (allows optional dot)
    const sceneHeaderRegex = /^\s*((?:INT|EXT|I\/E|INT\/EXT)[.\s]\s*.+?)$/gm;

    // We can't just use split because we want to keep the headers attached to the content.
    // So we will match all headers, find their indices, and slice.

    const matches = [...fullText.matchAll(sceneHeaderRegex)];

    if (matches.length === 0) {
        // Fallback: If no scene headers found, return the whole text as one chunk
        return [fullText];
    }

    const scenes: string[] = [];

    for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const nextMatch = matches[i + 1];

        const start = currentMatch.index!;
        const end = nextMatch ? nextMatch.index! : fullText.length;

        const sceneContent = fullText.slice(start, end).trim();
        if (sceneContent) {
            scenes.push(sceneContent);
        }
    }

    // Handle preamble (text before first scene)? 
    // Usually we can discard or attach to first scene. 
    // For now, let's ignore text before the first INT/EXT if it's just title page stuff,
    // but if it's significant, we might lose it. 
    // Let's assume the user pastes starting from a scene or we just start from first header.

    return scenes;
}
