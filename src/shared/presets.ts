import type { QuestionInput } from './types';

export interface PresetPack {
  id: string;
  title: string;
  subtitle: string;
  questions: QuestionInput[];
}

export const PRESET_PACKS: PresetPack[] = [
  {
    id: 'living-room-mix',
    title: 'Living Room Mix',
    subtitle: '10 questions · Everyday facts & warm-up',
    questions: [
      {
        prompt: 'Which planet in our solar system rotates on its side at nearly 98 degrees?',
        options: ['Mars', 'Uranus', 'Neptune', 'Venus'],
        correctIndex: 1,
        timeLimitSec: 20,
      },
      {
        prompt: 'What is the only mammal capable of true sustained flight?',
        options: ['Flying squirrel', 'Sugar glider', 'Bat', 'Colugo'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'How many hearts does an octopus have?',
        options: ['1', '2', '3', '4'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which element has the chemical symbol Au?',
        options: ['Silver', 'Argon', 'Gold', 'Aluminum'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'In standard UNO, how many cards are dealt to each player at the start?',
        options: ['5', '7', '9', '10'],
        correctIndex: 1,
        timeLimitSec: 20,
      },
      {
        prompt: 'Which country has the most natural lakes in the world?',
        options: ['Finland', 'Canada', 'Russia', 'Sweden'],
        correctIndex: 1,
        timeLimitSec: 20,
      },
      {
        prompt: 'What does HTTP stand for?',
        options: [
          'HyperText Transfer Protocol',
          'High Transmission Text Path',
          'Hyperlink Transport Terminal Process',
          'Host Transfer Text Protocol',
        ],
        correctIndex: 0,
        timeLimitSec: 20,
      },
      {
        prompt: 'Which bone is the longest in the human body?',
        options: ['Tibia', 'Humerus', 'Femur', 'Radius'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'What is the capital city of Australia?',
        options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which ocean is the deepest on Earth?',
        options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Southern Ocean'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
    ],
  },
  {
    id: 'kitchen-food',
    title: 'Kitchen & Food',
    subtitle: '10 questions · Snacks, cooking & drinks',
    questions: [
      {
        prompt: 'Which spice is the most expensive in the world by weight?',
        options: ['Vanilla', 'Cardamom', 'Saffron', 'Star anise'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'What temperature does water boil at sea level in Celsius?',
        options: ['90°C', '100°C', '110°C', '212°C'],
        correctIndex: 1,
        timeLimitSec: 10,
      },
      {
        prompt: 'Which nut is used to make traditional pesto genovese?',
        options: ['Walnuts', 'Cashews', 'Pine nuts', 'Almonds'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'Botanically speaking, which of these is actually a berry?',
        options: ['Strawberry', 'Raspberry', 'Banana', 'Blackberry'],
        correctIndex: 2,
        timeLimitSec: 20,
      },
      {
        prompt: 'What gives sourdough bread its signature tangy flavor?',
        options: ['Baking soda', 'Lactic acid bacteria', 'Lemon juice', 'Cornstarch'],
        correctIndex: 1,
        timeLimitSec: 20,
      },
      {
        prompt: 'Which country is the origin of the soup dish pho?',
        options: ['Thailand', 'Vietnam', 'Malaysia', 'Cambodia'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'What part of the cacao plant is chocolate made from?',
        options: ['The leaves', 'The bark', 'The seeds', 'The roots'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which cheese is traditionally served on an authentic Greek salad?',
        options: ['Halloumi', 'Feta', 'Ricotta', 'Mozzarella'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'About how long does a soft-boiled chicken egg take in simmering water?',
        options: ['2 minutes', '6 minutes', '14 minutes', '20 minutes'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which fruit carries its seeds on the outside?',
        options: ['Kiwi', 'Fig', 'Strawberry', 'Pomegranate'],
        correctIndex: 2,
        timeLimitSec: 10,
      },
    ],
  },
  {
    id: 'fast-odd',
    title: 'Fast & Odd',
    subtitle: '10 questions · Quick 5–15s timers',
    questions: [
      {
        prompt: 'How many sides does a standard dodecagon have?',
        options: ['10', '12', '14', '20'],
        correctIndex: 1,
        timeLimitSec: 10,
      },
      {
        prompt: 'Which color is NOT on the Olympic rings?',
        options: ['Green', 'Yellow', 'Purple', 'Black'],
        correctIndex: 2,
        timeLimitSec: 5,
      },
      {
        prompt: 'What is the smallest prime number?',
        options: ['0', '1', '2', '3'],
        correctIndex: 2,
        timeLimitSec: 10,
      },
      {
        prompt: 'Which bird can fly backward?',
        options: ['Kingfisher', 'Hummingbird', 'Swift', 'Swallow'],
        correctIndex: 1,
        timeLimitSec: 10,
      },
      {
        prompt: 'How many keys are on a standard full-size piano?',
        options: ['76', '84', '88', '92'],
        correctIndex: 2,
        timeLimitSec: 10,
      },
      {
        prompt: 'Which planet is closest in size to Earth?',
        options: ['Mars', 'Venus', 'Mercury', 'Neptune'],
        correctIndex: 1,
        timeLimitSec: 10,
      },
      {
        prompt: 'What number does the Roman numeral L represent?',
        options: ['10', '50', '100', '500'],
        correctIndex: 1,
        timeLimitSec: 5,
      },
      {
        prompt: 'Which instrument did Louis Armstrong famously play?',
        options: ['Saxophone', 'Trumpet', 'Trombone', 'Clarinet'],
        correctIndex: 1,
        timeLimitSec: 10,
      },
      {
        prompt: 'How many minutes are in a full 24-hour day?',
        options: ['1,200', '1,440', '1,680', '2,400'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which letter does NOT appear in any US state name?',
        options: ['J', 'Q', 'X', 'Z'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
    ],
  },
  {
    id: 'world-places',
    title: 'World & Places',
    subtitle: '10 questions · Capitals, borders & landmarks',
    questions: [
      {
        prompt: 'Which river flows through Cairo?',
        options: ['Amazon', 'Nile', 'Danube', 'Tigris'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which country has the longest coastline in the world?',
        options: ['Russia', 'Indonesia', 'Canada', 'Australia'],
        correctIndex: 2,
        timeLimitSec: 20,
      },
      {
        prompt: 'Mount Kilimanjaro is located in which country?',
        options: ['Kenya', 'Tanzania', 'Ethiopia', 'Uganda'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which city sits across two continents — Europe and Asia?',
        options: ['Athens', 'Baku', 'Istanbul', 'Tbilisi'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'What is the smallest independent country in the world by land area?',
        options: ['Monaco', 'San Marino', 'Vatican City', 'Liechtenstein'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which desert covers much of northern China and southern Mongolia?',
        options: ['Atacama', 'Gobi', 'Kalahari', 'Karakum'],
        correctIndex: 1,
        timeLimitSec: 20,
      },
      {
        prompt: 'Which European country is known as the Land of Fire and Ice?',
        options: ['Norway', 'Finland', 'Iceland', 'Scotland'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which US state is closest to Russia?',
        options: ['Washington', 'Hawaii', 'Alaska', 'Maine'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'What is the capital city of Japan?',
        options: ['Kyoto', 'Osaka', 'Tokyo', 'Yokohama'],
        correctIndex: 2,
        timeLimitSec: 10,
      },
      {
        prompt: 'Which strait separates Spain from Morocco?',
        options: [
          'Strait of Hormuz',
          'Bering Strait',
          'Strait of Gibraltar',
          'Strait of Malacca',
        ],
        correctIndex: 2,
        timeLimitSec: 20,
      },
    ],
  },
  {
    id: 'screen-sound',
    title: 'Screen & Sound',
    subtitle: '10 questions · Film, music & classics',
    questions: [
      {
        prompt: 'How many strings does a standard concert violin have?',
        options: ['4', '5', '6', '8'],
        correctIndex: 0,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which animated Studio Ghibli film features the spirit No-Face?',
        options: [
          'My Neighbor Totoro',
          'Spirited Away',
          'Howl’s Moving Castle',
          'Princess Mononoke',
        ],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'In music notation, what does the dynamic marking "forte" tell a player to do?',
        options: ['Play softly', 'Play loudly', 'Slow down', 'Hold the note'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which 1994 film follows two strangers talking from sunset to sunrise in Vienna?',
        options: ['Before Sunrise', 'Lost in Translation', 'Amélie', 'Chungking Express'],
        correctIndex: 0,
        timeLimitSec: 20,
      },
      {
        prompt: 'Which brass instrument uses a slide instead of valves to change pitch?',
        options: ['French horn', 'Tuba', 'Trombone', 'Cornet'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'Who composed the film scores for Jaws, Star Wars, and Jurassic Park?',
        options: ['Hans Zimmer', 'Ennio Morricone', 'John Williams', 'Howard Shore'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'In Toy Story, what is the name of the boy who owns Woody and Buzz?',
        options: ['Sid', 'Andy', 'Billy', 'Tommy'],
        correctIndex: 1,
        timeLimitSec: 10,
      },
      {
        prompt: 'How many beats are in a bar of standard 3/4 waltz time?',
        options: ['2', '3', '4', '6'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which 2019 South Korean film won the Oscar for Best Picture?',
        options: ['Oldboy', 'Minari', 'Parasite', 'Train to Busan'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which Beatles album cover shows the band walking across a zebra crossing?',
        options: ['Revolver', 'Rubber Soul', 'Abbey Road', 'Let It Be'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
    ],
  },
  {
    id: 'weird-science',
    title: 'Weird Science',
    subtitle: '10 questions · Animals, space & odd physics',
    questions: [
      {
        prompt: 'Which metal is liquid at standard room temperature?',
        options: ['Gallium', 'Mercury', 'Lead', 'Sodium'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'Roughly how long does light from the Sun take to reach Earth?',
        options: ['8 seconds', '8 minutes', '8 hours', '8 days'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which blood type is known as the universal red-cell donor?',
        options: ['AB positive', 'O negative', 'A positive', 'B negative'],
        correctIndex: 1,
        timeLimitSec: 20,
      },
      {
        prompt: 'What kind of animal is a Komodo dragon?',
        options: ['Amphibian', 'Monitor lizard', 'Crocodilian', 'Gecko'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'What gas makes up about 78% of Earth’s atmosphere?',
        options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'Why do astronauts float aboard the International Space Station?',
        options: [
          'There is zero gravity there',
          'They are in continuous free fall',
          'The hull blocks Earth’s gravity',
          'Cabin pressure pushes them up',
        ],
        correctIndex: 1,
        timeLimitSec: 20,
      },
      {
        prompt: 'Which sense works most closely with taste to create flavor?',
        options: ['Hearing', 'Smell', 'Touch', 'Sight'],
        correctIndex: 1,
        timeLimitSec: 10,
      },
      {
        prompt: 'What is the hardest naturally occurring mineral on the Mohs scale?',
        options: ['Quartz', 'Corundum', 'Topaz', 'Diamond'],
        correctIndex: 3,
        timeLimitSec: 15,
      },
      {
        prompt: 'How many legs does a honeybee have?',
        options: ['4', '6', '8', '10'],
        correctIndex: 1,
        timeLimitSec: 10,
      },
      {
        prompt: 'What happens to the boiling point of water at high mountain altitudes?',
        options: [
          'It stays at 100°C',
          'It drops below 100°C',
          'It rises above 100°C',
          'Water stops boiling',
        ],
        correctIndex: 1,
        timeLimitSec: 20,
      },
    ],
  },
  {
    id: 'everyday-oddities',
    title: 'Everyday Oddities',
    subtitle: '10 questions · Objects, words & clever habits',
    questions: [
      {
        prompt: 'What are the small plastic or metal tips at the ends of shoelaces called?',
        options: ['Eyelets', 'Aglets', 'Ferrels', 'Grommets'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'On a standard QWERTY keyboard, which letter sits directly between A and D?',
        options: ['Q', 'S', 'W', 'X'],
        correctIndex: 1,
        timeLimitSec: 10,
      },
      {
        prompt: 'How many dots in total appear on a standard six-sided die?',
        options: ['18', '20', '21', '24'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which month was named after the Roman statesman Julius Caesar?',
        options: ['June', 'July', 'August', 'January'],
        correctIndex: 1,
        timeLimitSec: 10,
      },
      {
        prompt: 'What color is the "0" pocket on a standard roulette wheel?',
        options: ['Red', 'Black', 'Green', 'White'],
        correctIndex: 2,
        timeLimitSec: 15,
      },
      {
        prompt: 'Which standard playing card suit is shaped like a three-leafed clover?',
        options: ['Spades', 'Hearts', 'Diamonds', 'Clubs'],
        correctIndex: 3,
        timeLimitSec: 10,
      },
      {
        prompt: 'How many full weeks are in a standard 365-day year (with 1 day left over)?',
        options: ['50', '52', '54', '56'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
      {
        prompt: 'In chess, which piece is the only one allowed to jump over other pieces?',
        options: ['Bishop', 'Rook', 'Knight', 'Queen'],
        correctIndex: 2,
        timeLimitSec: 10,
      },
      {
        prompt: 'What do the letters "ZIP" stand for in a US ZIP code?',
        options: [
          'Zone Index Point',
          'Zone Improvement Plan',
          'Zero Interruption Post',
          'Zonal Itinerary Path',
        ],
        correctIndex: 1,
        timeLimitSec: 20,
      },
      {
        prompt: 'What word describes reading the same forwards and backwards, like "kayak"?',
        options: ['Anagram', 'Palindrome', 'Oxymoron', 'Alliteration'],
        correctIndex: 1,
        timeLimitSec: 15,
      },
    ],
  },
];

export const TEXT_FORMAT_SPEC_EXAMPLE = `Whose turn was it to take the bins out on Tuesday?
The person who noticed
Nobody claimed it
*Whoever overflowed it
Next week's problem

Which burner on the stove actually heats evenly?
A) Front left
B) Back right
C) None of them
D) Only the kettle
Answer: A

Who always finishes the milk and puts the empty carton back?
- Sam
- Ada (correct)
- Leo`;

export const JSON_FORMAT_SPEC_EXAMPLE = `[
  {
    "prompt": "Whose turn was it to take the bins out on Tuesday?",
    "options": ["The person who noticed", "Nobody claimed it", "Whoever overflowed it", "Next week's problem"],
    "correctIndex": 2,
    "timeLimitSec": 20
  }
]`;

export const CSV_FORMAT_SPEC_EXAMPLE = `prompt,option1,option2,option3,option4,correctIndex,timeLimitSec
"Whose turn was it to take the bins out?",The person who noticed,Nobody claimed it,Whoever overflowed it,Next week's problem,2,20`;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function validateQuestionInput(
  item: unknown,
  indexLabel: string,
): { question?: QuestionInput; error?: string } {
  if (!item || typeof item !== 'object') {
    return { error: `${indexLabel}: Must be an object.` };
  }
  const obj = item as Record<string, unknown>;
  const prompt = typeof obj.prompt === 'string' ? obj.prompt.trim() : '';
  if (!prompt) {
    return { error: `${indexLabel}: Question prompt is required.` };
  }
  if (!Array.isArray(obj.options)) {
    return { error: `${indexLabel}: Provide 2 to 4 options.` };
  }
  const options = obj.options
    .map((o) => (typeof o === 'string' ? o.trim() : String(o ?? '').trim()))
    .filter((o) => o.length > 0);
  if (options.length < 2 || options.length > 4) {
    return { error: `${indexLabel}: Provide 2 to 4 non-empty options (found ${options.length}).` };
  }
  const correctRaw = Number(obj.correctIndex);
  if (!Number.isInteger(correctRaw) || correctRaw < 0 || correctRaw >= options.length) {
    return {
      error: `${indexLabel}: Correct answer index must be between 0 and ${options.length - 1}.`,
    };
  }
  const timeRaw = obj.timeLimitSec !== undefined ? Number(obj.timeLimitSec) : 20;
  const timeLimitSec = Number.isFinite(timeRaw)
    ? Math.max(5, Math.min(120, Math.round(timeRaw)))
    : 20;

  return {
    question: {
      prompt,
      options,
      correctIndex: correctRaw,
      timeLimitSec,
    },
  };
}

function stripQuestionPrefix(rawPrompt: string): { prompt: string; inlineTimeSec?: number } {
  let text = rawPrompt.trim();
  // Strip leading "Q1:", "Q1.", "1.", "1)"
  text = text.replace(/^(?:Q\s*\d+\s*[.):\-]\s*|\d+\s*[.)]\s+)/i, '').trim();

  // Optional trailing time hint like "(15s)" or "[15s]"
  let inlineTimeSec: number | undefined;
  const timeMatch = text.match(/\s*(?:\(|\[)(\d+)\s*s(?:\)|\])\s*$/i);
  if (timeMatch) {
    const parsed = Number(timeMatch[1]);
    if (Number.isFinite(parsed) && parsed >= 5 && parsed <= 120) {
      inlineTimeSec = parsed;
      text = text.slice(0, timeMatch.index).trim();
    }
  }

  return { prompt: text, inlineTimeSec };
}

function parseOptionLine(rawLine: string): {
  text: string;
  markedCorrect: boolean;
  starBullet: boolean;
} {
  let text = rawLine.trim();
  let markedCorrect = false;
  let starBullet = false;

  // Leading checkbox or checkmark: [x], (x), ✓, ✔
  if (/^(?:\[x\]|\(x\)|[✓✔])\s*/i.test(text)) {
    markedCorrect = true;
    text = text.replace(/^(?:\[x\]|\(x\)|[✓✔])\s*/i, '').trim();
  }

  // Leading asterisk (*Option or * Option)
  if (/^\*\s*/.test(text)) {
    starBullet = /^\*\s+/.test(text);
    markedCorrect = true;
    text = text.replace(/^\*\s*/, '').trim();
  }

  // Leading bullet (- , • , — )
  text = text.replace(/^(?:[-•—]+)\s+/, '').trim();

  // Leading option letter or number: "A)", "A.", "A:", "1)", "1."
  text = text.replace(/^(?:[A-Da-d]|[1-4])\s*[).:\-]\s+/, '').trim();

  // Re-check asterisk right after option label, e.g. "A) *Option"
  if (/^\*\s*/.test(text)) {
    markedCorrect = true;
    starBullet = false;
    text = text.replace(/^\*\s*/, '').trim();
  }

  // Trailing markers: "(correct)", "[correct]", "(right)", "✓", "✔", or trailing "*"
  if (/\s*(?:\((?:correct|right)\)|\[(?:correct|right)\]|[✓✔]|\*)\s*$/i.test(text)) {
    markedCorrect = true;
    text = text
      .replace(/\s*(?:\((?:correct|right)\)|\[(?:correct|right)\]|[✓✔]|\*)\s*$/i, '')
      .trim();
  }

  return { text, markedCorrect, starBullet };
}

function splitPlainTextBlocks(raw: string): string[][] {
  const rawLines = raw.split(/\r?\n/).map((l) => l.trim());
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of rawLines) {
    if (!line) {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
      continue;
    }

    // If no blank line was left between numbered questions (e.g. "1. ..." then "2. ..."),
    // split automatically once the current block already looks like a complete question (>= 3 lines).
    const looksLikeNewQuestion =
      current.length >= 3 &&
      /^(?:Q\s*\d+\s*[.):\-]|\d+\s*[.)])\s+\S/i.test(line) &&
      !/^[1-4]\s*[.)]\s+/.test(current[1] ?? '');

    if (looksLikeNewQuestion) {
      blocks.push(current);
      current = [line];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

function parsePlainTextQuestions(raw: string): { questions: QuestionInput[]; errors: string[] } {
  const blocks = splitPlainTextBlocks(raw);
  if (blocks.length === 0) {
    return { questions: [], errors: ['Paste your questions first.'] };
  }

  const questions: QuestionInput[] = [];
  const errors: string[] = [];

  blocks.forEach((lines, idx) => {
    const label = `Question #${idx + 1}`;
    const { prompt, inlineTimeSec } = stripQuestionPrefix(lines[0]);
    const shortName = prompt.length > 36 ? `${prompt.slice(0, 36)}…` : prompt;

    if (!prompt) {
      errors.push(`${label}: Missing question text.`);
      return;
    }

    const parsedOptions: { text: string; markedCorrect: boolean; starBullet: boolean }[] = [];
    let explicitAnswer: string | null = null;
    let timeLimitSec = inlineTimeSec ?? 20;

    for (const line of lines.slice(1)) {
      const timeMatch = line.match(/^(?:time|timer|limit)\s*:\s*(\d+)\s*s?$/i);
      if (timeMatch) {
        const t = Number(timeMatch[1]);
        if (Number.isFinite(t)) {
          timeLimitSec = Math.max(5, Math.min(120, Math.round(t)));
        }
        continue;
      }

      const ansMatch = line.match(/^(?:answer|ans|correct)\s*:\s*(.+)$/i);
      if (ansMatch) {
        explicitAnswer = ansMatch[1].trim();
        continue;
      }

      const opt = parseOptionLine(line);
      if (opt.text.length > 0) {
        parsedOptions.push(opt);
      }
    }

    if (parsedOptions.length < 2) {
      errors.push(`${label} (“${shortName}”): Needs at least 2 options below the question.`);
      return;
    }
    if (parsedOptions.length > 4) {
      errors.push(
        `${label} (“${shortName}”): Max 4 options per question (found ${parsedOptions.length}).`,
      );
      return;
    }

    const options = parsedOptions.map((o) => o.text);
    let correctIndex = -1;

    if (explicitAnswer !== null) {
      const cleanAns = explicitAnswer.replace(/^[A-Da-d]\s*[).:\-]\s*/, '').trim();
      const letterMatch = explicitAnswer.match(/^([A-Da-d])(?:[).:\s]|$)/);
      if (letterMatch) {
        const idxFromLetter = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
        if (idxFromLetter >= 0 && idxFromLetter < options.length) {
          correctIndex = idxFromLetter;
        }
      }
      if (correctIndex === -1 && /^\d+$/.test(explicitAnswer)) {
        const num = Number(explicitAnswer);
        if (num >= 1 && num <= options.length) {
          correctIndex = num - 1;
        }
      }
      if (correctIndex === -1) {
        const lowerAns = cleanAns.toLowerCase();
        correctIndex = options.findIndex((o) => o.toLowerCase() === lowerAns);
      }
      if (correctIndex === -1) {
        errors.push(
          `${label} (“${shortName}”): Couldn't match “Answer: ${explicitAnswer}” to an option.`,
        );
        return;
      }
    } else {
      const markedIndices = parsedOptions
        .map((o, i) => (o.markedCorrect ? i : -1))
        .filter((i) => i !== -1);

      const allStarBullets = parsedOptions.every((o) => o.starBullet);

      if (markedIndices.length === 0 || allStarBullets) {
        errors.push(
          `${label} (“${shortName}”): Mark the right answer with * (e.g. *${options[0]}) or add Answer: A.`,
        );
        return;
      }
      if (markedIndices.length > 1) {
        errors.push(
          `${label} (“${shortName}”): More than one option is marked — mark just one right answer.`,
        );
        return;
      }
      correctIndex = markedIndices[0];
    }

    const res = validateQuestionInput(
      { prompt, options, correctIndex, timeLimitSec },
      label,
    );
    if (res.question) questions.push(res.question);
    if (res.error) errors.push(res.error);
  });

  return { questions, errors };
}

function looksLikeCsv(trimmed: string): boolean {
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return false;

  const firstCols = parseCsvLine(lines[0]).map((c) => c.toLowerCase());
  if (
    firstCols.length >= 4 &&
    (firstCols[0] === 'prompt' || firstCols[0] === 'question' || firstCols.includes('correctindex'))
  ) {
    return true;
  }

  // Every single line has >= 4 CSV columns (prompt, opt1, opt2, correctIndex)
  return lines.every((line) => parseCsvLine(line).length >= 4);
}

export function parseQuestionsInput(raw: string): { questions: QuestionInput[]; errors: string[] } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { questions: [], errors: ['Paste your questions first.'] };
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed)
        ? parsed
        : parsed &&
            typeof parsed === 'object' &&
            Array.isArray((parsed as Record<string, unknown>).questions)
          ? ((parsed as Record<string, unknown>).questions as unknown[])
          : null;

      if (!list) {
        return {
          questions: [],
          errors: ['JSON must be an array of question objects or { "questions": [...] }.'],
        };
      }
      if (list.length === 0) {
        return { questions: [], errors: ['JSON array is empty.'] };
      }

      const questions: QuestionInput[] = [];
      const errors: string[] = [];
      list.forEach((item, idx) => {
        const res = validateQuestionInput(item, `Question #${idx + 1}`);
        if (res.question) questions.push(res.question);
        if (res.error) errors.push(res.error);
      });
      return { questions, errors };
    } catch (err) {
      return {
        questions: [],
        errors: [`Invalid JSON syntax: ${err instanceof Error ? err.message : 'Unable to parse'}`],
      };
    }
  }

  if (looksLikeCsv(trimmed)) {
    const lines = trimmed
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const firstCols = parseCsvLine(lines[0]).map((c) => c.toLowerCase());
    const hasHeader =
      firstCols[0] === 'prompt' || firstCols[0] === 'question' || firstCols.includes('correctindex');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    if (dataLines.length === 0) {
      return { questions: [], errors: ['CSV has a header row but no question rows.'] };
    }

    const questions: QuestionInput[] = [];
    const errors: string[] = [];

    dataLines.forEach((line, idx) => {
      const cols = parseCsvLine(line);
      const rowLabel = `Row ${idx + (hasHeader ? 2 : 1)}`;
      if (cols.length < 4) {
        errors.push(`${rowLabel}: Needs at least prompt, 2 options, and correct answer.`);
        return;
      }

      const prompt = cols[0];
      let options: string[] = [];
      let correctIndexRaw = '';
      let timeRaw = '20';

      if (cols.length >= 6) {
        options = cols.slice(1, 5).filter((o) => o.length > 0);
        correctIndexRaw = cols[5];
        timeRaw = cols[6] || '20';
      } else {
        const last = cols[cols.length - 1];
        const secondLast = cols[cols.length - 2];
        if (/^\d+$/.test(last) && /^\d+$/.test(secondLast) && cols.length >= 5) {
          options = cols.slice(1, cols.length - 2).filter((o) => o.length > 0);
          correctIndexRaw = secondLast;
          timeRaw = last;
        } else {
          options = cols.slice(1, cols.length - 1).filter((o) => o.length > 0);
          correctIndexRaw = last;
        }
      }

      const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      const upper = correctIndexRaw.toUpperCase();
      const correctIndex = upper in letterMap ? letterMap[upper] : Number(correctIndexRaw);

      const res = validateQuestionInput(
        {
          prompt,
          options,
          correctIndex,
          timeLimitSec: Number(timeRaw) || 20,
        },
        rowLabel,
      );
      if (res.question) questions.push(res.question);
      if (res.error) errors.push(res.error);
    });

    return { questions, errors };
  }

  return parsePlainTextQuestions(trimmed);
}
