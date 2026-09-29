export function calculateMegaMenuCenter({
  triggerCenter,
  menuWidth,
  containerWidth,
  edgePadding = 16,
}: {
  triggerCenter: number
  menuWidth: number
  containerWidth: number
  edgePadding?: number
}) {
  const halfMenu = menuWidth / 2
  const minimum = halfMenu + edgePadding
  const maximum = containerWidth - halfMenu - edgePadding
  return Math.max(minimum, Math.min(triggerCenter, maximum))
}
