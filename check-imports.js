const ts = require("typescript");
const program = ts.createProgram(["src/components/features/settings-widget.tsx"], {
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2017,
  jsx: ts.JsxEmit.ReactJSX,
  baseUrl: ".",
  paths: {
    "@/*": ["./src/*"],
    "@prisma/client": ["./src/generated/prisma"]
  }
});
const sourceFile = program.getSourceFile("src/components/features/settings-widget.tsx");
const checker = program.getTypeChecker();

function visit(node) {
  if (node.kind === 254) { // ImportDeclaration
    const moduleSpecifier = node.moduleSpecifier.getText();
    if (moduleSpecifier.includes("push-client")) {
      console.log("Import:", moduleSpecifier);
      if (node.importClause && node.importClause.namedBindings) {
        if (node.importClause.namedBindings.kind === 250) { // NamedImports
          node.importClause.namedBindings.elements.forEach(function(el) {
            const symbol = checker.getSymbolAtLocation(el.name);
            if (symbol) {
              const decls = symbol.getDeclarations();
              if (decls.length > 0) {
                const sourceFile = decls[0].getSourceFile();
                const type = checker.getTypeAtLocation(el.name);
                console.log("  ", el.name.getText(), "->", sourceFile?.fileName, "Type:", checker.typeToString(type));
              }
            }
          });
        }
      }
    }
  }
  ts.forEachChild(node, visit);
}

ts.forEachChild(sourceFile, visit);
