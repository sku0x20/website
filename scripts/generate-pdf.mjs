import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const distDir = path.resolve(process.cwd(), 'dist');
const outputFile = path.resolve(process.cwd(), 'public/cv.pdf');
const distOutputFile = path.resolve(distDir, 'cv.pdf');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
};

function getChromePath() {
    const candidates = [
        process.env.CHROME_BIN,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    throw new Error('Google Chrome executable not found.');
}

function createStaticServer() {
    return http.createServer((req, res) => {
        let reqPath = decodeURIComponent(req.url.split('?')[0]);
        if (reqPath.endsWith('/')) {
            reqPath += 'index.html';
        }

        let filePath = path.join(distDir, reqPath);

        if (!fs.existsSync(filePath) && fs.existsSync(path.join(filePath, 'index.html'))) {
            filePath = path.join(filePath, 'index.html');
        }

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
}

const resumeOutputFile = path.resolve(process.cwd(), 'public/resume.pdf');
const distResumeOutputFile = path.resolve(distDir, 'resume.pdf');

async function printDocument(chromePath, inputUrl, targetFile, distTargetFile) {
    console.log(`Printing ${targetFile} from ${inputUrl}...`);
    await execFileAsync(chromePath, [
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        `--print-to-pdf=${targetFile}`,
        inputUrl
    ]);

    if (fs.existsSync(targetFile)) {
        if (fs.existsSync(distDir)) {
            fs.copyFileSync(targetFile, distTargetFile);
        }
        const stats = fs.statSync(targetFile);
        console.log(`✓ Successfully generated ${targetFile} (${stats.size} bytes)`);
    } else {
        throw new Error(`Output file ${targetFile} was not generated.`);
    }
}

async function main() {
    if (!fs.existsSync(distDir)) {
        throw new Error('dist/ directory not found. Please run "astro build" first.');
    }

    const chromePath = getChromePath();
    const server = createStaticServer();

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const cvUrl = `http://127.0.0.1:${port}/cv/`;
    const resumeUrl = `http://127.0.0.1:${port}/resume/`;

    try {
        await printDocument(chromePath, cvUrl, outputFile, distOutputFile);
        await printDocument(chromePath, resumeUrl, resumeOutputFile, distResumeOutputFile);
    } finally {
        server.close();
    }
}

main().catch((err) => {
    console.error('Error generating PDF:', err);
    process.exit(1);
});
