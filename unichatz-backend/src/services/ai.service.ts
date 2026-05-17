import Groq from "groq-sdk";

// Lazy singleton — instantiated on first use so dotenv has already loaded
let _groq: Groq | null = null;
function getGroqClient(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

export interface ChatInsights {
  aiSummary: string | null;
  vibe: "warm" | "neutral" | "cold" | null;
  replySuggestions: string[];
  recommendExtend: boolean;
}

const SAFE_DEFAULTS: ChatInsights = {
  aiSummary: null,
  vibe: null,
  replySuggestions: [],
  recommendExtend: false,
};

export async function generateChatInsights(
  messages: string[]
): Promise<ChatInsights> {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "paste_your_key_here") {
    return SAFE_DEFAULTS;
  }

  if (!messages || messages.length === 0) {
    return SAFE_DEFAULTS;
  }

  const lastFive = messages.slice(-5).join("\n");

  const prompt = `You are analyzing a short anonymous chat conversation between two users. Based on the messages below, return a JSON object with exactly these fields:

1. "aiSummary" — a single short sentence (max 10 words) describing what the conversation is about, written naturally like "Planning a weekend study session" or "Bonding over shared music tastes". Do NOT say "the users are discussing". Be specific and human.
2. "vibe" — one of exactly: "warm", "neutral", or "cold". Warm = friendly/positive, Cold = distant/negative/short, Neutral = in between.
3. "replySuggestions" — an array of exactly 2 short natural reply starters (5–8 words each) the current user could send next. Match the conversation tone.
4. "recommendExtend" — true if the conversation seems genuinely engaging (mutual back-and-forth, friendly tone, multiple topics), false otherwise.

Return ONLY valid JSON, no explanation, no markdown.

Messages:
${lastFive}`;

  try {
    const completion = await getGroqClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 256,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    console.log(`[AI] Raw response from Groq:`, raw);
    if (!raw) return SAFE_DEFAULTS;

    // Strip markdown code fences if model wraps in them
    const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonStr);

    return {
      aiSummary: typeof parsed.aiSummary === "string" ? parsed.aiSummary : null,
      vibe: ["warm", "neutral", "cold"].includes(parsed.vibe) ? parsed.vibe : null,
      replySuggestions: Array.isArray(parsed.replySuggestions)
        ? parsed.replySuggestions.slice(0, 2)
        : [],
      recommendExtend: typeof parsed.recommendExtend === "boolean"
        ? parsed.recommendExtend
        : false,
    };
  } catch (err) {
    // Silent failure — chat always works regardless
    console.warn("[AI] generateChatInsights failed silently:", (err as Error).message);
    return SAFE_DEFAULTS;
  }
}
export async function generateAIResponse(
  messages: { role: "user" | "assistant" | "system"; content: string }[]
): Promise<string> {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "paste_your_key_here") {
    return "I'm currently resting. Please check back later!";
  }

  const systemPrompt = {
    role: "system",
    content: `You are 'Unichatz AI', the official AI assistant of the Unichatz student app. 
    Your personality: 
    - Friendly, supportive, and campus-savvy. 
    - Use student slang occasionally (like 'lowkey', 'vibe', 'no cap') but stay respectful. 
    - You help students with campus life, social advice, and using the app. 
    - Keep responses concise (max 2-3 sentences unless asked for more). 
    - Be empathetic but neutral. 
    - Never pretend to be a real human student; you are a helpful AI.`
  };

  try {
    const completion = await getGroqClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [systemPrompt, ...messages],
      temperature: 0.7,
      max_tokens: 512,
    });

    return completion.choices[0]?.message?.content?.trim() || "I'm not sure how to respond to that, but I'm here for you!";
  } catch (err) {
    console.error("[AI] generateAIResponse failed:", err);
    return "Something went wrong in my circuits! Try again?";
  }
}
