const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function exploreBirds({ location, latitude, longitude, radiusKm, backDays }) {
  const params = new URLSearchParams({
    radiusKm: String(radiusKm),
    backDays: String(backDays),
  });

  if (latitude != null && longitude != null) {
    params.set("latitude", String(latitude));
    params.set("longitude", String(longitude));
  } else {
    params.set("location", location);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}/api/explore?${params.toString()}`);
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
