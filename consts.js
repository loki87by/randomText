const SIGNS = ["ь", "ъ"];
const HUSHING = ["ж", "ш", "ч", "щ"];
const FORBIDDEN_AFTER_HUSHING = ["я", "ю", "ы"];
const NO_START = ["ы", "ь", "ъ", "й"];
const VELARS = ["к", "г", "х"];
const FORBIDDEN_AFTER_VELARS = ["ы", "я", "ё", "ю"];
export const CONSONANTS = "бвгджзклмнпрстфхцчшщ".split("");
export const VOWELS = "аеёиоуыэюя".split("");
export const VERB_SPECIAL_ENDINGS = [
  {
    infinitiveEnd: "нуть",
    forms: { male: "нул", female: "нула", neuter: "нуло", plural: "нули" },
  },
  {
    infinitiveEnd: "ереть",
    forms: { male: "ер", female: "ерла", neuter: "ерло", plural: "ерли" },
  },
  {
    infinitiveEnd: "ечь",
    forms: { male: "ёк", female: "екла", neuter: "екло", plural: "екли" },
  },
];

// Проверка: можно ли вставить букву на позицию idx в строке word (с учётом соседей слева и справа)
function canInsertAt(word, idx, letter) {
  const left = idx > 0 ? word[idx - 1] : null;
  const right = idx < word.length ? word[idx] : null;
  if (left && !isPairAllowed(left, letter)) return false;
  if (right && !isPairAllowed(letter, right)) return false;
  return true;
}

export const random = (array) => {
  const index = Math.floor(Math.random() * array.length);
  return array[index];
};

// --- Проверка допустимости пары букв ---
export function isPairAllowed(prevChar, nextChar) {
  if (!prevChar) return !NO_START.includes(nextChar);
  // й — только после гласной
  if (nextChar === "й") return VOWELS.includes(prevChar);
  // ь/ъ — только после согласной, кроме й
  if (SIGNS.includes(nextChar))
    return CONSONANTS.includes(prevChar) && prevChar !== "й";
  // после шипящих — запрет я/ю/ы
  if (
    HUSHING.includes(prevChar) &&
    FORBIDDEN_AFTER_HUSHING.includes(nextChar)
  ) {
    return false;
  }
  // после к/г/х — запрет ы/я/ё/ю
  if (VELARS.includes(prevChar) && FORBIDDEN_AFTER_VELARS.includes(nextChar))
    return false;

  if (VOWELS.includes(prevChar) && SIGNS.includes(nextChar)) return false;
  return true;
}

export const shuffle = (array) => {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export function permutations(letters, slots) {
  const result = [];
  const used = new Array(slots).fill(false);
  const current = [];

  function backtrack(i) {
    if (i === letters.length) {
      result.push(current.slice());
      return;
    }
    for (let s = 0; s < slots; s++) {
      if (used[s]) continue;
      used[s] = true;
      current.push([letters[i], s]);
      backtrack(i + 1);
      current.pop();
      used[s] = false;
    }
  }
  backtrack(0);
  return result;
}

// Пытаемся вставить букву letter в слово word в допустимую позицию.
// Возвращает новую строку или null, если вставить некуда.
export function tryInsertLetter(word, letter) {
  // Собираем все допустимые позиции
  const positions = [];
  for (let i = 0; i <= word.length; i++) {
    if (canInsertAt(word, i, letter)) positions.push(i);
  }
  if (positions.length === 0) return null;
  const pos = random(positions);
  return word.slice(0, pos) + letter + word.slice(pos);
}

// Возвращает массив допустимых букв для токена
export function tokenOptions(token) {
  switch (token.type) {
    case "consonant":
      return CONSONANTS.slice();
    case "vowel":
      return VOWELS.slice();
    case "any":
      return [...VOWELS, ...CONSONANTS, "й"];
    case "literal":
      return [token.char];
    case "set":
      return token.chars.slice();
    case "notset":
      return [...VOWELS, ...CONSONANTS, "й"].filter(
        (c) => !token.chars.includes(c),
      );
    default:
      return [];
  }
}

export function hasTripleConsonants(word) {
  for (let i = 2; i < word.length; i++) {
    const a = word[i - 2],
      b = word[i - 1],
      c = word[i];
    if (
      CONSONANTS.includes(a) &&
      CONSONANTS.includes(b) &&
      CONSONANTS.includes(c)
    ) {
      return true;
    }
  }
  return false;
}
