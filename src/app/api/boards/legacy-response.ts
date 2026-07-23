import { NextResponse } from "next/server";

export function legacyBoardsRemovedResponse() {
  return NextResponse.json(
    {
      error: "Boards were replaced by Pages. Existing board data is preserved for a future export.",
      replacement: "/pages",
    },
    { status: 410 }
  );
}
