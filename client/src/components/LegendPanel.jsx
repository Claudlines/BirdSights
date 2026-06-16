export default function LegendPanel() {
  return (
    <div className="panel-right">
      <p className="panel-title">Legend</p>
      <div className="legend-item">
        <span className="legend-dot" aria-hidden="true" />
        Recent eBird Report Location
      </div>
      <div className="legend-item">
        <span className="legend-circle" aria-hidden="true" />
        Selected Search Radius
      </div>
    </div>
  );
}
