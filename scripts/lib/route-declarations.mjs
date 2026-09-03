import ts from 'typescript';

function routePath(attributes) {
  for (const property of attributes.properties) {
    if (!ts.isJsxAttribute(property) || property.name.text !== 'path') continue;
    if (property.initializer && ts.isStringLiteral(property.initializer)) {
      return property.initializer.text;
    }
  }
  return null;
}

function isRouteTag(tagName, sourceFile) {
  return tagName.getText(sourceFile) === 'Route';
}

/**
 * A route is development-gated only when the route node is inside the boolean
 * or conditional expression that reads import.meta.env.DEV. An unrelated DEV
 * reference elsewhere in the file or on a nearby line is not a route guard.
 */
function hasDevelopmentGate(node, sourceFile) {
  let current = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (
      (ts.isBinaryExpression(current) || ts.isConditionalExpression(current)) &&
      /import\.meta\.env\.DEV/.test(current.getText(sourceFile))
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/** Structurally extract literal React Router declarations from TSX source. */
export function collectRouteDeclarations(file, source) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = [];

  function visit(node) {
    let opening = null;
    if (ts.isJsxSelfClosingElement(node)) opening = node;
    else if (ts.isJsxElement(node)) opening = node.openingElement;

    if (opening && isRouteTag(opening.tagName, sourceFile)) {
      const path = routePath(opening.attributes);
      if (path !== null) {
        declarations.push({
          file,
          path,
          devGated: hasDevelopmentGate(node, sourceFile),
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return declarations;
}
