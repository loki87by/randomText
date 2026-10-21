import {
  CONSONANTS,
  VOWELS,
  VERB_SPECIAL_ENDINGS,
  shuffle,
  random,
  isPairAllowed,
  tryInsertLetter,
  tokenOptions,
  hasTripleConsonants,
} from "./consts.js";

export function generateSafeSyllable(prevChar) {
  const candidates = [];

  // СГ
  for (const c of shuffle(CONSONANTS)) {
    if (!isPairAllowed(prevChar, c)) continue;
    for (const v of shuffle(VOWELS)) {
      if (isPairAllowed(c, v)) candidates.push(c + v);
    }
  }

  // Г
  for (const v of shuffle(VOWELS)) {
    if (isPairAllowed(prevChar, v)) candidates.push(v);
  }

  // СГС (с учётом правил для конечной согласной)
  for (const c1 of shuffle(CONSONANTS)) {
    if (!isPairAllowed(prevChar, c1)) continue;
    for (const v of shuffle(VOWELS)) {
      if (!isPairAllowed(c1, v)) continue;
      for (const c2 of shuffle(CONSONANTS)) {
        if (isPairAllowed(v, c2)) candidates.push(c1 + v + c2);
      }
    }
  }

  // СГЙ (й после гласной — допустим)
  for (const c of shuffle(CONSONANTS)) {
    if (!isPairAllowed(prevChar, c)) continue;
    for (const v of shuffle(VOWELS)) {
      if (!isPairAllowed(c, v)) continue;
      candidates.push(c + v + "й");
    }
  }

  if (candidates.length === 0) return "";
  return random(candidates);
}

export function normalizeLetters(input) {
  return [...(input || "")]
    .map((ch) => ch.toLowerCase())
    .filter((ch) => /[а-яё]/.test(ch));
}

// Вставляет все обязательные буквы. Если какая-то не вставляется —
// возвращает null (значит, слово не подходит).
export function applyRequiredLetters(word, required) {
  let result = word;
  for (const letter of required) {
    // Если буква уже есть — пропускаем
    if (result.includes(letter)) continue;
    const next = tryInsertLetter(result, letter);
    if (!next) return null;
    result = next;
  }
  return result;
}

// Пытается вставить желательные буквы (без гарантии)
export function applyPreferredLetters(word, preferred) {
  let result = word;
  for (const letter of preferred) {
    if (result.includes(letter)) continue;
    const next = tryInsertLetter(result, letter);
    if (next) result = next; // если не вставилось — просто пропускаем
  }
  return result;
}

// Чтобы не получалось «...аяий» и «...уия» — база должна кончаться на согласную.
export function ensureConsonantEnding(base) {
  if (!base) return base;
  let result = base;
  let guard = 0;
  while (result.length > 0 && guard < 10) {
    const last = result[result.length - 1];
    if (CONSONANTS.includes(last) && last !== "й") break;
    result = result.slice(0, -1);
    guard++;
  }
  return result;
}

// --- Окончания существительных и прилагательных ---
export function pickEnding(part, gender, number) {
  if (part === "noun") {
    if (number === "plural") return random(["ы", "и", "а"]);
    if (gender === "male") return random(["", "ь"]);
    if (gender === "female") return random(["а", "я", "ь"]);
    if (gender === "neuter") return random(["о", "е"]);
    return random(["", "а", "о", "ь", "я", "е"]);
  }
  if (part === "adjective") {
    if (number === "plural") return random(["ые", "ие"]);
    if (gender === "male") return random(["ый", "ий", "ой"]);
    if (gender === "female") return random(["ая", "яя"]);
    if (gender === "neuter") return random(["ое", "ее"]);
    return random(["ый", "ий", "ая", "яя", "ое", "ее"]);
  }
  return "";
}

// --- Глаголы: корни в инфинитиве + спряжение ---
export function generatePerfectiveInfinitive(targetLength) {
  const desired = targetLength || Math.floor(Math.random() * 8) + 5;
  const baseTarget = Math.max(2, desired - 2);

  let base = "";
  let attempts = 0;
  while (base.length < baseTarget && attempts < 20) {
    const prev = base[base.length - 1] || null;
    const syl = generateSafeSyllable(prev);
    if (!syl) break;
    base += syl;
    attempts++;
  }

  // Основа инфинитива должна кончаться на гласную
  const lastVowelIdx = [...base].reduce(
    (acc, ch, i) => (VOWELS.includes(ch) ? i : acc),
    -1,
  );
  base = lastVowelIdx >= 0 ? base.slice(0, lastVowelIdx + 1) : base;
  if (!base) base = "плы";

  // Иногда добавляем тематический суффикс, чтобы сработали особые правила
  const r = Math.random();
  if (r < 0.25) {
    // -нуть
    base = base.replace(/[аеёиоуыэюя]$/, "") + "ну";
  } else if (r < 0.4) {
    // -ереть: ставим «ере» после согласной
    base = base.replace(/[аеёиоуыэюя]$/, "") + "ере";
  } else if (r < 0.55) {
    // -ечь: основа на гласную + «ечь» (даст «ёк/екла»)
    base = base.replace(/[аеёиоуыэюя]$/, "") + "е";
  }

  return base + "ть";
}

export function applyVerbForm(infinitive, gender, number) {
  // Если ничего не задано — возвращаем инфинитив как есть
  if (gender === "any" && number === "any") return infinitive;
  // Ищем особый случай по окончанию инфинитива
  let matched = null;
  for (const rule of VERB_SPECIAL_ENDINGS) {
    if (infinitive.endsWith(rule.infinitiveEnd)) {
      matched = rule;
      break;
    }
  }
  // Определяем форму
  let formKey;
  if (number === "plural") formKey = "plural";
  else if (gender === "male" || gender === "any") formKey = "male";
  else if (gender === "female") formKey = "female";
  else if (gender === "neuter") formKey = "neuter";
  else formKey = "male";

  if (matched) {
    const stem = infinitive.slice(0, -matched.infinitiveEnd.length);
    return stem + matched.forms[formKey];
  }
  // Обычный случай: -ть → -л/-ла/-ло/-ли
  const stem = infinitive.slice(0, -2); // без «ть»
  const regular = { male: "л", female: "ла", neuter: "ло", plural: "ли" };
  return stem + regular[formKey];
}

export function generateVerb({ gender, number, targetLength }) {
  const infinitive = generatePerfectiveInfinitive(targetLength);
  return applyVerbForm(infinitive, gender, number);
}

// --- Маска ---
// Разбирает маску в массив токенов:
export function parseMask(mask) {
  const tokens = [];
  let i = 0;

  while (i < mask.length) {
    const ch = mask[i];

    // !с / !г — метасимволы (согласная / гласная)
    if (ch === "!" && i + 1 < mask.length) {
      const next = mask[i + 1].toLowerCase();
      if (next === "с") {
        tokens.push({ type: "consonant" });
        i += 2;
        continue;
      }
      if (next === "г") {
        tokens.push({ type: "vowel" });
        i += 2;
        continue;
      }
      // !? !* ![ !] — экранированные литералы, но это не буквы — пропускаем
      // либо можно трактовать как литерал (для ? * [ ]), но для алфавита не нужно
      tokens.push({ type: "literal", char: next });
      i += 2;
      continue;
    }

    // ? — любая буква
    if (ch === "?") {
      tokens.push({ type: "any" });
      i++;
      continue;
    }

    // * — 0+ любых букв
    if (ch === "*") {
      tokens.push({ type: "star" });
      i++;
      continue;
    }

    // [аоу] / [^аоу] — набор / кроме набора
    if (ch === "[") {
      let j = i + 1;
      let negate = false;
      if (mask[j] === "^") {
        negate = true;
        j++;
      }
      const chars = [];
      while (j < mask.length && mask[j] !== "]") {
        const c = mask[j].toLowerCase();
        if (/[а-яё]/.test(c)) chars.push(c);
        j++;
      }
      if (j >= mask.length) {
        tokens.push({ type: "literal", char: ch });
        i++;
      } else {
        tokens.push({ type: negate ? "notset" : "set", chars });
        i = j + 1;
      }
      continue;
    }

    // Всё остальное, что является буквой, — литерал (включая «с» и «г»!)
    const lower = ch.toLowerCase();
    if (/[а-яё]/.test(lower)) {
      tokens.push({ type: "literal", char: lower });
    }
    i++;
  }

  return tokens;
}

// Генерирует слово по маске. Возвращает строку или null.
export function generateFromMask(
  tokens,
  targetLength = null,
  requiredLetters = [],
) {
  const hasStar = tokens.some((t) => t.type === "star");
  const usedRequired = new Set();
  let word = "";

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];

    if (token.type === "star") {
      const rest = tokens.slice(idx + 1);
      let minRest = 0;

      for (const t of rest) if (t.type !== "star") minRest += 1;
      let extra;

      if (targetLength) {
        const available = targetLength - word.length - minRest;

        if (available < 0) return null;
        extra =
          rest.length === 0
            ? available
            : Math.floor(Math.random() * (available + 1));
      } else {
        extra = Math.floor(Math.random() * ((rest.length === 0 ? 4 : 3) + 1));
      }

      for (let k = 0; k < extra; k++) {
        const last = word[word.length - 1] || null;
        let placed = false;

        for (const l of requiredLetters) {
          if (usedRequired.has(l)) continue;
          if (isPairAllowed(last, l)) {
            word += l;
            usedRequired.add(l);
            placed = true;
            break;
          }
        }
        if (placed) continue;
        const options = [...VOWELS, ...CONSONANTS].filter((c) =>
          isPairAllowed(last, c),
        );

        if (options.length === 0) break;
        word += random(options);
      }
      continue;
    }

    // Сначала — попытка вставить обязательную букву, если токен это позволяет
    let placed = false;
    if (!hasStar) {
      const last = word[word.length - 1] || null;
      const tokenOpts = tokenOptions(token);
      
      for (const l of shuffle(requiredLetters)) {
        if (usedRequired.has(l)) continue;
        if (!tokenOpts.includes(l)) continue;
        if (!isPairAllowed(last, l)) continue;
        word += l;
        usedRequired.add(l);
        placed = true;
        break;
      }
    }
    if (placed) continue;

    // Иначе — обычный случайный выбор
    const options = tokenOptions(token);
    const last = word[word.length - 1] || null;
    const allowed = options.filter((c) => isPairAllowed(last, c));
    if (allowed.length === 0) return null;
    word += random(allowed);
  }

  // Если задана длина и слово не совпало — провал
  if (targetLength && word.length !== targetLength) return null;

  // Если есть обязательные, которые не вставились — провал
  if (!hasStar) {
    for (const l of requiredLetters) {
      if (!usedRequired.has(l) && !word.includes(l)) return null;
    }
  }

  if (hasTripleConsonants(word)) return null;
  return word.length >= 2 ? word : null;
}
