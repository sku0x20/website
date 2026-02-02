const terminal = document.getElementById('terminal');
const outputDiv = document.getElementById('output');
const commandInput = document.getElementById('command-input');

const fileSystem = {
    'about.txt': "I am Siddhant, a Backend & Infrastructure Engineer.\nI specialize in building scalable systems, cloud architecture, and automating everything.\nCurrently optimizing pipelines and wrestling with Kubernetes.",
    'projects': "1. \x1b[1mKube-scaler\x1b[0m: An auto-scaler for k8s based on custom metrics.\n2. \x1b[1mCache-money\x1b[0m: A distributed caching layer written in Rust.\n3. \x1b[1mInfra-bot\x1b[0m: Discord bot to manage AWS instances.",
    'skills.md': "- Languages: Go, Rust, Python, TypeScript\n- Infra: AWS, Terraform, Kubernetes, Docker\n- Databases: PostgreSQL, Redis, DynamoDB\n- Tools: Prometheus, Grafana, GitHub Actions",
    'contact.txt': "Email: siddhant@example.com\nGitHub: github.com/siddhant\nLinkedIn: linkedin.com/in/siddhant"
};

const commands = {
    'help': 'List all available commands',
    'ls': 'List directory contents',
    'cat [file]': 'Print file content',
    'whoami': 'Display current user',
    'date': 'Display current date and time',
    'clear': 'Clear the terminal screen'
};

// Fixed ASCII art using array join to avoid template literal escaping issues
const welcomeMessage = [
    "   _____ _    _     _ _                 _   ",
    "  / ____(_)  | |   | | |               | |  ",
    " | (___  _ __| | __| | |__   __ _ _ __ | |_ ",
    "  \___ \| / _` |/ _` | '_ \ / _` | '_ \| __|",
    "  ____) | | (_| | (_| | | | | (_| | | | | |_ ",
    " |_____/|_|\__,_|\__,_|_| |_|\__,_|_| |_|\__|",
    "                                             ",
    " Welcome to Siddhant's CLI Portfolio v1.0.0",
    " Type 'help' to see available commands.",
    ""
].join('\n');

let commandHistory = [];
let historyIndex = -1;

function init() {
    printOutput(welcomeMessage, 'welcome-msg');
    commandInput.focus();
}

commandInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const input = commandInput.value.trim();
        if (input) {
            commandHistory.push(input);
            historyIndex = commandHistory.length; // Reset index to end
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
    // Only autofocus if the user isn't selecting text
    if (window.getSelection().toString() === '') {
        commandInput.focus();
    }
});

function processCommand(cmdRaw) {
    const prompt = document.querySelector('.prompt').innerText;
    printOutput(`${prompt} ${cmdRaw}`, 'command-echo');

    const args = cmdRaw.split(' ');
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

        case 'whoami':
            printOutput('guest');
            break;
            
        case 'date':
            printOutput(new Date().toString());
            break;

        case 'clear':
            outputDiv.innerHTML = '';
            return;
            
default:
            printOutput(`Command not found: ${cmd}. Type 'help' for available commands.`, 'error');
    }

    // Scroll to bottom
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

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', init);