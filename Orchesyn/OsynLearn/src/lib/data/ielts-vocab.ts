/** Academic word bank — mined from the Reading passages & model answers in this app. */
export interface VocabItem {
  id: string;
  word: string;
  pos: string;
  def: string;
  example: string;
  band: string;
}

export const VOCAB: VocabItem[] = [
  { id: 'v-canonical', word: 'canonical', pos: 'adj', band: '8', def: 'accepted as the classic or standard example', example: 'Tacoma Narrows became the canonical example of bridge failure.' },
  { id: 'v-oscillation', word: 'oscillation', pos: 'n', band: '8', def: 'repeated swinging or vibrating movement', example: 'Wind created a twisting oscillation in the deck.' },
  { id: 'v-flutter', word: 'flutter', pos: 'n', band: '8', def: 'a self-reinforcing aerodynamic vibration', example: 'The collapse was caused by flutter, not simple resonance.' },
  { id: 'v-fatigue', word: 'fatigue', pos: 'n', band: '7', def: 'weakness in metal caused by repeated stress', example: 'Tiny cracks grow with fatigue under repeated loading.' },
  { id: 'v-mandate', word: 'mandate', pos: 'v', band: '7', def: 'to officially require something', example: 'Modern codes mandate inspection cycles based on load counts.' },
  { id: 'v-bureaucratic', word: 'bureaucratic inertia', pos: 'n', band: '8', def: 'slow organisational delay caused by procedure', example: 'Warnings were absorbed into bureaucratic inertia.' },
  { id: 'v-consolidation', word: 'consolidation', pos: 'n', band: '8', def: 'the process of making memories stable and permanent', example: 'Sleep supports memory consolidation.' },
  { id: 'v-hippocampus', word: 'hippocampus', pos: 'n', band: '8', def: 'brain region that replays and transfers new memories', example: 'The hippocampus replays the day during deep sleep.' },
  { id: 'v-declarative', word: 'declarative memory', pos: 'n', band: '8', def: 'memory for facts, dates and vocabulary', example: 'Sleep after studying strengthens declarative memory.' },
  { id: 'v-circadian', word: 'circadian', pos: 'adj', band: '8', def: 'relating to the body’s 24-hour rhythm', example: 'Night shifts sever the circadian link between experience and sleep.' },
  { id: 'v-counterintuitive', word: 'counter-intuitive', pos: 'adj', band: '7', def: 'opposite to what common sense expects', example: 'The reasons are counter-intuitive: cities help bees.' },
  { id: 'v-monoculture', word: 'monoculture', pos: 'n', band: '8', def: 'farming one single crop over a vast area', example: 'Countryside monocultures offer flowers for only a few weeks.' },
  { id: 'v-terroir', word: 'terroir', pos: 'n', band: '9', def: 'the unique local character of a food product', example: 'Urban honey shows a terroir of the street.' },
  { id: 'v-uncritical', word: 'uncritical enthusiasm', pos: 'n', band: '8', def: 'excitement without examining the downsides', example: 'Scientists caution against uncritical enthusiasm for hives.' },
  { id: 'v-consensus', word: 'emerging consensus', pos: 'n', band: '7', def: 'an agreement that is gradually forming among experts', example: 'The emerging consensus is to plant flowers first.' },
  { id: 'v-squeeze', word: 'squeeze out', pos: 'v', band: '7', def: 'to force something out by pressure or competition', example: 'Too many hives can squeeze out wild pollinators.' },
  { id: 'v-fragment', word: 'fragment', pos: 'v', band: '7', def: 'to break into small, disconnected pieces', example: 'Phones fragment meals and conversation.' },
  { id: 'v-intimacy', word: 'intimacy', pos: 'n', band: '7', def: 'close familiarity and emotional closeness', example: 'When presence becomes partial, intimacy erodes.' },
  { id: 'v-sustain', word: 'sustain', pos: 'v', band: '7', def: 'to keep something going over time', example: 'Video calls sustain relationships distance would sever.' },
  { id: 'v-caveat', word: 'caveat', pos: 'n', band: '8', def: 'a warning or limiting condition', example: 'The argument holds, but with an important caveat.' },
  { id: 'v-amplify', word: 'amplify', pos: 'v', band: '7', def: 'to increase the effect or strength of something', example: 'Technology amplifies the habits a family already has.' },
  { id: 'v-dichotomy', word: 'false dichotomy', pos: 'n', band: '8', def: 'presenting two options as the only ones when more exist', example: 'Employment versus knowledge is a false dichotomy.' },
  { id: 'v-transferable', word: 'transferable', pos: 'adj', band: '7', def: 'usable in many different situations or jobs', example: 'Critical thinking is a transferable skill.' },
  { id: 'v-leverage', word: 'leverage', pos: 'n', band: '7', def: 'the power to multiply the effect of your effort', example: 'AI gives professionals new leverage.' },
  { id: 'v-moat', word: 'moat', pos: 'n', band: '8', def: 'a durable competitive advantage', example: 'A skill stack is a career moat.' },
  { id: 'v-compound', word: 'compound', pos: 'v', band: '7', def: 'to grow by accumulating on top of itself', example: 'Daily practice compounds into a different voice.' },
  { id: 'v-plateau', word: 'plateau', pos: 'n', band: '7', def: 'a period where progress seems to stop', example: 'Language plateaus are normal at B1 and B2.' },
  { id: 'v-deliberate', word: 'deliberate', pos: 'adj', band: '7', def: 'done on purpose with careful intention', example: 'Deliberate use matters more than the device.' },
  { id: 'v-articulate', word: 'articulate', pos: 'adj', band: '8', def: 'able to express ideas clearly and effectively', example: 'Authority follows the articulate person.' },
  { id: 'v-narrate', word: 'narrate', pos: 'v', band: '7', def: 'to tell the story of something', example: 'Curate a CV that narrates your moves.' },
];
