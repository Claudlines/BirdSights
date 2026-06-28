export default function LegendPanel() {
  return (
    <div className="panel-right" aria-label="Map legend">
      <p className="panel-title">Map Key</p>
      <p className="legend-desc">For reference only</p>
      <div className="legend-item">
        <span className="legend-dot" aria-hidden="true" />
        Recent eBird sighting location
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
