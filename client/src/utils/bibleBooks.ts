// Canonical 66-book list used by the statistics "Bible coverage" grid.
// Book numbers (1..66) match the encoding used in Verse.refSort ("bible.BBCCCVVV").

export type Testament = 'OT' | 'NT';

export interface BibleBook {
  num: number; // 1..66
  name: string;
  abbr: string;
  testament: Testament;
}

export const BIBLE_BOOKS: BibleBook[] = [
  { num: 1, name: 'Genesis', abbr: 'Gen', testament: 'OT' },
  { num: 2, name: 'Exodus', abbr: 'Exo', testament: 'OT' },
  { num: 3, name: 'Leviticus', abbr: 'Lev', testament: 'OT' },
  { num: 4, name: 'Numbers', abbr: 'Num', testament: 'OT' },
  { num: 5, name: 'Deuteronomy', abbr: 'Deu', testament: 'OT' },
  { num: 6, name: 'Joshua', abbr: 'Jos', testament: 'OT' },
  { num: 7, name: 'Judges', abbr: 'Jdg', testament: 'OT' },
  { num: 8, name: 'Ruth', abbr: 'Rut', testament: 'OT' },
  { num: 9, name: '1 Samuel', abbr: '1Sa', testament: 'OT' },
  { num: 10, name: '2 Samuel', abbr: '2Sa', testament: 'OT' },
  { num: 11, name: '1 Kings', abbr: '1Ki', testament: 'OT' },
  { num: 12, name: '2 Kings', abbr: '2Ki', testament: 'OT' },
  { num: 13, name: '1 Chronicles', abbr: '1Ch', testament: 'OT' },
  { num: 14, name: '2 Chronicles', abbr: '2Ch', testament: 'OT' },
  { num: 15, name: 'Ezra', abbr: 'Ezr', testament: 'OT' },
  { num: 16, name: 'Nehemiah', abbr: 'Neh', testament: 'OT' },
  { num: 17, name: 'Esther', abbr: 'Est', testament: 'OT' },
  { num: 18, name: 'Job', abbr: 'Job', testament: 'OT' },
  { num: 19, name: 'Psalms', abbr: 'Psa', testament: 'OT' },
  { num: 20, name: 'Proverbs', abbr: 'Pro', testament: 'OT' },
  { num: 21, name: 'Ecclesiastes', abbr: 'Ecc', testament: 'OT' },
  { num: 22, name: 'Song of Solomon', abbr: 'Sng', testament: 'OT' },
  { num: 23, name: 'Isaiah', abbr: 'Isa', testament: 'OT' },
  { num: 24, name: 'Jeremiah', abbr: 'Jer', testament: 'OT' },
  { num: 25, name: 'Lamentations', abbr: 'Lam', testament: 'OT' },
  { num: 26, name: 'Ezekiel', abbr: 'Eze', testament: 'OT' },
  { num: 27, name: 'Daniel', abbr: 'Dan', testament: 'OT' },
  { num: 28, name: 'Hosea', abbr: 'Hos', testament: 'OT' },
  { num: 29, name: 'Joel', abbr: 'Joe', testament: 'OT' },
  { num: 30, name: 'Amos', abbr: 'Amo', testament: 'OT' },
  { num: 31, name: 'Obadiah', abbr: 'Oba', testament: 'OT' },
  { num: 32, name: 'Jonah', abbr: 'Jon', testament: 'OT' },
  { num: 33, name: 'Micah', abbr: 'Mic', testament: 'OT' },
  { num: 34, name: 'Nahum', abbr: 'Nah', testament: 'OT' },
  { num: 35, name: 'Habakkuk', abbr: 'Hab', testament: 'OT' },
  { num: 36, name: 'Zephaniah', abbr: 'Zep', testament: 'OT' },
  { num: 37, name: 'Haggai', abbr: 'Hag', testament: 'OT' },
  { num: 38, name: 'Zechariah', abbr: 'Zec', testament: 'OT' },
  { num: 39, name: 'Malachi', abbr: 'Mal', testament: 'OT' },
  { num: 40, name: 'Matthew', abbr: 'Mat', testament: 'NT' },
  { num: 41, name: 'Mark', abbr: 'Mar', testament: 'NT' },
  { num: 42, name: 'Luke', abbr: 'Luk', testament: 'NT' },
  { num: 43, name: 'John', abbr: 'Jhn', testament: 'NT' },
  { num: 44, name: 'Acts', abbr: 'Act', testament: 'NT' },
  { num: 45, name: 'Romans', abbr: 'Rom', testament: 'NT' },
  { num: 46, name: '1 Corinthians', abbr: '1Co', testament: 'NT' },
  { num: 47, name: '2 Corinthians', abbr: '2Co', testament: 'NT' },
  { num: 48, name: 'Galatians', abbr: 'Gal', testament: 'NT' },
  { num: 49, name: 'Ephesians', abbr: 'Eph', testament: 'NT' },
  { num: 50, name: 'Philippians', abbr: 'Php', testament: 'NT' },
  { num: 51, name: 'Colossians', abbr: 'Col', testament: 'NT' },
  { num: 52, name: '1 Thessalonians', abbr: '1Th', testament: 'NT' },
  { num: 53, name: '2 Thessalonians', abbr: '2Th', testament: 'NT' },
  { num: 54, name: '1 Timothy', abbr: '1Ti', testament: 'NT' },
  { num: 55, name: '2 Timothy', abbr: '2Ti', testament: 'NT' },
  { num: 56, name: 'Titus', abbr: 'Tit', testament: 'NT' },
  { num: 57, name: 'Philemon', abbr: 'Phm', testament: 'NT' },
  { num: 58, name: 'Hebrews', abbr: 'Heb', testament: 'NT' },
  { num: 59, name: 'James', abbr: 'Jas', testament: 'NT' },
  { num: 60, name: '1 Peter', abbr: '1Pe', testament: 'NT' },
  { num: 61, name: '2 Peter', abbr: '2Pe', testament: 'NT' },
  { num: 62, name: '1 John', abbr: '1Jn', testament: 'NT' },
  { num: 63, name: '2 John', abbr: '2Jn', testament: 'NT' },
  { num: 64, name: '3 John', abbr: '3Jn', testament: 'NT' },
  { num: 65, name: 'Jude', abbr: 'Jud', testament: 'NT' },
  { num: 66, name: 'Revelation', abbr: 'Rev', testament: 'NT' },
];

export const OT_BOOKS = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
export const NT_BOOKS = BIBLE_BOOKS.filter((b) => b.testament === 'NT');

/**
 * Extract the 1..66 book number from a refSort value like "bible.43003016".
 * Returns null for values that don't parse to a canonical book (so the grid
 * can skip arbitrary/manual refSort strings instead of throwing).
 */
export function bookNumberFromRefSort(refSort: string | undefined | null): number | null {
  if (!refSort) return null;
  // Anchored so only a leading "bible.NN" form parses (rejects prefixed junk
  // like "xbible.70..."); returns null for anything else so the grid skips it.
  const match = /^bible\.(\d{2})/.exec(refSort.trim());
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return n >= 1 && n <= 66 ? n : null;
}
