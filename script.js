const terminal = document.getElementById('terminal');
const outputDiv = document.getElementById('output');
const commandInput = document.getElementById('command-input');

const fileSystem = {
    'about.txt': "\x1b[1mCloud Infrastructure & Backend Architect\x1b[0m\n----------------------------------------\n\x1b[1mRoles:\x1b[0m DevOps, Backend Dev, Infra Architect\n\x1b[1mStack:\x1b[0m GCP, AWS, Docker, Kubernetes, Terraform\n\n\x1b[1mBackend & Microservices:\x1b[0m\n- \x1b[1mPrimary Stack:\x1b[0m Kotlin + Spring Boot 2.7 (Migrated from Spring 4).\n- \x1b[1mPolyglot Services:\x1b[0m Go, Node.js, Bun, Deno, Python.\n- \x1b[1mCommunication:\x1b[0m gRPC & Protocol Buffers.\n- \x1b[1mArchitecture:\x1b[0m Designing scalable microservice meshes.\n\n\x1b[1mInfrastructure & DevOps:\x1b[0m\n- \x1b[1mCloud:\x1b[0m Managing VM fleets on AWS/GCP (Self-managed).\n- \x1b[1mDatabases:\x1b[0m MongoDB, ClickHouse, Redis, PostgreSQL.\n- \x1b[1mObservability:\x1b[0m Loki, Grafana, Prometheus.\n- \x1b[1mOperations:\x1b[0m Docker Compose \u2192 K8s migration, IaC (Terraform).",
    'projects': "1. \x1b[1mKube-scaler\x1b[0m: An auto-scaler for k8s based on custom metrics.\n2. \x1b[1mCache-money\x1b[0m: A distributed caching layer written in Rust.\n3. \x1b[1mInfra-bot\x1b[0m: Discord bot to manage AWS instances.",
    'skills.md': "- Languages: Kotlin, Go, TypeScript, Python, Rust\n- Frameworks: Spring Boot, Node.js, Bun, Deno, FastAPI\n- Infra: AWS, GCP, Terraform, Kubernetes, Docker\n- Databases: MongoDB, ClickHouse, PostgreSQL, Redis\n- Comm: gRPC, Protocol Buffers",
    'contact.txt': "Email: siddhant@example.com\nGitHub: github.com/sku0x20\nLinkedIn: linkedin.com/in/siddhant"
};

const commands = {
    'help': 'List all available commands',
    'ls': 'List directory contents',
    'cat [file]': 'Print file content',
    'alias': 'List command aliases',
    'date': 'Display current date and time',
    'clear': 'Clear the terminal screen',
    'banner': 'Display the welcome banner'
};

const aliases = {
    'bio': 'cat about.txt'
};

// "sku0x20" with lowercase small 's' and very clear '2'
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
    commandInput.focus();
}

commandInput.addEventListener('keydown', function(event) {
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
    if (window.getSelection().toString() === '') {
        commandInput.focus();
    }
});

function processCommand(cmdRaw) {
    // Check for aliases
    let finalCmdRaw = cmdRaw;
    const firstWord = cmdRaw.split(' ')[0].toLowerCase();
    if (aliases[firstWord]) {
        finalCmdRaw = aliases[firstWord] + cmdRaw.substring(firstWord.length);
    }

    const prompt = document.querySelector('.prompt').innerText;
    printOutput(`${prompt} ${cmdRaw}`, 'command-echo');

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
            const files = Object.keys(fileSystem).join('   ');
            printOutput(files, 'file-list');
            break;

        case 'cat':
            if (!arg1) {
                printOutput('Usage: cat [filename]', 'error');
            } else if (fileSystem[arg1]) {
                let content = fileSystem[arg1]
                    .replace(/\x1b\[1m/g, '<strong>')
                    .replace(/\x1b\[0m/g, '</strong>')
                    .replace(/\n/g, '<br>');
                printOutput(content, '', true);
            } else {
                printOutput(`cat: ${arg1}: No such file or directory`, 'error');
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

document.addEventListener('DOMContentLoaded', init);
