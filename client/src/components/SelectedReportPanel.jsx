function fmt(dateStr) {
  if (!dateStr) return "Unknown";
  try {
    const d = new Date(dateStr.replace(" ", "T"));
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function SelectedReportPanel({ report }) {
  if (!report) {
    return (
      <div className="panel-left">
        <p className="panel-title">Selected Report</p>
        <p className="report-panel-placeholder">
          Select a marker or report location to view details.
        </p>
      </div>
    );
  }

  return (
    <div className="panel-left">
      <p className="panel-title">Selected Report</p>
      <div className="report-detail-name">{report.commonName}</div>
      <div className="report-detail-sci">{report.scientificName}</div>

      <div className="detail-row">
        <span className="detail-label">Location</span>
        <span className="detail-value">{report.locationName}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Most Recent Report</span>
        <span className="detail-value">{fmt(report.observationDateTime)}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Number Observed In Latest Report</span>
        <span className="detail-value">
          {report.numberObserved != null ? report.numberObserved : "Not reported"}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Reports Returned At This Location</span>
        <span className="detail-value">{report.reportCountAtLocation ?? 1}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Additional Returned Reports</span>
        <span className="detail-value">{report.additionalReturnedReports ?? 0}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Distance</span>
        <span className="detail-value">
          {report.distanceKm != null ? `${report.distanceKm} km` : "Unknown"}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Coordinates</span>
        <span className="detail-value">
          {report.latitude != null
            ? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`
            : "Not available"}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Observation Valid</span>
        <span className="detail-value">{report.observationValid ? "Yes" : "No"}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Observation Reviewed</span>
        <span className="detail-value">{report.observationReviewed ? "Yes" : "No"}</span>
      </div>
      {report.locationPrivate && (
        <span className="private-badge">Private Location</span>
      )}
      {report.checklistUrl ? (
        <a
          className="checklist-link"
          href={report.checklistUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Latest Checklist ↗
        </a>
      ) : (
        <div className="detail-row" style={{ marginTop: "0.8rem" }}>
          <span className="detail-value" style={{ color: "#9aa0a6" }}>
            Checklist unavailable
          </span>
        </div>
      )}
    </div>
  );
}
