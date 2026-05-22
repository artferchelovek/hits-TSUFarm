import type { Buildings } from "../../../engine/Types.ts";

export default function SizeBlock(props: { build: Buildings }) {
  const isTiled =
    props.build.type === "GARDEN" ||
    props.build.type === "ROAD" ||
    props.build.type === "BRIDGE";
  const area = isTiled ? (props.build.width || 1) * (props.build.length || 1) : 1;
  const maintenance = (props.build.maintenanceCost || 0) * area;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
      <span>Размер: {props.build.length}x{props.build.width}</span>
      {maintenance > 0 && (
        <span style={{ color: "#F44336", fontWeight: "bold" }}>
          ⚙️ -{maintenance} 💰/день
        </span>
      )}
    </div>
  );
}
