export interface HouseRecordEntry {
  name: string;
  wins: number;
}

interface StoredHouseRecord {
  monthKey: string;
  wins: Record<string, number>;
  recordedRounds: string[];
}

const HOUSE_RECORD_KEY = 'housequiz_house_record_v1';

function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function loadStore(): StoredHouseRecord {
  const currentMonth = getCurrentMonthKey();
  try {
    const raw = localStorage.getItem(HOUSE_RECORD_KEY);
    if (!raw) {
      return { monthKey: currentMonth, wins: {}, recordedRounds: [] };
    }
    const parsed = JSON.parse(raw) as StoredHouseRecord;
    // Automatically reset on the 1st of the new month (FR-31)
    if (!parsed || parsed.monthKey !== currentMonth) {
      const fresh: StoredHouseRecord = { monthKey: currentMonth, wins: {}, recordedRounds: [] };
      localStorage.setItem(HOUSE_RECORD_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return {
      monthKey: parsed.monthKey,
      wins: parsed.wins ?? {},
      recordedRounds: Array.isArray(parsed.recordedRounds) ? parsed.recordedRounds : [],
    };
  } catch {
    return { monthKey: currentMonth, wins: {}, recordedRounds: [] };
  }
}

function saveStore(store: StoredHouseRecord) {
  try {
    localStorage.setItem(HOUSE_RECORD_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

export function getHouseRecord(): HouseRecordEntry[] {
  const store = loadStore();
  return Object.entries(store.wins)
    .map(([name, wins]) => ({ name, wins }))
    .filter((entry) => entry.wins > 0)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.name.localeCompare(b.name);
    });
}

export function recordRoundWinners(
  roundKey: string,
  winnerNames: string[],
): { entries: HouseRecordEntry[]; newlyAddedNames: string[] } {
  const store = loadStore();
  if (winnerNames.length === 0 || store.recordedRounds.includes(roundKey)) {
    return {
      entries: getHouseRecord(),
      newlyAddedNames: [],
    };
  }

  const newlyAdded: string[] = [];
  for (const rawName of winnerNames) {
    const name = rawName.trim();
    if (!name) continue;
    store.wins[name] = (store.wins[name] ?? 0) + 1;
    newlyAdded.push(name);
  }

  store.recordedRounds = [...store.recordedRounds.slice(-49), roundKey];
  saveStore(store);

  return {
    entries: Object.entries(store.wins)
      .map(([name, wins]) => ({ name, wins }))
      .filter((entry) => entry.wins > 0)
      .sort((a, b) => (b.wins !== a.wins ? b.wins - a.wins : a.name.localeCompare(b.name))),
    newlyAddedNames: newlyAdded,
  };
}
