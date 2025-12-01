import esbuild from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import plugin from 'node-stdlib-browser/helpers/esbuild/plugin';
import stdLibBrowser from 'node-stdlib-browser';
import path from 'path';

const define = {};
for (const k of Object.keys(process.env)) {
    const v = process.env[k];
    if (v === undefined) continue;
    const value = JSON.stringify(v);

    // use dot-notation when the env key is a valid identifier,
    // otherwise use bracket-notation with a JSON-escaped string
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k)) {
        define[`process.env.${k}`] = value;
    } else {
        define[`process.env[${JSON.stringify(k)}]`] = value;
    }
}

esbuild
    .build({
        sourcemap: false,
        entryPoints: ["src/index.tsx", "src/resources/styles/index.scss"],
        outdir: "public/assets",
        bundle: true,
        minify: true,
        platform: 'browser',
        inject: [path.resolve('node_modules/node-stdlib-browser/helpers/esbuild/shim.js')],
        define: {
            https: 'https',
            ...define
        },
        plugins: [
            sassPlugin({
                async transform(source) {
                    const { css } = await postcss([autoprefixer]).process(source);
                    return css;
                },
            }),
            plugin(stdLibBrowser),
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