/* Tiny inline SVG icons — the UI stays emoji-free. */

const base = { display: "inline-block", verticalAlign: "-2px" };

export function LockIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={base} aria-hidden="true">
      <path d="M6 10V7a6 6 0 0 1 12 0v3h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1h1zm2 0h8V7a4 4 0 0 0-8 0v3z" />
    </svg>
  );
}

export function CheckIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#5DBB74" style={base} aria-hidden="true">
      <path d="M20.3 5.7 9 17l-5.3-5.3 1.4-1.4L9 14.2 18.9 4.3z" />
    </svg>
  );
}

export function HeartIcon({ size = 18, dim = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={dim ? "#2E2E3A" : "#E5533C"} style={base} aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
