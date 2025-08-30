import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';

export default [
  // Browser build
  {
    input: 'countrystatecity-npm/src/index.browser.ts',
    output: {
      file: 'countrystatecity-npm/dist/index.browser.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.lib.json',
        declaration: false,
        declarationMap: false
      }),
      terser({
        compress: {
          keep_fargs: true,
          keep_infinity: true
        },
        mangle: false,
        format: {
          comments: false
        }
      })
    ],
    external: ['js-yaml', 'xml-js'] // These will be handled separately
  },
  
  // Node build (CommonJS)
  {
    input: 'countrystatecity-npm/src/index.node.ts',
    output: {
      file: 'countrystatecity-npm/dist/index.node.cjs',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      resolve({
        preferBuiltins: true
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.lib.json',
        declaration: false,
        declarationMap: false
      })
    ],
    external: ['fs', 'path', 'js-yaml', 'xml-js']
  },
  
  // Node build (ESM)
  {
    input: 'countrystatecity-npm/src/index.node.ts',
    output: {
      file: 'countrystatecity-npm/dist/index.node.mjs',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      resolve({
        preferBuiltins: true
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.lib.json',
        declaration: true,
        declarationMap: true,
        declarationDir: 'countrystatecity-npm/dist'
      })
    ],
    external: ['fs', 'path', 'js-yaml', 'xml-js']
  }
];