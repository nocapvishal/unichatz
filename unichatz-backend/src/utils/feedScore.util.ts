export function calculateHotScore(
  upvotes: number,
  comments: number,
  views: number,
  createdAt: Date
) {

  const hoursOld =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

  const score =
    upvotes +
    comments * 2 +
    Math.log(views + 1) -
    hoursOld * 0.5;

  return score;

}