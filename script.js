const terminal = document.getElementById('terminal');
const outputDiv = document.getElementById('output');
const commandInput = document.getElementById('command-input');

const fileSystem = {
    'about.txt': "\x1b[1mCloud Infrastructure & Backend Architect\x1b[0m\n----------------------------------------\n\x1b[1mRoles:\x1b[0m DevOps, Backend Dev, Infra Architect\n\x1b[1mStack:\x1b[0m GCP, AWS, Docker, Kubernetes, Terraform\n\n\x1b[1mBackend & Microservices:\x1b[0m\n- \x1b[1mPrimary Stack:\x1b[0m Kotlin + Spring Boot 2.7 (Migrated from Spring 4).\n- \x1b[1mPolyglot Services:\x1b[0m Go, Node.js, Bun, Deno, Python.\n- \x1b[1mCommunication:\x1b[0m gRPC & Protocol Buffers.\n- \x1b[1mArchitecture:\x1b[0m Designing scalable microservice meshes.\n\n\x1b[1mInfrastructure & DevOps:\x1b[0m\n- \x1b[1mCloud & SysAdmin:\x1b[0m Managing VM fleets (AWS/GCP), Linux Administration, Shell Scripting.\n- \x1b[1mDatabases:\x1b[0m MongoDB, ClickHouse, Redis, PostgreSQL.\n- \x1b[1mObservability:\x1b[0m Loki, Grafana, Prometheus.\n- \x1b[1mOperations:\x1b[0m Docker Compose → K8s migration, IaC (Terraform).\n",
    'projects': {
        'relay': "Project Relay.\nLink: https://github.com/sku0x20/RELAY",
        'stopgap': "Project Stopgap.\nLink: https://github.com/sku0x20/STOPGAP",
        'k8s-config': "Kubernetes configurations and manifests.\nLink: https://github.com/sku0x20/K8S-CONFIG",
        'llcc': "Project LLCC.\nLink: https://github.com/sku0x20/LLCC",
        'hrh': "Project HRH.\nLink: https://github.com/sku0x20/HRH",
        'c_oop': "Implementing Object-Oriented Programming principles in pure C.\nLink: https://github.com/sku0x20/c_oop",
        'terraform-configs': "Infrastructure as Code using Terraform.\nLink: https://github.com/sku0x20/TERRAFORM-CONFIGS",
        'assertG': "A lightweight Go library for test assertions.\nLink: https://github.com/sku0x20/assertG",
        'fake-server-js': "A flexible mock server for JavaScript applications.\nLink: https://github.com/sku0x20/fake-server-js",
        'gRunner': "Grunner task runner project.\nLink: https://github.com/sku0x20/GRUNNER",
        'request-generator': "HTTP request generation tool.\nLink: https://github.com/sku0x20/REQUEST-GENERATOR",
        'DNSResolver': "A simple DNS resolver implementation using Java and Swing.\nLink: https://github.com/sku0x20/DNSResolver",
        'Define-Bot': "A bot for definitions.\nLink: https://github.com/sku0x20/Define-Bot",
        'Dijkstra_Algorithm': "Shortest path algorithm implementation in C++.\nLink: https://github.com/sku0x20/Dijkstra_Algorithm",
        'c_hashmap': "Hashmap data structure implementation in C.\nLink: https://github.com/sku0x20/c_hashmap",
        'SemiColonAdder': "A tool to automatically add missing semicolons.\nLink: https://github.com/sku0x20/SemiColonAdder"
    },
    'matrix': "\x1b[1mBinary file (7.2MB). Use './matrix' to execute.\x1b[0m"
};

const commands = {
    'help': 'List all available commands',
    'ls': 'List directory contents',
    'cd [dir]': 'Change directory',
    'cat [file]': 'Print file content',
    'alias': 'List command aliases',
    'date': 'Display current date and time',
    'clear': 'Clear the terminal screen',
    'banner': 'Display the welcome banner',
    'matrix': 'Enter the Matrix'
};

const aliases = {
    'bio': 'cat about.txt',
    './matrix': 'matrix'
};

let currentPath = []; // Array of directory names representing CWD
let isMatrixActive = false;
let matrixInterval;

function resolvePath(path) {
    if (!path) return { node: getDirNode(currentPath), path: currentPath.join('/') };
    
    let parts;
    let tempPath;

    if (path === '/') {
        return { node: fileSystem, path: '' };
    } else if (path.startsWith('/')) {
        parts = path.split('/').filter(p => p);
        tempPath = [];
    } else {
        parts = path.split('/').filter(p => p);
        tempPath = [...currentPath];
    }

    let current = fileSystem;
    // Resolve absolute base if needed
    for (const p of tempPath) {
        current = current[p];
    }

    for (const part of parts) {
        if (part === '.') {
            continue;
        } else if (part === '..') {
            if (tempPath.length > 0) {
                tempPath.pop();
                // Recalculate node from root for '..'
                current = fileSystem;
                for (const p of tempPath) {
                    current = current[p];
                }
            }
        } else {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
                tempPath.push(part);
            } else {
                return null;
            }
        }
    }
    
    return { node: current, path: tempPath.join('/') };
}

function getDirNode(pathArray) {
    let current = fileSystem;
    for (const p of pathArray) {
        current = current[p];
    }
    return current;
}

function updatePrompt() {
    const pathStr = currentPath.length === 0 ? '~' : '~/' + currentPath.join('/');
    document.querySelector('.prompt').innerText = `guest@sku20.dev:${pathStr}$`;
}

const asciiArt = [
    "      _             ___             ___   ___  ",
    "  ___| | ___ _   _ / _ \__  __     |_  ) / _ \ ",
    " (_ -| |/ / | | | | (_) | \/ /      / / | (_) |",
    " /___|_|\_\ \_,_|  \___/ /_/\_\    /___| \___/ "
].join('\n');

const welcomeHtml = `
<div class="welcome-container">
    <div class="ascii-art">${asciiArt}</div>
    <div class="welcome-info">
        <a href="https://github.com/sku0x20" target="_blank">github.com/sku0x20</a>
        <span>Type 'help' to start.</span>
    </div>
</div>
`;

let commandHistory = [];
let historyIndex = -1;

function init() {
    printOutput(welcomeHtml, 'welcome-msg', true);
    updatePrompt();
    commandInput.focus();
}

commandInput.addEventListener('keydown', function(event) {
    // Handle Ctrl+C to stop Matrix
    if (isMatrixActive && event.ctrlKey && event.key === 'c') {
        stopMatrixEffect();
        return;
    }
    
    // Ignore other keys if matrix is active
    if (isMatrixActive) {
        event.preventDefault();
        return;
    }

    if (event.key === 'Enter') {
        const input = commandInput.value.trim();
        if (input) {
            commandHistory.push(input);
            historyIndex = commandHistory.length;
            try {
                processCommand(input);
            } catch (e) {
                printOutput(`Error processing command: ${e.message}`, 'error');
                console.error(e);
            }
        }
        commandInput.value = '';
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            commandInput.value = commandHistory[historyIndex];
        }
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (historyIndex < commandHistory.length) {
            historyIndex++;
            commandInput.value = commandHistory[historyIndex] || '';
        }
    }
});

document.addEventListener('click', () => {
    // Prevent focus stealing if matrix is running
    if (!isMatrixActive && window.getSelection().toString() === '') {
        commandInput.focus();
    }
});

function processCommand(cmdRaw) {
    let finalCmdRaw = cmdRaw;
    const firstWord = cmdRaw.split(' ')[0].toLowerCase();
    if (aliases[firstWord]) {
        finalCmdRaw = aliases[firstWord] + cmdRaw.substring(firstWord.length);
    }

    const promptText = document.querySelector('.prompt').innerText;
    printOutput(`${promptText} ${cmdRaw}`, 'command-echo');

    const args = finalCmdRaw.split(' ');
    const cmd = args[0].toLowerCase();
    const arg1 = args[1];

    switch (cmd) {
        case 'help':
            let helpHtml = '<div class="help-table">';
            for (const [key, desc] of Object.entries(commands)) {
                helpHtml += `<div class="help-row"><span class="help-cmd">${key}</span><span class="help-desc">${desc}</span></div>`;
            }
            helpHtml += '</div>';
            printOutput(helpHtml, '', true);
            break;

        case 'ls':
            const target = resolvePath(arg1);
            if (target === null) {
                printOutput(`ls: ${arg1}: No such file or directory`, 'error');
            } else if (typeof target.node === 'string') {
                printOutput(arg1 || target.path.split('/').pop(), 'file-list');
            } else {
                const keys = Object.keys(target.node).map(k => {
                    return typeof target.node[k] === 'object' ? k + '/' : k;
                });
                keys.forEach(key => printOutput(key, 'file-list'));
            }
            break;

        case 'cd':
            if (!arg1 || arg1 === '~') {
                currentPath = [];
                updatePrompt();
            } else {
                const target = resolvePath(arg1);
                if (target === null) {
                    printOutput(`cd: ${arg1}: No such file or directory`, 'error');
                } else if (typeof target.node === 'string') {
                    printOutput(`cd: ${arg1}: Not a directory`, 'error');
                } else {
                    currentPath = target.path ? target.path.split('/') : [];
                    updatePrompt();
                }
            }
            break;

        case 'cat':
            if (!arg1) {
                printOutput('Usage: cat [filename]', 'error');
            } else {
                const res = resolvePath(arg1);
                if (res === null) {
                    printOutput(`cat: ${arg1}: No such file or directory`, 'error');
                } else if (typeof res.node === 'object') {
                    printOutput(`cat: ${arg1}: Is a directory`, 'error');
                } else {
                    let content = res.node
                        .replace(/\x1b\[1m/g, '<strong>')
                        .replace(/\x1b\[0m/g, '</strong>')
                        .replace(/\n/g, '<br>')
                        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
                    printOutput(content, '', true);
                }
            }
            break;

        case 'alias':
            let aliasHtml = '<div class="help-table">';
            for (const [key, val] of Object.entries(aliases)) {
                aliasHtml += `<div class="help-row"><span class="help-cmd">${key}</span><span class="help-desc">${val}</span></div>`;
            }
            aliasHtml += '</div>';
            printOutput(aliasHtml, '', true);
            break;
            
        case 'date':
            printOutput(new Date().toString());
            break;

        case 'clear':
            outputDiv.innerHTML = '';
            return;

        case 'banner':
            printOutput(welcomeHtml, 'welcome-msg', true);
            break;
        
        case 'matrix':
            startMatrixEffect();
            break;
            
default:
            printOutput(`Command not found: ${cmd}. Type 'help' for available commands.`, 'error');
    }

    terminal.scrollTop = terminal.scrollHeight;
}

function printOutput(text, className = '', isHtml = false) {
    const div = document.createElement('div');
    div.className = 'output-line ' + className;
    
    if (isHtml) {
        div.innerHTML = text;
    } else {
        div.textContent = text;
    }
    
    outputDiv.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
}

// Matrix Effect Logic
function startMatrixEffect() {
    isMatrixActive = true;
    
    // Create canvas if it doesn't exist
    let canvas = document.getElementById('matrix-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'matrix-canvas';
        document.body.appendChild(canvas);
    }
    
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');

    // Make canvas full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%';
    const fontSize = 16;
    const columns = canvas.width / fontSize;

    const drops = [];
    for (let x = 0; x < columns; x++) {
        drops[x] = 1;
    }

    function draw() {
        // Translucent black background to create trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0F0'; // Green text
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = letters.charAt(Math.floor(Math.random() * letters.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    matrixInterval = setInterval(draw, 33);
    
    // Focus logic is handled in the keydown listener
}

function stopMatrixEffect() {
    isMatrixActive = false;
    clearInterval(matrixInterval);
    const canvas = document.getElementById('matrix-canvas');
    if (canvas) {
        canvas.style.display = 'none';
    }
    commandInput.focus();
    printOutput('^C', 'command-echo'); // Simulate echo of Ctrl+C
}

// Handle window resize for matrix
window.addEventListener('resize', () => {
    if (isMatrixActive) {
        const canvas = document.getElementById('matrix-canvas');
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }
});

document.addEventListener('DOMContentLoaded', init);
