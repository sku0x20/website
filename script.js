const terminal = document.getElementById('terminal');
const outputDiv = document.getElementById('output');
const commandInput = document.getElementById('command-input');
const guiInterface = document.getElementById('gui-interface');
const modeToggleBtn = document.getElementById('mode-toggle');
const guiBreadcrumbs = document.getElementById('gui-breadcrumbs');
const guiContent = document.getElementById('gui-content');
const fileViewer = document.getElementById('file-viewer');
const viewerContent = document.getElementById('viewer-content');
const viewerFilename = document.getElementById('viewer-filename');
const closeViewerBtn = document.getElementById('close-viewer-btn');

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
    'matrix': "Binary file (7.2MB). Use './matrix' to execute."
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

let commandHistory = [];
let historyIndex = -1;
let currentPath = []; // Array of directory names representing CWD
let isGuiMode = false;
let isMatrixActive = false;
let matrixInterval;

// --- SHARED PATH RESOLUTION ---

function resolvePath(path) {
    if (!path) return {node: getDirNode(currentPath), path: currentPath.join('/')};

    let parts;
    let tempPath;

    if (path === '/') {
        return {node: fileSystem, path: ''};
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

    return {node: current, path: tempPath.join('/')};
}

function getDirNode(pathArray) {
    let current = fileSystem;
    for (const p of pathArray) {
        current = current[p];
    }
    return current;
}

// --- TERMINAL LOGIC ---

function updatePrompt() {
    const pathStr = currentPath.length === 0 ? '~' : '~/' + currentPath.join('/');
    document.querySelector('.prompt').innerText = `guest@sku0x20:${pathStr}$`;
}

const asciiArt = "        __          _______         _______________   \n" +
    "  _____|  | ____ __ \   _  \ ___  __\_____  \   _  \  \n" +
    " /  ___/  |/ /  |  \/  /_\  \\  \/  //  ____/  /_\  \ \n" +
    " \___ \|    &lt;|  |  /\  \_/   \&gt;    &lt;/       \  \_/   \ \n" +
    "/____  &gt;__|_ \____/  \_____  /__/\_ \_______ \_____  /\n" +
    "     \/     \/             \/      \/       \/     \/ "

const welcomeHtml = `
<div class="welcome-container">
    <div class="ascii-art">${asciiArt}</div>
    <div class="welcome-info">
        <a href="https://github.com/sku0x20" target="_blank">github.com/sku0x20</a>
        <span>Type 'help' to start.</span>
    </div>
</div>
`;

function init() {
    initBackground(); // Start dynamic background
    // Check for mobile device (simplified check)
    if (window.innerWidth <= 768) {
        toggleMode(true); // Force GUI mode on mobile
    } else {
        printOutput(welcomeHtml, 'welcome-msg', true);
        updatePrompt();
        commandInput.focus();
    }
}

// --- GUI LOGIC ---

function toggleMode(forceGui = false) {
    if (forceGui || !isGuiMode) {
        // Switch to GUI
        isGuiMode = true;
        terminal.style.display = 'none';
        guiInterface.style.display = 'flex';
        modeToggleBtn.innerText = 'TERMINAL MODE';
        renderGui();
    } else {
        // Switch to Terminal
        isGuiMode = false;
        terminal.style.display = 'block';
        guiInterface.style.display = 'none';
        modeToggleBtn.innerText = 'GUI MODE';
        commandInput.focus();
        // Sync terminal path with GUI path (if we changed it in GUI)
        updatePrompt();
    }
}

function renderGui() {
    const dirNode = getDirNode(currentPath);
    guiContent.innerHTML = '';
    guiBreadcrumbs.innerText = currentPath.length === 0 ? '~/' : '~/' + currentPath.join('/');

    // 'Up' folder if not root
    if (currentPath.length > 0) {
        const upItem = createGuiItem('..', 'DIR', () => {
            currentPath.pop();
            renderGui();
        });
        guiContent.appendChild(upItem);
    }

    const keys = Object.keys(dirNode).sort(); // Sort mainly for UI consistency
    
    // Sort directories first
    const sortedKeys = keys.sort((a, b) => {
        const aIsDir = typeof dirNode[a] === 'object';
        const bIsDir = typeof dirNode[b] === 'object';
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
        const isDir = typeof dirNode[key] === 'object';
        const type = isDir ? 'DIR' : 'FILE';
        const item = createGuiItem(key, type, () => {
            if (isDir) {
                currentPath.push(key);
                renderGui();
            } else {
                openFileViewer(key, dirNode[key]);
            }
        });
        guiContent.appendChild(item);
    });
}

function createGuiItem(name, type, onClick) {
    const div = document.createElement('div');
    div.className = 'gui-item';
    
    const icon = document.createElement('div');
    icon.className = 'gui-icon';
    // ASCII-style icons
    if (name === '..') {
        icon.innerHTML = '&#11013;'; // Left Arrow
    } else if (type === 'DIR') {
        icon.innerHTML = '&#128193;'; // Folder
    } else if (name === 'matrix') {
        icon.innerHTML = '&#128187;'; // PC Icon for binary
    } else {
        icon.innerHTML = '&#128196;'; // File
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'gui-name';
    nameSpan.textContent = name;

    div.appendChild(icon);
    div.appendChild(nameSpan);
    div.onclick = onClick;
    
    return div;
}

function openFileViewer(filename, content) {
    // Special case for Matrix
    if (filename === 'matrix') {
        // Switch to terminal mode temporarily to run matrix?
        // Or just run it on top?
        toggleMode(); // Switch back to terminal
        startMatrixEffect();
        return;
    }

    viewerFilename.innerText = filename;
    
    // Format content like 'cat'
    let formatted = content
        .replace(/\x1b\[1m/g, '<strong>')
        .replace(/\x1b\[0m/g, '</strong>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        
    viewerContent.innerHTML = formatted;
    fileViewer.style.display = 'flex';
}

closeViewerBtn.onclick = () => {
    fileViewer.style.display = 'none';
};

modeToggleBtn.onclick = () => toggleMode();

// --- EVENT LISTENERS ---

document.addEventListener('keydown', function(event) {
    if (isMatrixActive && event.ctrlKey && event.key === 'c') {
        stopMatrixEffect();
    }
});

commandInput.addEventListener('keydown', function(event) {
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
    } else if (event.key === 'Tab') {
        event.preventDefault();
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
    if (!isMatrixActive && !isGuiMode && window.getSelection().toString() === '') {
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
                const keys = Object.keys(target.node).sort().map(k => {
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

// --- DYNAMIC BACKGROUND ---
function initBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let particles = [];
    const particleCount = 60; // Adjust for density
    const connectionDistance = 150;
    
    // Mouse tracking
    let mouse = { x: null, y: null };
    
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.x;
        mouse.y = e.y;
    });
    
    window.addEventListener('resize', resize);
    
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    
    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5; // Slow velocity
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 1;
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            // Bounce off edges
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
            
            // Mouse interaction
            if (mouse.x != null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 200) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (200 - distance) / 200;
                    // Gentle push away or pull towards? Let's do gentle pull to form shapes
                    // Actually, nodes usually float. Let's just draw lines to mouse.
                }
            }
        }
        
        draw() {
            ctx.fillStyle = 'rgba(0, 255, 65, 0.3)'; // Dim green
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    function initParticles() {
        particles = [];
        resize();
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }
    
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            
            // Connect to other particles
            for (let j = i; j < particles.length; j++) {
                let dx = particles[i].x - particles[j].x;
                let dy = particles[i].y - particles[j].y;
                let distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < connectionDistance) {
                    ctx.strokeStyle = `rgba(0, 255, 65, ${1 - distance/connectionDistance})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
            
            // Connect to mouse
            if (mouse.x != null) {
                let dx = particles[i].x - mouse.x;
                let dy = particles[i].y - mouse.y;
                let distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < 200) {
                    ctx.strokeStyle = `rgba(0, 255, 65, ${1 - distance/200})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    
    initParticles();
    animate();
}

// Matrix Effect Logic
function startMatrixEffect() {
    isMatrixActive = true;
    let canvas = document.getElementById('matrix-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'matrix-canvas';
        document.body.appendChild(canvas);
    }
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
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
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0F0';
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
}

function stopMatrixEffect() {
    isMatrixActive = false;
    clearInterval(matrixInterval);
    const canvas = document.getElementById('matrix-canvas');
    if (canvas) {
        canvas.style.display = 'none';
    }
    if (!isGuiMode) {
        commandInput.focus();
        printOutput('^C', 'command-echo');
    }
}

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
