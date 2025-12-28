
import { highlightEntities } from '@/lib/google-docs';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { docId, scriptData } = await req.json();

        if (!docId || !scriptData) {
            return NextResponse.json({ error: "Missing docId or scriptData" }, { status: 400 });
        }

        await highlightEntities(docId, scriptData);

        return NextResponse.json({ success: true, message: "Annotation complete" });
    } catch (error) {
        console.error("Annotation API Error:", error);
        return NextResponse.json({ error: "Failed to annotate document", details: error }, { status: 500 });
    }
}
