export default function LoadingIndicator({ message = "Searching for recent reports…" }) {
  return (
    <div className="loading-wrapper" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
