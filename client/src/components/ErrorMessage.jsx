export default function ErrorMessage({ message }) {
  if (!message) return null;
  return <div className="error-msg" role="alert">{message}</div>;
}
