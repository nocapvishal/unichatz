const bases = [
  "broisdeadinside",
  "cryinginpublicwifi",
  "mentallyinairplanemode",
  "broneedshelpfr",
  "emotionallybuffering",
  "lifeisloading",
  "broneedsarestart",
  "existentialwifi",
  "cryinginthecomments",
  "bruhmomentdaily",
  "broforgotpurpose",
  "vibingwithtrauma",
  "broisnotokayfr",
  "laughingatpainlol",
  "chronicoverthinker",
  "broisslightlybroken",
  "scrollingthroughlife",
  "broisquestioninglife",
  "mentalhealthbutmemes",
  "broisjusttired"
];

export function generateAlias(): string {

  const base = bases[Math.floor(Math.random() * bases.length)];

  const number = Math.random() < 0.5
    ? Math.floor(Math.random() * 9999)
    : "";

  return `${base}${number}`;
}