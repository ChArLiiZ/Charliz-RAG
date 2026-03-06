type Props = {
  status: "idle" | "starting" | "ready" | "error";
};

export function HealthPanel({ status }: Props) {
  const labelMap = {
    idle: "Idle",
    starting: "Starting backend",
    ready: "Backend connected",
    error: "Backend offline",
  } as const;

  return (
    <div className={`health-panel is-${status}`}>
      <span className="health-dot" />
      <span>{labelMap[status]}</span>
    </div>
  );
}
