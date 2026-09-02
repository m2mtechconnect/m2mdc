import fs from 'node:fs';
import path from 'node:path';
import ts from '../../node_modules/typescript/lib/typescript.js';

const root = process.cwd();
const functionsRoot = path.join(root, 'supabase', 'functions');
const adapterPath = path.join(functionsRoot, '_shared', 'ai-client.ts');
const write = process.argv.includes('--write');
const endpoint = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const supportedBodyFields = new Set([
  'model',
  'messages',
  'temperature',
  'max_tokens',
  'stream',
  'response_format',
  'tools',
  'tool_choice',
]);

const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.isFile() && entry.name.endsWith('.ts') && absolute !== adapterPath) files.push(absolute);
  }
}
walk(functionsRoot);

function propertyName(node, source) {
  if (!node.name) return undefined;
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) return node.name.text;
  return node.name.getText(source);
}

function propertyValue(node, source) {
  if (ts.isPropertyAssignment(node)) return node.initializer.getText(source);
  if (ts.isShorthandPropertyAssignment(node)) return node.name.getText(source);
  return undefined;
}

function profileFor(modelText, file) {
  const normalized = modelText.toLowerCase();
  if (normalized.includes('2.5-pro')) return 'balanced';
  if (normalized.includes('2.5-flash')) return 'fast';
  if (normalized.includes('3-pro') || normalized.includes('3.0-pro')) return 'reasoning';
  const relative = path.relative(functionsRoot, file).replaceAll('\\', '/');
  if (relative.startsWith('agent-stream/') || relative.startsWith('copilot-')) return 'reasoning';
  return 'fast';
}

function operationFor(file) {
  const relative = path.relative(functionsRoot, file).replaceAll('\\', '/');
  if (relative === '_shared/llm/geminiAnalyzeDocument.ts') return 'document-analysis';
  return relative.replace(/\/index\.ts$/, '').replace(/\.ts$/, '').replaceAll('/', ':');
}

function importPathFor(file) {
  let relative = path.relative(path.dirname(file), adapterPath).replaceAll('\\', '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

const report = [];
for (const file of files) {
  let sourceText = fs.readFileSync(file, 'utf8');
  if (!sourceText.includes(endpoint)) continue;

  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const replacements = [];
  const unknownFields = [];

  function visit(node) {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'fetch'
      && node.arguments.length >= 2
      && ts.isStringLiteral(node.arguments[0])
      && node.arguments[0].text === endpoint
      && ts.isObjectLiteralExpression(node.arguments[1])
    ) {
      const requestOptions = node.arguments[1];
      const bodyProperty = requestOptions.properties.find(
        (property) => propertyName(property, source) === 'body',
      );
      const bodyExpression = bodyProperty && propertyValue(bodyProperty, source);
      if (!bodyExpression) throw new Error(`${file}: managed AI fetch has no body`);

      const bodyNode = bodyProperty.initializer;
      if (
        !ts.isCallExpression(bodyNode)
        || bodyNode.expression.getText(source) !== 'JSON.stringify'
        || bodyNode.arguments.length !== 1
        || !ts.isObjectLiteralExpression(bodyNode.arguments[0])
      ) {
        throw new Error(`${file}: managed AI body is not JSON.stringify(object)`);
      }

      const fields = new Map();
      for (const property of bodyNode.arguments[0].properties) {
        const name = propertyName(property, source);
        if (!name || !supportedBodyFields.has(name)) {
          unknownFields.push(name ?? property.getText(source));
          continue;
        }
        fields.set(name, propertyValue(property, source));
      }
      if (!fields.get('messages')) throw new Error(`${file}: managed AI body has no messages field`);

      const signalProperty = requestOptions.properties.find(
        (property) => propertyName(property, source) === 'signal',
      );
      const signal = signalProperty ? propertyValue(signalProperty, source) : undefined;
      const requestFields = [`messages: ${fields.get('messages')}`];
      if (fields.get('temperature')) requestFields.push(`temperature: ${fields.get('temperature')}`);
      if (fields.get('max_tokens')) requestFields.push(`maxTokens: ${fields.get('max_tokens')}`);
      if (fields.get('response_format')) requestFields.push(`responseFormat: ${fields.get('response_format')}`);
      if (fields.get('tools')) requestFields.push(`tools: ${fields.get('tools')}`);
      if (fields.get('tool_choice')) requestFields.push(`toolChoice: ${fields.get('tool_choice')}`);

      const responseOptions = [
        `model: '${profileFor(fields.get('model') ?? '', file)}'`,
        `operation: '${operationFor(file)}'`,
      ];
      if ((fields.get('stream') ?? '').trim() === 'true') responseOptions.push('stream: true');
      if (signal) responseOptions.push(`signal: ${signal}`);

      replacements.push({
        start: node.getStart(source),
        end: node.getEnd(),
        text: `makeAIResponse(\n      { ${requestFields.join(', ')} },\n      { ${responseOptions.join(', ')} },\n    )`,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

  if (unknownFields.length > 0) {
    throw new Error(`${file}: unsupported managed AI body fields: ${unknownFields.join(', ')}`);
  }
  if (replacements.length === 0) {
    report.push({ file: path.relative(root, file), status: 'manual', reason: 'endpoint is not a direct fetch call' });
    continue;
  }

  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    sourceText = sourceText.slice(0, replacement.start) + replacement.text + sourceText.slice(replacement.end);
  }

  const readsManagedCredential = /Deno\.env\.get\((['"])LOVABLE_API_KEY\1\)/.test(sourceText);
  sourceText = sourceText.replaceAll(
    /Deno\.env\.get\((['"])LOVABLE_API_KEY\1\)/g,
    'isManagedAIConfigured()',
  );

  const importNames = readsManagedCredential
    ? 'isManagedAIConfigured, makeAIResponse'
    : 'makeAIResponse';
  sourceText = `import { ${importNames} } from "${importPathFor(file)}";\n${sourceText}`;

  if (write) fs.writeFileSync(file, sourceText);
  report.push({ file: path.relative(root, file), status: write ? 'updated' : 'ready', calls: replacements.length });
}

console.log(JSON.stringify(report, null, 2));
