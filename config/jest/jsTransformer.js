'use strict';

const ts = require('typescript');

module.exports = {
  process: function process(sourceText, sourcePath) {
    const transpiled = ts.transpileModule(sourceText, {
      compilerOptions: {
        allowJs: true,
        esModuleInterop: true,
        jsx: ts.JsxEmit.React,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2018
      },
      fileName: sourcePath
    });

    return transpiled.outputText;
  }
};
