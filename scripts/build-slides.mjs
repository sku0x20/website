import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const slidesRootDir = path.resolve(process.cwd(), 'src/content/slides');
const distDir = path.resolve(process.cwd(), 'dist');

async function findSlideDecks() {
    if (!fs.existsSync(slidesRootDir)) {
        return [];
    }

    const entries = fs.readdirSync(slidesRootDir, { withFileTypes: true });
    const decks = [];

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const slidePath = path.join(slidesRootDir, entry.name, 'slides.md');
            if (fs.existsSync(slidePath)) {
                decks.push({
                    name: entry.name,
                    filePath: slidePath,
                });
            }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            const name = entry.name.replace(/\.md$/, '');
            decks.push({
                name,
                filePath: path.join(slidesRootDir, entry.name),
            });
        }
    }

    return decks;
}

async function buildDeck(deck) {
    const outDir = path.resolve(distDir, 'slides', deck.name);
    const basePath = `/slides/${deck.name}/`;

    console.log(`\nBuilding slides for [${deck.name}]...`);
    console.log(`  Source: ${deck.filePath}`);
    console.log(`  Output: ${outDir}`);
    console.log(`  Base:   ${basePath}`);

    const slidevBin = path.resolve(process.cwd(), 'node_modules/.bin/slidev');

    await execFileAsync(slidevBin, [
        'build',
        deck.filePath,
        '--base',
        basePath,
        '--out',
        outDir,
    ]);

    const deckDir = path.dirname(deck.filePath);
    const localNodeModules = path.join(deckDir, 'node_modules');
    if (fs.existsSync(localNodeModules)) {
        fs.rmSync(localNodeModules, { recursive: true, force: true });
    }

    console.log(`✓ [${deck.name}] built successfully.`);
}

async function main() {
    const decks = await findSlideDecks();

    if (decks.length === 0) {
        console.log('No slide decks found in slides/ directory.');
        return;
    }

    console.log(`Found ${decks.length} slide deck(s) to build.`);

    for (const deck of decks) {
        await buildDeck(deck);
    }

    console.log('\n✓ All slides built successfully.');
}

main().catch((err) => {
    console.error('Error building slides:', err);
    process.exit(1);
});
