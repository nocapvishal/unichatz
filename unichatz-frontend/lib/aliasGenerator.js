const adjectives = [
  "Silent","Crimson","Velvet","Lunar","Mystic","Phantom","Scarlet",
  "Golden","Frost","Cosmic","Hidden","Swift","Wild","Storm",
  "Night","Silver","Dark","Bright","Neon","Secret"
];

const traits = [
  "Shadow","Nova","Echo","Blaze","Storm","Whisper",
  "Flame","Pulse","Drift","Spark","Aura","Wave",
  "Core","Trace","Mist","Flash","Ghost","Glow"
];

const animals = [
  "Fox","Wolf","Owl","Raven","Tiger","Falcon","Panther",
  "Dragon","Viper","Lynx","Leopard","Hawk","Jaguar",
  "Serpent","Cobra","Phoenix","Eagle","Bear","Shark","Puma"
];

export function generateAlias() {

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const trait = traits[Math.floor(Math.random() * traits.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];

  return `${adj}${trait}${animal}`;
}