import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import ts from "typescript";

const SOURCE_EXTENSIONS = [".ts", ".tsx"];

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(target)));
    else if (SOURCE_EXTENSIONS.includes(extname(entry.name)))
      files.push(target);
  }
  return files.sort();
}

async function resolveModulePath(root, fromFile, specifier) {
  let base;
  if (specifier.startsWith("@/")) {
    base = join(root, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = resolve(dirname(fromFile), specifier);
  } else {
    return null;
  }

  const candidates = [
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => join(base, `index${extension}`)),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return resolve(candidate);
    } catch {
      // Try the next valid source-file shape.
    }
  }
  return null;
}

async function importsFor(root, file) {
  const contents = await readFile(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    contents,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const imports = [];
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }
    imports.push({
      declaration: statement,
      resolvedPath: await resolveModulePath(
        root,
        file,
        statement.moduleSpecifier.text
      ),
    });
  }
  return { imports, sourceFile };
}

function namedBindings(importDeclaration, exportedName) {
  const clause = importDeclaration.importClause;
  if (!clause || clause.isTypeOnly) return [];

  const names = [];
  if (exportedName === "default" && clause.name) names.push(clause.name.text);
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    for (const element of clause.namedBindings.elements) {
      if (element.isTypeOnly) continue;
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === exportedName) names.push(element.name.text);
    }
  }
  return names;
}

function hasJsxElement(sourceFile, localNames) {
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      localNames.has(node.tagName.text)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function hasHookCall(sourceFile, localNames) {
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      localNames.has(node.expression.text)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function isTestFile(file) {
  return file.includes("/__tests__/") || file.endsWith(".test.ts");
}

/**
 * Finds admin-gated settings components without a page that imports and renders
 * them. Imports and JSX are parsed so comments, aliases, and relative imports
 * cannot bypass or confuse the reachability contract.
 */
export async function checkAdminSettingsReachability(root) {
  const settingsRoot = join(root, "src/components/settings");
  const appRoot = join(root, "src/app");
  const adminOnlyPath = await resolveModulePath(
    root,
    join(root, "src/__contract__.tsx"),
    "@/components/auth/AdminOnly"
  );
  const useAdminPath = await resolveModulePath(
    root,
    join(root, "src/__contract__.tsx"),
    "@/hooks/use-admin"
  );
  const settingFiles = (await collect(settingsRoot)).filter(
    (file) => !isTestFile(file)
  );
  const pageFiles = (await collect(appRoot)).filter((file) =>
    file.endsWith("page.tsx")
  );
  const pages = await Promise.all(
    pageFiles.map(async (file) => ({ file, ...(await importsFor(root, file)) }))
  );
  const failures = [];

  for (const file of settingFiles) {
    const { imports, sourceFile } = await importsFor(root, file);
    const adminOnlyNames = new Set(
      imports
        .filter(({ resolvedPath }) => resolvedPath === adminOnlyPath)
        .flatMap(({ declaration }) => namedBindings(declaration, "default"))
    );
    const useAdminNames = new Set(
      imports
        .filter(({ resolvedPath }) => resolvedPath === useAdminPath)
        .flatMap(({ declaration }) => namedBindings(declaration, "useAdmin"))
    );
    const isAdminGated =
      hasJsxElement(sourceFile, adminOnlyNames) ||
      hasHookCall(sourceFile, useAdminNames);
    if (!isAdminGated) continue;

    const importingPage = pages.find(
      ({ imports: pageImports, sourceFile: page }) => {
        const localNames = new Set(
          pageImports
            .filter(
              ({ declaration, resolvedPath }) =>
                resolvedPath === resolve(file) &&
                !declaration.importClause?.isTypeOnly
            )
            .flatMap(({ declaration }) => {
              const clause = declaration.importClause;
              if (!clause) return [];
              const names = clause.name ? [clause.name.text] : [];
              if (
                clause.namedBindings &&
                ts.isNamedImports(clause.namedBindings)
              ) {
                names.push(
                  ...clause.namedBindings.elements
                    .filter((element) => !element.isTypeOnly)
                    .map((element) => element.name.text)
                );
              }
              return names;
            })
        );
        return hasJsxElement(page, localNames);
      }
    );
    if (!importingPage) {
      failures.push(
        `${relative(root, file)}: AdminOnly settings component has no page importing and rendering it`
      );
    }
  }

  return failures;
}
