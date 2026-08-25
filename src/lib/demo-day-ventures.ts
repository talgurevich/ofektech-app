// The active cohort contains placeholder venture rows named with bare numbers
// ("10", "11", "2", "6"). They are real rows other parts of the portal rely on,
// so they are filtered out of the Demo Day judging views rather than deleted:
// judges shouldn't see them in the dropdown, and they shouldn't sit in the
// leaderboard and completeness grid as permanently unscored.

export function isJudgeableVenture(name: string) {
  return !/^\d+$/.test(name.trim());
}
