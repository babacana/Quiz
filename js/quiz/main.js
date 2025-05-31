// js/quiz/main.js
import { getFromLocalStorage, saveToLocalStorage, showAlert as utilShowAlert, showConfirm as utilShowConfirm, formatTime as utilFormatTime, shuffleArray as utilShuffleArray } from '../shared/utils.js';
import {
    initUIElements, applyFontSize, loadFontPreference, incrementFontStep, decrementFontStep,
    applyCustomLogo, applyCustomBackground, applyVirtualKeyboardHeight, applyThemeCustomizations,
    showScreenUI, updateIdleScreenMessageUI, updateInitialScreenForEventStateUI,
    showWinnerAlreadyModalUI, hideWinnerAlreadyModalUI,
    showIncorrectAnswersModalFuncUI, hideIncorrectAnswersModalFuncUI,
    showTop3CongratsModalUI, hideTop3CongratsModalUI,
    displayIncorrectAnswersUI, updateQuestionDisplay, updateQuestionTimerBar,
    showAnswerFeedbackUI, showTimeoutFeedbackUI, updateNextButtonTextUI,
    updateResultScreenUI, loadRankingListUI, setQuizContainerFade,
    setMainTimerDisplay, applyTimeAlertVisuals, triggerScreenFlashUI
} from './ui.js';
import { initKeyboard, showVirtualKeyboard, hideVirtualKeyboard, updateKeyboardSettings } from './keyboard.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM elements are now managed within ui.js or keyboard.js after init.
    // We will call init functions for them.

    // Global state variables for the quiz logic
    let fadeOutTimer = null;
    let actualIdleTimer = null;
    let isFadingToIdle = false;

    let allQuestions = [];
    let participants = [];
    let settings = {};
    let playerAttempts = [];
    let currentEventData = null;
    let quizCustomizations = {}; // This will hold merged customizations

    // Constants for localStorage keys and defaults should remain or be moved to a config.js
    const DEFAULT_SETTINGS = {
        minScoreForPrize: 7, showCorrectAnswerOnWrong: true, rankingDisplayCount: 10,
        enablePrizeLock: true, customBackgroundFileName: '', enableCustomBackground: false,
        giveUpLockoutMinutes: 0, numberOfQuestions: 10, timePerQuestion: 30,
        idleTimeoutSeconds: 60, fadeOutLeadTimeSeconds: 5,
        difficultyPercentages: { facil: 40, moderado: 40, dificil: 20 },
        virtualKeyboardHeight: 30, enableVirtualKeyboard: true,
        enableTimeAlertBorderPulse: true, enableTimeAlertFlash: true
    };
    const DEFAULT_CUSTOMIZATIONS = {
        texts: {
            initialScreenTitle: "Bem-vindo ao Quiz!", initialScreenSlogan: "Água da CAESB, Patrimônio de Brasília.",
            initialScreenStartButton: "Iniciar Quiz", initialScreenRankingButton: "Ver Ranking",
            quizScreenNextButton: "Próxima Pergunta", quizScreenFinalizeButton: "Finalizar Quiz",
            resultScreenPrizeWon: "Parabéns, você ganhou um brinde!", resultScreenPrizeNotWon: "Que pena, não foi dessa vez. Tente novamente!",
            resultScreenRankingButton: "Ver Ranking", resultScreenPlayAgainButton: "Jogar Novamente",
            rankingScreenTitle: "Ranking Geral", rankingScreenBackButton: "Voltar ao Início",
            idleScreenCallToAction: "TOQUE PARA COMEÇAR",
            modalAlreadyWonTitle: "Segura a emoção, campeão(ã)! 🏆",
            modalAlreadyWonMessage: "Detectamos que você já faturou no nosso Quiz. Para a festa continuar e mais gente ganhar, a vez agora é de outro craque! Espalha a notícia!",
            modalIncorrectAnswersTitle: "Gabarito das Questões Erradas",
            inputNamePlaceholder: "Nome", inputPhonePlaceholder: "Telefone (DDD + Número)"
        },
        colors: { /* ... default colors ... */
            quizMainBackground: "#002244", quizPrimaryButtonBg: "#51cf66", quizPrimaryButtonText: "#ffffff",
            quizSecondaryButtonBg: "#003366", quizSecondaryButtonBorder: "#0056a0", quizSecondaryButtonText: "#ffffff",
            quizMainTextColor: "#ffffff", quizHighlightColor: "#61dafb", quizOptionBg: "#ffffff",
            quizOptionText: "#333333", quizOptionCorrectBg: "#51cf66", quizOptionIncorrectBg: "#ff6b6b",
        },
        fontSizes: { /* ... default font sizes ... */
            initialSloganFontSize: "clamp(1.1em, 4vw, 1.25em)", idleCallToActionFontSize: "clamp(2.8em, 7vw, 5.5em)",
            mainButtonsFontSize: "1.1em", questionTextFontSize: "clamp(1.1em, 3vw, 1.3em)"
        }
    };
    const DEFAULT_LOGO_SRC = "assets/logo.png";
    const CUSTOM_LOGO_FILENAME_KEY = 'quizCustomLogoFileName';
    const PRIZE_WINNERS_LIST_KEY = 'quizPrizeWinnersData';
    const GIVE_UP_LOCKOUT_LIST_KEY = 'quizGiveUpLockoutData';
    const QUIZ_EVENT_KEY = 'quizCurrentEvent';
    const QUIZ_CUSTOMIZATIONS_KEY = 'quizThemeCustomizations';


    let currentQuestionIndex = 0;
    let currentQuizQuestions = [];
    let score = 0;
    let questionTimerInterval = null;
    let flashInterval = null; // Interval for screen flash
    let currentQuestionTimeLeft = 0;
    let totalQuizStartTime;
    let timeBarAnimationId = null; // For requestAnimationFrame of the question time bar

    let playerName = '';
    let playerPhone = '';
    let currentPlayerTimestamp;

    // --- localStorage specific loading ---
    function loadSettings() {
        const storedSettings = getFromLocalStorage('quizSettings', {});
        settings = { ...DEFAULT_SETTINGS, ...storedSettings };
        // Ensure nested objects like difficultyPercentages are also merged correctly
        settings.difficultyPercentages = {
            ...DEFAULT_SETTINGS.difficultyPercentages,
            ...(storedSettings.difficultyPercentages || {})
        };
        // Validate and parse specific settings
        settings.idleTimeoutSeconds = parseInt(settings.idleTimeoutSeconds, 10);
        settings.fadeOutLeadTimeSeconds = parseInt(settings.fadeOutLeadTimeSeconds, 10);
        if (isNaN(settings.idleTimeoutSeconds) || settings.idleTimeoutSeconds < 15) {
            settings.idleTimeoutSeconds = DEFAULT_SETTINGS.idleTimeoutSeconds;
        }
        if (isNaN(settings.fadeOutLeadTimeSeconds) || settings.fadeOutLeadTimeSeconds < 3 || settings.fadeOutLeadTimeSeconds >= settings.idleTimeoutSeconds) {
            settings.fadeOutLeadTimeSeconds = DEFAULT_SETTINGS.fadeOutLeadTimeSeconds;
        }
    }

    function loadCustomizations() {
        const storedCustomizations = getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, {});
        quizCustomizations = {
            texts: { ...DEFAULT_CUSTOMIZATIONS.texts, ...(storedCustomizations.texts || {}) },
            colors: { ...DEFAULT_CUSTOMIZATIONS.colors, ...(storedCustomizations.colors || {}) },
            fontSizes: { ...DEFAULT_CUSTOMIZATIONS.fontSizes, ...(storedCustomizations.fontSizes || {}) }
        };
    }

    // Wrapper for showAlert to include resetIdleTimer
    function showAlert(message, type = 'default') {
        utilShowAlert(message, type); // utilShowAlert is the imported one from utils.js
        resetIdleTimer();
    }

    // Wrapper for showConfirm
    function showConfirm(message, onConfirmCallback, type = 'default') {
        // The quiz.js showConfirm was simpler. We map its `onConfirm` to the new structure.
        utilShowConfirm(message,
            {
                onConfirm: onConfirmCallback, // This will be used if showSaveButton is false
                onDiscardAndProceed: onConfirmCallback // Also map here for safety if it's a simple "Yes"
            },
            type,
            { showSaveButton: false } // Ensure it behaves like a Yes/No
        );
        resetIdleTimer(); // Called after modal interaction setup
    }

    function checkEventStatus() {
        currentEventData = getFromLocalStorage(QUIZ_EVENT_KEY, null);
        if (!currentEventData || !currentEventData.startTime || !currentEventData.endTime) {
            return 'no_event';
        }
        const now = new Date();
        const startTime = new Date(currentEventData.startTime);
        const endTime = new Date(currentEventData.endTime);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            console.warn("Datas do evento inválidas:", currentEventData);
            return 'no_event';
        }
        if (now < startTime) return 'before';
        else if (now > endTime) return 'after';
        else return 'during';
    }

    function initializeQuizApp() {
        initUIElements(); // Initialize UI elements from ui.js

        loadSettings();
        loadCustomizations();

        // Pass the actual applyVirtualKeyboardHeight function from ui.js to keyboard.js
        initKeyboard(settings, applyVirtualKeyboardHeight, resetIdleTimer);

        applyThemeCustomizations(settings, quizCustomizations, DEFAULT_CUSTOMIZATIONS);
        applyCustomLogo(getFromLocalStorage(CUSTOM_LOGO_FILENAME_KEY, null), DEFAULT_LOGO_SRC);
        loadFontPreference();


        allQuestions = getFromLocalStorage('quizQuestions', []);
        participants = getFromLocalStorage('quizParticipants', []);
        // currentEventData is loaded by checkEventStatus, called by UI update functions

        if (getFromLocalStorage('quizQuestions_initialized', 'false') !== 'true' && allQuestions.length === 0) {
            const defaultQuizQuestions = [
                { id: 'q1', text: 'Qual é a capital do Brasil?', options: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'], correct: 2, isDisabled: false, difficulty: 'facil' },
                { id: 'q2', text: 'Qual monumento é um ícone de Brasília, projetado por Oscar Niemeyer, e sede do Congresso Nacional?', options: ['Palácio da Alvorada', 'Catedral Metropolitana', 'Congresso Nacional', 'Ponte JK'], correct: 2, isDisabled: false, difficulty: 'moderado' },
                { id: 'q3', text: 'A CAESB é responsável por qual serviço essencial no Distrito Federal?', options: ['Transporte Público', 'Energia Elétrica', 'Saneamento Básico (Água e Esgoto)', 'Comunicações'], correct: 2, isDisabled: false, difficulty: 'facil' },
                { id: 'q4', text: 'Qual o principal reservatório de água que abastece o Distrito Federal?', options: ['Lago Paranoá', 'Represa do Descoberto', 'Represa de Santa Maria', 'Ambos Descoberto e Santa Maria'], correct: 3, isDisabled: false, difficulty: 'dificil' },
                { id: 'q5', text: 'O slogan da campanha da CAESB mencionada é:', options: ['Água é Vida', 'CAESB, Água para Todos', 'Água da CAESB, Patrimônio de Brasília', 'Beba Água, Viva Melhor'], correct: 2, isDisabled: false, difficulty: 'facil' }
            ];
            saveToLocalStorage('quizQuestions', defaultQuizQuestions);
            allQuestions = [...defaultQuizQuestions]; // Ensure current allQuestions is updated
            saveToLocalStorage('quizQuestions_initialized', 'true');
        }

        setupEventListeners();

        const initialTestAction = localStorage.getItem('quiz_test_action');
        const initialTestTarget = localStorage.getItem('quiz_test_target');
        if (initialTestAction && initialTestTarget) {
            setTimeout(() => {
                if (initialTestAction === 'goto_screen') showScreenUI(initialTestTarget, settings, quizCustomizations, getFromLocalStorage(QUIZ_EVENT_KEY, null), resetIdleTimer, getFromLocalStorage);
                else if (initialTestAction === 'simulate_scenario') handleSimulatedScenario(initialTestTarget); // This function needs careful review for dependencies
                localStorage.removeItem('quiz_test_action');
                localStorage.removeItem('quiz_test_target');
            }, 100);
        } else {
            showScreenUI('initial-screen', settings, quizCustomizations, getFromLocalStorage(QUIZ_EVENT_KEY, null), resetIdleTimer, getFromLocalStorage);
        }
        document.addEventListener('contextmenu', event => event.preventDefault());
    }

    function setupEventListeners() {
        // References to elements are now obtained via getEl() or from initUIElements() if stored globally in ui.js
        const nomeInputEl = document.getElementById('nome');
        const telefoneInputEl = document.getElementById('telefone');
        const startQuizBtnEl = document.getElementById('start-quiz-btn');
        // ... (get other elements as needed for listeners)

        if (nomeInputEl) {
            nomeInputEl.addEventListener('focus', (e) => { setTimeout(() => showVirtualKeyboard(e.target), 0); resetIdleTimer(); });
            nomeInputEl.addEventListener('input', () => { nomeInputEl.value = nomeInputEl.value.replace(/[^a-zA-Z\sÀ-ú]/g, '').toUpperCase(); resetIdleTimer(); });
        }
        if (telefoneInputEl){
            telefoneInputEl.addEventListener('focus', (e) => { setTimeout(() => showVirtualKeyboard(e.target), 0); resetIdleTimer(); });
            telefoneInputEl.addEventListener('input', () => {
                let v = telefoneInputEl.value.replace(/\D/g, '').substring(0, 11), f = '';
                if (v.length > 0) f = `(${v.substring(0, 2)}`;
                if (v.length > 2) f += `) ${v.substring(2, v.length > 6 ? 7 : v.length)}`;
                if (v.length > 7) f += `-${v.substring(7, 11)}`;
                telefoneInputEl.value = f;
                resetIdleTimer();
            });
        }

        if (startQuizBtnEl) startQuizBtnEl.addEventListener('click', () => { handleStartQuizAttempt(); resetIdleTimer(); });

        const viewRankingInitialBtnEl = document.getElementById('view-ranking-initial-btn');
        if (viewRankingInitialBtnEl) viewRankingInitialBtnEl.addEventListener('click', () => {
            loadAndDisplayRanking();
            showScreenUI('ranking-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage);
        });

        const nextQuestionBtnEl = document.getElementById('next-question-btn');
        if (nextQuestionBtnEl) nextQuestionBtnEl.addEventListener('click', () => { currentQuestionIndex++; loadQuestion(); resetIdleTimer(); });

        const giveUpBtnEl = document.getElementById('give-up-btn');
        if (giveUpBtnEl) giveUpBtnEl.addEventListener('click', () => { handleGiveUp(); resetIdleTimer(); });

        const showRankingBtnEl = document.getElementById('show-ranking-btn');
        if (showRankingBtnEl) showRankingBtnEl.addEventListener('click', () => {
            loadAndDisplayRanking();
            showScreenUI('ranking-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage);
        });

        const restartQuizBtnEl = document.getElementById('restart-quiz-btn');
        if (restartQuizBtnEl) restartQuizBtnEl.addEventListener('click', () => {
            if (nomeInputEl) nomeInputEl.value = '';
            if (telefoneInputEl) telefoneInputEl.value = '';
            showScreenUI('initial-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage);
        });

        const backToInitialBtnEl = document.getElementById('back-to-initial-btn');
        if (backToInitialBtnEl) backToInitialBtnEl.addEventListener('click', () => {
            if (nomeInputEl) nomeInputEl.value = '';
            if (telefoneInputEl) telefoneInputEl.value = '';
            showScreenUI('initial-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage);
        });

        const idleScreenElementRef = document.getElementById('idle-screen'); // Using direct get for this one-off
        if (idleScreenElementRef) {
            const handleIdleScreenInteraction = () => {
                showScreenUI('initial-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage);
            };
            idleScreenElementRef.addEventListener('click', handleIdleScreenInteraction);
            idleScreenElementRef.addEventListener('touchstart', handleIdleScreenInteraction, {passive: true});
        }

        // Modals - close buttons (assuming their IDs are consistent or handled by ui.js if complex)
        const closeWinnerAlreadyModalBtnEl = document.getElementById('close-winner-already-modal-btn');
        if(closeWinnerAlreadyModalBtnEl) closeWinnerAlreadyModalBtnEl.addEventListener('click', () => { hideWinnerAlreadyModalUI(); resetIdleTimer(); });
        const winnerAlreadyModalEl = document.getElementById('winner-already-modal');
        if(winnerAlreadyModalEl) winnerAlreadyModalEl.addEventListener('click', (event) => { if (event.target === winnerAlreadyModalEl) { hideWinnerAlreadyModalUI(); resetIdleTimer(); } });

        const closeIncorrectAnswersModalBtnEl = document.getElementById('close-incorrect-answers-modal-btn');
        if(closeIncorrectAnswersModalBtnEl) closeIncorrectAnswersModalBtnEl.addEventListener('click', () => { hideIncorrectAnswersModalFuncUI(); resetIdleTimer(); });
        const incorrectAnswersModalEl = document.getElementById('incorrect-answers-modal');
        if(incorrectAnswersModalEl) incorrectAnswersModalEl.addEventListener('click', (event) => { if (event.target === incorrectAnswersModalEl) { hideIncorrectAnswersModalFuncUI(); resetIdleTimer(); } });

        const closeTop3CongratsModalBtnEl = document.getElementById('close-top3-congrats-modal-btn');
        if(closeTop3CongratsModalBtnEl) closeTop3CongratsModalBtnEl.addEventListener('click', () => { hideTop3CongratsModalUI(); resetIdleTimer(); });
        const top3CongratsModalEl = document.getElementById('top3-congrats-modal');
        if(top3CongratsModalEl) top3CongratsModalEl.addEventListener('click', (event) => { if (event.target === top3CongratsModalEl) { hideTop3CongratsModalUI(); resetIdleTimer(); } });

        const showIncorrectAnswersBtnEl = document.getElementById('show-incorrect-answers-btn');
        if (showIncorrectAnswersBtnEl) showIncorrectAnswersBtnEl.addEventListener('click', () => { displayIncorrectAnswersUI(playerAttempts); resetIdleTimer(); });


        // Accessibility font buttons
        const decreaseFontButtonEl = document.getElementById('decrease-font');
        if(decreaseFontButtonEl) decreaseFontButtonEl.addEventListener('click', () => { decrementFontStep(); resetIdleTimer(); });
        const increaseFontButtonEl = document.getElementById('increase-font');
        if(increaseFontButtonEl) increaseFontButtonEl.addEventListener('click', () => { incrementFontStep(); resetIdleTimer(); });

        const adminAccessBtnEl = document.getElementById('admin-access-btn');
        if(adminAccessBtnEl) adminAccessBtnEl.addEventListener('click', () => { window.location.href = 'admin.html'; resetIdleTimer(); });

        ['click', 'keydown', 'touchstart', 'mousemove', 'input', 'scroll'].forEach(event => {
            document.addEventListener(event, (e) => {
                // Assuming isResizingKeyboard is a global/module-scoped var in keyboard.js, not accessible here directly
                // This idle timer reset might need to be more nuanced if keyboard resizing is active.
                // For now, assume it's okay.
                if (e.isTrusted /* && !isResizingKeyboard */) {
                    resetIdleTimer();
                }
            }, {passive: true});
        });
    }


    function handleStartQuizAttempt() {
        const eventStatus = checkEventStatus();
        currentEventData = getFromLocalStorage(QUIZ_EVENT_KEY, null); // Ensure currentEventData is fresh
        const eventMessageActive = currentEventData && currentEventData.enableOutOfPeriodMessage;

        if (eventMessageActive && (eventStatus === 'before' || eventStatus === 'after')) {
            if (eventStatus === 'before') showAlert(\`O quiz ainda não começou. Aguarde até \${new Date(currentEventData.startTime).toLocaleString('pt-BR')}.\`);
            else if (eventStatus === 'after') showAlert(\`O quiz já foi encerrado. Obrigado pela participação!\`);
            return;
        }

        const nomeInputEl = document.getElementById('nome'); // Query directly as it's within this function's scope of action
        const telefoneInputEl = document.getElementById('telefone');

        playerName = nomeInputEl.value.trim();
        playerPhone = telefoneInputEl.value.trim();

        if (!playerName) { showAlert('Preencha o nome.'); if (nomeInputEl && settings.enableVirtualKeyboard) showVirtualKeyboard(nomeInputEl); return; }
        if (!/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(playerPhone)) { showAlert('Telefone inválido. Formato esperado: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.'); if (telefoneInputEl && settings.enableVirtualKeyboard) showVirtualKeyboard(telefoneInputEl); return; }

        if (settings.enablePrizeLock) {
            const prizeWinners = getFromLocalStorage(PRIZE_WINNERS_LIST_KEY, []);
            const existingWinner = prizeWinners.find(winner => winner.phone === playerPhone);
            if (existingWinner) { showWinnerAlreadyModalUI(existingWinner.timestamp); return; }
        }

        if (settings.giveUpLockoutMinutes > 0) {
            const giveUpLockouts = getFromLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, []);
            const now = Date.now();
            const activeLockouts = giveUpLockouts.filter(lockout => (new Date(lockout.timestamp).getTime() + (settings.giveUpLockoutMinutes * 60 * 1000)) > now);
            saveToLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, activeLockouts); // Save filtered list
            const existingLockout = activeLockouts.find(lockout => lockout.phone === playerPhone);
            if (existingLockout) {
                const remainingTimeMs = (new Date(existingLockout.timestamp).getTime() + (settings.giveUpLockoutMinutes * 60 * 1000)) - now;
                const remainingMinutes = Math.ceil(remainingTimeMs / (1000 * 60));
                showAlert(\`Você desistiu recentemente do quiz e está bloqueado por \${remainingMinutes} minuto(s). Por favor, aguarde para jogar novamente.\`, 'warning');
                return;
            }
        }
        if (settings.enableVirtualKeyboard) hideVirtualKeyboard();
        startQuiz();
    }

    function startQuiz() {
        playerAttempts = [];
        allQuestions = getFromLocalStorage('quizQuestions', []); // Ensure fresh questions
        loadSettings(); // Ensure fresh settings

        const enabledQuestions = allQuestions.filter(q => !q.isDisabled);
        const numQuestionsToPlay = settings.numberOfQuestions;
        const difficultyPercentages = settings.difficultyPercentages;

        if (enabledQuestions.length === 0) {
            showAlert("Sem questões habilitadas para jogar. Por favor, verifique as configurações na área administrativa.");
            showScreenUI('initial-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage); return;
        }

        currentQuizQuestions = [];
        const questionsByDifficulty = {
            facil: utilShuffleArray(enabledQuestions.filter(q => q.difficulty === 'facil')),
            moderado: utilShuffleArray(enabledQuestions.filter(q => q.difficulty === 'moderado')),
            dificil: utilShuffleArray(enabledQuestions.filter(q => q.difficulty === 'dificil'))
        };

        let countFacil = Math.round(numQuestionsToPlay * (difficultyPercentages.facil / 100));
        let countModerado = Math.round(numQuestionsToPlay * (difficultyPercentages.moderado / 100));
        let countDificil = Math.round(numQuestionsToPlay * (difficultyPercentages.dificil / 100));

        // Adjust counts to match numQuestionsToPlay if rounding caused discrepancies
        let currentTotal = countFacil + countModerado + countDificil;
        while (currentTotal !== numQuestionsToPlay) {
            if (currentTotal < numQuestionsToPlay) {
                if (difficultyPercentages.facil >= difficultyPercentages.moderado && difficultyPercentages.facil >= difficultyPercentages.dificil && questionsByDifficulty.facil.length > countFacil) countFacil++;
                else if (difficultyPercentages.moderado >= difficultyPercentages.facil && difficultyPercentages.moderado >= difficultyPercentages.dificil && questionsByDifficulty.moderado.length > countModerado) countModerado++;
                else if (questionsByDifficulty.dificil.length > countDificil) countDificil++;
                else if (questionsByDifficulty.facil.length > countFacil) countFacil++; // Fallback if preferred are exhausted
                else if (questionsByDifficulty.moderado.length > countModerado) countModerado++;
                else break; // Cannot add more
            } else { // currentTotal > numQuestionsToPlay
                if (difficultyPercentages.dificil <= difficultyPercentages.moderado && difficultyPercentages.dificil <= difficultyPercentages.facil && countDificil > 0) countDificil--;
                else if (difficultyPercentages.moderado <= difficultyPercentages.facil && difficultyPercentages.moderado <= difficultyPercentages.dificil && countModerado > 0) countModerado--;
                else if (countFacil > 0) countFacil--;
                else break; // Cannot remove more
            }
            currentTotal = countFacil + countModerado + countDificil;
        }

        currentQuizQuestions.push(...questionsByDifficulty.facil.slice(0, countFacil));
        currentQuizQuestions.push(...questionsByDifficulty.moderado.slice(0, countModerado));
        currentQuizQuestions.push(...questionsByDifficulty.dificil.slice(0, countDificil));

        // Fill remaining if counts didn't meet numQuestionsToPlay due to lack of specific difficulties
        let remainingNeeded = numQuestionsToPlay - currentQuizQuestions.length;
        if (remainingNeeded > 0) {
            const allAvailableShuffled = utilShuffleArray(enabledQuestions.filter(q => !currentQuizQuestions.find(cq => cq.id === q.id)));
            currentQuizQuestions.push(...allAvailableShuffled.slice(0, remainingNeeded));
        }
        currentQuizQuestions = utilShuffleArray(currentQuizQuestions.slice(0, numQuestionsToPlay));


        if (currentQuizQuestions.length === 0) {
            showAlert("Não foi possível selecionar questões. Verifique as configurações.");
            showScreenUI('initial-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage); return;
        }

        currentQuestionIndex = 0;
        score = 0;
        totalQuizStartTime = Date.now();

        loadQuestion();
        showScreenUI('quiz-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage);
    }

    function loadQuestion() {
        stopQuestionTimersAndAnimations(); // Clear previous timers/animations

        if (currentQuestionIndex >= currentQuizQuestions.length) {
            endQuiz();
            return;
        }
        const q = currentQuizQuestions[currentQuestionIndex];
        if (!q || typeof q.text !== 'string' || q.text.trim() === "") {
            showAlert("Erro: Questão inválida. Pulando...");
            currentQuizQuestions.splice(currentQuestionIndex, 1); // Remove invalid question
            if (currentQuizQuestions.length === 0 || currentQuestionIndex >= currentQuizQuestions.length) {
                 if (playerAttempts.length > 0 || score > 0) endQuiz();
                 else showScreenUI('initial-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage);
            } else {
                loadQuestion(); // Try loading next
            }
            return;
        }

        const difficultyMap = { facil: 'Fácil', moderado: 'Moderado', dificil: 'Difícil' };
        updateQuestionDisplay(q, currentQuestionIndex, currentQuizQuestions.length, difficultyMap, utilShuffleArray,
            (optionDiv, questionId) => { // This is addOptionEventListenerFn
                optionDiv.addEventListener('click', () => {
                    handleOptionSelect(optionDiv, questionId);
                    resetIdleTimer();
                });
            }
        );
        startQuestionCountdown();
    }

    function animateQuestionTimerBar() {
        if (!questionTimerInterval) { // If main timer stopped, stop animation
            if(timeBarAnimationId) cancelAnimationFrame(timeBarAnimationId);
            timeBarAnimationId = null;
            updateQuestionTimerBar(0, settings.timePerQuestion); // Ensure bar is at 0%
            return;
        }
        const elapsedTimeInInterval = settings.timePerQuestion - currentQuestionTimeLeft;
        updateQuestionTimerBar(currentQuestionTimeLeft, settings.timePerQuestion);

        if (currentQuestionTimeLeft > 0) {
            timeBarAnimationId = requestAnimationFrame(animateQuestionTimerBar);
        } else {
            timeBarAnimationId = null;
            // Final update to ensure it's at 0 if timer ended exactly
            updateQuestionTimerBar(0, settings.timePerQuestion);
        }
    }


    function startQuestionCountdown() {
        stopQuestionTimersAndAnimations(); // Clear any existing ones first

        currentQuestionTimeLeft = settings.timePerQuestion;
        setMainTimerDisplay(utilFormatTime(Math.floor((Date.now() - totalQuizStartTime) / 1000)));

        // Start the visual time bar animation
        timeBarAnimationId = requestAnimationFrame(animateQuestionTimerBar);

        questionTimerInterval = setInterval(() => {
            currentQuestionTimeLeft--;
            setMainTimerDisplay(utilFormatTime(Math.floor((Date.now() - totalQuizStartTime) / 1000)));

            // Visual Alerts for time
            if (settings.enableTimeAlertBorderPulse) {
                if (currentQuestionTimeLeft <= 5) applyTimeAlertVisuals('critical');
                else if (currentQuestionTimeLeft <= 10) applyTimeAlertVisuals('warning');
                else applyTimeAlertVisuals('none');
            }

            if (settings.enableTimeAlertFlash && currentQuestionTimeLeft <= 5 && currentQuestionTimeLeft >= 0) {
                if (!flashInterval) { // Start flash interval only once
                    if (currentQuestionTimeLeft > 0) triggerScreenFlashUI(); // Initial flash
                    flashInterval = setInterval(() => {
                        if (currentQuestionTimeLeft <= 0 || currentQuestionTimeLeft > 5) {
                            clearInterval(flashInterval); flashInterval = null;
                            if (settings.enableTimeAlertBorderPulse) applyTimeAlertVisuals('none'); // Clear border too
                            return;
                        }
                        triggerScreenFlashUI();
                    }, 700);
                }
            } else if (flashInterval && (currentQuestionTimeLeft > 5 || currentQuestionTimeLeft < 0)) {
                clearInterval(flashInterval); flashInterval = null;
                 if (settings.enableTimeAlertBorderPulse) applyTimeAlertVisuals('none');
            }

            if (currentQuestionTimeLeft <= 0) {
                handleQuestionTimeout();
            }
        }, 1000);
    }

    function stopQuestionTimersAndAnimations() {
        clearInterval(questionTimerInterval); questionTimerInterval = null;
        clearInterval(flashInterval); flashInterval = null;
        if (timeBarAnimationId) cancelAnimationFrame(timeBarAnimationId); timeBarAnimationId = null;
        if (settings.enableTimeAlertBorderPulse) applyTimeAlertVisuals('none'); // Clear visuals
    }


    function handleQuestionTimeout() {
        stopQuestionTimersAndAnimations();
        showTimeoutFeedbackUI(settings.showCorrectAnswerOnWrong);

        const q = currentQuizQuestions[currentQuestionIndex];
        if (q) {
            playerAttempts.push({
                questionId: q.id, questionText: q.text, options: [...q.options],
                selectedOptionText: "Tempo esgotado", correctOptionIndex: q.correct,
                correctOptionText: q.options[q.correct], isCorrect: false
            });
        }
        updateNextButtonTextUI((currentQuestionIndex >= currentQuizQuestions.length - 1), quizCustomizations.texts.quizScreenNextButton, quizCustomizations.texts.quizScreenFinalizeButton);
    }

    function handleOptionSelect(selectedOptionDiv, questionId) {
        stopQuestionTimersAndAnimations();
        const isCorrect = selectedOptionDiv.dataset.isCorrect === 'true';
        const q = currentQuizQuestions[currentQuestionIndex];

        playerAttempts.push({
            questionId: questionId, questionText: q.text, options: [...q.options],
            selectedOptionText: selectedOptionDiv.textContent, correctOptionIndex: q.correct,
            correctOptionText: q.options[q.correct], isCorrect: isCorrect
        });

        if (isCorrect) score++;
        showAnswerFeedbackUI(selectedOptionDiv, isCorrect, settings.showCorrectAnswerOnWrong);
        updateNextButtonTextUI((currentQuestionIndex >= currentQuizQuestions.length - 1), quizCustomizations.texts.quizScreenNextButton, quizCustomizations.texts.quizScreenFinalizeButton);
    }

    function endQuiz() {
        stopQuestionTimersAndAnimations();
        const totalSeconds = Math.floor((Date.now() - totalQuizStartTime) / 1000);
        currentPlayerTimestamp = new Date().toISOString();

        let currentParticipantsList = getFromLocalStorage('quizParticipants', []);
        currentParticipantsList.push({ name: playerName, phone: playerPhone, score, time: totalSeconds, timestamp: currentPlayerTimestamp, playerAttempts: [...playerAttempts] });
        saveToLocalStorage('quizParticipants', currentParticipantsList);
        participants = currentParticipantsList; // Update local cache

        if (settings.enablePrizeLock && score >= settings.minScoreForPrize) {
            let prizeWinners = getFromLocalStorage(PRIZE_WINNERS_LIST_KEY, []);
            if (!prizeWinners.some(winner => winner.phone === playerPhone)) {
                prizeWinners.push({ phone: playerPhone, timestamp: currentPlayerTimestamp });
                saveToLocalStorage(PRIZE_WINNERS_LIST_KEY, prizeWinners);
            }
        }

        const sortedParticipants = [...participants].sort((a, b) => b.score - a.score || a.time - b.time);
        const currentPlayerRank = sortedParticipants.findIndex(p => p.timestamp === currentPlayerTimestamp) + 1;

        updateResultScreenUI(playerName, score, currentQuizQuestions.length > 0 ? currentQuizQuestions.length : settings.numberOfQuestions,
                             totalSeconds, currentPlayerRank,
                             quizCustomizations.texts.resultScreenPrizeWon, quizCustomizations.texts.resultScreenPrizeNotWon,
                             settings.minScoreForPrize, playerAttempts, utilFormatTime);

        showScreenUI('result-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage);
    }

    function handleGiveUp() {
        showConfirm('Tem certeza que deseja desistir do quiz? Seu progresso atual não será salvo.', () => {
            stopQuestionTimersAndAnimations();
            if (settings.giveUpLockoutMinutes > 0 && playerPhone) {
                let giveUpLockouts = getFromLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, []);
                giveUpLockouts = giveUpLockouts.filter(lockout => lockout.phone !== playerPhone); // Remove old entries for same phone
                giveUpLockouts.push({ phone: playerPhone, timestamp: new Date().toISOString() });
                saveToLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, giveUpLockouts);
            }
            const nomeInputEl = document.getElementById('nome');
            const telefoneInputEl = document.getElementById('telefone');
            if (nomeInputEl) nomeInputEl.value = '';
            if (telefoneInputEl) telefoneInputEl.value = '';
            showScreenUI('initial-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage);
        }, 'warning');
    }

    function loadAndDisplayRanking() {
        participants = getFromLocalStorage('quizParticipants', []); // Ensure fresh data
        const sorted = participants.sort((a, b) => b.score - a.score || a.time - b.time).slice(0, settings.rankingDisplayCount);
        loadRankingListUI(sorted, utilFormatTime);
    }

    function startQuizFadeOut() { // Renamed from startFadeOut to avoid conflict if any
        if (!isFadingToIdle) {
            const activeScreenId = document.querySelector('.screen.active')?.id;
            if (activeScreenId !== 'idle-screen') {
                setQuizContainerFade(true);
                isFadingToIdle = true;
            }
        }
    }

    function resetIdleTimer() {
        const activeScreenId = document.querySelector('.screen.active')?.id;
        if (activeScreenId === 'idle-screen') return;

        clearTimeout(fadeOutTimer);
        clearTimeout(actualIdleTimer);

        if (isFadingToIdle) {
            setQuizContainerFade(false);
            isFadingToIdle = false;
        }

        loadSettings(); // Ensure idle timeout settings are current

        let currentIdleTimeoutSeconds = settings.idleTimeoutSeconds;
        let currentFadeOutLeadSeconds = settings.fadeOutLeadTimeSeconds;

        // Ensure fadeOutLeadTime is less than idleTimeout
        if (currentFadeOutLeadSeconds >= currentIdleTimeoutSeconds) {
            currentFadeOutLeadSeconds = Math.max(3, currentIdleTimeoutSeconds - 5);
            if (currentFadeOutLeadSeconds >= currentIdleTimeoutSeconds) { // Still problematic
                 currentIdleTimeoutSeconds = currentFadeOutLeadSeconds + 15;
            }
        }

        const totalIdleMs = currentIdleTimeoutSeconds * 1000;
        const fadeOutLeadMs = currentFadeOutLeadSeconds * 1000;
        const fadeOutStartTimeMs = totalIdleMs - fadeOutLeadMs;

        if (fadeOutStartTimeMs > 0) {
            fadeOutTimer = setTimeout(startQuizFadeOut, fadeOutStartTimeMs);
        } else if (totalIdleMs > 0) { // If fade out is immediate or not applicable
            startQuizFadeOut();
        }

        if (totalIdleMs > 0) {
            actualIdleTimer = setTimeout(() => {
                setQuizContainerFade(false); // Ensure fade is removed
                isFadingToIdle = false;
                showScreenUI('idle-screen', settings, quizCustomizations, getFromLocalStorage(QUIZ_EVENT_KEY, null), resetIdleTimer, getFromLocalStorage);
            }, totalIdleMs);
        }
    }

    // handleSimulatedScenario needs careful refactoring if it's to be kept,
    // as it directly manipulates global state and UI elements.
    // For now, it's commented out or would need significant rework.
    /*
    const handleSimulatedScenario = (scenarioName) => { ... }
    */
    const handleSimulatedScenario = (scenarioName) => {
        // This function is for testing and might need significant rework
        // to use the new UI functions and state management.
        // For now, just log that it's called.
        console.warn("handleSimulatedScenario called with:", scenarioName, "Full functionality may require refactor.");
        // Example:
        if (scenarioName === 'modal_already_won') {
            showWinnerAlreadyModalUI(new Date().toISOString());
            showScreenUI('initial-screen', settings, quizCustomizations, currentEventData, resetIdleTimer, getFromLocalStorage);
        }
        // Other scenarios would need similar updates.
    };


    // --- Initialize ---
    initializeQuizApp();
});
