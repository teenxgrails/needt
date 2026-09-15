import type { Metadata } from "next";

import { DesignPreview } from "@/components/needt/preview/DesignPreview";

export const metadata: Metadata = {
  title: "Design preview | Needt",
  robots: { index: false, follow: false },
};

/**
 * The surface the ported design is judged on.
 *
 * It runs the new design against the same fixture the Claude Design prototype
 * uses, with no sign-in and no database, so it can be opened next to the
 * prototype and compared frame for frame. Design defects and data defects stay
 * separable that way: anything wrong here is the port, not the data.
 *
 * It is not product navigation and is not indexed. It goes away when every
 * screen has replaced its predecessor.
 */
export default function DesignPreviewPage() {
  return <DesignPreview />;
}
