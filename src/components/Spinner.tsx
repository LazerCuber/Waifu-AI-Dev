export default function Spinner() {
  return (
    <div className="rounded-lg p-4 lg:overflow-visible">
      <svg className="h-8 w-8 animate-spin" viewBox="0 0 100 100">
        <circle
          fill="none"
          strokeWidth="14"
          className="stroke-blue-300"
          cx="50"
          cy="50"
          r="40"
        />
        <circle
          fill="none"
          strokeWidth="14"
          className="stroke-blue-600"
          strokeDasharray="250"
          strokeDashoffset="210"
          cx="50"
          cy="50"
          r="40"
        />
      </svg>
    </div>
  );
}