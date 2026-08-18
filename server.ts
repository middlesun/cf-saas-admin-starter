import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client lazy/safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Editor Command Interpreter API
app.post("/api/ai-editor", async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "A non-empty prompt string is required." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a specialized AI Assistant & Command Interpreter for a video editing application called SAAS Demo Creator.
Your ONLY job is to convert natural language video editing instructions into a structured array of JSON editing commands.
Do NOT output conversational prose, explanations, or Markdown codeblocks.
Return ONLY valid JSON adhering strictly to the response schema.

COMMAND SCHEMA & SPECIFICATIONS:
You can output one or more commands inside a "commands" array.

Allowed command actions:
1. "remove_segment": Trim/remove a portion of video.
   - start (number, seconds)
   - end (number, seconds)

2. "add_text" or "add_callout": Add text callout/annotation box.
   - timestamp (number, seconds)
   - text (string)
   - style (string: "rounded" | "speech" | "floating" | "highlight" | "minimal", default "rounded")
   - animation (string: "fade" | "slide" | "pop" | "typewriter" | "expand", default "pop")
   - duration (number, seconds, default 3.0)
   - x (number, 0-100 percentage, default 50)
   - y (number, 0-100 percentage, default 70)
   - textColor (hex string, default "#ffffff")
   - bgColor (hex string, default "#0284c7")

3. "add_transition": Add a full-screen section title card transition.
   - timestamp (number, seconds)
   - duration (number, seconds, default 2.5)
   - text (string, title text)
   - subtitle (string, optional)
   - style (string: "minimal" | "centered" | "saas" | "gradient" | "slide" | "zoom", default "saas")
   - bgColor (hex string, default "#0f172a")
   - textColor (hex string, default "#38bdf8")

4. "add_audio": Add background music track.
   - mood (string: "upbeat" | "ambient" | "lofi" | "corporate" | "energetic" | "tutorial", default "upbeat")
   - presetId (string: "upbeat" | "ambient" | "lofi", default "upbeat")
   - volume (number, 0.0 to 1.0, default 0.2)

5. "add_click_animation": Add cursor click ripple effect.
   - timestamp (number, seconds)
   - x (number, 0-100 percentage, default 50)
   - y (number, 0-100 percentage, default 50)
   - style (string: "ripple" | "highlight" | "pulse" | "spotlight" | "cursor", default "ripple")
   - color (hex string, default "#38bdf8")

6. "delete_element": Delete existing element.
   - elementType (string: "annotation" | "transition" | "audio" | "click")
   - elementId (string, optional if specified)
   - timestamp (number, optional to locate nearest element)

7. "update_element": Update properties of an existing element.
   - elementType (string: "annotation" | "transition" | "audio" | "click")
   - elementId (string, optional if specified)
   - changes (object with properties to update, e.g. textColor, bgColor, style, text, duration)

TIMESTAMPS:
Always convert times like "01:05.50" to numeric seconds (e.g. 65.5).
If user says "at current playhead" or doesn't give a time for a text/transition, use context.currentTime.

CURRENT PROJECT CONTEXT:
${JSON.stringify(context || {})}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            commands: {
              type: Type.ARRAY,
              description: "List of structured editing commands to execute",
              items: {
                type: Type.OBJECT,
                properties: {
                  action: {
                    type: Type.STRING,
                    description: "Action type (e.g., remove_segment, add_text, add_transition, add_audio, add_click_animation, delete_element, update_element)"
                  },
                  start: { type: Type.NUMBER },
                  end: { type: Type.NUMBER },
                  timestamp: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  style: { type: Type.STRING },
                  animation: { type: Type.STRING },
                  duration: { type: Type.NUMBER },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  textColor: { type: Type.STRING },
                  bgColor: { type: Type.STRING },
                  mood: { type: Type.STRING },
                  presetId: { type: Type.STRING },
                  volume: { type: Type.NUMBER },
                  color: { type: Type.STRING },
                  elementType: { type: Type.STRING },
                  elementId: { type: Type.STRING },
                  changes: { type: Type.OBJECT }
                },
                required: ["action"]
              }
            }
          },
          required: ["commands"]
        }
      }
    });

    const jsonText = response.text || '{"commands":[]}';
    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch {
      parsedData = { commands: [] };
    }

    return res.json({
      commands: parsedData.commands || [],
      tokenEstimate: Math.ceil((prompt.length + jsonText.length) / 4)
    });
  } catch (error: any) {
    console.error("Error in /api/ai-editor:", error);
    return res.status(500).json({
      error: error?.message || "Failed to interpret command with AI.",
      commands: []
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SAAS Demo Creator server running on http://localhost:${PORT}`);
  });
}

startServer();
