"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "./components/ToastProvider";

interface Annotation {
  text: string;
  category: string;
}

interface Annotation {
  text: string;
  category: string;
}

interface ScriptData {
  success: boolean;
  sceneCount: number;
  results: Annotation[][];
}

type SSEStart = {
  success: boolean;
  totalChunks: number;
  message?: string;
};

type SSEProgress = {
  chunkIndex: number;
  status?: string;
  message?: string;
};

type SSEChunk = {
  chunkIndex: number;
  analysis: Annotation[];
};

type SSEDone = {
  success: boolean;
  message?: string;
};

type SSEError = {
  success: boolean;
  message: string;
};

interface ProcessedScene {
  scene_number: number;
  int_ext: string;
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
}

interface ScriptData {
  success: boolean;
  sceneCount: number;
  results: Annotation[][];
}

const README_CONTENT = `# SCRIPTBREAKDOWN.AI - User Guide & Integration Guide

Welcome to **ScriptBreakdown.AI**, the professional-grade tool for transforming your raw screenplays into structured, production-ready data.

## 🚀 How to Use the Service

### 1. Prepare your Google Doc
Our service integrates directly with Google Docs for automated analysis and annotation. 
- **Share Permission**: You must share your Google Doc with our service account email:
  \`breakdown-ai@brack-down-ai.iam.gserviceaccount.com\`
- **Access Level**: Set the permission to **Editor**. This allows the AI to highlight entities directly in your script.

### 2. Character Definition Pattern (IMPORTANT)
For the most accurate cast extraction, our AI uses an embedded pattern detection. In your action paragraphs, introduce characters using the following format:
\`NAME (Sex) (Age) (Build) (Wardrobe)\`

**Example:**
> *INT. - AIRPLANE - DAY*
> 
> **APRIL (F) (30s) (Kind and smart) (Nice clothes)** sits next to **PAUL (M) (30s) (Big, strong, toxic) (Casual clothes)**. PAUL is aggressive and takes up space.

### 3. Run the Breakdown
- Copy your Google Doc URL.
- Paste it into the input field on the **ScriptBreakdown.AI** home page.
- Click **"BREAK IT DOWN"**.
- Watch the progress bar as the AI processes each scene in real-time.

### 4. Review Results
- **In-App**: View the structured breakdown including summaries, cast details, props, vehicles, and effects (SFX/VFX).
- **In-Doc**: Return to your Google Doc to see automated color-coded highlights of all extracted entities.

---

## 🎨 Color Coding Legend
The service automatically highlights your script using the following color scheme:

| Category | Color | Description |
| :--- | :--- | :--- |
| **Scene Header** | Cream (#fff2cc) | INT/EXT and Scene Numbers |
| **Location** | Light Blue (#c9daf8) | Script Story Locations |
| **Cast/Actors** | Bright Green (#00ff00) | Speaking Characters |
| **Non-Speaking** | Soft Green (#b6d7a8) | Background/Atmosphere characters |
| **Props** | Yellow (#ffff00) | Handheld or interacted objects |
| **Wardrobe** | Pink (#ead1dc) | Clothing and accessories |
| **Vehicles** | Blue (#4a86e8) | Cars, planes, boats, etc. |
| **SFX** | Light Cyan (#cfe2f3) | Practical sound effects |
| **VFX** | Cyan (#00ffff) | Visual effects requirements |

---

## 📧 Email Template for Users

**Subject: Unleash the Power of Your Script with ScriptBreakdown.AI!**

Hi [User Name],

We're excited to have you on board with ScriptBreakdown.AI! Transforming your screenplay into a production-ready breakdown has never been easier.

To get started, follow these simple steps:

1. **Grant Access**: Share your Google Doc with \`breakdown-ai@brack-down-ai.iam.gserviceaccount.com\` as an **Editor**.
2. **Format Characters**: Use our smart pattern \`NAME (Sex) (Age) (Build) (Wardrobe)\` when introducing characters in your script for perfect extraction.
3. **Analyze**: Paste your URL at [Your-App-URL] and click "Break It Down".

In seconds, you'll have a full scene-by-scene breakdown and a beautifully annotated Google Doc waiting for you.

Happy producing!

Best regards,
The ScriptBreakdown.AI Team`;

export default function Home() {
  const { showToast } = useToast();
  const [result, setResult] = useState<ScriptData | null>(null);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [provider, setProvider] = useState("nvidia");

  const [docUrl, setDocUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Progress State
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Load API Key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  const triggerAutoAnnotation = async (docId: string, data: any) => {
    console.log("Line 183 annotation data", data);

    try {
      console.log("Triggering auto-annotation for doc:", docId);
      const res = await fetch("/api/annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, scriptData: data }),
      });
      if (res.ok) {
        console.log("Auto-annotation successful");
        showToast("Auto-annotation successful!", "success");
      } else {
        console.error("Auto-annotation failed");
        showToast("Auto-annotation failed.", "error");
      }
    } catch (err) {
      console.error("Auto-annotation error", err);
    }
  };

  const handleAnalyze = async () => {
    if (!docUrl) return;

    setLoading(true);
    setResult(null);
    setProgress({ current: 0, total: 0 });

    const payload = {
      provider: "nvidia",
      stream: true,
      fileUrl: docUrl,
      apiKey: apiKey || undefined,
    };

    const finalResults: Annotation[][] = [];

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(res.statusText + " " + (await res.text()));
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE event blocks separated by "\n\n"
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          const lines = block.split("\n").filter(Boolean);

          let eventName = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              dataStr += line.replace("data:", "").trim();
            }
          }

          if (!eventName || !dataStr) continue;

          let parsedData: unknown;
          try {
            parsedData = JSON.parse(dataStr);
          } catch (err) {
            console.error("❌ SSE JSON parse error:", err, dataStr);
            continue;
          }

          // START
          if (eventName === "start") {
            const startData = parsedData as SSEStart;

            setProgress({
              current: 0,
              total: startData.totalChunks || 0,
            });

            // Optional: show empty structure immediately
            setResult({
              success: true,
              sceneCount: 0,
              results: [],
            });
          }

          // PROGRESS (optional - only show "processing", don't mark completed)
          if (eventName === "progress") {
            const progressData = parsedData as SSEProgress;

            // Don't update current here, because chunk isn't completed yet
            // You can optionally store "processingIndex" if you want
            console.log("Processing chunk:", progressData.chunkIndex + 1);
          }

          // CHUNK (this means COMPLETED)
          if (eventName === "chunk") {
            const chunkData = parsedData as SSEChunk;

            finalResults[chunkData.chunkIndex] = chunkData.analysis;

            const completedChunks = finalResults.filter(Boolean).length;

            const sceneCount = finalResults.reduce(
              (acc, chunk) => acc + (chunk?.length || 0),
              0,
            );

            const liveData: ScriptData = {
              success: true,
              sceneCount,
              results: [...finalResults],
            };

            setResult(liveData);

            // THIS IS THE IMPORTANT PART
            // progress.current means COMPLETED chunks
            setProgress((prev) => ({
              ...prev,
              current: completedChunks,
            }));
          }

          // DONE
          if (eventName === "done") {
            const doneData = parsedData as SSEDone;

            const sceneCount = finalResults.reduce(
              (acc, chunk) => acc + (chunk?.length || 0),
              0,
            );

            const finalData: ScriptData = {
              success: true,
              sceneCount,
              results: finalResults,
            };

            setResult(finalData);

            // Trigger auto annotation AFTER streaming is complete
            if (docUrl) {
              const docIdMatch = docUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
              if (docIdMatch?.[1]) {
                triggerAutoAnnotation(docIdMatch[1], finalData.results);
              } else {
                console.warn(
                  "Could not extract docId from URL for auto-annotation.",
                );
              }
            }

            console.log("Stream completed:", doneData.message || "done");
          }

          // ❌ ERROR
          if (eventName === "error") {
            const errData = parsedData as SSEError;
            throw new Error(errData.message || "Streaming failed");
          }
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      showToast("Error processing script: " + message, "error");
    } finally {
      setLoading(false);
    }
  };

  const transformResults = (results: Annotation[][]): ProcessedScene[] => {
    return results.map((sceneTokens, index) => {
      const scene: ProcessedScene = {
        scene_number: index + 1,
        int_ext: "",
        scene_location: "",
        prod_location: "",
        time_of_day: "",
        scene_transition: "",
        scene_summary: "",
        props: [],
        item_quantity: [],
        wardrobe: [],
        set_dec: [],
        vehicles: [],
        stunts: [],
        sfx: [],
        vfx: [],
        actors: [],
        non_speaking_roles: [],
        cast_details: {
          age: [],
          build: [],
          ethnicity: [],
          gender: [],
        },
        makeup: [],
        additional_scheduling: [],
        breakdown_name: "",
        scene_length: "",
      };

      sceneTokens.forEach(({ text, category }) => {
        switch (category) {
          case "INT_EXT":
            scene.int_ext = text;
            break;
          case "LOCATION":
            scene.scene_location = text;
            break;
          case "TIME":
            scene.time_of_day = text;
            break;
          case "TRANSITION":
            scene.scene_transition = text;
            break;
          case "PROD_LOC":
            scene.prod_location = text;
            break;
          case "ACTOR":
            if (!scene.actors.includes(text)) scene.actors.push(text);
            break;
          case "NON_SPEAKING":
            if (!scene.non_speaking_roles.includes(text))
              scene.non_speaking_roles.push(text);
            break;
          case "PROP":
            if (!scene.props.includes(text)) scene.props.push(text);
            break;
          case "QUANTITY":
            scene.item_quantity.push(text);
            break;
          case "WARDROBE":
            if (!scene.wardrobe.includes(text)) scene.wardrobe.push(text);
            break;
          case "SET_DEC":
            if (!scene.set_dec.includes(text)) scene.set_dec.push(text);
            break;
          case "VEHICLE":
            if (!scene.vehicles.includes(text)) scene.vehicles.push(text);
            break;
          case "STUNT":
            if (!scene.stunts.includes(text)) scene.stunts.push(text);
            break;
          case "SFX":
            if (!scene.sfx.includes(text)) scene.sfx.push(text);
            break;
          case "VFX":
            if (!scene.vfx.includes(text)) scene.vfx.push(text);
            break;
          case "AGE":
            if (!scene.cast_details.age.includes(text))
              scene.cast_details.age.push(text);
            break;
          case "GENDER":
            if (!scene.cast_details.gender.includes(text))
              scene.cast_details.gender.push(text);
            break;
          case "BUILD":
            if (!scene.cast_details.build.includes(text))
              scene.cast_details.build.push(text);
            break;
          case "ETHNICITY":
            if (!scene.cast_details.ethnicity.includes(text))
              scene.cast_details.ethnicity.push(text);
            break;
          case "MAKEUP":
            if (!scene.makeup.includes(text)) scene.makeup.push(text);
            break;
          case "NOTE":
            scene.additional_scheduling.push(text);
            break;
          case "ID":
            scene.breakdown_name = text;
            break;
          case "SCENE_HEADER":
            if (!scene.scene_location) scene.scene_location = text;
            break;
        }
      });

      return scene;
    });
  };

  const progressPercentage =
    progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  const processedScenes = result ? transformResults(result.results) : [];

  return (
    <main className="min-h-screen text-gray-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-100 overflow-x-hidden flex flex-col">
      {/* Decorative Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[20%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-emerald-900/10 rounded-full blur-[80px] md:blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-blue-900/10 rounded-full blur-[80px] md:blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-20 flex-grow w-full">
        {/* Navigation Links - Top Right */}
        <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all group shadow-xl text-xs font-bold tracking-wider cursor-pointer"
          >
            <span className="text-gray-400 group-hover:text-emerald-400">
              USER GUIDE
            </span>
            <svg
              className="w-4 h-4 text-gray-500 group-hover:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
          </button>

          <a
            href="https://github.com/iamrutvikbarot/scriptBreakdown.AI"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-panel p-2.5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all group shadow-xl"
            title="View on GitHub"
          >
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </div>

        {/* Header Section */}
        <header className="mb-10 md:mb-16 text-center space-y-4 md:space-y-6 relative">
          <div className="inline-block relative">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-emerald-600 animate-text-gradient pb-2 relative z-10 break-words">
              SCRIPT<span className="text-white">BREAKDOWN</span>.AI
            </h1>
            <div className="absolute inset-0 bg-emerald-500/20 blur-[40px] md:blur-[60px] -z-10 opacity-50"></div>
          </div>
          <p className="text-gray-400 text-sm sm:text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto px-4">
            Professional AI-powered breakdown for film production.{" "}
            <br className="hidden md:block" />
            <span className="text-gray-500 block mt-1">
              Transform your screenplay into actionable data in seconds.
            </span>
          </p>
        </header>

        {/* Input Control Center */}
        <div className="max-w-4xl mx-auto mb-12 md:mb-20">
          {/* Main Input Panel */}
          <div className="glass-panel rounded-2xl md:rounded-3xl p-2 md:p-3 shadow-2xl shadow-black/50 mx-2 md:mx-0">
            <div className="bg-black/40 rounded-xl md:rounded-2xl p-4 md:p-8 space-y-4 md:space-y-6 border border-white/5">
              <div className="h-48 md:h-64 flex flex-col justify-center items-center gap-4 md:gap-6">
                <div className="w-full max-w-lg space-y-3 px-2">
                  <label className="text-xs md:text-sm font-bold text-gray-400 ml-1 uppercase tracking-wider">
                    Google Doc URL
                  </label>
                  <input
                    type="url"
                    className="glass-input w-full text-gray-200 p-3 md:p-4 rounded-xl focus:outline-none font-mono text-sm placeholder-gray-600"
                    placeholder="https://docs.google.com/document/d/..."
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                  />
                  <div className="flex flex-col gap-2 mt-2 ml-1">
                    <p className="text-[10px] md:text-xs text-gray-500 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
                      Must be shared with Service Account (Editor Mode):
                    </p>
                    <div
                      className="glass-panel px-3 py-2 rounded-lg flex items-center justify-between group cursor-pointer bg-black/20 hover:bg-black/40 transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          "breakdown-ai@brack-down-ai.iam.gserviceaccount.com",
                        );
                        showToast("Email copied to clipboard!", "success");
                      }}
                      title="Click to copy"
                    >
                      <code className="text-xs text-emerald-400 font-mono break-all">
                        breakdown-ai@brack-down-ai.iam.gserviceaccount.com
                      </code>
                      <svg
                        className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors ml-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        ></path>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-lg space-y-3 px-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs md:text-sm font-bold text-gray-400 ml-1 uppercase tracking-wider">
                      Gemini API Key (Optional)
                    </label>
                    <span className="text-[10px] text-gray-600 font-mono uppercase">
                      Stored Locally
                    </span>
                  </div>
                  <input
                    type="password"
                    className="glass-input w-full text-gray-200 p-3 md:p-4 rounded-xl focus:outline-none font-mono text-sm placeholder-gray-600"
                    placeholder="Enter your Gemini API Key..."
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      localStorage.setItem("gemini_api_key", e.target.value);
                    }}
                  />
                  <p className="text-[10px] text-gray-500 ml-1">
                    If provided, this key will be used instead of the default
                    server key.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-white/5 gap-4">
                <div className="text-[10px] md:text-xs text-gray-600 font-mono order-2 md:order-1 capitalize">
                  AI MODEL: gemini-3-flash-preview
                </div>
                {loading ? (
                  <div className="w-full md:w-auto flex-1 md:max-w-md mx-auto order-1 md:order-2 space-y-2">
                    <div className="flex justify-between text-xs font-mono text-emerald-400">
                      <span>
                        ANALYZING DATA {progress.current} /{" "}
                        {progress.total > 0 ? progress.total : "..."}
                      </span>
                      <span>{progressPercentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300 ease-out relative"
                        style={{ width: `${progressPercentage}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite] skew-x-12"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleAnalyze}
                    disabled={loading || !docUrl}
                    className="group relative bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden w-full md:w-auto order-1 md:order-2 cursor-pointer"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      <span>BREAK IT DOWN</span>
                      <svg
                        className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        ></path>
                      </svg>
                    </div>
                    {/* Button Glow Effect */}
                    <div className="absolute inset-0 bg-emerald-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Display */}
        {result && (
          <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 mb-8 md:mb-12 px-2 md:px-0">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                ANALYSIS RESULTS
              </h2>
              <div className="h-px bg-gradient-to-r from-gray-800 to-transparent flex-grow w-full md:w-auto"></div>

              <div className="flex items-center gap-4 self-start md:self-auto">
                {/* Auto-Sync is now active, no button needed */}
                <span className="glass-panel px-4 py-1.5 rounded-full text-emerald-400 font-mono text-xs font-bold shadow-lg shadow-emerald-900/20 backdrop-blur-md">
                  {processedScenes.length} DATA EXTRACTED
                </span>
              </div>
            </div>

            <div className="grid gap-6 md:gap-8">
              {processedScenes.map((scene, i) => (
                <div
                  key={i}
                  className="glass-panel rounded-2xl overflow-hidden transition-all hover:border-gray-700 group mx-2 md:mx-0"
                >
                  {/* Scene Header */}
                  <div className="bg-black/40 px-4 md:px-6 py-4 md:py-5 flex flex-wrap items-baseline gap-3 md:gap-4 border-b border-white/5 relative overflow-hidden">
                    {/* Header Glow */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>

                    <span className="text-emerald-500 font-mono text-[10px] md:text-xs font-bold tracking-widest border border-emerald-500/20 px-2 py-0.5 rounded bg-emerald-500/10">
                      SCENE {scene.scene_number}
                    </span>

                    <h3 className="text-lg md:text-2xl font-black tracking-wide text-gray-100 font-mono uppercase flex-grow md:flex-grow-0">
                      <span className="text-gray-500 mr-2">
                        {scene.int_ext}
                      </span>
                      {scene.scene_location}
                      <span className="text-gray-600 mx-1 md:mx-2 block md:inline my-1 md:my-0 h-0 md:h-auto"></span>
                      <span className="text-blue-200 block md:inline text-base md:text-inherit">
                        {scene.time_of_day}
                      </span>
                    </h3>

                    {scene.scene_transition && (
                      <span className="ml-auto text-gray-600 font-mono text-[10px] uppercase tracking-[0.2em]">
                        {scene.scene_transition}
                      </span>
                    )}

                    {scene.breakdown_name && (
                      <div className="w-full md:w-auto md:absolute md:top-2 md:right-4 opacity-75 md:opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-gray-700 mt-1 md:mt-0">
                        ID: {scene.breakdown_name}
                      </div>
                    )}
                  </div>

                  <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-gradient-to-b from-transparent to-black/20">
                    {/* Summary */}
                    {scene.scene_summary && (
                      <div className="pl-4 border-l-2 border-gray-700 italic text-gray-400 text-sm md:text-lg font-light leading-relaxed">
                        "{scene.scene_summary}"
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                      {/* CAST COLUMN */}
                      <div className="space-y-4 md:space-y-5">
                        <h4 className="flex items-center gap-3 text-xs font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">
                          <span className="text-lg">🎭</span> Cast
                        </h4>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {(scene.actors || []).map((actor, idx) => (
                              <div
                                key={idx}
                                className="bg-blue-500/10 text-blue-200 px-3 py-1.5 rounded text-xs md:text-sm font-semibold border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-shadow cursor-default"
                              >
                                {actor}
                              </div>
                            ))}
                          </div>

                          {(scene.non_speaking_roles || []).map((role, idx) => (
                            <div
                              key={idx}
                              className="text-gray-500 text-sm px-1 border-l border-gray-800 pl-2"
                            >
                              {role}{" "}
                              <span className="opacity-50 text-xs uppercase ml-1">
                                Non-Speaking
                              </span>
                            </div>
                          ))}

                          {/* Cast Details Section */}
                          {(scene.cast_details?.age?.length > 0 ||
                            scene.cast_details?.gender?.length > 0 ||
                            scene.cast_details?.build?.length > 0) && (
                            <div className="bg-white/5 rounded-lg p-3 text-xs space-y-1.5 border border-white/5 mt-2">
                              {scene.cast_details.gender?.length > 0 && (
                                <div className="flex justify-between flex-wrap gap-1">
                                  <span className="text-gray-500 uppercase tracking-tighter opacity-50">
                                    Sex
                                  </span>{" "}
                                  <span className="text-emerald-400 font-mono text-right">
                                    {scene.cast_details.gender.join(", ")}
                                  </span>
                                </div>
                              )}
                              {scene.cast_details.age?.length > 0 && (
                                <div className="flex justify-between flex-wrap gap-1">
                                  <span className="text-gray-500 uppercase tracking-tighter opacity-50">
                                    Age
                                  </span>{" "}
                                  <span className="text-blue-300 font-mono text-right">
                                    {scene.cast_details.age.join(", ")}
                                  </span>
                                </div>
                              )}
                              {scene.cast_details.build?.length > 0 && (
                                <div className="flex justify-between flex-wrap gap-1">
                                  <span className="text-gray-500 uppercase tracking-tighter opacity-50">
                                    Build
                                  </span>{" "}
                                  <span className="text-gray-300 font-mono text-right">
                                    {scene.cast_details.build.join(", ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ART DEPT COLUMN */}
                      <div className="space-y-4 md:space-y-5">
                        <h4 className="flex items-center gap-3 text-xs font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">
                          <span className="text-lg">🎨</span> Art Dept
                        </h4>
                        <div className="space-y-4 text-sm">
                          {(scene.props || []).length > 0 && (
                            <div>
                              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider block mb-2">
                                Props
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {scene.props.map((p, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-red-500/10 text-red-300 px-2 py-1 rounded text-xs border border-red-500/20"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {(scene.item_quantity || []).length > 0 && (
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                                Quantities
                              </span>
                              <ul className="space-y-1">
                                {scene.item_quantity.map((q, idx) => (
                                  <li
                                    key={idx}
                                    className="text-gray-400 text-xs font-mono flex items-start gap-2 break-all"
                                  >
                                    <span className="text-gray-700 min-w-[6px]">
                                      •
                                    </span>{" "}
                                    {q}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(scene.wardrobe || []).length > 0 && (
                            <div>
                              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider block mb-2">
                                Wardrobe
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {scene.wardrobe.map((w, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-purple-500/10 text-purple-300 px-2 py-1 rounded text-xs border border-purple-500/20"
                                  >
                                    {w}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ACTION & FX COLUMN */}
                      <div className="space-y-4 md:space-y-5">
                        <h4 className="flex items-center gap-3 text-xs font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">
                          <span className="text-lg">💥</span> Action
                        </h4>
                        <div className="space-y-4 text-sm">
                          {(scene.vfx || []).length > 0 && (
                            <div className="bg-indigo-900/10 p-3 rounded border border-indigo-500/20">
                              <span className="text-indigo-400 font-bold text-[10px] tracking-wider block mb-2">
                                VFX SHOTS
                              </span>
                              <ul className="space-y-1">
                                {scene.vfx.map((v, i) => (
                                  <li
                                    key={i}
                                    className="text-indigo-200 text-xs border-l-2 border-indigo-500/30 pl-2"
                                  >
                                    {v}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(scene.stunts || []).length > 0 && (
                            <div className="bg-orange-900/10 p-3 rounded border border-orange-500/20">
                              <span className="text-orange-400 font-bold text-[10px] tracking-wider block mb-2">
                                STUNTS
                              </span>
                              <ul className="space-y-1">
                                {scene.stunts.map((st, i) => (
                                  <li
                                    key={i}
                                    className="text-orange-200 text-xs border-l-2 border-orange-500/30 pl-2"
                                  >
                                    {st}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(scene.vehicles || []).length > 0 && (
                            <div>
                              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider block mb-2">
                                Vehicles
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {scene.vehicles.map((v, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs border border-slate-700"
                                  >
                                    {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* PRODUCTION NOTES COLUMN */}
                      <div className="space-y-4 md:space-y-5">
                        <h4 className="flex items-center gap-3 text-xs font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">
                          <span className="text-lg">📋</span> Production
                        </h4>
                        <div className="space-y-4 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            {scene.prod_location && (
                              <div className="bg-white/5 p-2 rounded text-center border border-white/5">
                                <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">
                                  Location
                                </span>
                                <span
                                  className="text-gray-200 font-semibold block truncate text-xs md:text-sm"
                                  title={scene.prod_location}
                                >
                                  {scene.prod_location}
                                </span>
                              </div>
                            )}
                            {scene.scene_length && (
                              <div className="bg-white/5 p-2 rounded text-center border border-white/5">
                                <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">
                                  Duration
                                </span>
                                <span className="text-emerald-400 font-mono block text-xs md:text-sm">
                                  {scene.scene_length}
                                </span>
                              </div>
                            )}
                          </div>

                          {(scene.additional_scheduling || []).length > 0 && (
                            <div>
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">
                                Notes
                              </span>
                              <ul className="space-y-2">
                                {scene.additional_scheduling.map(
                                  (note, idx) => (
                                    <li
                                      key={idx}
                                      className="text-yellow-500/80 text-xs italic bg-yellow-900/5 p-2 rounded border border-yellow-900/10"
                                    >
                                      " {note} "
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER SECTION: SIGNATURE */}
      <footer className="w-full py-8 border-t border-white/5 mt-auto relative z-10 bg-black/40 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="text-gray-600 text-[10px] sm:text-xs font-mono uppercase tracking-[0.3em]">
            CREATED BY
          </p>
          <div className="relative group cursor-default">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600 rounded-lg blur opacity-20 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-text-gradient bg-[length:200%_auto]"></div>
            <span className="relative text-lg sm:text-xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-200 to-emerald-500 animate-text-gradient bg-[length:200%_auto]">
              RUTVIK BAROT
            </span>
          </div>
        </div>
      </footer>

      {/* User Guide Modal */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsGuideOpen(false)}
          ></div>

          {/* Modal Container */}
          <div className="relative w-full max-w-4xl max-h-[90vh] glass-panel rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="bg-black/40 px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="text-emerald-500">📖</span> USER MANUAL
              </h2>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors group cursor-pointer"
              >
                <svg
                  className="w-6 h-6 text-gray-500 group-hover:text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-grow overflow-y-auto p-6 md:p-10 custom-scrollbar">
              <div
                className="prose prose-invert prose-emerald max-w-none 
                prose-headings:font-black prose-headings:tracking-tight prose-headings:uppercase 
                prose-h1:text-3xl prose-h1:mb-8 prose-h1:text-transparent prose-h1:bg-clip-text prose-h1:bg-gradient-to-r prose-h1:from-emerald-400 prose-h1:to-teal-200
                prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-white/5 prose-h2:pb-2
                prose-h3:text-lg prose-h3:text-emerald-400 prose-h3:mt-8
                prose-p:text-gray-400 prose-p:leading-relaxed
                prose-li:text-gray-400
                prose-strong:text-white
                prose-code:text-emerald-400 prose-code:bg-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-xl
                prose-blockquote:border-l-emerald-500 prose-blockquote:bg-emerald-500/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-gray-300
                prose-table:border prose-table:border-white/5 prose-table:rounded-xl prose-table:overflow-hidden
                prose-th:bg-white/5 prose-th:px-4 prose-th:py-3 prose-th:text-xs prose-th:font-bold prose-th:text-gray-500 prose-th:uppercase prose-th:tracking-wider
                prose-td:px-4 prose-td:py-3 prose-td:border-t prose-td:border-white/5 prose-td:text-sm
              "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {README_CONTENT}
                </ReactMarkdown>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-black/40 px-6 py-4 border-t border-white/5 text-center">
              <button
                onClick={() => setIsGuideOpen(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2 rounded-xl font-bold transition-all cursor-pointer"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
