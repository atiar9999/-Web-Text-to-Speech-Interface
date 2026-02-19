// script.js - robust voice loading with timeout & fallback

(function() {
    // --- DOM elements ---
    const textarea = document.getElementById('textInput');
    const langHint = document.getElementById('langHint');
    const voiceSelect = document.getElementById('voiceSelect');
    const speakBtn = document.getElementById('speakBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const stopBtn = document.getElementById('stopBtn');
    const speedDown = document.getElementById('speedDown');
    const speedUp = document.getElementById('speedUp');
    const speedSpan = document.getElementById('speedValue');

    // --- State ---
    let voices = [];
    let currentRate = 1.0;
    let isSpeaking = false;
    let isPaused = false;
    let currentUtterance = null;
    let voiceLoadAttempts = 0;
    const MAX_ATTEMPTS = 50; // 5 seconds (50 * 100ms)

    // --- Helper: detect Bengali script ---
    function detectLanguage(text) {
        const bengaliRegex = /[\u0980-\u09FF]/;
        if (bengaliRegex.test(text)) return '🇧🇩 Bangla script detected';
        if (text.trim() === '') return '📝 Paste text to analyse';
        return '🇬🇧 English / other (no Bangla characters)';
    }

    function updateLangHint() {
        langHint.innerHTML = `<span class="indicator"></span> ${detectLanguage(textarea.value)}`;
    }
    textarea.addEventListener('input', updateLangHint);
    updateLangHint();

    // --- Check for browser support ---
    if (!window.speechSynthesis) {
        alert('Sorry, your browser does not support text-to-speech. Try Chrome, Edge, or Safari.');
        // Disable all buttons
        [speakBtn, pauseBtn, resumeBtn, stopBtn, speedDown, speedUp].forEach(btn => btn.disabled = true);
        voiceSelect.innerHTML = '<option>Speech not supported</option>';
        throw new Error('speechSynthesis unavailable');
    }

    // --- Populate voice dropdown with real voices ---
    function populateVoiceList(availableVoices) {
        voices = availableVoices; // store globally

        // Clear the select (remove placeholder)
        voiceSelect.innerHTML = '';

        if (voices.length === 0) {
            // No voices – show a disabled message
            const option = document.createElement('option');
            option.textContent = '❌ No voices found. Install TTS.';
            option.disabled = true;
            voiceSelect.appendChild(option);
            return;
        }

        // Group by language for readability
        const grouped = {};
        voices.forEach(voice => {
            const lang = voice.lang || 'unknown';
            if (!grouped[lang]) grouped[lang] = [];
            grouped[lang].push(voice);
        });

        for (let lang in grouped) {
            const group = document.createElement('optgroup');
            group.label = lang;
            grouped[lang].forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.voiceURI;
                option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' [default]' : ''}`;
                option.dataset.voiceURI = voice.voiceURI;
                group.appendChild(option);
            });
            voiceSelect.appendChild(group);
        }

        // Try to preselect a Bangla-friendly voice
        for (let voice of voices) {
            if (/bn|ben|bangla|bengali/i.test(voice.lang) || /bangla|bengali/i.test(voice.name)) {
                voiceSelect.value = voice.voiceURI;
                break;
            }
        }
    }

    // --- Load voices with retry and timeout ---
    function loadVoices() {
        const availableVoices = window.speechSynthesis.getVoices();
        
        if (availableVoices.length > 0) {
            // Voices found – populate and stop retrying
            populateVoiceList(availableVoices);
            return;
        }

        // No voices yet – retry up to MAX_ATTEMPTS
        voiceLoadAttempts++;
        if (voiceLoadAttempts <= MAX_ATTEMPTS) {
            setTimeout(loadVoices, 100); // try again in 100ms
        } else {
            // Give up – show fallback message
            voiceSelect.innerHTML = ''; // clear placeholder
            const option = document.createElement('option');
            option.textContent = '⚠️ No voices detected. Check OS settings.';
            option.disabled = true;
            voiceSelect.appendChild(option);
        }
    }

    // Initial placeholder
    voiceSelect.innerHTML = '<option>🔄 Loading voices...</option>';

    // Start loading
    loadVoices();

    // Also listen for the onvoiceschanged event (fires in Chrome when voices are ready)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = function() {
            // Reset attempts and try again (but don't exceed max)
            voiceLoadAttempts = 0;
            loadVoices();
        };
    }

    // --- Helper: get selected voice object ---
    function getSelectedVoice() {
        const selected = voiceSelect.selectedOptions[0];
        if (!selected || !selected.value) return null; // placeholder or no selection
        return voices.find(v => v.voiceURI === selected.value) || null;
    }

    // --- Stop any ongoing speech ---
    function stopSpeaking() {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        isPaused = false;
        currentUtterance = null;
    }

    // --- Create utterance with current settings and event handlers ---
    function createUtterance(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = getSelectedVoice();
        if (voice) utterance.voice = voice;
        utterance.rate = currentRate;

        utterance.onstart = () => {
            isSpeaking = true;
            isPaused = false;
        };
        utterance.onend = () => {
            isSpeaking = false;
            isPaused = false;
            currentUtterance = null;
        };
        utterance.onerror = (e) => {
            console.warn('Speech error:', e);
            isSpeaking = false;
            isPaused = false;
            currentUtterance = null;
        };
        utterance.onpause = () => { isPaused = true; };
        utterance.onresume = () => { isPaused = false; };

        return utterance;
    }

    // --- Start speaking ---
    function speak() {
        const text = textarea.value.trim();
        if (!text) {
            alert('Please enter or paste some text.');
            return;
        }

        // Check if we have any voices
        if (voices.length === 0) {
            alert('No text-to-speech voices available. Please install a TTS language pack in your operating system.');
            return;
        }

        // Cancel current speech (if any)
        stopSpeaking();

        const utterance = createUtterance(text);
        currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    }

    // --- Pause ---
    function pause() {
        if (isSpeaking && !isPaused) {
            window.speechSynthesis.pause();
            isPaused = true;
        }
    }

    // --- Resume ---
    function resume() {
        if (isSpeaking && isPaused) {
            window.speechSynthesis.resume();
        }
    }

    // --- Speed change: update rate, restart speech if active ---
    function setSpeed(delta) {
        let newRate = currentRate + delta;
        newRate = Math.min(2.0, Math.max(0.5, newRate));
        if (newRate === currentRate) return;

        currentRate = newRate;
        speedSpan.textContent = currentRate.toFixed(1) + '×';

        // If something is speaking or paused, restart with new rate
        if (isSpeaking || currentUtterance) {
            const wasPaused = isPaused;
            const text = textarea.value.trim();
            if (!text) return;

            // Cancel current
            stopSpeaking();

            // Create new utterance
            const utterance = createUtterance(text);
            currentUtterance = utterance;

            // If it was paused, pause after start
            if (wasPaused) {
                const originalOnStart = utterance.onstart;
                utterance.onstart = () => {
                    originalOnStart();
                    window.speechSynthesis.pause();
                };
            }

            window.speechSynthesis.speak(utterance);
        }
    }

    // --- Attach event listeners ---
    speakBtn.addEventListener('click', speak);
    pauseBtn.addEventListener('click', pause);
    resumeBtn.addEventListener('click', resume);
    stopBtn.addEventListener('click', stopSpeaking);

    speedDown.addEventListener('click', () => setSpeed(-0.25));
    speedUp.addEventListener('click', () => setSpeed(0.25));
})();