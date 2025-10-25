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
        (async () => {
            const fs = await import('fs');
            const { createServer } = await import('http');
            const publicDir = path.resolve('public');
            const assetsDir = path.join(publicDir, 'assets');
            const indexPath = path.join(publicDir, 'index.html');
            const port = 3000;

            // preload index.html and always return it for SPA routing
            let indexHtml;
            try {
                indexHtml = await fs.promises.readFile(indexPath, 'utf8');
            } catch (err) {
                console.error(`Index file not found at ${indexPath}`);
                indexHtml = null;
            }

            const mime = {
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.html': 'text/html',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.svg': 'image/svg+xml',
                '.webp': 'image/webp',
                '.ico': 'image/x-icon',
                '.json': 'application/json',
                '.wasm': 'application/wasm',
                '.map': 'application/json'
            };

            const server = createServer(async (req, res) => {
                try {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const pathname = decodeURIComponent(url.pathname);

                    if (pathname.startsWith('/assets/')) {
                        const relativePath = pathname.slice('/assets/'.length);
                        const filePath = path.join(assetsDir, relativePath);
                        const resolved = path.resolve(filePath);
                        const assetsResolved = path.resolve(assetsDir);

                        if (resolved.startsWith(assetsResolved + path.sep) || resolved === assetsResolved) {
                            try {
                                const stat = await fs.promises.stat(resolved);
                                if (stat.isFile()) {
                                    const ext = path.extname(resolved).toLowerCase();
                                    res.statusCode = 200;
                                    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
                                    fs.createReadStream(resolved).pipe(res);
                                    return;
                                }
                            } catch {}
                        }
                    }

                    // SPA fallback for everything else
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html');
                    res.end(indexHtml);
                } catch (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.end('Internal Server Error');
                }
            });

            server.listen(port, () => console.log(`Server started on http://localhost:${port}`));
        })();
        r.watch().then(r => console.log('watching...'));
    })
    .catch(() => process.exit(1));