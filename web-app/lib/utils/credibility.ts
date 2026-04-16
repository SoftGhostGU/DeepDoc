function clampScore(score: number) {
  if (Number.isNaN(score)) {
    return 0;
  }

  return Math.min(Math.max(score, 0), 1);
}

function scoreToHue(score: number) {
  return Math.round(clampScore(score) * 120);
}

export function getCredibilityColor(score: number): string {
  const hue = scoreToHue(score);
  return `hsl(${hue}, 78%, 46%)`;
}

export function getCredibilityColorAlpha(score: number, alpha: number): string {
  const hue = scoreToHue(score);
  const safeAlpha = Math.min(Math.max(alpha, 0), 1);
  return `hsla(${hue}, 78%, 46%, ${safeAlpha})`;
}
