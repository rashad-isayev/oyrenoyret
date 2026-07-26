import {AZ_MESSAGES} from '../src/i18n/messages/az.ts';
import {EN_MESSAGES} from '../src/i18n/messages/en.ts';
import {TR_MESSAGES} from '../src/i18n/messages/tr.ts';
import {RU_MESSAGES} from '../src/i18n/messages/ru.ts';
import {createTranslator} from 'next-intl';

const catalogs = {
  en: EN_MESSAGES,
  az: AZ_MESSAGES,
  tr: TR_MESSAGES,
  ru: RU_MESSAGES,
};

function collectLeaves(value, path = [], result = new Map()) {
  if (typeof value === 'string') {
    result.set(path.join('.'), value);
    return result;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLeaves(item, [...path, String(index)], result));
    return result;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) =>
      collectLeaves(item, [...path, key], result),
    );
    return result;
  }

  throw new Error(`Unsupported message value at ${path.join('.') || '<root>'}`);
}

function placeholders(message) {
  return Array.from(message.matchAll(/\{\{\s*(\w+)\s*\}\}/g), (match) => match[1]).sort();
}

function toIntlMessages(value) {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, '{$1}');
  }
  if (Array.isArray(value)) {
    return Object.fromEntries(value.map((item, index) => [String(index), toIntlMessages(item)]));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, toIntlMessages(item)]),
  );
}

const reference = collectLeaves(catalogs.en);
const failures = [];
const isVariableLengthAlias = (key) => key.includes('.aliases.');

for (const [locale, catalog] of Object.entries(catalogs)) {
  const leaves = collectLeaves(catalog);
  const intlErrors = [];
  const translate = createTranslator({
    locale,
    messages: toIntlMessages(catalog),
    onError: (error) => intlErrors.push(error),
  });

  for (const [key, englishMessage] of reference) {
    if (isVariableLengthAlias(key)) continue;
    if (!leaves.has(key)) {
      failures.push(`[${locale}] Missing message: ${key}`);
      continue;
    }

    const message = leaves.get(key);
    if (!message.trim()) failures.push(`[${locale}] Empty message: ${key}`);

    const expectedVars = placeholders(englishMessage);
    const actualVars = placeholders(message);
    if (expectedVars.join(',') !== actualVars.join(',')) {
      failures.push(
        `[${locale}] Placeholder mismatch at ${key}: expected {${expectedVars.join(', ')}}, received {${actualVars.join(', ')}}`,
      );
    }

    if (/\[\[\[(?:OYPROTECTED|OYSPLIT)/.test(message)) {
      failures.push(`[${locale}] Translation marker leaked into ${key}`);
    }

    const values = Object.fromEntries(placeholders(message).map((name) => [name, 1]));
    translate(key, values);
  }

  for (const key of leaves.keys()) {
    if (isVariableLengthAlias(key)) continue;
    if (!reference.has(key)) failures.push(`[${locale}] Unexpected message: ${key}`);
  }

  intlErrors.forEach((error) => failures.push(`[${locale}] ${error.message}`));
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${reference.size} messages across ${Object.keys(catalogs).length} locales.`,
  );
}
