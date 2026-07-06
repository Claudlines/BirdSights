import {
  getActivityLabel,
  getMostRecentReportDate,
  getClosestReportKm,
} from "../utils/activitySummary";

export default function BirdActivitySummary({ data, searchParams }) {
  const rawResults = data?.results ?? [];
  const radiusKm = data?.radiusKm ?? searchParams?.radiusKm ?? 25;
  const backDays = data?.backDays ?? searchParams?.backDays ?? 7;

  const activityLabel = getActivityLabel(rawResults.length);
  const mostRecentDate = getMostRecentReportDate(rawResults);
  const closestKm = getClosestReportKm(rawResults, data?.searchCenter);

  return (
    <div className="activity-summary">
      <p className="activity-summary-title">Bird Activity Summary</p>

      <div className="activity-summary-grid">
        <div className="activity-item">
          <span className="activity-item-label">Recent activity</span>
          <span className="activity-item-value activity-highlight">{activityLabel}</span>
        </div>
        <div className="activity-item">
          <span className="activity-item-label">Most recent report</span>
          <span className="activity-item-value">
            {mostRecentDate ?? "None in selected timeframe"}
          </span>
        </div>
        <div className="activity-item">
          <span className="activity-item-label">Closest report</span>
          <span className="activity-item-value">
            {closestKm != null ? `${closestKm.toFixed(1)} km away` : "None in selected timeframe"}
          </span>
        </div>
        <div className="activity-item">
          <span className="activity-item-label">Search radius</span>
          <span className="activity-item-value">{radiusKm} km</span>
        </div>
        <div className="activity-item">
          <span className="activity-item-label">Timeframe</span>
          <span className="activity-item-value">Last {backDays} days</span>
        </div>
      </div>

      <p className="activity-summary-note">
        This reflects recent eBird reports in the selected area and timeframe. It does not
        guarantee the bird is currently present.
      </p>
    </div>
  );
}
