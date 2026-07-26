import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceRoots = ['app', 'src'];
const sharedControlFiles = new Set([
  'src/modules/auth/components/password-input.tsx',
]);
const controlNames = new Set([
  'Input',
  'IntegerInput',
  'PasswordInput',
  'Textarea',
  'Select',
]);
const ownershipPatterns = [
  /^(?:h|min-h|max-h)-/,
  /^(?:p|px|py|pl|pr|pt|pb)-/,
  /^rounded(?:-|$)/,
  /^border(?:-|$)/,
  /^bg-/,
  /^shadow(?:-|$)/,
  /^(?:focus|focus-visible|hover):/,
  /^ring(?:-|$)/,
  /^text-(?:xs|sm|base|lg|xl|\[[^\]]+\])/,
  /^leading-/,
];

function collectFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(absolute);
    return /\.(?:tsx|jsx)$/.test(entry.name) ? [absolute] : [];
  });
}

function staticClassValue(attribute) {
  if (!attribute?.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (!ts.isJsxExpression(attribute.initializer)) return null;
  const expression = attribute.initializer.expression;
  if (
    expression &&
    (ts.isStringLiteral(expression) ||
      ts.isNoSubstitutionTemplateLiteral(expression))
  ) {
    return expression.text;
  }
  return null;
}

const problems = [];

for (const absolute of sourceRoots.flatMap((directory) =>
  collectFiles(path.join(root, directory)),
)) {
  const relative = path.relative(root, absolute);
  if (
    relative.startsWith('components/ui/') ||
    relative.startsWith('src/components/ui/') ||
    sharedControlFiles.has(relative)
  ) {
    continue;
  }

  const sourceText = fs.readFileSync(absolute, 'utf8');
  const sourceFile = ts.createSourceFile(
    absolute,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const name = node.tagName.getText(sourceFile);
      if (controlNames.has(name)) {
        const className = node.attributes.properties.find(
          (property) =>
            ts.isJsxAttribute(property) &&
            property.name.getText(sourceFile) === 'className',
        );
        const value = staticClassValue(className);
        if (value) {
          const forbidden = value
            .split(/\s+/)
            .filter(Boolean)
            .filter((token) => {
              if (name === 'Textarea' && /^(?:min-h|max-h|overflow)-/.test(token)) {
                return false;
              }
              return ownershipPatterns.some((pattern) => pattern.test(token));
            });
          if (forbidden.length > 0) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            problems.push(
              `${relative}:${line + 1} ${name} overrides shared design properties: ${forbidden.join(', ')}`,
            );
          }
        }
      }

      if (name === 'input') {
        const typeAttribute = node.attributes.properties.find(
          (property) =>
            ts.isJsxAttribute(property) &&
            property.name.getText(sourceFile) === 'type',
        );
        const type = staticClassValue(typeAttribute) ?? 'text';
        if (!['file', 'hidden'].includes(type)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          problems.push(
            `${relative}:${line + 1} uses a native ${type} input instead of a shared control`,
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

for (const [relative, marker] of Object.entries({
  'components/ui/input.tsx': 'data-ui-control="input"',
  'components/ui/textarea.tsx': 'data-ui-control="textarea"',
  'components/ui/select.tsx': 'data-ui-control="select"',
})) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!source.includes('fieldControlStyles') || !source.includes(marker)) {
    problems.push(
      `${relative} must use the shared fieldControlStyles contract and ${marker}`,
    );
  }
}

const richTextSource = fs.readFileSync(
  path.join(root, 'src/components/rich-text/compact-rich-text.tsx'),
  'utf8',
);
if (
  !richTextSource.includes('fieldControlFrameStyles') ||
  !richTextSource.includes('data-ui-control="rich-text"')
) {
  problems.push(
    'src/components/rich-text/compact-rich-text.tsx must use the shared field frame contract',
  );
}

const globalStyles = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
for (const selector of [
  '.field-control,\n  .field-control-frame {',
  '.field-control::placeholder {',
  '.field-control:hover:not(:disabled)',
  '.field-control:focus,',
  '.field-control:disabled,',
  ".field-control[aria-invalid='true']",
  '.field-control-frame:focus-within',
]) {
  if (!globalStyles.includes(selector)) {
    problems.push(`app/globals.css is missing shared state selector: ${selector}`);
  }
}

if (globalStyles.includes('.field-focus-glow')) {
  problems.push(
    'app/globals.css contains the obsolete field-focus-glow contract',
  );
}

const rangeSource = fs.readFileSync(
  path.join(root, 'components/ui/range.tsx'),
  'utf8',
);
if (
  !rangeSource.includes("cn('range-control'") ||
  !rangeSource.includes('data-ui-control="range"') ||
  !globalStyles.includes('.range-control::-webkit-slider-thumb') ||
  !globalStyles.includes('.range-control::-moz-range-thumb')
) {
  problems.push(
    'components/ui/range.tsx must use the shared cross-browser range-control contract',
  );
}

if (problems.length > 0) {
  console.error('UI control contract violations:\n');
  console.error(problems.map((problem) => `- ${problem}`).join('\n'));
  process.exit(1);
}

console.log('UI control contract is consistent.');
