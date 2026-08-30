#!/usr/bin/env node
// ts_morph_analyzer.mjs — Static frontend analyzer using ts-morph
// Usage: node ts_morph_analyzer.mjs <directory> <analysis_run_id>
// Outputs JSON to stdout: { nodes: [...], edges: [...] }

import { Project, SyntaxKind, Node } from "ts-morph";
import { readdirSync, statSync } from "fs";
import { randomUUID } from "crypto";

const projectRoot = process.argv[2] || ".";
const analysisRunId = process.argv[3] || "unknown";

import crypto from "crypto";
function stableId(...parts) {
  const key = parts.join("|");
  return crypto.createHash("md5").update(key).digest("hex").slice(0, 12);
}
function genId() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

function makeNode(type, name, file, lineStart, lineEnd, lang, runId, meta = {}) {
  return {
    id: (typeof file !== "undefined") ? stableId(file, name, type) : stableId(source, target, edgeType),
    type,
    name,
    file,
    lineStart,
    lineEnd,
    language: lang,
    analysisRunId: runId,
    metadata: meta,
  };
}

function makeEdge(source, target, edgeType, confidence, runId, sourceRef, meta = {}) {
  return {
    id: (typeof file !== "undefined") ? stableId(file, name, type) : stableId(source, target, edgeType),
    source,
    target,
    type: edgeType,
    confidence,
    analysisRunId: runId,
    sourceRef,
    metadata: meta,
  };
}

function findTsFiles(dir) {
  const extensions = [".ts", ".tsx"];
  const results = [];
  function walk(d) {
    try {
      const entries = readdirSync(d);
      for (const entry of entries) {
        if (entry === "node_modules" || entry === "dist" || entry === ".next") continue;
        const fullPath = `${d}/${entry}`;
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (extensions.some((ext) => entry.endsWith(ext))) {
            results.push(fullPath);
          }
        } catch {}
      }
    } catch {}
  }
  walk(dir);
  return results;
}

function main() {
  const files = findTsFiles(projectRoot);
  const nodes = [];
  const edges = [];
  const componentNodes = new Map(); // name -> node

  const tsProject = new Project({
    compilerOptions: { jsx: 1, allowJs: true },
    skipAddingFilesFromTsConfig: true,
    useInMemoryFileSystem: false,
  });

  for (const filePath of files) {
    let sourceFile;
    try {
      sourceFile = tsProject.addSourceFileAtPath(filePath);
    } catch {
      continue;
    }
    const relPath = filePath;

    // --- Detect React components ---
    // Function components
    for (const fn of sourceFile.getFunctions()) {
      const name = fn.getName();
      if (!name) continue;
      const bodyText = fn.getBody()?.getText() || "";
      if (bodyText.includes("<") && (bodyText.includes("/>") || bodyText.includes("</"))) {
        const node = makeNode(
          "component", name, relPath,
          fn.getStartLineNumber(), fn.getEndLineNumber(),
          "typescript", analysisRunId, { kind: "function-component" }
        );
        nodes.push(node);
        componentNodes.set(name, node);
      }
    }

    // Variable declarations (arrow functions, function expressions)
    for (const stmt of sourceFile.getVariableStatements()) {
      for (const dec of stmt.getDeclarations()) {
        const name = dec.getName();
        const init = dec.getInitializer();
        if (!init) continue;
        const kind = init.getKind();
        if (kind === SyntaxKind.ArrowFunction || kind === SyntaxKind.FunctionExpression) {
          const bodyText = init.getText();
          if (bodyText.includes("<") && (bodyText.includes("/>") || bodyText.includes("</"))) {
            const node = makeNode(
              "component", name, relPath,
              dec.getStartLineNumber(), dec.getEndLineNumber(),
              "typescript", analysisRunId, { kind: "arrow-component" }
            );
            nodes.push(node);
            componentNodes.set(name, node);
          }
        }
      }
    }

    // --- Detect API calls (fetch) at file level ---
    // We find all fetch() calls and associate them to the nearest parent component
    const allFetchCalls = [];
    for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const exprText = callExpr.getExpression().getText();
      if (exprText !== "fetch") continue;

      const args = callExpr.getArguments();
      if (args.length === 0) continue;

      let url = "";
      let method = "GET";

      const firstArg = args[0];
      if (Node.isStringLiteral(firstArg)) {
        url = firstArg.getLiteralValue();
      } else {
        // Template expression or other: get full text and parse manually
        const argText = firstArg.getText();
        // Try to extract the URL pattern
        // Remove template literal backticks and replace ${...} with {param}
        url = argText.replace(/^`|`$/g, "").replace(/\$\{(\w+)\}/g, "{$1}");
      }

      if (args.length > 1 && Node.isObjectLiteralExpression(args[1])) {
        for (const prop of args[1].getProperties()) {
          if (Node.isPropertyAssignment(prop)) {
            const key = prop.getName();
            if (key === "method" && Node.isStringLiteral(prop.getInitializer())) {
              method = prop.getInitializer().getLiteralValue().toUpperCase();
            }
          }
        }
      }

      if (url) {
        allFetchCalls.push({ url, method, expr: callExpr });
      }
    }

    // Find which component each fetch call belongs to
    for (const fetchInfo of allFetchCalls) {
      const fetchExpr = fetchInfo.expr;
      const fetchLine = fetchExpr.getStartLineNumber();

      // Find the parent component
      let parentComp = null;
      for (const [compName, compNode] of componentNodes) {
        if (compNode.file === relPath && compNode.lineStart <= fetchLine && compNode.lineEnd >= fetchLine) {
          parentComp = compNode;
          break;
        }
      }

      const apiNode = makeNode(
        "handler",
        `${fetchInfo.method} ${fetchInfo.url}`,
        relPath,
        fetchLine,
        fetchExpr.getEndLineNumber(),
        "typescript",
        analysisRunId,
        { kind: "api-call", method: fetchInfo.method, url: fetchInfo.url }
      );
      nodes.push(apiNode);

      if (parentComp) {
        edges.push(
          makeEdge(
            parentComp.id, apiNode.id, "CALLS", 0.95,
            analysisRunId, `${relPath}:${fetchLine}`,
            { method: fetchInfo.method, url: fetchInfo.url }
          )
        );
      }
    }

    // --- Detect event handlers (onClick, onSubmit, onChange) ---
    for (const jsx of sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)) {
      const tagName = jsx.getTagNameNode().getText();

      for (const attr of jsx.getAttributes()) {
        if (!Node.isJsxAttribute(attr)) continue;
        const attrName = attr.getNameNode().getText();
        if (!/^(on[A-Z])/.test(attrName)) continue;

        const init = attr.getInitializer();
        if (!init) continue;

        let handlerName = null;
        let handlerLine = init.getStartLineNumber();
        let handlerEndLine = init.getEndLineNumber();

        if (Node.isJsxExpression(init)) {
          const innerExpr = init.getExpression();
          if (innerExpr) {
            if (Node.isCallExpression(innerExpr)) {
              // onClick={() => doSomething()} or onClick={handleClick(arg)}
              const callExpr = innerExpr;
              const funcExpr = callExpr.getExpression();
              if (Node.isIdentifier(funcExpr)) {
                handlerName = funcExpr.getText();
              } else if (Node.isPropertyAccessExpression(funcExpr)) {
                handlerName = funcExpr.getName();
              }
            } else if (Node.isArrowFunction(innerExpr)) {
              // onClick={() => { ... }}
              const body = innerExpr.getBody();
              if (Node.isCallExpression(body)) {
                handlerName = body.getExpression().getText();
              }
            } else if (Node.isIdentifier(innerExpr)) {
              // onClick={handleClick}
              handlerName = innerExpr.getText();
            }
          }
        }

        if (!handlerName) continue;

        // Find which component this JSX belongs to
        let parentComp = null;
        for (const [compName, compNode] of componentNodes) {
          if (compNode.file === relPath && compNode.lineStart <= handlerLine && compNode.lineEnd >= handlerLine) {
            parentComp = compNode;
            break;
          }
        }

        const handlerNode = makeNode(
          "handler",
          `${attrName}:${handlerName}`,
          relPath,
          handlerLine,
          handlerEndLine,
          "typescript",
          analysisRunId,
          { event: attrName, handler: handlerName, jsxTag: tagName }
        );
        nodes.push(handlerNode);

        if (parentComp) {
          edges.push(
            makeEdge(
              parentComp.id, handlerNode.id, "TRIGGERS", 1.0,
              analysisRunId, `${relPath}:${handlerLine}`
            )
          );
        }
      }
    }
  }

  process.stdout.write(JSON.stringify({ nodes, edges }));
}

main();
