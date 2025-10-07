import esbuild from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import plugin from 'node-stdlib-browser/helpers/esbuild/plugin';
import stdLibBrowser from 'node-stdlib-browser';
import {sentryEsbuildPlugin} from "@sentry/esbuild-plugin";
import { YAMLPlugin } from "esbuild-yaml";
import path from 'path';
import data from './package.json' with { type: "json" };
import { copy } from 'esbuild-plugin-copy';

esbuild
    .build({
        sourcemap: true,
        entryPoints: ["src/index.tsx", "src/resources/styles/index.scss"],
        outdir: "public/assets",
        bundle: true,
        minify: true,
        platform: 'browser',
        inject: [path.resolve('node_modules/node-stdlib-browser/helpers/esbuild/shim.js')],
        define: {
            https: 'https',
        },
        plugins: [
            sassPlugin({
                async transform(source) {
                    const { css } = await postcss([autoprefixer]).process(source);
                    return css;
                },
            }),
            plugin(stdLibBrowser),
            YAMLPlugin({}),
            sentryEsbuildPlugin({
                authToken: process.env.SENTRY_AUTH_TOKEN,
                org: "fire-phoenix-games",
                project: "home-automation-frontend",
                release: {
                    name: data.name,
                    version: data.version,
                }
            }),
            copy({
                resolveFrom: "cwd",
                assets: {
                    from: ['src/conf.yaml'],
                    to: ['public/assets'],
                }
            })
        ],
        loader: {
            ".png": "dataurl",
            ".webp": "dataurl",
            ".yaml": "dataurl",
        }
    })
    .then(() => {
        console.log("⚡ Build complete! ⚡");
    })
    .catch((e) => {
        console.error(`Build failed: ${e.message}`);
        process.exit(1);
    });