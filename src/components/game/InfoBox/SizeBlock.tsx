import type { Buildings } from "../../../engine/Types.ts";

export default function SizeBlock(props: { build: Buildings }) {
  return (
    <p>
      Размер: {props.build.length}x{props.build.width}
    </p>
  );
}
