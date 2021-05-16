// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import legacy from '@rollup/plugin-legacy';
import license from 'rollup-plugin-license';
import {terser} from "rollup-plugin-terser";
import path from "path";

import pkg from './package.json';

export default [
  {
    input: 'src/index.ts',

    external: ['@convergence/convergence'],

    plugins: [
      resolve(),
      commonjs(),
      typescript(),
      license({
        banner: {
          commentStyle: 'ignored', // The default
          content: {
            file: path.join(__dirname, 'copyright-header.txt'),
          },
        },
      })
    ],
    output: [
      {
        name: 'ConvergenceDomUtils',
        file: "dist/" + pkg.browser,
        format: 'umd',
        sourcemap: true,
        globals: {
          '@convergence/convergence': 'Convergence',
          "rxjs": "rxjs"
        },
      }
    ]
  },
  {
    input: 'src/index.ts',

    external: ['@convergence/convergence'],

    plugins: [
      resolve(),
      commonjs(),
      legacy({ 'node_modules/mutation-summary.js': 'mutation-summary' }),
      typescript(),
      license({
        banner: {
          commentStyle: 'ignored',
          content: {
            file: path.join(__dirname, 'copyright-header.txt'),
          },
        },
      }),
      terser()
    ],
    output: [
      {
        name: 'ConvergenceDomUtils',
        file: `dist/${path.dirname(pkg.browser)}/${path.basename(pkg.browser, ".js")}.min.js`,
        format: 'umd',
        sourcemap: true,
        globals: {
          '@convergence/convergence': 'Convergence',
          "rxjs": "rxjs"
        },
      }
    ]
  }
];