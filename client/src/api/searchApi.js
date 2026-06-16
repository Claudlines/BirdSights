const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function searchBirds({ speciesCode, location, latitude, longitude, radiusKm, showAllReports }) {
  const params = new URLSearchParams({ speciesCode, radiusKm: String(radiusKm) });

  if (latitude != null && longitude != null) {
    params.set("latitude", String(latitude));
    params.set("longitude", String(longitude));
  } else {
    params.set("location", location);
  }

  if (showAllReports) {
    params.set("showAllReports", "true");
  }

  const url = `${BASE_URL}/api/search?${params.toString()}`;

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Could not reach the BirdsNearMe server. Please make sure the backend is running.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error || "An unexpected error occurred. Please try again."
    );
  }

  return data;
}
