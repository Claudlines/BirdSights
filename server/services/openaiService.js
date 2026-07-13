const OpenAI = require("openai");

const DEFAULT_MODEL = "gpt-4o-mini";

const MIN_RADIUS_KM = 5;
const MAX_RADIUS_KM = 50;
const MIN_DAYS_BACK = 1;
const MAX_DAYS_BACK = 30;

const VALID_INTENTS = ["recent_reports", "closest_report", "general_activity"];

let client = null;

function isOpenAiConfigured() {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && key !== "your_openai_api_key_here");
}

function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const VALID_ACTION_TYPES = [
  "species_search",
  "explore_location",
  "explain_feature",
  "clarification",
];

const VALID_EXPLAIN_TOPICS = ["pin_colors", "category_labels", "presence_guarantee", "general"];

const SYSTEM_PROMPT = `You classify a user's question for a bird-sighting web app and extract structured parameters.
Respond with ONLY a JSON object containing exactly these fields:
{
  "actionType": "species_search" | "explore_location" | "explain_feature" | "clarification",
  "birdName": string,
  "location": string,
  "radiusKm": number,
  "daysBack": number,
  "intent": "recent_reports" | "closest_report" | "general_activity",
  "explainTopic": "pin_colors" | "category_labels" | "presence_guarantee" | "general" | "",
  "needsClarification": boolean,
  "clarifyingQuestion": string
}
actionType rules:
- "species_search": the user asks about a specific bird species (e.g. "Has American Woodcock been reported near 19153?").
- "explore_location": the user wants to discover which birds are near a place WITHOUT naming a specific bird (e.g. "What birds are near me?", "I don't know any birds, what should I look for near 19153?", "Show me birds near Philadelphia").
- "explain_feature": the user asks what something in the app means. Set explainTopic to "pin_colors" for map pin colors or freshness, "category_labels" for labels like "frequently reported nearby", "presence_guarantee" for whether a bird is guaranteed/definitely there, or "general" for other app questions. explainTopic is "" for other actionTypes.
- "clarification": ONLY when the question is unrelated to birds or too unclear to act on. Put a short friendly question in clarifyingQuestion. Otherwise clarifyingQuestion is "".
Field rules:
- birdName is the common name of the bird species mentioned. Use "" if no bird is mentioned. Never guess a bird that was not mentioned.
- location is the city, address, place name, or ZIP code mentioned. For ZIP codes return only the 5 digits (e.g. "10468", not "ZIP code 10468").
- Use "" for location if none is given, including phrases that refer to the user's own position such as "near me", "nearby", "around me", "my location", "in my location", "my area", or "my current location". A missing location is fine — never set needsClarification or actionType "clarification" because of it.
- radiusKm is the search radius in km if the user gave one, otherwise 25. It must be between ${MIN_RADIUS_KM} and ${MAX_RADIUS_KM}.
- daysBack is the timeframe in days if the user gave one, otherwise 30. It must be between ${MIN_DAYS_BACK} and ${MAX_DAYS_BACK}.
- intent is "closest_report" if the user mainly asks where the nearest report is, "recent_reports" if they ask to see or list recent reports, otherwise "general_activity".`;

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampRadiusKm(value) {
  return clampNumber(value, MIN_RADIUS_KM, MAX_RADIUS_KM, 25);
}

function clampDaysBack(value) {
  return clampNumber(value, MIN_DAYS_BACK, MAX_DAYS_BACK, 30);
}

// Phrases that refer to the user's own position rather than a real place.
// If the model passes one through as the location, treat it as "no location"
// so the current-location (GPS) flow kicks in.
const SELF_LOCATION_PATTERN =
  /^(?:in |at |around |near )?(?:my|our) (?:current )?(?:location|area|place|spot|position)$|^(?:near me|around me|nearby|here|current location)$/i;

function normalizeLocation(location) {
  let loc = typeof location === "string" ? location.trim() : "";
  loc = loc.replace(/^zip ?code /i, "").trim();
  if (SELF_LOCATION_PATTERN.test(loc)) return "";
  return loc;
}

// Interprets a natural-language question into structured search intent.
// Throws a user-safe Error on API or parsing failure.
async function interpretQuestion(question) {
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  let completion;
  try {
    completion = await getClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 300,
    });
  } catch (err) {
    console.error("[Ask] OpenAI request failed:", err.status || "", err.message);
    throw new Error(
      "Ask BirdSights could not interpret your question right now. Please try again in a moment."
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
  } catch {
    console.error("[Ask] OpenAI returned non-JSON content.");
    throw new Error(
      "Ask BirdSights could not interpret your question right now. Please try again in a moment."
    );
  }

  // Never trust model output — sanitize and clamp everything.
  const birdName = typeof parsed.birdName === "string" ? parsed.birdName.trim() : "";

  // Fallback if the model returns an unknown actionType: a named bird means a
  // species search; otherwise treat it as location exploration.
  const actionType = VALID_ACTION_TYPES.includes(parsed.actionType)
    ? parsed.actionType
    : birdName
      ? "species_search"
      : "explore_location";

  return {
    actionType,
    birdName,
    location: normalizeLocation(parsed.location),
    radiusKm: clampRadiusKm(parsed.radiusKm),
    daysBack: clampDaysBack(parsed.daysBack),
    intent: VALID_INTENTS.includes(parsed.intent) ? parsed.intent : "general_activity",
    explainTopic: VALID_EXPLAIN_TOPICS.includes(parsed.explainTopic)
      ? parsed.explainTopic
      : "general",
    needsClarification: parsed.needsClarification === true,
    clarifyingQuestion:
      typeof parsed.clarifyingQuestion === "string" ? parsed.clarifyingQuestion.trim() : "",
  };
}

module.exports = { isOpenAiConfigured, interpretQuestion, clampRadiusKm, clampDaysBack };
