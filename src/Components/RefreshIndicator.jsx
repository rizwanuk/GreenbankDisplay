export default function RefreshIndicator({ status }) {
  if (!status) return null;

  const { lastCheckedAt, nextCheckAt, isOnline } = status;

  const format = (d) =>
    d
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "--:--";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 6,
        right: 10,
        fontSize: "11px",
        opacity: 0.65,
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      {isOnline ? "Online" : "Offline"} · Checked {format(lastCheckedAt)} · Next{" "}
      {format(nextCheckAt)}
    </div>
  );
}
