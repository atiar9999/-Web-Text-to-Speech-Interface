// Updated script.js with rewind/forward and progress bar
(function () {
  // --- DOM elements ---
  const textarea = document.getElementById("textInput");
  const langHint = document.getElementById("langHint");
  const voiceSelect = document.getElementById("voiceSelect");
  const speakBtn = document.getElementById("speakBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");
  const stopBtn = document.getElementById("stopBtn");
  const rewindBtn = document.getElementById("rewindBtn");
  const forwardBtn = document.getElementById("forwardBtn");
  const speedDown = document.getElementById("speedDown");
  const speedUp = document.getElementById("speedUp");
  const speedSpan = document.getElementById("speedValue");
  const progressBar = document.getElementById("progressBar");

  // --- State ---
  let voices = [];
  let currentRate = 1.0;
  let isSpeaking = false;
  let isPaused = false;
  let currentUtterance = null;
  let voiceLoadAttempts = 0;
  const MAX_ATTEMPTS = 50;
  // For progress tracking
  let currentCharIndex = 0;
  let totalTextLength = 0;
  // Skip amount in characters (approx 5 seconds at average speech rate)
  const SKIP_CHARS = 50;

  // --- Helper: detect Bengali script ---
  function detectLanguage(text) {
    const bengaliRegex = /[\u0980-\u09FF]/;
    if (bengaliRegex.test(text)) return "🇧🇩 Bangla script detected";
    if (text.trim() === "") return "📝 Paste text to analyse";
    return "🇬🇧 English / other (no Bangla characters)";
  }

  function updateLangHint() {
    langHint.innerHTML = `<span class="indicator"></span> ${detectLanguage(textarea.value)}`;
  }
  textarea.addEventListener("input", updateLangHint);
  updateLangHint();

  // --- Check for browser support ---
  if (!window.speechSynthesis) {
    alert(
      "Sorry, your browser does not support text-to-speech. Try Chrome, Edge, or Safari.",
    );
    [
      speakBtn,
      pauseBtn,
      resumeBtn,
      stopBtn,
      rewindBtn,
      forwardBtn,
      speedDown,
      speedUp,
    ].forEach((btn) => (btn.disabled = true));
    voiceSelect.innerHTML = "<option>Speech not supported</option>";
    throw new Error("speechSynthesis unavailable");
  }

  // --- Populate voice dropdown with real voices ---
  function populateVoiceList(availableVoices) {
    voices = availableVoices;
    voiceSelect.innerHTML = "";

    if (voices.length === 0) {
      const option = document.createElement("option");
      option.textContent = "❌ No voices found. Install TTS.";
      option.disabled = true;
      voiceSelect.appendChild(option);
      return;
    }

    const grouped = {};
    voices.forEach((voice) => {
      const lang = voice.lang || "unknown";
      if (!grouped[lang]) grouped[lang] = [];
      grouped[lang].push(voice);
    });

    for (let lang in grouped) {
      const group = document.createElement("optgroup");
      group.label = lang;
      grouped[lang].forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})${voice.default ? " [default]" : ""}`;
        option.dataset.voiceURI = voice.voiceURI;
        group.appendChild(option);
      });
      voiceSelect.appendChild(group);
    }

    // Try to preselect a Bangla-friendly voice
    for (let voice of voices) {
      if (
        /bn|ben|bangla|bengali/i.test(voice.lang) ||
        /bangla|bengali/i.test(voice.name)
      ) {
        voiceSelect.value = voice.voiceURI;
        break;
      }
    }
  }

  // --- Load voices with retry and timeout ---
  function loadVoices() {
    const availableVoices = window.speechSynthesis.getVoices();

    if (availableVoices.length > 0) {
      populateVoiceList(availableVoices);
      return;
    }

    voiceLoadAttempts++;
    if (voiceLoadAttempts <= MAX_ATTEMPTS) {
      setTimeout(loadVoices, 100);
    } else {
      voiceSelect.innerHTML = "";
      const option = document.createElement("option");
      option.textContent = "⚠️ No voices detected. Check OS settings.";
      option.disabled = true;
      voiceSelect.appendChild(option);
    }
  }

  voiceSelect.innerHTML = "<option>🔄 Loading voices...</option>";
  loadVoices();

  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = function () {
      voiceLoadAttempts = 0;
      loadVoices();
    };
  }

  // --- Helper: get selected voice object ---
  function getSelectedVoice() {
    // Prefer the select's value (voiceURI). Fallback to matching by name.
    const value = voiceSelect.value;
    if (!value) return null;
    return voices.find((v) => v.voiceURI === value || v.name === value) || null;
  }

  // --- Stop any ongoing speech ---
  function stopSpeaking() {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    isPaused = false;
    currentUtterance = null;
    currentCharIndex = 0;
    progressBar.style.width = "0%";
  }

  // --- Create utterance with current settings and event handlers ---
  function createUtterance(text, startFrom = 0) {
    // If we're starting from a specific character, take substring
    const speakText = startFrom > 0 ? text.substring(startFrom) : text;
    const utterance = new SpeechSynthesisUtterance(speakText);
    const voice = getSelectedVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = currentRate;

    // Store the original start index for progress calculation
    utterance._startIndex = startFrom;
    utterance._fullText = text;

    utterance.onstart = () => {
      isSpeaking = true;
      isPaused = false;
      totalTextLength = text.length;
      // Reset progress to startFrom
      currentCharIndex = startFrom;
      updateProgressBar();
    };

    utterance.onend = () => {
      isSpeaking = false;
      isPaused = false;
      currentUtterance = null;
      currentCharIndex = totalTextLength; // finished
      updateProgressBar();
    };

    utterance.onerror = (e) => {
      console.warn("Speech error:", e);
      isSpeaking = false;
      isPaused = false;
      currentUtterance = null;
    };

    utterance.onpause = () => {
      isPaused = true;
    };
    utterance.onresume = () => {
      isPaused = false;
    };

    utterance.onboundary = (event) => {
      // event.charIndex is relative to the spoken substring
      // Only update when a numeric charIndex is provided to avoid NaN
      if (utterance._fullText && event && typeof event.charIndex === "number") {
        currentCharIndex = utterance._startIndex + event.charIndex;
        updateProgressBar();
      }
    };

    return utterance;
  }

  // --- Update progress bar width ---
  function updateProgressBar() {
    if (totalTextLength > 0) {
      const percent = (currentCharIndex / totalTextLength) * 100;
      progressBar.style.width = Math.min(percent, 100) + "%";
    } else {
      progressBar.style.width = "0%";
    }
  }

  // --- Start speaking from a given character index (default 0) ---
  function speakFrom(startIndex = 0) {
    const text = textarea.value.trim();
    if (!text) {
      alert("Please enter or paste some text.");
      return;
    }

    if (voices.length === 0) {
      alert(
        "No text-to-speech voices available. Please install a TTS language pack in your operating system.",
      );
      return;
    }

    // Cancel current speech
    stopSpeaking();

    const utterance = createUtterance(text, startIndex);
    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // --- Speak (default from beginning) ---
  function speak() {
    speakFrom(0);
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

  // --- Rewind: skip backward by SKIP_CHARS ---
  function rewind() {
    if (!isSpeaking && !isPaused) return; // nothing playing

    const text = textarea.value.trim();
    if (!text) return;

    // Calculate new index
    let newIndex = Math.max(0, currentCharIndex - SKIP_CHARS);
    // If we're at the beginning, maybe restart from 0
    if (newIndex === currentCharIndex) return;

    const wasPaused = isPaused;

    // Cancel current
    stopSpeaking();

    // Start speaking from new index
    const utterance = createUtterance(text, newIndex);
    currentUtterance = utterance;

    // If it was paused, pause after start
    if (wasPaused) {
      utterance.onstart = (function (original) {
        return function () {
          original.call(this);
          window.speechSynthesis.pause();
        };
      })(utterance.onstart);
    }

    window.speechSynthesis.speak(utterance);
  }

  // --- Forward: skip forward by SKIP_CHARS ---
  function forward() {
    if (!isSpeaking && !isPaused) return;

    const text = textarea.value.trim();
    if (!text) return;

    let newIndex = Math.min(text.length, currentCharIndex + SKIP_CHARS);
    if (newIndex >= text.length) {
      // If at the end, stop
      stopSpeaking();
      return;
    }
    if (newIndex === currentCharIndex) return;

    const wasPaused = isPaused;

    stopSpeaking();

    const utterance = createUtterance(text, newIndex);
    currentUtterance = utterance;

    if (wasPaused) {
      utterance.onstart = (function (original) {
        return function () {
          original.call(this);
          window.speechSynthesis.pause();
        };
      })(utterance.onstart);
    }

    window.speechSynthesis.speak(utterance);
  }

  // --- Speed change: update rate, restart speech if active ---
  function setSpeed(delta) {
    let newRate = currentRate + delta;
    newRate = Math.min(2.0, Math.max(0.5, newRate));
    if (newRate === currentRate) return;

    currentRate = newRate;
    speedSpan.textContent = currentRate.toFixed(1) + "×";

    // If something is speaking or paused, restart with new rate from current position
    if (isSpeaking || currentUtterance) {
      const wasPaused = isPaused;
      const text = textarea.value.trim();
      if (!text) return;

      // Use currentCharIndex as the start point
      const startFrom = currentCharIndex;

      stopSpeaking();

      const utterance = createUtterance(text, startFrom);
      currentUtterance = utterance;

      if (wasPaused) {
        utterance.onstart = (function (original) {
          return function () {
            original.call(this);
            window.speechSynthesis.pause();
          };
        })(utterance.onstart);
      }

      window.speechSynthesis.speak(utterance);
    }
  }

  // --- Attach event listeners ---
  speakBtn.addEventListener("click", speak);
  pauseBtn.addEventListener("click", pause);
  resumeBtn.addEventListener("click", resume);
  stopBtn.addEventListener("click", stopSpeaking);
  rewindBtn.addEventListener("click", rewind);
  forwardBtn.addEventListener("click", forward);

  speedDown.addEventListener("click", () => setSpeed(-0.25));
  speedUp.addEventListener("click", () => setSpeed(0.25));
})();
