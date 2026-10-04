/* Preview-only documents. Production routes pass workspace-authorized Pages
 * through `DocsRoute`; the judging surface and mobile preview reuse this one
 * authored list so they cannot drift from each other. */

import { documents } from "@/lib/needt/fixture";
import type { NeedtDocument } from "@/lib/needt/types";

export type DocFixtureItem = NeedtDocument;
export const DOCS_FIXTURE: readonly DocFixtureItem[] = documents;
