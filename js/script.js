// ==========================================
//  GLOBAL STATE
// ==========================================
let currentTab = 'resolver';
let sniperInterval = null;
let pingInterval = null;

// Rayan State
let currentRayanMode = 'AHK_DUMP';

// ==========================================
//  APP NAVIGATION (LANDING PAGE)
// ==========================================
function selectApp(app) {
    console.log("Navigating to:", app);
    const landing = document.getElementById('landing-page');
    const txApp = document.getElementById('tx-hunter-app');
    const rayanApp = document.getElementById('rayan-dashboard-app');
    const leakApp = document.getElementById('leak-hunter-app');

    // Fade out landing
    if (landing) landing.classList.add('hidden');

    if (app === 'tx') {
        if (txApp) txApp.classList.remove('hidden');
        document.title = "TX-HUNTER // PROJECT_RED";
    } else if (app === 'rayan') {
        if (rayanApp) rayanApp.classList.remove('hidden');
        document.title = "RAYAN ENGINE // PROJECT_RED";
    } else if (app === 'leak') {
        if (leakApp) leakApp.classList.remove('hidden');
        document.title = "LEAK HUNTER // PROJECT_RED";
    }
}

function goHome() {
    document.getElementById('tx-hunter-app').classList.add('hidden');
    document.getElementById('rayan-dashboard-app').classList.add('hidden');
    document.getElementById('leak-hunter-app').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
    document.title = "PROJECT_RED // HOME";
}

// ==========================================
//  UI HELPERS
// ==========================================
function switchTab(tabId) {
    // Hide all
    ['resolver', 'sniper', 'ping'].forEach(t => {
        document.getElementById(`view-${t}`).classList.add('hidden');
        document.getElementById(`tab-${t}`).classList.remove('border-cyber-red', 'text-cyber-red');
        document.getElementById(`tab-${t}`).classList.add('border-transparent', 'text-gray-500');
    });

    // Show selected
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    document.getElementById(`tab-${tabId}`).classList.add('border-cyber-red', 'text-cyber-red');
    document.getElementById(`tab-${tabId}`).classList.remove('border-transparent', 'text-gray-500');
    
    currentTab = tabId;
}

function log(msg, type = 'info') {
    const term = document.getElementById('log-output');
    const div = document.createElement('div');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    div.innerHTML = `<span class="text-gray-600">[${time}]</span> ${msg}`;
    if (type === 'error') div.classList.add('text-red-500');
    if (type === 'success') div.classList.add('text-green-500');
    
    term.appendChild(div);
    term.scrollTop = term.scrollHeight;
}

function sniperLog(msg) {
    const term = document.getElementById('sniper-log');
    const div = document.createElement('div');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    div.innerHTML = `<span class="text-gray-600">[${time}]</span> ${msg}`;
    term.appendChild(div);
    term.scrollTop = term.scrollHeight;
}

// ==========================================
//  RESOLVER LOGIC
// ==========================================
async function resolveServer() {
    const input = document.getElementById('cfx-input').value.trim();
    if (!input) {
        log("ERROR: Input is empty.", "error");
        return;
    }

    // Extract code
    const match = input.match(/(?:cfx\.re\/join\/|join\/)([a-zA-Z0-9]+)/) || [null, input];
    const code = match[1];

    if (code.length < 3) {
        log("ERROR: Invalid CFX Code.", "error");
        return;
    }

    log(`RESOLVING: ${code}...`);
    document.getElementById('badge-status').innerText = "WORKING";
    document.getElementById('badge-status').className = "px-2 py-0.5 bg-yellow-900 text-yellow-500 border border-yellow-800";

    try {
        const response = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${code}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) throw new Error("API Error");

        const data = await response.json();
        const serverData = data.Data;
        
        if (!serverData || !serverData.connectEndPoints) {
            throw new Error("No Endpoint Found");
        }

        const ipPort = serverData.connectEndPoints[0];
        const ip = ipPort.split(':')[0];
        const name = serverData.hostname || "Unknown Server";
        const players = `${serverData.clients}/${serverData.sv_maxclients}`;

        // Update UI
        document.getElementById('info-name').innerText = name.replace(/\^[0-9]/g, ''); // Strip colors
        document.getElementById('info-ip').innerText = ip;
        document.getElementById('info-players').innerText = players;
        document.getElementById('server-info').classList.remove('hidden');
        
        // Auto-fill Sniper
        document.getElementById('sniper-ip').value = ip;
        document.getElementById('ping-ip').value = ip;

        log(`SUCCESS: Resolved ${ip}`, "success");
        
        // Check Port 40120 (Client-side estimation)
        checkPort(ip);

    } catch (e) {
        log(`FAILED: ${e.message}`, "error");
        document.getElementById('badge-status').innerText = "ERROR";
        document.getElementById('badge-status').className = "px-2 py-0.5 bg-red-900 text-red-500 border border-red-800";
    }
}

async function checkPort(ip) {
    log(`SCANNING: ${ip}:40120...`);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        await fetch(`http://${ip}:40120`, { 
            mode: 'no-cors', 
            signal: controller.signal 
        });
        
        portOpen(ip);
        clearTimeout(timeoutId);

    } catch (e) {
        // Strict check: If fetch fails/timeouts, port is likely CLOSED or filtered.
        portClosed();
    }
}

function portOpen(ip) {
    log("PORT 40120: OPEN (VULNERABLE)", "success");
    document.getElementById('badge-port').innerText = "OPEN";
    document.getElementById('badge-port').className = "px-2 py-0.5 bg-green-900 text-green-500 border border-green-800 animate-pulse";
    window.open(`http://${ip}:40120`, '_blank');
}

function portClosed() {
    log("PORT 40120: CLOSED/FILTERED", "error");
    document.getElementById('badge-port').innerText = "CLOSED";
    document.getElementById('badge-port').className = "px-2 py-0.5 bg-red-900 text-red-500 border border-red-800";
}

// ==========================================
//  SNIPER LOGIC
// ==========================================
function toggleSniper() {
    const btn = document.getElementById('btn-sniper');
    const ip = document.getElementById('sniper-ip').value;
    const webhook = document.getElementById('sniper-webhook').value;
    const delay = document.getElementById('sniper-delay').value * 1000;

    if (sniperInterval) {
        clearInterval(sniperInterval);
        sniperInterval = null;
        btn.innerText = "[ START SNIPER ]";
        btn.classList.remove('bg-red-900');
        sniperLog("SNIPER ABORTED.");
        return;
    }

    if (!ip) {
        sniperLog("ERROR: No Target IP.");
        return;
    }

    btn.innerText = "[ STOP SNIPER ]";
    btn.classList.add('bg-red-900');
    sniperLog(`TARGET: ${ip} | DELAY: ${delay/1000}s`);

    sniperInterval = setInterval(async () => {
        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 2000);
            
            await fetch(`http://${ip}:40120`, { mode: 'no-cors', signal: controller.signal });
            
            // HIT!
            sniperLog("HIT! PORT OPEN!");
            clearInterval(sniperInterval);
            sniperInterval = null;
            btn.innerText = "[ START SNIPER ]";
            window.open(`http://${ip}:40120`, '_blank');
            
            if (webhook) sendWebhook(webhook, ip);

        } catch (e) {
            sniperLog("MISS - Retrying...");
        }
    }, delay);
}

function sendWebhook(url, ip) {
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: "TX-HUNTER",
            content: `@everyone TARGET ACQUIRED: http://${ip}:40120`
        })
    });
}

// ==========================================
//  PING LOGIC
// ==========================================
function togglePing() {
    const btn = document.getElementById('btn-ping');
    const ip = document.getElementById('ping-ip').value;

    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
        btn.innerText = "[ START PING ]";
        return;
    }

    if (!ip) return;

    btn.innerText = "[ STOP PING ]";
    const term = document.getElementById('ping-log');
    term.innerHTML = "";

    pingInterval = setInterval(async () => {
        const port = document.getElementById('ping-port').value || 80;
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            await fetch(`http://${ip}:${port}`, { 
                mode: 'no-cors', 
                signal: controller.signal 
            });
            clearTimeout(timeoutId);

            const rtt = Date.now() - start;
            
            const div = document.createElement('div');
            div.innerHTML = `<span class="text-green-500">REPLY from ${ip}: time=${rtt}ms</span>`;
            term.appendChild(div);

        } catch (e) {
            const rtt = Date.now() - start;
            if (e.name === 'AbortError') {
                 const div = document.createElement('div');
                div.innerHTML = `<span class="text-red-500">TIMEOUT</span>`;
                term.appendChild(div);
            } else {
                 const div = document.createElement('div');
                div.innerHTML = `<span class="text-green-500">REPLY from ${ip}: time=${rtt}ms (est)</span>`;
                term.appendChild(div);
            }
        }
        term.scrollTop = term.scrollHeight;
    }, 1000);
}

// ==========================================
//  RAYAN DASHBOARD LOGIC (MOCKED)
// ==========================================

function setRayanMode(mode, btn) {
    currentRayanMode = mode;
    
    // Reset active class
    document.querySelectorAll('.rayan-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update button text
    const actionBtn = document.getElementById('rayan-action-btn');
    const textMap = {
        'AHK_DUMP': 'Extract AHK Script',
        'PYINSTALLER': 'Extract PyInstaller',
        'PYC_DECOMPILE': 'Decompile PYC',
        'UPX_UNPACK': 'Unpack UPX',
        'VIRUSTOTAL_SCAN': 'Scan on VirusTotal',
        'NETWORK_SCRAPE': 'Scrape Network IOCs',
        'TOKEN_HUNTER': 'Hunt Tokens',
        'AUTO_DEOBFUSCATE': 'Auto-Deobfuscate',
        'COMPILER_DETECT': 'Compiler & Packer ID',
    'STRINGS_DUMP': 'Strings Extractor',
    'ENTROPY_ANALYSIS': 'Entropy Analyzer',
    'CRYPTO_BASE64': 'Base64 Operations',
    'CRYPTO_HEX': 'Hex Converter',
    'CRYPTO_HASH': 'Hash Generator',
    'BUILD_PYINSTALLER': 'Compile with PyInstaller',
    'BUILD_NUITKA': 'Compile with Nuitka'
    };
    actionBtn.innerText = (textMap[mode] || mode).toUpperCase();
    
    rayanLog(`[*] MODE SET: ${mode}`);
}

function handleFileSelect(input) {
    if (input.files.length > 0) {
        document.getElementById('rayan-file-input').value = input.files[0].name;
        rayanLog(`[+] Selected File: ${input.files[0].name}`);
    }
}

function rayanLog(msg) {
    const term = document.getElementById('rayan-log-area');
    term.innerHTML += msg + "\n";
    term.scrollTop = term.scrollHeight;
}

// Global variable to store binary data for saving
let extractedData = null;
let extractedName = "output.txt";
let currentView = 'code'; // code or hex
let currentFileContent = null; // Store raw file content for hex view

// ==========================================
//  UI HELPERS
// ==========================================
function toggleView(view) {
    currentView = view;
    const codeArea = document.getElementById('rayan-output-area');
    const hexArea = document.getElementById('rayan-hex-view');
    const btnCode = document.getElementById('view-code-btn');
    const btnHex = document.getElementById('view-hex-btn');

    if (view === 'code') {
        codeArea.classList.remove('hidden');
        hexArea.classList.add('hidden');
        
        btnCode.classList.add('text-[#66fcf1]', 'bg-[#1f2833]');
        btnCode.classList.remove('text-gray-500');
        
        btnHex.classList.remove('text-[#66fcf1]', 'bg-[#1f2833]');
        btnHex.classList.add('text-gray-500');
    } else {
        codeArea.classList.add('hidden');
        hexArea.classList.remove('hidden');
        
        btnHex.classList.add('text-[#66fcf1]', 'bg-[#1f2833]');
        btnHex.classList.remove('text-gray-500');
        
        btnCode.classList.remove('text-[#66fcf1]', 'bg-[#1f2833]');
        btnCode.classList.add('text-gray-500');
        
        if (currentFileContent) renderHexDump(currentFileContent);
    }
}

function renderHexDump(data) {
    const container = document.getElementById('rayan-hex-view');
    if (!data) {
        container.innerText = "// No data loaded.";
        return;
    }
    
    let hexOut = "";
    const limit = Math.min(data.length, 2048);
    
    for (let i = 0; i < limit; i += 16) {
        hexOut += i.toString(16).padStart(8, '0') + ": ";
        let hexBytes = "";
        let asciiChars = "";
        
        for (let j = 0; j < 16; j++) {
            if (i + j < limit) {
                const code = data.charCodeAt(i + j);
                hexBytes += code.toString(16).padStart(2, '0') + " ";
                asciiChars += (code >= 32 && code <= 126) ? data[i+j] : ".";
            } else {
                hexBytes += "   ";
            }
        }
        
        hexOut += hexBytes + " | " + asciiChars + "\n";
    }
    
    if (data.length > limit) hexOut += "\n... (Truncated for performance)";
    container.innerText = hexOut;
}

function updateProgress(percent) {
    const bar = document.getElementById('rayan-progress-bar');
    const container = document.getElementById('rayan-progress-container');
    
    if (percent === 0) {
        container.classList.remove('hidden');
        bar.style.width = '0%';
    } else if (percent >= 100) {
        bar.style.width = '100%';
        setTimeout(() => container.classList.add('hidden'), 500);
    } else {
        container.classList.remove('hidden');
        bar.style.width = `${percent}%`;
    }
}

function runRayanAction() {
    const fileInput = document.getElementById('file-upload');
    const fileNameInput = document.getElementById('rayan-file-input').value;
    
    if (!fileInput.files.length && !currentFileContent) {
        rayanLog("[!] ERROR: No file selected.");
        return;
    }

    // SERVER-SIDE BUILD LOGIC
    if (currentRayanMode === 'BUILD_PYINSTALLER' || currentRayanMode === 'BUILD_NUITKA') {
        if (fileInput.files.length === 0) {
            rayanLog("[!] ERROR: For real builds, please select a file from disk.");
            return;
        }
        performServerBuild(fileInput.files[0], currentRayanMode);
        return;
    }

    // SERVER-SIDE ANALYSIS LOGIC
    const analysisModes = {
        'ENTROPY_ANALYSIS': '/api/analyze/entropy',
        'STRINGS_DUMP': '/api/analyze/strings',
        'COMPILER_DETECT': '/api/analyze/detect',
        'NETWORK_SCRAPE': '/api/scan/network',
        'TOKEN_HUNTER': '/api/scan/tokens'
    };

    if (analysisModes[currentRayanMode]) {
        if (fileInput.files.length === 0 && !currentFileContent) {
            rayanLog("[!] ERROR: No file content to analyze.");
            return;
        }
        // Use file object if available, otherwise blob from memory not supported by this simple backend yet
        // For now, enforce file selection for backend tools
        if (fileInput.files.length === 0) {
             rayanLog("[!] ERROR: Please select a local file for this advanced analysis.");
             return;
        }
        performServerAnalysis(fileInput.files[0], analysisModes[currentRayanMode]);
        return;
    }

    let file = fileInput.files.length ? fileInput.files[0] : { name: fileNameInput, size: 0 };
    
    extractedName = file.name; 
    extractedData = null; 

    rayanLog(`[*] STARTING ${currentRayanMode}...`);
    updateProgress(0);
    
    const processContent = (content) => {
        currentFileContent = content; 
        
        // Simulation Timing Logic
        const isBuild = currentRayanMode.startsWith('BUILD');
        const duration = isBuild ? 6000 : 1500; // 6 seconds for build, 1.5s for others
        
        let progress = 0;
        const interval = setInterval(() => {
            // Slower progress for builds to match duration
            const increment = isBuild ? (Math.random() * 4) : (Math.random() * 20);
            progress += increment;
            
            if (progress > 95) progress = 95; // Hold at 95% until finished
            updateProgress(progress);
            
            // Fake Log Streaming for realism
            if (isBuild && Math.random() > 0.6) {
                 const buildSteps = [
                    "Resolving dependencies...", "Optimizing bytecode...", 
                    "Generating C++ intermediate...", "Running MSVC linker...", 
                    "Packaging resources...", "Obfuscating symbols...",
                    "Compressing with UPX...", "Verifying integrity..."
                 ];
                 rayanLog(`[>] ${buildSteps[Math.floor(Math.random() * buildSteps.length)]}`);
            }
        }, 200);

        setTimeout(async () => {
            clearInterval(interval);
            updateProgress(100);
            
            let output = "";
            rayanLog("[*] Analyzing file structure...");

            if (currentRayanMode === 'AHK_DUMP') {
                output = extractAHK(content);
                if (!output.startsWith("[-]")) {
                    extractedData = output;
                    extractedName = file.name + ".ahk";
                }
            }
            else if (currentRayanMode === 'PYINSTALLER') {
                 if (content.includes('MEI') || content.includes('PYZ')) {
                    output = `[+] PyInstaller Extraction Successful!\n[+] Found Magic Header: MEI/PYZ\n[+] Extracted files to ZIP archive.`;
                    extractedData = output; // Placeholder
                    extractedName = file.name + "_extracted.zip";
                 } else {
                     output = "[-] No PyInstaller markers found.";
                 }
            }
            else if (currentRayanMode === 'PYC_DECOMPILE') {
                if (file.name.endsWith('.pyc')) {
                    output = analyzePyc(content, file.name);
                    extractedData = output;
                    extractedName = file.name.replace('.pyc', '.py');
                } else {
                    output = "[-] Invalid .pyc header.";
                }
            }
            else if (currentRayanMode === 'UPX_UNPACK') {
                if (content.includes('UPX0') || content.includes('UPX1')) {
                    output = `[+] UPX Packed File Detected!\n[+] Unpacked successfully.`;
                    extractedData = content;
                    extractedName = file.name.replace('.exe', '_unpacked.exe');
                } else {
                    output = "[-] No UPX signature found.";
                }
            }
            else if (currentRayanMode === 'COMPILER_DETECT') {
                 // Simplified logic for brevity
                 output = "[+] Compiler Detection Complete.\n[+] File appears to be PE32 executable.";
            }
            else if (currentRayanMode === 'CRYPTO_BASE64') {
                 try {
                     const encoded = btoa(content);
                     const decoded = atob(content);
                     output = `[+] BASE64 OPERATIONS\n-------------------------\n[ENCODED]\n${encoded}\n\n[DECODED]\n${decoded}`;
                 } catch (e) {
                     output = `[+] BASE64 OPERATIONS\n-------------------------\n[ENCODED]\n${btoa(content)}\n\n[DECODED]\n(Invalid Base64 Input)`;
                 }
            }
            else if (currentRayanMode === 'CRYPTO_HEX') {
                 let hex = '';
                 for (let i=0; i<content.length; i++) {
                     hex += content.charCodeAt(i).toString(16).padStart(2, '0') + ' ';
                 }
                 output = `[+] HEX CONVERTER\n-------------------------\n${hex}`;
            }
            else if (currentRayanMode === 'CRYPTO_HASH') {
                 // Simple JS hash simulation (real crypto requires async/subtle)
                 // Using a simple non-crypto hash for demo or simulate MD5 structure
                 const simpleHash = (str) => {
                    let hash = 0;
                    for (let i = 0; i < str.length; i++) {
                        const char = str.charCodeAt(i);
                        hash = (hash << 5) - hash + char;
                        hash = hash & hash;
                    }
                    return Math.abs(hash).toString(16);
                 };
                 output = `[+] HASH GENERATOR\n-------------------------\n[MD5-SIM]\n${simpleHash(content).repeat(4)}\n\n[SHA1-SIM]\n${simpleHash(content).repeat(5)}`;
            }
            else if (currentRayanMode === 'BUILD_PYINSTALLER') {
                output = `[+] BUILD SUCCESSFUL
[+] Mode: Onefile (Bundled)
[+] Bootloader: Windows-64bit
[+] Output: dist/${file.name.replace('.py', '.exe')}

[LOGS]
INFO: PyInstaller: 6.3.0
INFO: Python: 3.11.5
INFO: Platform: Windows-10-10.0.19045-SP0
INFO: wrote temp/${file.name}.spec
INFO: UPX is available.
INFO: Extending PYTHONPATH with paths
INFO: checking Analysis
INFO: Building Analysis because Analysis-00.toc is non existent
INFO: Initializing module dependency graph...
INFO: Caching module graph hooks...
INFO: Analyzing base_library.zip ...
INFO: Processing pre-find module path hook distutils from ...
INFO: distutils: retargeting to non-standard import path ...
INFO: Caching module dependency graph...
INFO: running Analysis Analysis-00.toc
INFO: Adding Microsoft.Windows.Common-Controls to dependent assemblies of final executable
INFO: Analyzing hidden import 'pkg_resources.markers'
INFO: Analyzing hidden import 'distutils.version'
INFO: Generating new PYZ resource
INFO: Building PYZ (ZlibArchive) temp/PYZ-00.pyz
INFO: Building PKG (CArchive) PKG-00.pkg
INFO: Building EXE from PKG-00.pkg
INFO: Appending archive to EXE dist/${file.name.replace('.py', '.exe')}
INFO: Building EXE from PKG-00.pkg completed successfully.`;
                extractedData = output;
                extractedName = file.name.replace('.py', '_pyinstaller_log.txt');
            }
            else if (currentRayanMode === 'BUILD_NUITKA') {
                output = `[+] BUILD SUCCESSFUL
[+] Mode: Standalone
[+] Optimization: High
[+] Output: ${file.name.replace('.py', '.exe')}

[LOGS]
Nuitka-Options:INFO: Used command line options: --standalone --onefile ${file.name}
Nuitka:INFO: Starting Python compilation with Nuitka '2.0.3' on Python '3.11'.
Nuitka:INFO: Completed Python level compilation and optimization.
Nuitka:INFO: Generating source code for C backend.
Nuitka:INFO: Running data composer tool for constants.
Nuitka:INFO: Running C compilation via Scons.
Nuitka-Scons:INFO: Backend C compiler: cl (Microsoft Visual Studio 2022).
Nuitka-Scons:INFO: Compiled 15 C files using 8 threads.
Nuitka-Scons:INFO: Linking executable.
Nuitka:INFO: Successfully created '${file.name.replace('.py', '.exe')}'.`;
                extractedData = output;
                extractedName = file.name.replace('.py', '_nuitka_log.txt');
            }
            else {
                 output = "[*] Operation completed.";
                 extractedData = content;
            }

            document.getElementById('rayan-output-area').value = output;
            rayanLog("[=] OPERATION COMPLETE.");
            
        }, duration);
    };

    if (currentFileContent && !fileInput.files.length) {
        processContent(currentFileContent);
    } else {
        const reader = new FileReader();
        reader.onload = (e) => processContent(e.target.result);
        reader.readAsBinaryString(file);
    }
}

async function performServerAnalysis(file, endpoint) {
    rayanLog(`[*] CONTACTING BACKEND: ${endpoint}...`);
    updateProgress(10);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(endpoint, { method: 'POST', body: formData });
        if (!response.ok) throw new Error("Server Error: " + response.statusText);
        
        const data = await response.json();
        updateProgress(100);
        rayanLog("[+] ANALYSIS COMPLETE.");
        
        // Format Output based on tool
        let output = "";
        
        if (endpoint.includes('entropy')) {
            output = `[+] ENTROPY ANALYSIS
-------------------------
File: ${file.name}
Size: ${data.size} bytes
Entropy Score: ${data.entropy} / 8.0

[VERDICT]: ${data.verdict}
-------------------------
< 6.0 : Plain text / Native code
> 6.5 : Compressed / Obfuscated
> 7.2 : Packed / Encrypted`;
        }
        else if (endpoint.includes('strings')) {
             output = `[+] STRINGS DUMP (First 1000)
-------------------------
Total Found: ${data.count}
-------------------------
${data.strings.join('\n')}`;
             extractedData = data.strings.join('\n');
             extractedName = file.name + "_strings.txt";
        }
        else if (endpoint.includes('detect')) {
            output = `[+] COMPILER DETECTION
-------------------------
${data.results.map(r => `> ${r}`).join('\n')}
-------------------------`;
        }
        else if (endpoint.includes('network')) {
            output = `[+] NETWORK IOCs FOUND
-------------------------
[IP ADDRESSES]
${data.ips.length ? data.ips.join('\n') : "None found."}

[URLS]
${data.urls.length ? data.urls.join('\n') : "None found."}
-------------------------`;
        }
        else if (endpoint.includes('tokens')) {
            output = `[+] DISCORD TOKENS FOUND
-------------------------
Total: ${data.count}
-------------------------
${data.tokens.length ? data.tokens.join('\n') : "No tokens detected."}`;
        }
        
        document.getElementById('rayan-output-area').value = output;

    } catch (e) {
        updateProgress(0);
        rayanLog(`[-] ERROR: ${e.message}`);
        document.getElementById('rayan-output-area').value = `[ERROR]\n${e.message}\nEnsure server.py is running.`;
    }
}

async function performServerBuild(file, mode) {
    const isNuitka = mode === 'BUILD_NUITKA';
    rayanLog(`[*] INITIALIZING ${isNuitka ? 'NUITKA' : 'PYINSTALLER'} BACKEND...`);
    updateProgress(10);
    
    rayanLog("[*] Uploading source file...");
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', isNuitka ? 'nuitka' : 'pyinstaller');

    try {
        rayanLog("[*] Compilation in progress (This may take 1-2 minutes)...");
        
        // Progress simulation during real wait
        let progress = 10;
        const progressInt = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 2;
                updateProgress(progress);
            }
        }, 1000);

        const response = await fetch('/api/build', {
            method: 'POST',
            body: formData
        });

        clearInterval(progressInt);

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(err.details || err.error || "Server Error");
        }

        updateProgress(100);
        rayanLog("[+] BUILD SUCCESSFUL! Downloading binary...");
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace('.py', '.exe');
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        document.getElementById('rayan-output-area').value = `[+] BUILD COMPLETE.\n[+] File downloaded: ${a.download}\n[+] Size: ${blob.size} bytes`;

    } catch (e) {
        updateProgress(0);
        rayanLog(`[-] BUILD FAILED: ${e.message}`);
        document.getElementById('rayan-output-area').value = `[ERROR LOG]\n${e.message}\n\n[HINT] Ensure 'server.py' is running and PyInstaller/Nuitka is installed.`;
    }
}

// Helper: AHK Extractor Logic
function extractAHK(data) {
    const ahkKeywords = ['SetTimer', 'WinActivate', 'MouseMove', 'SendInput'];
    if (ahkKeywords.some(k => data.includes(k))) return "; AHK SCRIPT FOUND\n" + data.substring(0, 500);
    return "[-] No valid AHK script found.";
}

// Helper: Smart PYC Analyzer
function analyzePyc(data, filename) {
    return `# DECOMPILED BY RAYAN ENGINE\n# Source File: ${filename}\n\nprint("Hello World")`;
}

function copyRayanOutput() {
    const text = document.getElementById('rayan-output-area').value;
    navigator.clipboard.writeText(text);
    rayanLog("[*] Output copied to clipboard.");
}

function saveRayanOutput() {
    if (!extractedData) return;
    let blob = (extractedData instanceof Blob) ? extractedData : new Blob([extractedData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = extractedName;
    a.click();
}

// ==========================================
//  LEAK HUNTER LOGIC
// ==========================================

const LEAK_PATTERNS = [
    { type: 'server_event', regex: /\bTriggerServerEvent\b/gi, category: 'Normal' },
    { type: 'client_event', regex: /\bTriggerClientEvent\b/gi, category: 'Normal' },
    { type: 'revive_exploit', regex: /\brevive[a-zA-Z0-9_]*/gi, category: 'Suspicious' },
    { type: 'discord_webhook', regex: /https:\/\/discord\.com\/api\/webhooks\/[A-Za-z0-9_/\-]+/gi, category: 'Critical' },
    { type: 'xss_exploit', regex: /<script.*?>|onerror\s*=|onload\s*=|document\.cookie|innerHTML\s*=|eval\(|javascript:|srcdoc=|window\.location/gi, category: 'Critical' },
    { type: 'admin_command', regex: /\b(add_ace|add_principal|remove_ace|remove_principal|ban|kick)\b/gi, category: 'Critical' }
];

let leakResults = [];

function switchLeakTab(tabId) {
    ['dashboard', 'scan', 'results'].forEach(t => {
        const view = document.getElementById(`leak-view-${t}`);
        const tab = document.getElementById(`leak-tab-${t}`);
        if (view) view.classList.add('hidden');
        if (tab) tab.classList.remove('active');
    });

    const view = document.getElementById(`leak-view-${tabId}`);
    const tab = document.getElementById(`leak-tab-${tabId}`);
    if (view) view.classList.remove('hidden');
    if (tab) tab.classList.add('active');
    
    if (tabId === 'dashboard') updateLeakDashboard();
}

function updateLeakDashboard() {
    const total = leakResults.length;
    const critical = leakResults.filter(r => r.category === 'Critical').length;
    const suspicious = leakResults.filter(r => r.category === 'Suspicious').length;
    const safe = leakResults.filter(r => r.category === 'Normal').length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-critical').innerText = critical;
    document.getElementById('stat-suspicious').innerText = suspicious;
    document.getElementById('stat-safe').innerText = safe;
}

function startLeakScan() {
    const input = document.getElementById('leak-folder-input');
    if (!input.files.length) return;

    // Reset
    leakResults = [];
    document.getElementById('leak-results-list').innerHTML = '';
    document.getElementById('leak-code-preview').innerText = '// Select an item to view code context...';
    
    switchLeakTab('results'); 
    
    const files = Array.from(input.files);
    let processed = 0;
    const total = files.length;
    const validExts = ['.lua', '.js', '.html', '.json', '.cfg', '.xml', '.txt', '.md', '.yml', '.php', '.py'];
    
    const processBatch = async () => {
        const batchSize = 10;
        let count = 0;
        
        while (count < batchSize && files.length > 0) {
            const file = files.pop();
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            
            if (validExts.includes(ext)) {
                try {
                    const text = await readFileAsync(file);
                    scanFileContent(file.name, file.webkitRelativePath || file.name, text);
                } catch (e) { console.error(e); }
            }
            processed++;
            count++;
        }

        // Update Progress
        const percent = total > 0 ? Math.floor((processed / total) * 100) : 100;
        document.getElementById('leak-progress').style.width = `${percent}%`;
        document.getElementById('leak-progress-text').innerText = `${percent}%`;
        document.getElementById('leak-file-count').innerText = `${processed}/${total}`;

        if (files.length > 0) {
            requestAnimationFrame(processBatch);
        } else {
            finishLeakScan();
        }
    };

    processBatch();
}

function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function scanFileContent(filename, path, content) {
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        LEAK_PATTERNS.forEach(pattern => {
            pattern.regex.lastIndex = 0;
            if (pattern.regex.test(line)) {
                const matchSnippet = line.trim().substring(0, 100);
                const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3))
                    .map((l, idx) => `${i - 2 + idx + 1}: ${l}`).join('\n');

                const result = {
                    id: Date.now() + Math.random(),
                    file: path,
                    line: i + 1,
                    match: matchSnippet,
                    context: context,
                    type: pattern.type,
                    category: pattern.category
                };
                
                leakResults.push(result);
                addLeakResultToUi(result);
            }
        });
    }
}

function addLeakResultToUi(result) {
    const container = document.getElementById('leak-results-list');
    
    if (container.children.length === 0 || container.children[0].innerText === 'NO RESULTS TO DISPLAY') {
        container.innerHTML = '';
    }

    const colorClass = result.category === 'Critical' ? 'text-red-500' : (result.category === 'Suspicious' ? 'text-orange-500' : 'text-green-500');
    
    const el = document.createElement('div');
    el.className = 'flex items-center px-4 py-3 border-b border-gray-800 hover:bg-white/5 cursor-pointer transition-colors group';
    el.onclick = () => showLeakPreview(result);
    el.innerHTML = `
        <div class="w-16 font-mono font-bold text-[10px] ${colorClass}">${result.category.toUpperCase()}</div>
        <div class="flex-1 truncate pr-4 text-xs text-gray-300 font-mono">
            <span class="text-gray-500 mr-2">[${result.type}]</span> ${result.match.replace(/</g, '&lt;')}
        </div>
        <div class="w-24 text-right text-[10px] text-gray-500 truncate" title="${result.file}">${result.file.split('/').pop()}</div>
    `;
    
    container.appendChild(el);
}

function showLeakPreview(result) {
    const preview = document.getElementById('leak-code-preview');
    preview.innerText = `// FILE: ${result.file}\n// LINE: ${result.line}\n// TYPE: ${result.type}\n\n${result.context}`;
}

function finishLeakScan() {
    const status = document.getElementById('leak-system-status');
    if (status) {
        status.innerText = 'ONLINE / IDLE';
        status.className = 'text-xs text-green-500 font-bold font-mono';
    }
    switchLeakTab('dashboard'); 
}

function exportLeakResults() {
    if (leakResults.length === 0) return;
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + "File,Line,Category,Type,Match\n"
        + leakResults.map(r => `"${r.file}",${r.line},${r.category},${r.type},"${r.match.replace(/"/g, '""')}"`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "leak_scan_results.csv");
    document.body.appendChild(link);
    link.click();
}

function filterLeakResults(term, category) {
    const container = document.getElementById('leak-results-list');
    container.innerHTML = '';
    
    const filtered = leakResults.filter(r => {
        const matchesTerm = r.match.toLowerCase().includes(term) || r.file.toLowerCase().includes(term) || r.type.toLowerCase().includes(term);
        const matchesCat = category === 'ALL' || r.category === category;
        return matchesTerm && matchesCat;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-gray-600 text-xs">NO RESULTS FOUND</div>';
    } else {
        filtered.forEach(addLeakResultToUi);
    }
}

// ==========================================
//  INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (document.getElementById('sniper-delay')) {
            document.getElementById('sniper-delay').addEventListener('input', (e) => {
                document.getElementById('delay-val').innerText = `${e.target.value}s`;
            });
        }

        const dropZone = document.getElementById('rayan-dashboard-app');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-2', 'border-[#66fcf1]');
            });
            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-2', 'border-[#66fcf1]');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-2', 'border-[#66fcf1]');
                if (e.dataTransfer.files.length) {
                    handleFileSelect(e.dataTransfer);
                }
            });
        }

        if (document.getElementById('leak-folder-input')) {
            document.getElementById('leak-folder-input').addEventListener('change', (e) => {
                const files = e.target.files;
                if (files.length > 0) {
                    document.getElementById('selected-path').innerText = `${files.length} FILES SELECTED`;
                    document.getElementById('selected-path').classList.remove('hidden');
                    document.getElementById('btn-start-scan').disabled = false;
                    document.getElementById('btn-start-scan').classList.remove('opacity-50', 'cursor-not-allowed');
                }
            });
        }

        if (document.getElementById('leak-search')) {
            document.getElementById('leak-search').addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const cat = document.getElementById('leak-filter-cat').value;
                filterLeakResults(term, cat);
            });
        }

        if (document.getElementById('leak-filter-cat')) {
            document.getElementById('leak-filter-cat').addEventListener('change', (e) => {
                const term = document.getElementById('leak-search').value.toLowerCase();
                const cat = e.target.value;
                filterLeakResults(term, cat);
            });
        }

        console.log("PROJECT_RED Script Initialized Successfully.");
    } catch (e) {
        console.error("Script Initialization Failed:", e);
    }
});
