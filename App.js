import { VOWELS, random, isPairAllowed, permutations } from "./consts.js";
import {
  normalizeLetters,
  applyRequiredLetters,
  applyPreferredLetters,
  generateSafeSyllable,
  pickEnding,
  generatePerfectiveInfinitive,
  applyVerbForm,
  generateVerb,
  parseMask,
  generateFromMask,
} from "./helpers.js";

const form = document.getElementById("word-form");
const partOfLang = document.getElementById("pl");
const genderSel = document.getElementById("gender");
const numberSel = document.getElementById("number");
const lengthInput = document.getElementById("length");
const requiredInput = document.getElementById("required-letters");
const preferredInput = document.getElementById("preferred-letters");
const maskInput = document.getElementById("mask");
const addsButton = document.querySelector("button");
const fieldsets = document.querySelectorAll("fieldset");

const resultBox = document.getElementById("result");
const wordOutput = document.getElementById("word-output");
const copyBtn = document.getElementById("copy-btn");

// --- Генерация слова ---
function generateWord({
  partOfSpeech,
  gender,
  number,
  targetLength,
  requiredLetters,
  preferredLetters,
  mask,
}) {
  // === Ветка маски ===
  if (mask && mask.trim()) {
    const tokens = parseMask(mask.trim());

    for (let attempt = 0; attempt < 100; attempt++) {
      const word = generateFromMask(tokens, targetLength, requiredLetters);

      if (word) {
        if (preferredLetters && preferredLetters.length > 0 && !targetLength) {
          return applyPreferredLetters(word, preferredLetters);
        }
        return word;
      }
    }

    return null;
  }

  // Глагол — отдельная ветка
  if (partOfSpeech === "verb") {
    for (let attempt = 0; attempt < 30; attempt++) {
      let infinitive = generatePerfectiveInfinitive(targetLength);
      const stem = infinitive.slice(0, -2);
      let fixedStem = applyRequiredLetters(stem, requiredLetters);

      if (fixedStem === null) continue;
      fixedStem = applyPreferredLetters(fixedStem, preferredLetters);

      if (targetLength) {
        const full = fixedStem + "ть";

        if (full.length !== targetLength) {
          continue;
        }
      }
      return applyVerbForm(fixedStem + "ть", gender, number);
    }
    // fallback — без обязательных букв
    return generateVerb({ gender, number, targetLength });
  }
  // === Ветка существительного/прилагательного ===
  const desiredLength = targetLength || Math.floor(Math.random() * 10) + 4;

  for (let attempt = 0; attempt < 50; attempt++) {
    let ending = pickEnding(partOfSpeech, gender, number);
    const baseTarget = Math.max(2, desiredLength - ending.length);
    let base = "";
    let tries = 0;

    while (base.length < baseTarget && tries < 25) {
      const prev = base[base.length - 1] || null;
      const syl = generateSafeSyllable(prev);

      if (!syl) break;
      base += syl;
      tries++;
    }
    base = ensureConsonantEnding(base);

    if (!base) base = "бар";
    const withRequired = applyRequiredLetters(base, requiredLetters);

    if (withRequired === null) continue;
    base = withRequired;
    base = applyPreferredLetters(base, preferredLetters);
    let result = base + ending;

    if (targetLength) {
      while (result.length > targetLength && base.length > 2) {
        base = base.slice(0, -1);
        base = ensureConsonantEnding(base);

        if (!base) {
          base = "бар";
          break;
        }
        result = base + ending;
      }
      while (result.length < targetLength) {
        const last = result[result.length - 1];
        const possible = VOWELS.filter((v) => isPairAllowed(last, v));

        if (possible.length === 0) break;
        result += random(possible);
      }

      if (result.length > targetLength) result = result.slice(0, targetLength);
      const allRequiredPresent = requiredLetters.every((l) =>
        result.includes(l),
      );

      if (!allRequiredPresent) continue;
    }
    const ok = requiredLetters.every((l) => result.includes(l));

    if (!ok) continue;
    if (result.length >= 3) return result;
  }
  return null;
}

// --- Обработчики ---
copyBtn.addEventListener("click", async () => {
  const text = wordOutput.textContent;
  if (!text || text === "—") return;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.classList.add("copied");
    copyBtn.textContent = "✓";
    setTimeout(() => {
      copyBtn.classList.remove("copied");
      copyBtn.textContent = "⧉";
    }, 1200);
  } catch (err) {
    // Fallback для file:// и старых браузеров
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(ta);
    copyBtn.classList.add("copied");
    copyBtn.textContent = "✓";
    setTimeout(() => {
      copyBtn.classList.remove("copied");
      copyBtn.textContent = "⧉";
    }, 1200);
  }
});
partOfLang.addEventListener("change", () => {
  const part = partOfLang.value;
  const hidden = !part || part === "0";
  const genderClasses = genderSel.parentNode.classList;
  const numberClasses = numberSel.parentNode.classList;
  Array.from([genderClasses, numberClasses]).forEach((i) => {
    if (!hidden) i.remove("hide");
    if (hidden && !i.has("hide")) i.add("hide");
  });
});
addsButton.addEventListener("click", () => {
  const hidden = addsButton.textContent === "Показать дополнительные опции";
  const currFields = Array.from(fieldsets).slice(1);
  currFields.forEach((i) => i.classList.toggle("hide"));
  addsButton.textContent = hidden
    ? "Скрыть дополнительные опции"
    : "Показать дополнительные опции";
});

// --- Обработчик генерации ---
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const part = partOfLang.value;
  const mask = maskInput.value.trim();
  if ((!part || part === "0") && (!mask || mask === "0")) {
    alert("Выберите часть речи или введите маску");
    return;
  }

  const gender = genderSel.value;
  const number = numberSel.value;
  const lengthRaw = lengthInput.value.trim();
  const length = lengthRaw ? Number(lengthRaw) : null;
  const requiredLetters = normalizeLetters(requiredInput.value);
  const preferredLetters = normalizeLetters(preferredInput.value);

  let word = null;
  for (let i = 0; i < 30; i++) {
    word = generateWord({
      partOfSpeech: part,
      gender,
      number,
      targetLength: length,
      requiredLetters,
      preferredLetters,
      mask,
    });
    if (word) break;
  }

  if (!word) {
    alert(
      "Не удалось сгенерировать слово с заданными буквами, попробуйте ослабить условия",
    );
    return;
  }
  resultBox.hidden = false;
  wordOutput.textContent = word;
  copyBtn.classList.remove("copied");
  copyBtn.textContent = "⧉";
});
