export function shouldAnimateSpaceParticles({
  documentHidden,
  reducedMotion,
}: {
  documentHidden: boolean;
  reducedMotion: boolean;
}) {
  return !documentHidden && !reducedMotion;
}
