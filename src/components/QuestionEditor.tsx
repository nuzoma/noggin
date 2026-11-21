import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ClipboardList,
  Layers,
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

  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [presetTimeSec, setPresetTimeSec] = useState<'default' | number>('default');
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
    const presetQuestions: QuestionInput[] =
      presetTimeSec === 'default'
        ? pack.questions
        : pack.questions.map((q) => ({ ...q, timeLimitSec: presetTimeSec }));
    const current = toInputs(questions);
    const next = mode === 'replace' ? presetQuestions : [...current, ...presetQuestions];
    if (next.length > MAX_QUESTIONS) {
      setStartError(
        `Adding ${presetQuestions.length} would pass the ${MAX_QUESTIONS}-question max. Replace or trim first.`,
      );
      setShowPresetsModal(false);
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
    setShowPresetsModal(false);
    setStartError(null);
  };

  const handleApplyAllTimers = (sec: number) => {
    if (questions.length === 0) return;
    onChange(
      toInputs(questions).map((q) => ({
        ...q,
        timeLimitSec: sec,
      })),
    );
    if (editingIndex !== null) {
      setTimeLimitSec(sec);
    }
  };

  const handleTryOpenLobby = () => {
    if (questions.length < MIN_QUESTIONS) {
      setStartError(
        `You need at least ${MIN_QUESTIONS} questions to start (currently ${questions.length}).`,
      );
      return;
    }
    setStartError(null);
    onOpenLobby();
  };

  const canStart = questions.length >= MIN_QUESTIONS;
  const countStatus =
    questions.length < MIN_QUESTIONS
      ? `${questions.length} of ${MIN_QUESTIONS} minimum`
      : `${questions.length} of ${MAX_QUESTIONS} · Ready to host`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 min-w-0">
      {/* Streamlined Setup Bar */}
      <div className="pb-5 border-b border-border flex flex-col lg:flex-row lg:items-end justify-between gap-4 min-w-0">
        <div className="space-y-2 flex-1 min-w-0 max-w-lg">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="round-title" className="text-xs font-bold text-muted">
              Round title
            </label>
            <span className="font-mono text-xs font-semibold text-muted tabular-nums whitespace-nowrap">
              {countStatus}
            </span>
          </div>
          <input
            id="round-title"
            type="text"
            maxLength={60}
            value={roundTitle}
            onChange={(e) => setRoundTitle(e.target.value)}
            onBlur={() => onTitleChange(roundTitle)}
            placeholder="Untitled house round"
            className="w-full min-w-0 h-11 rounded-[14px] border border-border focus:border-accent bg-surface px-4 text-base font-display font-bold text-text placeholder:text-faint focus:outline-none"
          />
          {startError && (
            <p className="text-xs font-semibold text-danger" role="alert">
              {startError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setPendingPresetId(null);
              setShowPresetsModal(true);
            }}
            className="btn-secondary inline-flex items-center gap-2 px-4 h-11 text-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            Preset rounds
          </button>
          <button
            type="button"
            onClick={() => {
              setImportErrors([]);
              setShowImportModal(true);
            }}
            className="btn-secondary inline-flex items-center gap-2 px-4 h-11 text-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ClipboardList className="w-4 h-4" />
            Paste a list
          </button>
          <button
            type="button"
            onClick={handleTryOpenLobby}
            className={`btn-primary inline-flex items-center gap-2 px-5 sm:px-6 h-11 text-sm whitespace-nowrap shrink-0 cursor-pointer ${
              !canStart ? 'opacity-65' : ''
            }`}
          >
            {canStart ? 'Start round' : 'Start round (needs 10+)'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Two-Column Setup Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left: Single Question Composer */}
        <form
          onSubmit={handleSaveQuestion}
          className="lg:col-span-5 bg-surface rounded-2xl border border-border p-5 space-y-4 min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-base text-text">
              {editingIndex !== null ? `Edit question #${editingIndex + 1}` : 'Add a question'}
            </h2>
            {(editingIndex !== null || prompt || options.some((o) => o)) && (
              <button
                type="button"
                onClick={resetForm}
                className="btn-ghost text-xs underline underline-offset-4 px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div>
            <label htmlFor="question-prompt" className="sr-only">
              Question
            </label>
            <textarea
              id="question-prompt"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Write your question…"
              className="w-full rounded-[14px] border border-border focus:border-accent focus:outline-none px-3.5 py-2.5 text-sm bg-surface-2 text-text placeholder:text-faint resize-none"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted">
                Options — tap letter for correct answer
              </span>
            </div>
            <div className="space-y-2 min-w-0">
              {options.map((val, idx) => {
                const isCorrect = correctIndex === idx;
                return (
                  <div key={idx} className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(idx)}
                      aria-label={`Mark option ${OPTION_LETTERS[idx]} as correct`}
                      className={`w-9 h-9 rounded-full border-[1.5px] flex items-center justify-center font-display font-bold text-xs shrink-0 transition-colors cursor-pointer ${
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
                      className="flex-1 min-w-0 w-full h-10 rounded-[12px] border border-border focus:border-accent focus:outline-none px-3.5 text-sm bg-surface-2 text-text placeholder:text-faint"
                    />
                  </div>
                );
              })}
            </div>

            {options.length < 4 && (
              <button
                type="button"
                onClick={handleAddOptionField}
                className="btn-ghost inline-flex items-center gap-1 text-xs px-1.5 py-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add option
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/70">
            <div className="flex items-center gap-1 p-1 rounded-[12px] bg-surface-2 border border-border">
              {[5, 10, 15, 20, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setTimeLimitSec(sec)}
                  className={`px-2 py-1 rounded-[8px] text-xs font-mono font-bold tabular-nums transition-colors cursor-pointer ${
                    timeLimitSec === sec
                      ? 'bg-accent text-on-accent'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-1.5 px-4 h-10 text-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              {editingIndex !== null ? 'Save edit' : 'Add question'}
            </button>
          </div>

          {formError && (
            <p className="text-xs font-semibold text-danger" role="alert">
              {formError}
            </p>
          )}
        </form>

        {/* Right: Clean Question Queue */}
        <div className="lg:col-span-7 space-y-2.5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-display font-bold text-base text-text">Question queue</h2>
              <span className="text-xs font-mono text-muted tabular-nums">
                {questions.length} / {MAX_QUESTIONS}
              </span>
            </div>

            {questions.length > 0 && (() => {
              const firstTimer = questions[0]?.timeLimitSec;
              const allSameTimer =
                firstTimer !== undefined && questions.every((q) => q.timeLimitSec === firstTimer);
              return (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-muted whitespace-nowrap">
                    All timers
                  </span>
                  <div className="flex items-center gap-0.5 p-0.5 rounded-[10px] bg-surface-2 border border-border">
                    {[5, 10, 15, 20, 30].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleApplyAllTimers(sec)}
                        className={`px-2 py-1 rounded-[7px] text-[11px] font-mono font-bold tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                          allSameTimer && firstTimer === sec
                            ? 'bg-accent text-on-accent'
                            : 'text-muted hover:text-text'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center space-y-3">
              <p className="font-display font-bold text-base text-text">No questions yet</p>
              <p className="text-sm text-muted max-w-sm mx-auto">
                Add questions on the left, paste a list, or load a ready-made preset round.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPresetsModal(true)}
                  className="btn-secondary px-4 py-2 text-xs cursor-pointer"
                >
                  Browse preset rounds
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportErrors([]);
                    setShowImportModal(true);
                  }}
                  className="btn-ghost px-3 py-2 text-xs cursor-pointer"
                >
                  Paste a list
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl border border-border overflow-hidden divide-y divide-border">
              {questions.map((q, idx) => {
                const isEditing = editingIndex === idx;
                return (
                  <div
                    key={q.id}
                    className={`px-4 py-3 flex items-start justify-between gap-3 min-w-0 transition-colors ${
                      isEditing ? 'bg-accent-soft/45' : 'hover:bg-surface-2/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-faint tabular-nums shrink-0">
                          {idx + 1}.
                        </span>
                        <p className="font-display font-semibold text-sm text-text leading-snug break-words">
                          {q.prompt}
                        </p>
                      </div>
                      <p className="pl-5 text-xs text-muted truncate">
                        <span className="font-mono tabular-nums">{q.timeLimitSec}s</span>
                        {' · '}
                        <span className="font-semibold text-success">
                          {OPTION_LETTERS[q.correctIndex]}. {q.options[q.correctIndex]}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Move question up"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2 hover:text-text disabled:opacity-25 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 1)}
                        disabled={idx === questions.length - 1}
                        aria-label="Move question down"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2 hover:text-text disabled:opacity-25 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditClick(idx)}
                        aria-label="Edit question"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2 hover:text-accent cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(idx)}
                        aria-label="Delete question"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-danger-soft hover:text-danger cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Preset Rounds Modal */}
      {showPresetsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Preset rounds"
        >
          <div className="bg-surface rounded-3xl border border-border w-full max-w-xl max-h-[88vh] flex flex-col p-5 sm:p-6 gap-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display font-extrabold text-xl text-text">Preset rounds</h2>
                <p className="text-xs text-muted mt-0.5">
                  One tap loads 10 ready-to-play questions. Tweak or add more anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPresetsModal(false)}
                aria-label="Close preset rounds"
                className="btn-secondary w-9 h-9 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl bg-surface-2/65 border border-border px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-bold text-text">Timer for preset</p>
                <p className="text-[11px] text-muted">
                  {presetTimeSec === 'default'
                    ? 'Uses each pack’s built-in pace (5s–20s).'
                    : `Sets all 10 questions to ${presetTimeSec}s.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-[12px] bg-surface border border-border self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setPresetTimeSec('default')}
                  className={`px-2.5 py-1 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    presetTimeSec === 'default'
                      ? 'bg-accent text-on-accent'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  Pack pace
                </button>
                {[5, 10, 15, 20, 30].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setPresetTimeSec(sec)}
                    className={`px-2 py-1 rounded-[8px] text-xs font-mono font-bold tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                      presetTimeSec === sec
                        ? 'bg-accent text-on-accent'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-border rounded-2xl border border-border overflow-y-auto flex-1 min-h-0">
              {PRESET_PACKS.map((pack) => {
                const isPending = pendingPresetId === pack.id;
                const canAppend = questions.length + pack.questions.length <= MAX_QUESTIONS;
                return (
                  <div
                    key={pack.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface min-w-0"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-display font-bold text-base text-text truncate">
                        {pack.title}
                      </p>
                      <p className="text-xs text-muted break-words">{pack.subtitle}</p>
                    </div>

                    {isPending ? (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                      <button
                        type="button"
                        onClick={() => {
                          if (questions.length === 0) {
                            handleApplyPreset(pack, 'replace');
                          } else {
                            setPendingPresetId(pack.id);
                          }
                        }}
                        className="btn-secondary px-3.5 py-1.5 text-xs cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
                      >
                        {questions.length === 0 ? 'Use this round' : 'Load preset'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
