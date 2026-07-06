export default function LegendPanel() {
  return (
    <div className="panel-right" aria-label="Map legend">
      <p className="panel-title">Map Key</p>
      <p className="legend-desc">
        Pin colors show how old the returned report is — not how likely the bird is to be there.
      </p>
      <div className="legend-item">
        <span className="legend-dot legend-dot-fresh" aria-hidden="true" />
        Fresh report (0–7 days old)
      </div>
      <div className="legend-item">
        <span className="legend-dot legend-dot-recent" aria-hidden="true" />
        Recent report (8–14 days old)
      </div>
      <div className="legend-item">
        <span className="legend-dot legend-dot-older" aria-hidden="true" />
        Older report (15+ days old)
      </div>
      <div className="legend-item">
        <span className="legend-dot legend-dot-selected" aria-hidden="true" />
        Selected location
      </div>
      <div className="legend-item">
        <span className="legend-circle" aria-hidden="true" />
        Search radius boundary
      </div>
    </div>
  );
}
