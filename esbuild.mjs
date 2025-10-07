import esbuild from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import plugin from 'node-stdlib-browser/helpers/esbuild/plugin';
import stdLibBrowser from 'node-stdlib-browser';
import { YAMLPlugin } from "esbuild-yaml";
import path from 'path';
import { copy } from 'esbuild-plugin-copy';

esbuild
    .context({
        sourcemap: true,
        entryPoints: ["src/index.tsx", "src/resources/styles/index.scss"],
        outdir: "public/assets",
        bundle: true,
        minify: false,
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
        ],
        loader: {
            ".png": "dataurl",
            ".webp": "dataurl",
            ".yaml": "dataurl",
            ".svg": "dataurl"
        }
    })
    .then((r) =>  {
            console.log("⚡ Build complete! ⚡");
            r.serve({
                servedir: "public/assets",
                port: 3000,
            }).then((server) => {
                console.log(`Server started on http://${server.host}:${server.port}`);
            });
            r.watch().then(r => console.log('watching...'));
    })
    .catch(() => process.exit(1));