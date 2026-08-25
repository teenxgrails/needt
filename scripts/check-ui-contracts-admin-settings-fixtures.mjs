import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { checkAdminSettingsReachability } from "./ui-contracts/admin-settings-reachability.mjs";

async function withFixture(run) {
  const root = await mkdtemp(join(tmpdir(), "needt-ui-contract-"));
  const write = async (path, contents) => {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents);
  };
  await write(
    "src/components/auth/AdminOnly.tsx",
    "export default function AdminOnly() { return null; }"
  );
  await write(
    "src/hooks/use-admin.ts",
    "export function useAdmin() { return true; }"
  );
  await write("src/app/.keep", "");
  try {
    await run({ root, write });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

await withFixture(async ({ root, write }) => {
  await write(
    "src/components/settings/CommentedPage.tsx",
    'import AdminOnly from "@/components/auth/AdminOnly"; export function CommentedPage() { return <AdminOnly />; }'
  );
  await write(
    "src/app/admin/commented/page.tsx",
    '// import { CommentedPage } from "@/components/settings/CommentedPage"; export default function Page() { return null; }'
  );
  assert.match(
    (await checkAdminSettingsReachability(root)).join("\n"),
    /CommentedPage\.tsx: AdminOnly settings component has no page importing/
  );
});

await withFixture(async ({ root, write }) => {
  await write(
    "src/components/settings/HookOnly.tsx",
    'import { useAdmin } from "@/hooks/use-admin"; export function HookOnly() { useAdmin(); return null; }'
  );
  assert.match(
    (await checkAdminSettingsReachability(root)).join("\n"),
    /HookOnly\.tsx: AdminOnly settings component has no page importing/
  );
});

await withFixture(async ({ root, write }) => {
  await write(
    "src/components/settings/RelativeGuarded.tsx",
    'import AdminOnly from "@/components/auth/AdminOnly"; export function RelativeGuarded() { return <AdminOnly />; }'
  );
  await write(
    "src/app/admin/relative/page.tsx",
    'import { RelativeGuarded } from "../../../components/settings/RelativeGuarded"; export default function Page() { return <RelativeGuarded />; }'
  );
  assert.deepEqual(await checkAdminSettingsReachability(root), []);
});

await withFixture(async ({ root, write }) => {
  await write(
    "src/components/settings/DeletedRoute.tsx",
    'import AdminOnly from "@/components/auth/AdminOnly"; export function DeletedRoute() { return <AdminOnly />; }'
  );
  const page = "src/app/admin/deleted/page.tsx";
  await write(
    page,
    'import { DeletedRoute } from "../../../components/settings/DeletedRoute"; export default function Page() { return <DeletedRoute />; }'
  );
  assert.deepEqual(await checkAdminSettingsReachability(root), []);
  await rm(join(root, page));
  assert.match(
    (await checkAdminSettingsReachability(root)).join("\n"),
    /DeletedRoute\.tsx: AdminOnly settings component has no page importing/
  );
});

console.log("Admin settings reachability fixtures passed.");
