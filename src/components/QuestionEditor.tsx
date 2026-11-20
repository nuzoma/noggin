import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  PRESET_PACKS,
  TEXT_FORMAT_SPEC_EXAMPLE,
  parseQuestionsInput,
  type PresetPack,
} from '../shared/presets';
import type { Question, QuestionInput } from '../shared/types';

interface QuestionEditorProps {
  title: string;
  questions: Question[];
  onTitleChange: (nextTitle: string) => void;
  onChange: (next: QuestionInput[]) => void;
  onOpenLobby: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const MIN_QUESTIONS = 10;
const MAX_QUESTIONS = 50;

export function QuestionEditor({
  title,
  questions,
  onTitleChange,
  onChange,
  onOpenLobby,
}: QuestionEditorProps) {
  const [roundTitle, setRoundTitle] = useState(title);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [timeLimitSec, setTimeLimitSec] = useState(20);
  const [formError, setFormError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [pendingPresetId, setPendingPresetId] = useState<string | null>(null);

  useEffect(() => {
    setRoundTitle(title);
  }, [title]);

  const toInputs = (list: Question[]): QuestionInput[] =>
    list.map((q) => ({
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex,
      timeLimitSec: q.timeLimitSec,
    }));

  const resetForm = () => {
    setEditingIndex(null);
    setPrompt('');
    setOptions(['', '']);
    setCorrectIndex(null);
    setTimeLimitSec(20);
    setFormError(null);
  };

  const handleEditClick = (idx: number) => {
    const q = questions[idx];
    if (!q) return;
    setEditingIndex(idx);
    setPrompt(q.prompt);
    setOptions(q.options.length >= 2 ? [...q.options] : ['', '']);
    setCorrectIndex(q.correctIndex);
    setTimeLimitSec(q.timeLimitSec);
    setFormError(null);
  };

  const handleAddOptionField = () => {
    if (options.length < 4) {
      setOptions([...options, '']);
    }
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    setStartError(null);

    if (editingIndex === null && questions.length >= MAX_QUESTIONS) {
      setFormError(`That's the max — ${MAX_QUESTIONS} questions per round. Trim one to add another.`);
      return;
    }

    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setFormError('Write a question prompt first.');
      return;
    }

    const kept: { text: string; wasSelected: boolean }[] = [];
    options.forEach((opt, i) => {
      const t = opt.trim();
      if (t.length > 0) {
        kept.push({ text: t, wasSelected: i === correctIndex });
      }
    });

    if (kept.length < 2) {
      setFormError('Give people at least two options to pick from.');
      return;
    }

    const mappedCorrect = kept.findIndex((k) => k.wasSelected);
    if (mappedCorrect === -1) {
      setFormError('This question needs a correct answer picked before you can save it.');
      return;
    }

    const newItem: QuestionInput = {
      prompt: cleanPrompt,
      options: kept.map((k) => k.text),
      correctIndex: mappedCorrect,
      timeLimitSec,
    };

    const current = toInputs(questions);
    if (editingIndex !== null && current[editingIndex]) {
      current[editingIndex] = newItem;
    } else {
      current.push(newItem);
    }

    onChange(current);
    resetForm();
  };

  const handleDelete = (idx: number) => {
    const current = toInputs(questions);
    current.splice(idx, 1);
    onChange(current);
    if (editingIndex === idx) resetForm();
    setStartError(null);
  };

  const handleMove = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    const current = toInputs(questions);
    const [item] = current.splice(idx, 1);
    current.splice(target, 0, item);
    onChange(current);
    if (editingIndex === idx) setEditingIndex(target);
  };

  const handleImportSubmit = () => {
    const result = parseQuestionsInput(importText);
    if (result.errors.length > 0) {
      setImportErrors(result.errors);
      return;
    }

    const current = toInputs(questions);
    const combined =
      importMode === 'replace' ? result.questions : [...current, ...result.questions];

    if (combined.length > MAX_QUESTIONS) {
      setImportErrors([
        `That's the max — ${MAX_QUESTIONS} questions per round. Trim one to add another.`,
      ]);
      return;
    }

    onChange(combined);
    setImportText('');
    setImportErrors([]);
    setStartError(null);
    setShowImportModal(false);
  };

  const handleApplyPreset = (pack: PresetPack, mode: 'replace' | 'append') => {
    const current = toInputs(questions);
    const next = mode === 'replace' ? pack.questions : [...current, ...pack.questions];
    if (next.length > MAX_QUESTIONS) {
      setStartError(
        `Adding ${pack.questions.length} would pass the ${MAX_QUESTIONS}-question max. Replace or trim first.`,
      );
      return;
    }
    onChange(next);
    if (
      mode === 'replace' &&
      (!roundTitle.trim() || roundTitle.trim().toLowerCase() === 'untitled house round')
    ) {
      setRoundTitle(pack.title);
      onTitleChange(pack.title);
    }
    setPendingPresetId(null);
    setStartError(null);
  };

  const handleTryOpenLobby = () => {
    if (questions.length < MIN_QUESTIONS) {
      setStartError(
        `Almost there — you need at least ${MIN_QUESTIONS} questions to start. You've got ${questions.length}.`,
      );
      return;
    }
    setStartError(null);
    onOpenLobby();
  };

  const countHelper = () => {
    const n = questions.length;
    if (n === 0) return 'Add at least 10 to start. You have 0.';
    if (n < MIN_QUESTIONS) return `Add at least 10 to start. You've got ${n}.`;
    if (n === MIN_QUESTIONS)
      return "10 questions — that's a proper short round. Add more if you like, up to 50.";
    if (n < MAX_QUESTIONS) return `${n} questions locked in. Add more or start whenever.`;
    return "That's the max — 50 questions. Ready when you are.";
  };

  const canStart = questions.length >= MIN_QUESTIONS;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 min-w-0">
      {/* Header & Round Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-border bg-surface min-w-0">
        <div className="space-y-3 flex-1 min-w-0 max-w-xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-text">
              Host setup
            </h1>
            <span className="font-mono text-xs font-bold text-muted tabular-nums whitespace-nowrap">
              Questions · {questions.length} of {MAX_QUESTIONS}
            </span>
          </div>
          <div>
            <label htmlFor="round-title" className="block text-xs font-bold text-muted mb-1">
              Your round
            </label>
            <input
              id="round-title"
              type="text"
              maxLength={60}
              value={roundTitle}
              onChange={(e) => setRoundTitle(e.target.value)}
              onBlur={() => onTitleChange(roundTitle)}
              placeholder="Untitled house round"
              className="w-full min-w-0 h-11 rounded-[14px] border border-border focus:border-accent bg-surface-2 px-4 text-sm font-semibold text-text placeholder:text-faint focus:outline-none"
            />
          </div>
          <p className="text-xs font-medium text-muted">{countHelper()}</p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setImportErrors([]);
                setShowImportModal(true);
              }}
              className="btn-secondary inline-flex items-center gap-2 px-4 h-12 text-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              Paste a list
            </button>
            <button
              type="button"
              onClick={handleTryOpenLobby}
              className={`btn-primary inline-flex items-center gap-2 px-6 h-12 text-sm whitespace-nowrap shrink-0 cursor-pointer ${
                !canStart ? 'opacity-65' : ''
              }`}
            >
              {canStart ? 'Start round' : 'Start round (needs 10+)'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {canStart && !startError && (
            <p className="text-xs text-muted">
              Ready when you are. We&apos;ll give you a code to share.
            </p>
          )}
          {startError && (
            <p className="text-xs font-semibold text-danger" role="alert">
              {startError}
            </p>
          )}
        </div>
      </div>

      {/* Preset Rounds */}
      <section className="space-y-3 min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display font-bold text-base text-text">Preset rounds</h2>
          <p className="text-xs text-muted">
            One tap loads 10 ready-to-play questions. Tweak or add more anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-w-0">
          {PRESET_PACKS.map((pack) => {
            const isPending = pendingPresetId === pack.id;
            const canAppend = questions.length + pack.questions.length <= MAX_QUESTIONS;
            return (
              <div
                key={pack.id}
                className="bg-surface rounded-2xl border border-border p-4 flex flex-col justify-between gap-3 min-w-0"
              >
                <div className="space-y-1 min-w-0">
                  <p className="font-display font-bold text-base text-text truncate">
                    {pack.title}
                  </p>
                  <p className="text-xs text-muted break-words">{pack.subtitle}</p>
                </div>

                {isPending ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {canAppend && (
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(pack, 'append')}
                        className="btn-secondary px-3 py-1.5 text-xs cursor-pointer whitespace-nowrap"
                      >
                        Add +10
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(pack, 'replace')}
                      className="btn-primary px-3 py-1.5 text-xs cursor-pointer whitespace-nowrap"
                    >
                      Replace queue
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingPresetId(null)}
                      className="btn-ghost px-2.5 py-1.5 text-xs cursor-pointer whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        if (questions.length === 0) {
                          handleApplyPreset(pack, 'replace');
                        } else {
                          setPendingPresetId(pack.id);
                        }
                      }}
                      className="btn-secondary px-3.5 py-1.5 text-xs cursor-pointer whitespace-nowrap"
                    >
                      {questions.length === 0 ? 'Use this round' : 'Load preset'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Add / Edit Question Form */}
        <form
          onSubmit={handleSaveQuestion}
          className="lg:col-span-6 bg-surface rounded-2xl border border-border p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-text">
              {editingIndex !== null ? `Edit question #${editingIndex + 1}` : 'Add a question'}
            </h2>
            {(editingIndex !== null || prompt || options.some((o) => o)) && (
              <button
                type="button"
                onClick={resetForm}
                className="btn-ghost text-xs underline underline-offset-4 px-2 py-1 cursor-pointer"
              >
                Discard
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1.5">Question</label>
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Who left the dishes in the sink for three days?"
              className="w-full rounded-[14px] border border-border focus:border-accent focus:outline-none px-4 py-3 text-base bg-surface-2 text-text placeholder:text-faint resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-text">
                Options — tap the circle next to the right one
              </label>
            </div>
            <div className="space-y-2.5 min-w-0">
              {options.map((val, idx) => {
                const isCorrect = correctIndex === idx;
                return (
                  <div key={idx} className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(idx)}
                      aria-label={`Mark option ${OPTION_LETTERS[idx]} as correct`}
                      className={`w-10 h-10 rounded-full border-[1.5px] flex items-center justify-center font-display font-bold text-sm shrink-0 transition-colors cursor-pointer ${
                        isCorrect
                          ? 'bg-success-soft border-success text-success'
                          : 'bg-surface border-border text-muted hover:border-accent hover:text-accent'
                      }`}
                    >
                      {isCorrect ? <Check className="w-4 h-4 stroke-[2.5]" /> : OPTION_LETTERS[idx]}
                    </button>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const next = [...options];
                        next[idx] = e.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Option ${OPTION_LETTERS[idx]}`}
                      className="flex-1 min-w-0 w-full h-11 rounded-[14px] border border-border focus:border-accent focus:outline-none px-4 text-sm bg-surface-2 text-text placeholder:text-faint"
                    />
                  </div>
                );
              })}
            </div>

            {options.length < 4 && (
              <button
                type="button"
                onClick={handleAddOptionField}
                className="btn-ghost mt-2.5 inline-flex items-center gap-1 text-xs px-2 py-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add option
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-text">Time per question</span>
              <div className="flex items-center gap-1 p-1 rounded-[14px] bg-surface-2 border border-border">
                {[5, 10, 20, 30].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTimeLimitSec(sec)}
                    className={`px-2.5 sm:px-3 py-1 rounded-[10px] text-xs font-mono font-bold tabular-nums transition-colors cursor-pointer ${
                      timeLimitSec === sec
                        ? 'bg-accent text-on-accent'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-2 px-5 h-11 text-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              {editingIndex !== null ? 'Update question' : 'Add question'}
            </button>
          </div>

          {formError && (
            <p className="text-sm font-medium text-danger" role="alert">
              {formError}
            </p>
          )}
        </form>

        {/* Right: Question Queue */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-text">Question queue</h2>
            <span className="text-xs font-mono text-muted tabular-nums">
              {questions.length} of {MAX_QUESTIONS}
            </span>
          </div>

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-2">
              <p className="font-display font-bold text-base text-text">No questions yet</p>
              <p className="text-sm text-muted">Add one on the left or paste a list in one go.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-surface rounded-2xl border border-border hover:border-accent transition-colors p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono text-muted tabular-nums mb-1">
                      Q{idx + 1} · {q.timeLimitSec}s · Answer: {OPTION_LETTERS[q.correctIndex]}
                    </div>
                    <p className="font-display font-bold text-base text-text leading-snug break-words">
                      {q.prompt}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      {q.options.map((opt, oIdx) => (
                        <span
                          key={oIdx}
                          className={`break-words ${oIdx === q.correctIndex ? 'font-bold text-success' : ''}`}
                        >
                          {OPTION_LETTERS[oIdx]}. {opt}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/60">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move question up"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2 hover:text-text disabled:opacity-25 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      disabled={idx === questions.length - 1}
                      aria-label="Move question down"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2 hover:text-text disabled:opacity-25 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditClick(idx)}
                      aria-label="Edit question"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2 hover:text-accent cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      aria-label="Delete question"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-danger hover:bg-danger-soft cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paste a list modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Paste a list of questions"
        >
          <div className="bg-surface rounded-3xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display font-extrabold text-xl text-text">Paste a list</h2>
                <p className="text-xs text-muted mt-0.5 break-words">
                  Paste normal text — leave a blank line between questions, and put * on the right answer (or add Answer: A).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                aria-label="Close paste modal"
                className="btn-secondary w-9 h-9 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setImportText(TEXT_FORMAT_SPEC_EXAMPLE);
                  setImportErrors([]);
                }}
                className="btn-secondary px-3 py-1.5 cursor-pointer"
              >
                Load example
              </button>
              <span className="text-muted">
                Supports plain text, A/B/C/D, bullets, *, (correct), or Answer:
              </span>
            </div>

            <textarea
              rows={10}
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportErrors([]);
              }}
              placeholder={`Who left the fridge open?\nSam\n*Ada\nLeo\n\nWhich burner heats evenly?\nA) Front left\nB) Back right\nAnswer: A`}
              className="w-full rounded-[14px] border border-border bg-surface-2 text-text placeholder:text-faint p-4 text-sm leading-relaxed focus:outline-none focus:border-accent"
            />

            {importText.trim().length > 0 && importErrors.length === 0 && (() => {
              const preview = parseQuestionsInput(importText);
              if (preview.questions.length > 0 && preview.errors.length === 0) {
                return (
                  <p className="text-xs font-semibold text-success tabular-nums">
                    Ready to add · {preview.questions.length}{' '}
                    {preview.questions.length === 1 ? 'question' : 'questions'} detected.
                  </p>
                );
              }
              return null;
            })()}

            {importErrors.length > 0 && (
              <div className="rounded-2xl bg-danger-soft border border-danger p-3.5 space-y-1">
                {importErrors.map((err, i) => (
                  <p key={i} className="text-xs font-semibold text-danger">
                    • {err}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1 p-1 rounded-[14px] bg-surface-2 border border-border w-fit">
                <button
                  type="button"
                  onClick={() => setImportMode('append')}
                  className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold cursor-pointer ${
                    importMode === 'append' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
                  }`}
                >
                  Add to queue
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold cursor-pointer ${
                    importMode === 'replace' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
                  }`}
                >
                  Replace queue
                </button>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="btn-ghost px-4 py-2.5 text-sm cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  className="btn-primary px-5 py-2.5 text-sm cursor-pointer"
                >
                  Add questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
