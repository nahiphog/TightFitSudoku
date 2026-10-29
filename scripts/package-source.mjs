import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('public', { recursive: true });
copyFileSync('LICENSE', 'public/LICENSE.txt');
const inputs = ['src', 'tests', 'vendor', 'docs', 'scripts', 'techniques', 'vite.config.mjs', 'package.json', 'package-lock.json', 'tsconfig.json', 'index.html', 'README.md', 'LICENSE'];
for (const input of inputs) if (!existsSync(input)) throw new Error(`Missing source input: ${input}`);
const result = spawnSync('tar', ['-czf', 'public/tight-fit-source.tar.gz', ...inputs], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
