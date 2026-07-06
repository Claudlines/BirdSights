const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function postAsk(body) {
  let response;
  try {
    response = await fetch(`${BASE_URL}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Could not reach the BirdSights server. Please make sure the backend is running."
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "An unexpected error occurred. Please try again.");
  }

  return data;
}

export function askBirdSights(question, coords) {
  const body = { question };
  if (coords && coords.latitude != null && coords.longitude != null) {
    body.latitude = coords.latitude;
    body.longitude = coords.longitude;
  }
  return postAsk(body);
}

// Quick-action rerun: reuses the already-interpreted bird/location with a
// changed radius or timeframe. No OpenAI call happens on the backend.
export function rerunAskSearch({ birdName, location, latitude, longitude, radiusKm, daysBack }) {
  const body = { rerun: { birdName, location: location || "", radiusKm, daysBack } };
  if (latitude != null && longitude != null) {
    body.latitude = latitude;
    body.longitude = longitude;
  }
  return postAsk(body);
}
