import type { QuestionInput } from './types';

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
