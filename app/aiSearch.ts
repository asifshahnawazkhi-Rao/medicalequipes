export type SearchDocument = { title: string; text: string };

const STOP_WORDS = new Set(["a","an","and","available","buy","for","find","from","in","is","item","ki","ka","ke","ko","main","me","mujhe","of","on","or","sale","the","to","want","with"]);
const SYNONYMS = [
  ["ultrasound","ultrasonography","usg","sonography"],
  ["ecg","ekg","electrocardiograph","cardiograph"],
  ["patient monitor","monitor","multiparameter","vital signs"],
  ["ventilator","ventilation","respirator"],
  ["refurbished","refurb","reconditioned"],
  ["used","second hand","preowned","pre owned"],
  ["new","unused","brand new"],
  ["printer","thermal printer","video printer"],
  ["probe","transducer"],
  ["board","pcb","card","circuit board"],
  ["requirement","required","wanted","need","looking for"],
];

export function normalizeSearchText(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
function compact(value: string) { return normalizeSearchText(value).replace(/\s+/g, ""); }
function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}
function variants(term: string) {
  const value = normalizeSearchText(term);
  return SYNONYMS.find((group) => group.map(normalizeSearchText).includes(value))?.map(normalizeSearchText) ?? [value];
}
function queryTerms(query: string) {
  const normalized = normalizeSearchText(query);
  const phrases = SYNONYMS.flat().map(normalizeSearchText).filter((p) => p.includes(" ") && normalized.includes(p));
  const words = normalized.split(" ").filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  return [...new Set([...phrases, ...words])];
}
function termScore(text: string, words: string[], term: string) {
  for (const variant of variants(term)) {
    if (text.includes(variant)) return variant === term ? 18 : 13;
    if (compact(text).includes(compact(variant))) return variant === term ? 17 : 12;
  }
  if (term.length >= 4) {
    const distance = words.reduce((best, word) => Math.min(best, editDistance(word, term)), Infinity);
    if (distance <= (term.length >= 7 ? 2 : 1)) return 8;
  }
  return 0;
}
export function aiSearchScore(document: SearchDocument, query: string) {
  const searched = normalizeSearchText(query);
  if (!searched) return 1;
  const title = normalizeSearchText(document.title);
  const text = normalizeSearchText(`${document.title} ${document.text}`);
  const terms = queryTerms(query);
  if (!terms.length) return 0;
  let score = title.includes(searched) ? 80 : compact(title).includes(compact(searched)) ? 75 : text.includes(searched) ? 55 : compact(text).includes(compact(searched)) ? 50 : 0;
  let matches = 0;
  for (const term of terms) {
    const points = termScore(text, text.split(" "), term);
    if (points) matches += 1;
    score += points;
    if (termScore(title, title.split(" "), term)) score += 8;
  }
  const required = terms.length <= 2 ? terms.length : Math.ceil(terms.length * 0.6);
  return matches >= required ? score : 0;
}
export function rankByAiSearch<T>(items: T[], query: string, document: (item: T) => SearchDocument) {
  if (!query.trim()) return items.map((item) => ({ item, score: 1 }));
  return items.map((item) => ({ item, score: aiSearchScore(document(item), query) }))
    .filter(({ score }) => score > 0).sort((a, b) => b.score - a.score);
}
