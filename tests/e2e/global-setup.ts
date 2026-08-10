import { prepareE2eEnvironment } from "./environment";

export default async function globalSetup() {
  await prepareE2eEnvironment();
}
