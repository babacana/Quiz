document.addEventListener('DOMContentLoaded', () => {

    // Variáveis globais para o quiz
    let fadeOutTimer = null;
    let actualIdleTimer = null;
    let isFadingToIdle = false;

    const screens = document.querySelectorAll('.screen');
    const virtualKeyboard = document.getElementById('virtual-keyboard');
    let quizContainer;
    const accessibilityControls = document.getElementById('accessibility-controls');

    let keyboardTargetInput = null;
    let allQuestions = [];
    let participants = [];
    let settings = {};
    let playerAttempts = [];
    let currentEventData = null;
    let quizCustomizations = {};

    // Variáveis para redimensionamento do teclado
    let isResizingKeyboard = false;
    let initialKeyboardHeightVh;
    let initialPointerY;
    let keyboardResizeHandle;
    const MIN_KEYBOARD_HEIGHT_VH = 20;
    const MAX_KEYBOARD_HEIGHT_VH = 60;
    const DEFAULT_KEYBOARD_HEIGHT_VH = 30;

    const DEFAULT_SETTINGS = {
        minScoreForPrize: 7,
        showCorrectAnswerOnWrong: true,
        rankingDisplayCount: 10,
        enablePrizeLock: true,
        customBackgroundFileName: '',
        enableCustomBackground: false,
        giveUpLockoutMinutes: 0,
        numberOfQuestions: 10,
        timePerQuestion: 30,
        idleTimeoutSeconds: 60,
        fadeOutLeadTimeSeconds: 5,
        difficultyPercentages: { facil: 40, moderado: 40, dificil: 20 },
        virtualKeyboardHeight: DEFAULT_KEYBOARD_HEIGHT_VH,
        enableVirtualKeyboard: true,
        enableTimeAlertBorderPulse: true,
        enableTimeAlertFlash: true
    };
    const DEFAULT_CUSTOMIZATIONS = {
        texts: {
            initialScreenTitle: "Bem-vindo ao Quiz!",
            initialScreenSlogan: "Água da CAESB, Patrimônio de Brasília.",
            initialScreenStartButton: "Iniciar Quiz",
            initialScreenRankingButton: "Ver Ranking",
            quizScreenNextButton: "Próxima Pergunta",
            quizScreenFinalizeButton: "Finalizar Quiz",
            resultScreenPrizeWon: "Parabéns, você ganhou um brinde!",
            resultScreenPrizeNotWon: "Que pena, não foi dessa vez. Tente novamente!",
            resultScreenRankingButton: "Ver Ranking",
            resultScreenPlayAgainButton: "Jogar Novamente",
            rankingScreenTitle: "Ranking Geral",
            rankingScreenBackButton: "Voltar ao Início",
            idleScreenCallToAction: "TOQUE PARA COMEÇAR",
            modalAlreadyWonTitle: "Segura a emoção, campeão(ã)! 🏆",
            modalAlreadyWonMessage: "Detectamos que você já faturou no nosso Quiz. Para a festa continuar e mais gente ganhar, a vez agora é de outro craque! Espalha a notícia!",
            modalIncorrectAnswersTitle: "Gabarito das Questões Erradas",
            inputNamePlaceholder: "Nome",
            inputPhonePlaceholder: "Telefone (DDD + Número)"
        },
        colors: {
            quizMainBackground: "#002244",
            quizPrimaryButtonBg: "#51cf66",
            quizPrimaryButtonText: "#ffffff",
            quizSecondaryButtonBg: "#003366",
            quizSecondaryButtonBorder: "#0056a0",
            quizSecondaryButtonText: "#ffffff",
            quizMainTextColor: "#ffffff",
            quizHighlightColor: "#61dafb",
            quizOptionBg: "#ffffff",
            quizOptionText: "#333333",
            quizOptionCorrectBg: "#51cf66",
            quizOptionIncorrectBg: "#ff6b6b",
        },
        fontSizes: {
            initialSloganFontSize: "clamp(1.1em, 4vw, 1.25em)",
            idleCallToActionFontSize: "clamp(2.8em, 7vw, 5.5em)",
            mainButtonsFontSize: "1.1em",
            questionTextFontSize: "clamp(1.1em, 3vw, 1.3em)"
        }
    };

    const DEFAULT_LOGO_SRC = "assets/logo.png";
    const CUSTOM_LOGO_FILENAME_KEY = 'quizCustomLogoFileName';
    const PRIZE_WINNERS_LIST_KEY = 'quizPrizeWinnersData';
    const GIVE_UP_LOCKOUT_LIST_KEY = 'quizGiveUpLockoutData';
    const QUIZ_EVENT_KEY = 'quizCurrentEvent';
    const QUIZ_CUSTOMIZATIONS_KEY = 'quizThemeCustomizations';

    const htmlEl = document.documentElement;
    const fontSizesInPx = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
    let currentFontStepIndex = fontSizesInPx.indexOf(18);
    if (currentFontStepIndex === -1) {
        currentFontStepIndex = fontSizesInPx.indexOf(16) !== -1 ? fontSizesInPx.indexOf(16) : Math.floor(fontSizesInPx.length / 2);
    }

    let resultPlayerNameTitleEl, resultSummaryDetailsEl, resultPrizeMessageEl, resultTop3CongratsMessageEl;
    let top3CongratsModal, top3ModalMessageContentEl, closeTop3CongratsModalBtn;
    let incorrectAnswersModal, closeIncorrectAnswersModalBtn, incorrectAnswersListEl, showIncorrectAnswersBtnRef;
    let progressBarFillEl;
    let nomeInput, telefoneInput, startQuizBtn, viewRankingInitialBtn, questionCounterEl, timerEl, questionTextEl, optionsContainer, nextQuestionBtn, giveUpBtn;
    let showRankingBtn, restartQuizBtn, rankingListEl, backToInitialBtn, idleScreenEl, idleCallToActionEl;
    let eventStatusMessageEl;
    let questionDifficultyTagEl;
    let questionTimeBarContainerEl = null;
    let questionTimeBarFillEl = null;
    let timeOutMessageEl = null;
    let postQuestionControlsEl = null;
    let timeBarAnimationId = null;

    let currentQuestionIndex = 0;
    let currentQuizQuestions = [];
    let score = 0;
    let questionTimerInterval = null;
    let flashInterval = null;
    let currentQuestionTimeLeft = 0; // Ainda usado para lógica interna da pergunta
    let totalQuizStartTime; // Usado para o novo timer progressivo
    let questionStartTimeForBar;
    let playerName = '';
    let playerPhone = '';
    let currentPlayerTimestamp;

    const getFromLocalStorage = (key, defaultValue = {}) => {
        const stored = localStorage.getItem(key);
        try {
            const parsed = stored ? JSON.parse(stored) : defaultValue;
            if (key === 'quizQuestions' && Array.isArray(parsed)) {
                return parsed.map(q => ({
                    ...q,
                    isDisabled: typeof q.isDisabled === 'boolean' ? q.isDisabled : false,
                    difficulty: q.difficulty || 'facil'
                }));
            }
            if (key === QUIZ_CUSTOMIZATIONS_KEY) {
                const mergedTexts = { ...DEFAULT_CUSTOMIZATIONS.texts, ...(parsed.texts || {}) };
                const mergedColors = { ...DEFAULT_CUSTOMIZATIONS.colors, ...(parsed.colors || {}) };
                const mergedFontSizes = { ...DEFAULT_CUSTOMIZATIONS.fontSizes, ...(parsed.fontSizes || {}) };
                return { texts: mergedTexts, colors: mergedColors, fontSizes: mergedFontSizes };
            }
             if (key === 'quizSettings' && parsed) {
                 parsed.difficultyPercentages = { ...DEFAULT_SETTINGS.difficultyPercentages, ...(parsed.difficultyPercentages || {}) };
                 parsed.idleTimeoutSeconds = parseInt(parsed.idleTimeoutSeconds, 10);
                 parsed.fadeOutLeadTimeSeconds = parseInt(parsed.fadeOutLeadTimeSeconds, 10);
                 if (isNaN(parsed.idleTimeoutSeconds) || parsed.idleTimeoutSeconds < 15) {
                    parsed.idleTimeoutSeconds = DEFAULT_SETTINGS.idleTimeoutSeconds;
                 }
                 if (isNaN(parsed.fadeOutLeadTimeSeconds) || parsed.fadeOutLeadTimeSeconds < 3 || parsed.fadeOutLeadTimeSeconds >= parsed.idleTimeoutSeconds) {
                    parsed.fadeOutLeadTimeSeconds = DEFAULT_SETTINGS.fadeOutLeadTimeSeconds;
                 }
                 return { ...DEFAULT_SETTINGS, ...parsed};
            }
            return parsed;
        }
        catch (e) { console.error(`LS Get Error (${key}):`, e); return defaultValue; }
    };
    const saveToLocalStorage = (key, data) => {
        try { localStorage.setItem(key, JSON.stringify(data)); }
        catch (e) { console.error(`LS Save Error (${key}):`, e); }
    };

    function showAlert(message, type = 'default') {
        const modal = document.getElementById('alert-modal');
        const msgEl = document.getElementById('alert-message');
        const okBtn = document.getElementById('alert-ok-btn');
        if (!modal || !msgEl || !okBtn) { console.error("Alert modal elements not found."); alert(message); return; }
        modal.classList.remove('modal-type-warning');
        if (type === 'warning') modal.classList.add('modal-type-warning');
        msgEl.textContent = message;
        modal.classList.remove('hidden');
        const cleanup = () => {
            modal.classList.add('hidden');
            modal.classList.remove('modal-type-warning');
            okBtn.removeEventListener('click', handler);
            modal.removeEventListener('click', onOverlayClick);
        };
        const handler = () => { cleanup(); resetIdleTimer(); };
        const onOverlayClick = (event) => { if (event.target === modal) { cleanup(); resetIdleTimer(); } };
        okBtn.addEventListener('click', handler);
        modal.addEventListener('click', onOverlayClick);
    }
    function showConfirm(message, onConfirm, type = 'default') {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-no-btn');
        if (!modal || !msgEl || !yesBtn || !noBtn) { console.error("Confirm modal elements not found."); if (confirm(message)) { if (typeof onConfirm === 'function') onConfirm(); } return; }
        modal.classList.remove('modal-type-danger', 'modal-type-warning');
        if (type === 'danger') modal.classList.add('modal-type-danger');
        else if (type === 'warning') modal.classList.add('modal-type-warning');
        msgEl.textContent = message;
        modal.classList.remove('hidden');
        const cleanupAndResetIdle = (confirmed) => {
            modal.classList.add('hidden');
            modal.classList.remove('modal-type-danger', 'modal-type-warning');
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
            modal.removeEventListener('click', onOverlayClick);
            if (confirmed && typeof onConfirm === 'function') onConfirm();
            resetIdleTimer();
        };
        const onYes = () => { cleanupAndResetIdle(true); };
        const onNo = () => { cleanupAndResetIdle(false); };
        const onOverlayClick = (event) => { if (event.target === modal) { cleanupAndResetIdle(false); } };
        yesBtn.addEventListener('click', onYes);
        noBtn.addEventListener('click', onNo);
        modal.addEventListener('click', onOverlayClick);
    }

    const applyFontSize = () => {
        if (currentFontStepIndex < 0) currentFontStepIndex = 0;
        if (currentFontStepIndex >= fontSizesInPx.length) currentFontStepIndex = fontSizesInPx.length - 1;
        htmlEl.style.fontSize = `${fontSizesInPx[currentFontStepIndex]}px`;
        const decreaseBtn = document.getElementById('decrease-font');
        const increaseBtn = document.getElementById('increase-font');
        if (decreaseBtn) decreaseBtn.disabled = currentFontStepIndex === 0;
        if (increaseBtn) increaseBtn.disabled = currentFontStepIndex === fontSizesInPx.length - 1;
    };
    const loadFontPreference = () => {
        currentFontStepIndex = fontSizesInPx.indexOf(18);
        if (currentFontStepIndex === -1) { currentFontStepIndex = Math.floor(fontSizesInPx.length / 2); }
        applyFontSize();
    };
    const applyCustomLogo = (logoFileName) => {
        const logoSrc = logoFileName ? `assets/${logoFileName}` : DEFAULT_LOGO_SRC;
        const logoElements = document.querySelectorAll('.caesb-logo');
        logoElements.forEach(logoEl => {
            logoEl.src = logoSrc;
            logoEl.onerror = () => { logoEl.src = DEFAULT_LOGO_SRC; };
        });
    };
    const loadCustomLogo = () => {
        const customLogoFileName = localStorage.getItem(CUSTOM_LOGO_FILENAME_KEY);
        applyCustomLogo(customLogoFileName);
    };
    const applyCustomBackground = () => {
        const currentSettings = getFromLocalStorage('quizSettings', DEFAULT_SETTINGS);
        const currentCustomizations = getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, DEFAULT_CUSTOMIZATIONS);

        if (!quizContainer) {
            console.error("applyCustomBackground: quizContainer is not defined yet.");
            return;
        }
        if (currentSettings.enableCustomBackground && currentSettings.customBackgroundFileName) {
            const imgPath = `assets/${currentSettings.customBackgroundFileName}`;
            quizContainer.style.backgroundImage = `url('${imgPath}')`;
            quizContainer.style.backgroundSize = 'cover';
            quizContainer.style.backgroundPosition = 'center bottom';
            quizContainer.style.backgroundRepeat = 'no-repeat';
            document.documentElement.style.removeProperty('--quiz-main-background');
            quizContainer.style.backgroundColor = '';
        } else {
            quizContainer.style.backgroundImage = '';
            const bgColor = currentCustomizations.colors.quizMainBackground || DEFAULT_CUSTOMIZATIONS.colors.quizMainBackground;
            document.documentElement.style.setProperty('--quiz-main-background', bgColor);
            quizContainer.style.backgroundColor = bgColor;
        }
    };

    function applyVirtualKeyboardHeight(targetHeightVh) {
        if (!virtualKeyboard) return;

        const currentKeyboardHeightVh = parseFloat(targetHeightVh);
        if (isNaN(currentKeyboardHeightVh)) return;

        const clampedHeightVh = Math.max(MIN_KEYBOARD_HEIGHT_VH, Math.min(MAX_KEYBOARD_HEIGHT_VH, currentKeyboardHeightVh));
        virtualKeyboard.style.height = `${clampedHeightVh}vh`;

        const keyboardHeightPx = (clampedHeightVh / 100) * window.innerHeight;
        const baseFontSizePx = keyboardHeightPx * 0.08;
        const minFontSizePx = 14;
        const maxFontSizePx = 32;
        const finalFontSizePx = Math.max(minFontSizePx, Math.min(maxFontSizePx, baseFontSizePx));

        document.documentElement.style.setProperty('--virtual-keyboard-key-font-size', `${finalFontSizePx}px`);
    }


    const applyThemeCustomizations = () => {
        quizCustomizations = getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, DEFAULT_CUSTOMIZATIONS);

        for (const key in quizCustomizations.colors) {
            document.documentElement.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, quizCustomizations.colors[key]);
        }
        applyCustomBackground();

        for (const key in quizCustomizations.fontSizes) {
            document.documentElement.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, quizCustomizations.fontSizes[key]);
        }

        const textTargets = {
            initialScreenTitle: { selector: '#initial-screen h2', default: DEFAULT_CUSTOMIZATIONS.texts.initialScreenTitle },
            initialScreenSlogan: { selector: '#initial-screen .slogan', default: DEFAULT_CUSTOMIZATIONS.texts.initialScreenSlogan },
            initialScreenStartButton: { element: startQuizBtn, default: DEFAULT_CUSTOMIZATIONS.texts.initialScreenStartButton },
            initialScreenRankingButton: { element: viewRankingInitialBtn, default: DEFAULT_CUSTOMIZATIONS.texts.initialScreenRankingButton },
            resultScreenRankingButton: { element: showRankingBtn, default: DEFAULT_CUSTOMIZATIONS.texts.resultScreenRankingButton },
            resultScreenPlayAgainButton: { element: restartQuizBtn, default: DEFAULT_CUSTOMIZATIONS.texts.resultScreenPlayAgainButton },
            rankingScreenTitle: { selector: '#ranking-screen h2', default: DEFAULT_CUSTOMIZATIONS.texts.rankingScreenTitle },
            rankingScreenBackButton: { element: backToInitialBtn, default: DEFAULT_CUSTOMIZATIONS.texts.rankingScreenBackButton },
            idleScreenCallToAction: { element: idleCallToActionEl, default: DEFAULT_CUSTOMIZATIONS.texts.idleScreenCallToAction },
            modalAlreadyWonTitle: { element: document.getElementById('winner-already-modal-title'), default: DEFAULT_CUSTOMIZATIONS.texts.modalAlreadyWonTitle },
            modalAlreadyWonMessage: { element: document.getElementById('winner-already-main-message'), default: DEFAULT_CUSTOMIZATIONS.texts.modalAlreadyWonMessage },
            modalIncorrectAnswersTitle: { element: document.getElementById('incorrect-answers-modal-title'), default: DEFAULT_CUSTOMIZATIONS.texts.modalIncorrectAnswersTitle }
        };

        for (const key in quizCustomizations.texts) {
            const targetInfo = textTargets[key];
            if (targetInfo) {
                const element = targetInfo.element || (targetInfo.selector ? document.querySelector(targetInfo.selector) : null);
                if (element) {
                    element.textContent = quizCustomizations.texts[key] || targetInfo.default;
                }
            }
        }
        if(nomeInput) nomeInput.placeholder = quizCustomizations.texts.inputNamePlaceholder || DEFAULT_CUSTOMIZATIONS.texts.inputNamePlaceholder;
        if(telefoneInput) telefoneInput.placeholder = quizCustomizations.texts.inputPhonePlaceholder || DEFAULT_CUSTOMIZATIONS.texts.inputPhonePlaceholder;

        applyVirtualKeyboardHeight(settings.virtualKeyboardHeight || DEFAULT_KEYBOARD_HEIGHT_VH);
    };

    const shuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);
    const formatTime = (s) => {
        if (isNaN(s) || s < 0) return "00:00";
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
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
    function updateIdleScreenMessage() {
        if (!idleCallToActionEl) return;
        const eventStatus = checkEventStatus();
        const eventMessageActive = currentEventData && currentEventData.enableOutOfPeriodMessage;
        const callToActionText = quizCustomizations.texts.idleScreenCallToAction || DEFAULT_CUSTOMIZATIONS.texts.idleScreenCallToAction;
        if (eventMessageActive) {
            if (eventStatus === 'before') idleCallToActionEl.innerHTML = `QUIZ EM BREVE!<br><small>Toque para mais informações</small>`;
            else if (eventStatus === 'after') idleCallToActionEl.innerHTML = `QUIZ ENCERRADO<br><small>Obrigado por participar!</small>`;
            else idleCallToActionEl.textContent = callToActionText;
        } else idleCallToActionEl.textContent = callToActionText;
    }
    function updateInitialScreenForEventState() {
        if (!eventStatusMessageEl || !startQuizBtn || !viewRankingInitialBtn) return;
        const eventStatus = checkEventStatus();
        const eventMessageActive = currentEventData && currentEventData.enableOutOfPeriodMessage;
        eventStatusMessageEl.classList.add('hidden');
        eventStatusMessageEl.textContent = '';
        startQuizBtn.disabled = false;
        viewRankingInitialBtn.disabled = false;
        startQuizBtn.classList.remove('hidden');
        if (eventMessageActive) {
            if (eventStatus === 'before') {
                startQuizBtn.disabled = true;
                eventStatusMessageEl.textContent = `O quiz "${currentEventData.eventName || 'especial'}" ainda não começou! Prepare-se, a diversão começa em ${new Date(currentEventData.startTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.`;
                eventStatusMessageEl.classList.remove('hidden');
            } else if (eventStatus === 'after') {
                startQuizBtn.disabled = true;
                eventStatusMessageEl.textContent = `O quiz "${currentEventData.eventName || 'especial'}" foi encerrado em ${new Date(currentEventData.endTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. Obrigado pela participação!`;
                eventStatusMessageEl.classList.remove('hidden');
            }
        }
    }

    function createKeyboardResizeHandle() {
        if (document.getElementById('keyboard-resize-handle')) return;

        keyboardResizeHandle = document.createElement('div');
        keyboardResizeHandle.id = 'keyboard-resize-handle';
        virtualKeyboard.prepend(keyboardResizeHandle);

        keyboardResizeHandle.addEventListener('mousedown', startKeyboardResize);
        keyboardResizeHandle.addEventListener('touchstart', startKeyboardResize, { passive: false });
    }

    function startKeyboardResize(event) {
        if (event.type === 'touchstart') event.preventDefault();
        isResizingKeyboard = true;
        initialPointerY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;

        const currentHeightStyle = virtualKeyboard.style.height;
        if (currentHeightStyle && currentHeightStyle.endsWith('vh')) {
            initialKeyboardHeightVh = parseFloat(currentHeightStyle);
        } else {
            initialKeyboardHeightVh = settings.virtualKeyboardHeight || DEFAULT_KEYBOARD_HEIGHT_VH;
        }

        virtualKeyboard.classList.add('resizing');

        document.addEventListener('mousemove', doKeyboardResize);
        document.addEventListener('touchmove', doKeyboardResize, { passive: false });
        document.addEventListener('mouseup', stopKeyboardResize);
        document.addEventListener('touchend', stopKeyboardResize);
    }

    function doKeyboardResize(event) {
        if (!isResizingKeyboard) return;
        if (event.type === 'touchmove') event.preventDefault();

        const currentPointerY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
        const deltaY = currentPointerY - initialPointerY;

        const deltaVh = (deltaY / window.innerHeight) * 100;

        let newHeightVh = initialKeyboardHeightVh - deltaVh;

        applyVirtualKeyboardHeight(newHeightVh);
    }

    function stopKeyboardResize() {
        if (!isResizingKeyboard) return;
        isResizingKeyboard = false;
        virtualKeyboard.classList.remove('resizing');

        document.removeEventListener('mousemove', doKeyboardResize);
        document.removeEventListener('touchmove', doKeyboardResize);
        document.removeEventListener('mouseup', stopKeyboardResize);
        document.removeEventListener('touchend', stopKeyboardResize);
    }


    function initializeQuizApp() {
        console.log("initializeQuizApp: Iniciando...");
        quizContainer = document.querySelector('.quiz-container');
        if (!quizContainer) {
            console.error("initializeQuizApp: Elemento .quiz-container não encontrado! O Quiz não pode ser renderizado.");
            return;
        }

        nomeInput = document.getElementById('nome');
        telefoneInput = document.getElementById('telefone');
        startQuizBtn = document.getElementById('start-quiz-btn');
        viewRankingInitialBtn = document.getElementById('view-ranking-initial-btn');
        questionCounterEl = document.getElementById('question-counter');
        timerEl = document.getElementById('timer');
        questionTextEl = document.getElementById('question-text');
        optionsContainer = document.getElementById('options-container');
        nextQuestionBtn = document.getElementById('next-question-btn');
        giveUpBtn = document.getElementById('give-up-btn');
        showRankingBtn = document.getElementById('show-ranking-btn');
        restartQuizBtn = document.getElementById('restart-quiz-btn');
        rankingListEl = document.getElementById('ranking-list');
        backToInitialBtn = document.getElementById('back-to-initial-btn');
        idleScreenEl = document.getElementById('idle-screen');
        idleCallToActionEl = document.getElementById('idle-call-to-action');
        resultPlayerNameTitleEl = document.getElementById('result-player-name-title');
        resultSummaryDetailsEl = document.getElementById('result-summary-details');
        resultPrizeMessageEl = document.getElementById('result-prize-message');
        resultTop3CongratsMessageEl = document.getElementById('result-top3-congrats-message');
        top3CongratsModal = document.getElementById('top3-congrats-modal');
        top3ModalMessageContentEl = document.getElementById('top3-modal-message-content');
        closeTop3CongratsModalBtn = document.getElementById('close-top3-congrats-modal-btn');
        incorrectAnswersModal = document.getElementById('incorrect-answers-modal');
        closeIncorrectAnswersModalBtn = document.getElementById('close-incorrect-answers-modal-btn');
        incorrectAnswersListEl = document.getElementById('incorrect-answers-list');
        showIncorrectAnswersBtnRef = document.getElementById('show-incorrect-answers-btn');
        progressBarFillEl = document.getElementById('progress-bar-fill');
        eventStatusMessageEl = document.getElementById('event-status-message');
        questionDifficultyTagEl = document.getElementById('question-difficulty-tag');
        questionTimeBarContainerEl = document.getElementById('question-time-bar-container');
        questionTimeBarFillEl = document.getElementById('question-time-bar-fill');
        timeOutMessageEl = document.getElementById('timeout-message-text');
        postQuestionControlsEl = document.getElementById('post-question-controls');

        settings = getFromLocalStorage('quizSettings', DEFAULT_SETTINGS);
        console.log("initializeQuizApp: Configurações carregadas:", JSON.parse(JSON.stringify(settings)));

        allQuestions = getFromLocalStorage('quizQuestions', []);
        participants = getFromLocalStorage('quizParticipants', []);
        currentEventData = getFromLocalStorage(QUIZ_EVENT_KEY, null);
        quizCustomizations = getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, DEFAULT_CUSTOMIZATIONS);

        applyThemeCustomizations();
        loadCustomLogo();
        loadFontPreference();

        if (settings.enableVirtualKeyboard && virtualKeyboard) {
            createKeyboardResizeHandle();
        }


        if (getFromLocalStorage('quizQuestions_initialized', 'false') !== 'true' && allQuestions.length === 0) {
            const defaultQuizQuestions = [
                { id: 'q1', text: 'Qual é a capital do Brasil?', options: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'], correct: 2, isDisabled: false, difficulty: 'facil' },
                { id: 'q2', text: 'Qual monumento é um ícone de Brasília, projetado por Oscar Niemeyer, e sede do Congresso Nacional?', options: ['Palácio da Alvorada', 'Catedral Metropolitana', 'Congresso Nacional', 'Ponte JK'], correct: 2, isDisabled: false, difficulty: 'moderado' },
                { id: 'q3', text: 'A CAESB é responsável por qual serviço essencial no Distrito Federal?', options: ['Transporte Público', 'Energia Elétrica', 'Saneamento Básico (Água e Esgoto)', 'Comunicações'], correct: 2, isDisabled: false, difficulty: 'facil' },
                { id: 'q4', text: 'Qual o principal reservatório de água que abastece o Distrito Federal?', options: ['Lago Paranoá', 'Represa do Descoberto', 'Represa de Santa Maria', 'Ambos Descoberto e Santa Maria'], correct: 3, isDisabled: false, difficulty: 'dificil' },
                { id: 'q5', text: 'O slogan da campanha da CAESB mencionada é:', options: ['Água é Vida', 'CAESB, Água para Todos', 'Água da CAESB, Patrimônio de Brasília', 'Beba Água, Viva Melhor'], correct: 2, isDisabled: false, difficulty: 'facil' }
            ];
            saveToLocalStorage('quizQuestions', defaultQuizQuestions);
            allQuestions = [...defaultQuizQuestions];
            saveToLocalStorage('quizQuestions_initialized', 'true');
        }

        setupEventListeners();

        const initialTestAction = localStorage.getItem('quiz_test_action');
        const initialTestTarget = localStorage.getItem('quiz_test_target');
        if (initialTestAction && initialTestTarget) {
            console.log(`initializeQuizApp: Executando ação de teste - Ação: ${initialTestAction}, Alvo: ${initialTestTarget}`);
            setTimeout(() => {
                if (initialTestAction === 'goto_screen') showScreen(initialTestTarget);
                else if (initialTestAction === 'simulate_scenario') handleSimulatedScenario(initialTestTarget);
                localStorage.removeItem('quiz_test_action');
                localStorage.removeItem('quiz_test_target');
            }, 100);
        } else {
            showScreen('initial-screen');
        }

        document.addEventListener('contextmenu', event => event.preventDefault());
        console.log("initializeQuizApp: Finalizado.");
    }

    function setupEventListeners() {
        [nomeInput, telefoneInput].forEach(inputEl => {
            if (inputEl) inputEl.addEventListener('focus', (e) => { setTimeout(() => showVirtualKeyboard(e.target), 0); resetIdleTimer(); });
        });
        if (nomeInput) nomeInput.addEventListener('input', () => { nomeInput.value = nomeInput.value.replace(/[^a-zA-Z\sÀ-ú]/g, '').toUpperCase(); resetIdleTimer(); });
        if (telefoneInput) telefoneInput.addEventListener('input', () => {
            let v = telefoneInput.value.replace(/\D/g, '').substring(0, 11), f = '';
            if (v.length > 0) f = `(${v.substring(0, 2)}`;
            if (v.length > 2) f += `) ${v.substring(2, v.length > 6 ? 7 : v.length)}`;
            if (v.length > 7) f += `-${v.substring(7, 11)}`;
            telefoneInput.value = f;
            resetIdleTimer();
        });

        if (startQuizBtn) startQuizBtn.addEventListener('click', () => { handleStartQuizAttempt(); resetIdleTimer(); });
        if (viewRankingInitialBtn) viewRankingInitialBtn.addEventListener('click', () => { loadRanking(); showScreen('ranking-screen'); });
        if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', () => { currentQuestionIndex++; loadQuestion(); resetIdleTimer(); });
        if (giveUpBtn) giveUpBtn.addEventListener('click', () => { handleGiveUp(); resetIdleTimer(); });
        if (showRankingBtn) showRankingBtn.addEventListener('click', () => { loadRanking(); showScreen('ranking-screen'); });
        if (restartQuizBtn) restartQuizBtn.addEventListener('click', () => { if (nomeInput) nomeInput.value = ''; if (telefoneInput) telefoneInput.value = ''; showScreen('initial-screen'); });
        if (backToInitialBtn) backToInitialBtn.addEventListener('click', () => { if (nomeInput) nomeInput.value = ''; if (telefoneInput) telefoneInput.value = ''; showScreen('initial-screen'); });

        if (idleScreenEl) {
            const handleIdleScreenInteraction = () => {
                showScreen('initial-screen');
            };
            idleScreenEl.addEventListener('click', handleIdleScreenInteraction);
            idleScreenEl.addEventListener('touchstart', handleIdleScreenInteraction, {passive: true});
        }

        const winnerAlreadyModal = document.getElementById('winner-already-modal');
        const closeWinnerAlreadyModalBtn = document.getElementById('close-winner-already-modal-btn');
        if (closeWinnerAlreadyModalBtn) closeWinnerAlreadyModalBtn.addEventListener('click', () => { hideWinnerAlreadyModal(); resetIdleTimer(); });
        if (winnerAlreadyModal) winnerAlreadyModal.addEventListener('click', (event) => { if (event.target === winnerAlreadyModal) { hideWinnerAlreadyModal(); resetIdleTimer(); } });

        if (closeIncorrectAnswersModalBtn) closeIncorrectAnswersModalBtn.addEventListener('click', () => { hideIncorrectAnswersModalFunc(); resetIdleTimer(); });
        if (incorrectAnswersModal) incorrectAnswersModal.addEventListener('click', (event) => { if (event.target === incorrectAnswersModal) { hideIncorrectAnswersModalFunc(); resetIdleTimer(); } });
        if (closeTop3CongratsModalBtn) closeTop3CongratsModalBtn.addEventListener('click', () => { hideTop3CongratsModal(); resetIdleTimer(); });
        if (top3CongratsModal) top3CongratsModal.addEventListener('click', (event) => { if (event.target === top3CongratsModal) { hideTop3CongratsModal(); resetIdleTimer(); } });
        if (showIncorrectAnswersBtnRef) showIncorrectAnswersBtnRef.addEventListener('click', () => { displayIncorrectAnswers(); resetIdleTimer(); });

        const decreaseFontButton = document.getElementById('decrease-font');
        const increaseFontButton = document.getElementById('increase-font');
        if (decreaseFontButton) decreaseFontButton.addEventListener('click', () => { if (currentFontStepIndex > 0) { currentFontStepIndex--; applyFontSize(); } resetIdleTimer(); });
        if (increaseFontButton) increaseFontButton.addEventListener('click', () => { if (currentFontStepIndex < fontSizesInPx.length - 1) { currentFontStepIndex++; applyFontSize(); } resetIdleTimer(); });
        const adminAccessBtn = document.getElementById('admin-access-btn');
        if (adminAccessBtn) adminAccessBtn.addEventListener('click', () => { window.location.href = 'admin.html'; resetIdleTimer(); });

        ['click', 'keydown', 'touchstart', 'mousemove', 'input', 'scroll'].forEach(event => {
            document.addEventListener(event, (e) => {
                if (e.isTrusted && !isResizingKeyboard) {
                    resetIdleTimer();
                }
            }, {passive: true});
        });
    }

    const showScreen = (screenId) => {
        console.log(`showScreen: Tentando mostrar tela '${screenId}'`);
        if (!screens || screens.length === 0) {
            console.error("showScreen: Lista de 'screens' está vazia ou não definida.");
            return;
        }
        let foundScreen = false;
        screens.forEach(screen => {
            if (screen && screen.id) {
                const isActive = screen.id === screenId;
                screen.style.display = isActive ? 'flex' : 'none';
                screen.classList.toggle('active', isActive);
                if (isActive) foundScreen = true;
            } else {
                console.warn("showScreen: Encontrado um elemento 'screen' inválido ou sem ID.");
            }
        });
        if (!foundScreen) {
            console.error(`showScreen: Tela com ID '${screenId}' não encontrada.`);
        }

        if (virtualKeyboard && screenId !== 'initial-screen' && !virtualKeyboard.classList.contains('hidden')) {
            if (settings.enableVirtualKeyboard) {
                hideVirtualKeyboard();
            }
        }
        if (accessibilityControls) {
            accessibilityControls.classList.toggle('hidden-on-idle', screenId === 'idle-screen');
        }

        if (screenId === 'idle-screen') {
            updateIdleScreenMessage();
            clearTimeout(fadeOutTimer);
            clearTimeout(actualIdleTimer);
            if (quizContainer) {
                quizContainer.classList.remove('fading-to-idle');
                quizContainer.classList.remove('time-alert-border-pulse-warning');
                quizContainer.classList.remove('time-alert-border-pulse-critical');
                quizContainer.classList.remove('time-alert-flash-effect');
            }
            isFadingToIdle = false;
        } else {
            resetIdleTimer();
        }

        if (screenId === 'initial-screen') {
            updateInitialScreenForEventState();
            if (nomeInput) nomeInput.value = '';
            if (telefoneInput) telefoneInput.value = '';
            applyVirtualKeyboardHeight(settings.virtualKeyboardHeight || DEFAULT_KEYBOARD_HEIGHT_VH);
        }
        applyThemeCustomizations();
        console.log(`showScreen: Tela '${screenId}' deveria estar visível.`);
    };

    const createVirtualKeyboard = () => {
        if (!virtualKeyboard || !keyboardTargetInput) { if (virtualKeyboard) virtualKeyboard.classList.add('hidden'); return; }

        applyVirtualKeyboardHeight(parseFloat(virtualKeyboard.style.height) || settings.virtualKeyboardHeight || DEFAULT_KEYBOARD_HEIGHT_VH);

        virtualKeyboard.innerHTML = '';
        if (settings.enableVirtualKeyboard && keyboardResizeHandle) {
            virtualKeyboard.prepend(keyboardResizeHandle);
        }

        let keySet;
        if (keyboardTargetInput.id === 'nome') {
            keySet = [['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'], ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'APAGAR'], ['ESPAÇO', 'OK']];
            virtualKeyboard.style.gridTemplateColumns = `repeat(10, 1fr)`;
        } else if (keyboardTargetInput.id === 'telefone') {
            keySet = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['APAGAR', '0', 'OK']];
            virtualKeyboard.style.gridTemplateColumns = 'repeat(3, 1fr)';
        } else { if (virtualKeyboard) virtualKeyboard.classList.add('hidden'); return; }

        keySet.forEach((row, rowIndex) => {
            row.forEach(key => {
                const btn = document.createElement('button');
                btn.textContent = key;
                btn.addEventListener('click', () => onVirtualKeyPress(key));
                if (key === 'OK') btn.classList.add('ok-key-highlight');
                if (keyboardTargetInput.id === 'nome') {
                    if (key === 'APAGAR' && rowIndex === 2) btn.style.gridColumn = 'span 3';
                    if (key === 'ESPAÇO' && rowIndex === 3) btn.style.gridColumn = 'span 7';
                    if (key === 'OK' && rowIndex === 3) btn.style.gridColumn = 'span 3';
                }
                virtualKeyboard.appendChild(btn);
            });
        });
        virtualKeyboard.classList.remove('hidden');
        virtualKeyboard.style.display = 'grid';
        if (keyboardResizeHandle) keyboardResizeHandle.classList.remove('hidden');
    };
    const onVirtualKeyPress = (key) => {
        if (!keyboardTargetInput) return;
        switch (key) {
            case 'APAGAR': keyboardTargetInput.value = keyboardTargetInput.value.slice(0, -1); break;
            case 'ESPAÇO': if (keyboardTargetInput.id === 'nome') keyboardTargetInput.value += ' '; break;
            case 'OK': hideVirtualKeyboard(); if (keyboardTargetInput) keyboardTargetInput.blur(); break;
            default: keyboardTargetInput.value += key;
        }
        if (keyboardTargetInput) keyboardTargetInput.dispatchEvent(new Event('input'));
        resetIdleTimer();
    };
    const showVirtualKeyboard = (targetElement) => {
        if (!settings.enableVirtualKeyboard || !virtualKeyboard) {
             if (virtualKeyboard) virtualKeyboard.classList.add('hidden');
             if (keyboardResizeHandle) keyboardResizeHandle.classList.add('hidden');
            return;
        }
        keyboardTargetInput = targetElement;
        createVirtualKeyboard();
        resetIdleTimer();
    };
    const hideVirtualKeyboard = () => {
        if (virtualKeyboard) virtualKeyboard.classList.add('hidden');
        if (keyboardResizeHandle) keyboardResizeHandle.classList.add('hidden');
        resetIdleTimer();
    };

    const showWinnerAlreadyModal = (timestamp) => {
        const modal = document.getElementById('winner-already-modal');
        const timestampEl = document.getElementById('winner-already-timestamp');
        if (modal && timestampEl) {
            const dateObj = new Date(timestamp);
            const datePart = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timePart = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
            timestampEl.textContent = `Participação em: ${datePart} às ${timePart}`;
            modal.classList.remove('hidden');
        }
        resetIdleTimer();
    };
    const hideWinnerAlreadyModal = () => {
        const modal = document.getElementById('winner-already-modal');
        if (modal) modal.classList.add('hidden');
        if (nomeInput) nomeInput.value = '';
        if (telefoneInput) telefoneInput.value = '';
        resetIdleTimer();
    };
    const showIncorrectAnswersModalFunc = () => { if (incorrectAnswersModal) incorrectAnswersModal.classList.remove('hidden'); resetIdleTimer(); };
    const hideIncorrectAnswersModalFunc = () => { if (incorrectAnswersModal) incorrectAnswersModal.classList.add('hidden'); resetIdleTimer(); };
    const showTop3CongratsModal = () => { if (top3CongratsModal) top3CongratsModal.classList.remove('hidden'); resetIdleTimer(); };
    const hideTop3CongratsModal = () => { if (top3CongratsModal) top3CongratsModal.classList.add('hidden'); resetIdleTimer(); };

    function displayIncorrectAnswers() {
        if (!incorrectAnswersListEl) return;
        incorrectAnswersListEl.innerHTML = '';
        const incorrectAttempts = playerAttempts.filter(attempt => !attempt.isCorrect);
        if (incorrectAttempts.length > 0) {
            incorrectAttempts.forEach(attempt => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('question-review-item');
                const questionTitle = document.createElement('h4');
                questionTitle.textContent = attempt.questionText;
                itemDiv.appendChild(questionTitle);
                const userAnswerP = document.createElement('p');
                userAnswerP.classList.add('user-answer');
                userAnswerP.innerHTML = `<span class="review-label">Sua resposta: </span><span class="review-value-user">${attempt.selectedOptionText}</span>`;
                itemDiv.appendChild(userAnswerP);
                const correctAnswerP = document.createElement('p');
                correctAnswerP.classList.add('correct-answer-review');
                correctAnswerP.innerHTML = `<span class="review-label">Resposta correta: </span><span class="review-value-correct">${attempt.correctOptionText}</span>`;
                itemDiv.appendChild(correctAnswerP);
                incorrectAnswersListEl.appendChild(itemDiv);
            });
            showIncorrectAnswersModalFunc();
        }
    }

    function handleStartQuizAttempt() {
        const eventStatus = checkEventStatus();
        const eventMessageActive = currentEventData && currentEventData.enableOutOfPeriodMessage;

        if (eventMessageActive && (eventStatus === 'before' || eventStatus === 'after')) {
            if (eventStatus === 'before') showAlert(`O quiz ainda não começou. Aguarde até ${new Date(currentEventData.startTime).toLocaleString('pt-BR')}.`);
            else if (eventStatus === 'after') showAlert(`O quiz já foi encerrado. Obrigado pela participação!`);
            return;
        }

        playerName = nomeInput.value.trim();
        playerPhone = telefoneInput.value.trim();

        if (!playerName) { showAlert('Preencha o nome.'); if (nomeInput && settings.enableVirtualKeyboard) showVirtualKeyboard(nomeInput); return; }
        if (!/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(playerPhone)) { showAlert('Telefone inválido. Formato esperado: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.'); if (telefoneInput && settings.enableVirtualKeyboard) showVirtualKeyboard(telefoneInput); return; }

        if (settings.enablePrizeLock) {
            const prizeWinners = getFromLocalStorage(PRIZE_WINNERS_LIST_KEY, []);
            const existingWinner = prizeWinners.find(winner => winner.phone === playerPhone);
            if (existingWinner) { showWinnerAlreadyModal(existingWinner.timestamp); return; }
        }

        if (settings.giveUpLockoutMinutes > 0) {
            const giveUpLockouts = getFromLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, []);
            const now = Date.now();
            const activeLockouts = giveUpLockouts.filter(lockout => (new Date(lockout.timestamp).getTime() + (settings.giveUpLockoutMinutes * 60 * 1000)) > now);
            saveToLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, activeLockouts);
            const existingLockout = activeLockouts.find(lockout => lockout.phone === playerPhone);
            if (existingLockout) {
                const remainingTimeMs = (new Date(existingLockout.timestamp).getTime() + (settings.giveUpLockoutMinutes * 60 * 1000)) - now;
                const remainingMinutes = Math.ceil(remainingTimeMs / (1000 * 60));
                showAlert(`Você desistiu recentemente do quiz e está bloqueado por ${remainingMinutes} minuto(s). Por favor, aguarde para jogar novamente.`, 'warning');
                return;
            }
        }
        if (settings.enableVirtualKeyboard) hideVirtualKeyboard();
        startQuiz();
    }

    const startQuiz = () => {
        playerAttempts = [];
        allQuestions = getFromLocalStorage('quizQuestions', []);
        settings = getFromLocalStorage('quizSettings', DEFAULT_SETTINGS);

        const enabledQuestions = allQuestions.filter(q => !q.isDisabled);
        const numQuestionsToPlay = settings.numberOfQuestions || DEFAULT_SETTINGS.numberOfQuestions;
        const difficultyPercentages = settings.difficultyPercentages || DEFAULT_SETTINGS.difficultyPercentages;

        if (enabledQuestions.length === 0) {
            showAlert("Sem questões habilitadas para jogar. Por favor, verifique as configurações na área administrativa.");
            showScreen('initial-screen'); return;
        }

        currentQuizQuestions = [];
        const questionsByDifficulty = {
            facil: shuffleArray(enabledQuestions.filter(q => q.difficulty === 'facil')),
            moderado: shuffleArray(enabledQuestions.filter(q => q.difficulty === 'moderado')),
            dificil: shuffleArray(enabledQuestions.filter(q => q.difficulty === 'dificil'))
        };

        let countFacil = Math.round(numQuestionsToPlay * (difficultyPercentages.facil / 100));
        let countModerado = Math.round(numQuestionsToPlay * (difficultyPercentages.moderado / 100));
        let countDificil = Math.round(numQuestionsToPlay * (difficultyPercentages.dificil / 100));

        let currentTotal = countFacil + countModerado + countDificil;
        while (currentTotal !== numQuestionsToPlay) {
            if (currentTotal < numQuestionsToPlay) {
                if (difficultyPercentages.facil >= difficultyPercentages.moderado && difficultyPercentages.facil >= difficultyPercentages.dificil && questionsByDifficulty.facil.length > countFacil) countFacil++;
                else if (difficultyPercentages.moderado >= difficultyPercentages.facil && difficultyPercentages.moderado >= difficultyPercentages.dificil && questionsByDifficulty.moderado.length > countModerado) countModerado++;
                else if (questionsByDifficulty.dificil.length > countDificil) countDificil++;
                else if (questionsByDifficulty.facil.length > countFacil) countFacil++;
                else if (questionsByDifficulty.moderado.length > countModerado) countModerado++;
                else break;
            } else {
                if (difficultyPercentages.dificil <= difficultyPercentages.moderado && difficultyPercentages.dificil <= difficultyPercentages.facil && countDificil > 0) countDificil--;
                else if (difficultyPercentages.moderado <= difficultyPercentages.facil && difficultyPercentages.moderado <= difficultyPercentages.dificil && countModerado > 0) countModerado--;
                else if (countFacil > 0) countFacil--;
                else break;
            }
            currentTotal = countFacil + countModerado + countDificil;
        }

        currentQuizQuestions.push(...questionsByDifficulty.facil.slice(0, countFacil));
        currentQuizQuestions.push(...questionsByDifficulty.moderado.slice(0, countModerado));
        currentQuizQuestions.push(...questionsByDifficulty.dificil.slice(0, countDificil));

        let remainingNeeded = numQuestionsToPlay - currentQuizQuestions.length;
        if (remainingNeeded > 0) {
            const allAvailableShuffled = shuffleArray(enabledQuestions.filter(q => !currentQuizQuestions.find(cq => cq.id === q.id)));
            currentQuizQuestions.push(...allAvailableShuffled.slice(0, remainingNeeded));
        }

        currentQuizQuestions = shuffleArray(currentQuizQuestions.slice(0, numQuestionsToPlay));

        if (currentQuizQuestions.length === 0) {
            showAlert("Não foi possível selecionar questões com base nas configurações. Verifique o banco de questões e as configurações de dificuldade.");
            showScreen('initial-screen'); return;
        }
        if (numQuestionsToPlay > currentQuizQuestions.length && currentQuizQuestions.length > 0) {
             console.warn(`Configurado para ${numQuestionsToPlay} perguntas, mas apenas ${currentQuizQuestions.length} foram selecionadas devido à disponibilidade/distribuição. Jogando com ${currentQuizQuestions.length}.`);
        }

        currentQuestionIndex = 0;
        score = 0;
        totalQuizStartTime = Date.now(); // NOVO: Definido aqui para o timer total do quiz
        if (giveUpBtn) giveUpBtn.classList.remove('hidden');
        if (postQuestionControlsEl) postQuestionControlsEl.classList.add('hidden');
        if (showIncorrectAnswersBtnRef) showIncorrectAnswersBtnRef.classList.add('hidden');
        if (questionDifficultyTagEl) questionDifficultyTagEl.textContent = '';
        loadQuestion();
        showScreen('quiz-screen');
    };

    const loadQuestion = () => {
        clearInterval(questionTimerInterval);
        clearInterval(flashInterval);
        flashInterval = null;
        if (timeBarAnimationId) {
            cancelAnimationFrame(timeBarAnimationId);
            timeBarAnimationId = null;
        }

        if (questionTimeBarContainerEl) questionTimeBarContainerEl.classList.remove('hidden');
        if (questionTimeBarFillEl) {
            questionTimeBarFillEl.style.width = '100%';
            questionTimeBarFillEl.style.backgroundColor = 'hsl(120, 80%, 50%)';
        }
        if (timeOutMessageEl) timeOutMessageEl.classList.add('hidden');
        if (postQuestionControlsEl) postQuestionControlsEl.classList.add('hidden');
        if (optionsContainer) optionsContainer.classList.remove('options-really-dimmed');


        if (quizContainer) {
            quizContainer.classList.remove('time-alert-border-pulse-warning');
            quizContainer.classList.remove('time-alert-border-pulse-critical');
            quizContainer.classList.remove('time-alert-flash-effect');
        }
        if (currentQuestionIndex >= currentQuizQuestions.length) {
            endQuiz();
            return;
        }
        const q = currentQuizQuestions[currentQuestionIndex];

        if (!q || typeof q.text !== 'string' || q.text.trim() === "") {
            console.error("Questão inválida ou texto da questão ausente/vazio:", q);
            showAlert("Erro: Não foi possível carregar o texto da pergunta. Verifique os dados das questões no painel de administração.");
            currentQuizQuestions.splice(currentQuestionIndex, 1);
            if (currentQuizQuestions.length === 0 || currentQuestionIndex >= currentQuizQuestions.length) {
                 if (playerAttempts.length > 0 || score > 0) { endQuiz(); }
                 else { showScreen('initial-screen'); }
            } else { loadQuestion(); }
            return;
        }

        if (!questionTextEl || !questionCounterEl || !optionsContainer || !nextQuestionBtn || !progressBarFillEl || !questionDifficultyTagEl || !timerEl) {
            console.error("Elementos da UI do quiz não encontrados!");
            showAlert("Erro crítico na interface do quiz. Por favor, recarregue.");
            showScreen('initial-screen');
            return;
        }

        questionTextEl.textContent = q.text;
        questionCounterEl.textContent = `${currentQuestionIndex + 1}/${currentQuizQuestions.length}`;
        const progress = ((currentQuestionIndex + 1) / currentQuizQuestions.length) * 100;
        progressBarFillEl.style.width = `${progress}%`;

        const difficultyMap = { facil: 'Fácil', moderado: 'Moderado', dificil: 'Difícil' };
        const difficultyText = q.difficulty ? (difficultyMap[q.difficulty] || q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)) : 'N/D';
        questionDifficultyTagEl.textContent = difficultyText;
        questionDifficultyTagEl.className = `question-difficulty-tag difficulty-${q.difficulty || 'na'}`;

        optionsContainer.innerHTML = '';
        let optionsToDisplay = q.options.map((optionText, index) => ({ text: optionText, isCorrectOriginal: index === q.correct }));
        const shuffledOptionsToDisplay = shuffleArray([...optionsToDisplay]);
        shuffledOptionsToDisplay.forEach(optionData => {
            const optionDiv = document.createElement('div');
            optionDiv.classList.add('option');
            optionDiv.textContent = optionData.text;
            optionDiv.dataset.isCorrect = optionData.isCorrectOriginal;
            optionDiv.addEventListener('click', () => { handleOptionSelect(optionDiv, q.id); resetIdleTimer(); });
            optionsContainer.appendChild(optionDiv);
        });

        if (giveUpBtn) giveUpBtn.classList.remove('hidden');
        startQuestionCountdown();
    };

    // MODIFICADO: Função para atualizar a barra de tempo progressiva com lógica de cor ajustada
    function updateProgressiveTimeBar() {
        if (!questionTimeBarFillEl || currentQuestionTimeLeft <=0 ) {
            if (timeBarAnimationId) cancelAnimationFrame(timeBarAnimationId);
            timeBarAnimationId = null;
            if (questionTimeBarFillEl && currentQuestionTimeLeft <=0) {
                 questionTimeBarFillEl.style.width = '0%';
                 questionTimeBarFillEl.style.backgroundColor = `hsl(0, 80%, 50%)`; // Vermelho
            }
            return;
        }

        const totalTimeForQuestionMs = (settings.timePerQuestion || DEFAULT_SETTINGS.timePerQuestion) * 1000;
        const elapsedTime = Date.now() - questionStartTimeForBar;
        const timeRemainingMs = Math.max(0, totalTimeForQuestionMs - elapsedTime);
        const percentageRemaining = (timeRemainingMs / totalTimeForQuestionMs) * 100;

        questionTimeBarFillEl.style.width = percentageRemaining + '%';

        let hue;
        const timeLeftSecondsForColor = timeRemainingMs / 1000;
        const warningTimeThreshold = 10; // Ponto onde a cor DEVE ser amarela
        const criticalTimeThreshold = 5;  // Ponto onde a cor DEVE ser vermelha

        const greenHue = 120;
        const yellowHue = 60;
        const redHue = 0;

        if (timeLeftSecondsForColor > warningTimeThreshold) { // Acima de 10s
            hue = greenHue;
        } else if (timeLeftSecondsForColor > criticalTimeThreshold) { // Entre 10s (inclusive) e > 5s
            // Queremos que em 10s seja amarelo (60) e em 5s seja vermelho (0)
            // (tempo_restante - tempo_critico) / (tempo_aviso - tempo_critico)
            // Quando tempo_restante = 10s, progresso = (10-5)/(10-5) = 1
            // Quando tempo_restante = 5.001s, progresso ~= 0
            const progress = (timeLeftSecondsForColor - criticalTimeThreshold) / (warningTimeThreshold - criticalTimeThreshold);
            hue = redHue + progress * (yellowHue - redHue); // Interpola de vermelho para amarelo
        } else { // 5s ou menos
            hue = redHue; // Vermelho direto
        }

        hue = Math.max(0, Math.min(120, hue));
        questionTimeBarFillEl.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;

        if (timeRemainingMs > 0 && questionTimerInterval) {
            timeBarAnimationId = requestAnimationFrame(updateProgressiveTimeBar);
        } else {
            if (questionTimeBarFillEl) {
                questionTimeBarFillEl.style.width = '0%';
                questionTimeBarFillEl.style.backgroundColor = `hsl(0, 80%, 50%)`;
            }
            timeBarAnimationId = null;
        }
    }


    function startQuestionCountdown() {
        clearInterval(questionTimerInterval);
        clearInterval(flashInterval);
        flashInterval = null;
        if (timeBarAnimationId) {
            cancelAnimationFrame(timeBarAnimationId);
            timeBarAnimationId = null;
        }

        currentQuestionTimeLeft = settings.timePerQuestion || DEFAULT_SETTINGS.timePerQuestion;

        // MODIFICADO: Timer numérico agora mostra tempo total do quiz e tem cor fixa
        if (timerEl) {
            const elapsedTimeTotalQuiz = Math.floor((Date.now() - totalQuizStartTime) / 1000);
            timerEl.textContent = formatTime(elapsedTimeTotalQuiz);
            timerEl.className = 'quiz-timer timer-normal'; // Cor fixa
        }

        if (questionTimeBarContainerEl) questionTimeBarContainerEl.classList.remove('hidden');
        if (questionTimeBarFillEl) {
            questionTimeBarFillEl.style.width = '100%';
            questionTimeBarFillEl.style.backgroundColor = 'hsl(120, 80%, 50%)'; // Verde inicial
            questionStartTimeForBar = Date.now();
            timeBarAnimationId = requestAnimationFrame(updateProgressiveTimeBar);
        }


        if (quizContainer) {
            quizContainer.classList.remove('time-alert-border-pulse-warning');
            quizContainer.classList.remove('time-alert-border-pulse-critical');
            quizContainer.classList.remove('time-alert-flash-effect');
        }

        questionTimerInterval = setInterval(() => {
            currentQuestionTimeLeft--; // Decrementa para lógica interna da pergunta

            // MODIFICADO: Atualiza o timer numérico para mostrar o tempo total do quiz
            if (timerEl) {
                const elapsedTimeTotalQuiz = Math.floor((Date.now() - totalQuizStartTime) / 1000);
                timerEl.textContent = formatTime(elapsedTimeTotalQuiz);
                // A classe do timerEl não muda mais com base no tempo da pergunta
            }

            // Lógica da Borda Pulsante (baseada no currentQuestionTimeLeft)
            if (settings.enableTimeAlertBorderPulse && quizContainer) {
                if (currentQuestionTimeLeft <= 5) {
                    quizContainer.classList.remove('time-alert-border-pulse-warning');
                    quizContainer.classList.add('time-alert-border-pulse-critical');
                } else if (currentQuestionTimeLeft <= 10) {
                    quizContainer.classList.add('time-alert-border-pulse-warning');
                    quizContainer.classList.remove('time-alert-border-pulse-critical');
                } else {
                    quizContainer.classList.remove('time-alert-border-pulse-warning');
                    quizContainer.classList.remove('time-alert-border-pulse-critical');
                }
            } else if (quizContainer) {
                quizContainer.classList.remove('time-alert-border-pulse-warning');
                quizContainer.classList.remove('time-alert-border-pulse-critical');
            }

            // Lógica do Flash na Tela (baseada no currentQuestionTimeLeft)
            if (settings.enableTimeAlertFlash && quizContainer) {
                if (currentQuestionTimeLeft <= 5 && currentQuestionTimeLeft >= 0) {
                    if (!flashInterval) {
                        if (currentQuestionTimeLeft > 0) {
                           quizContainer.classList.add('time-alert-flash-effect');
                            setTimeout(() => {
                                if (quizContainer) quizContainer.classList.remove('time-alert-flash-effect');
                            }, 300);
                        }
                        flashInterval = setInterval(() => {
                            if (currentQuestionTimeLeft <= 0 || currentQuestionTimeLeft > 5) {
                                clearInterval(flashInterval);
                                flashInterval = null;
                                if (quizContainer) quizContainer.classList.remove('time-alert-flash-effect');
                                return;
                            }
                            quizContainer.classList.add('time-alert-flash-effect');
                            setTimeout(() => {
                                if (quizContainer) quizContainer.classList.remove('time-alert-flash-effect');
                            }, 300);
                        }, 700);
                    }
                } else {
                    if (flashInterval) {
                        clearInterval(flashInterval);
                        flashInterval = null;
                        if (quizContainer) quizContainer.classList.remove('time-alert-flash-effect');
                    }
                }
            } else if (quizContainer && flashInterval) {
                clearInterval(flashInterval);
                flashInterval = null;
                quizContainer.classList.remove('time-alert-flash-effect');
            }

            // MODIFICADO: A cor do timerEl não muda mais aqui
            // if (timerEl) {
            //     if (currentQuestionTimeLeft <= 5) {
            //         timerEl.className = 'quiz-timer timer-critical';
            //     } else if (currentQuestionTimeLeft <= 10) {
            //         timerEl.className = 'quiz-timer timer-warning';
            //     } else {
            //         timerEl.className = 'quiz-timer timer-normal';
            //     }
            // }

            if (currentQuestionTimeLeft <= 0) {
                handleQuestionTimeout();
            }
        }, 1000);
    }

    function handleQuestionTimeout() {
        clearInterval(questionTimerInterval);
        questionTimerInterval = null;
        clearInterval(flashInterval);
        flashInterval = null;
        if (timeBarAnimationId) {
            cancelAnimationFrame(timeBarAnimationId);
            timeBarAnimationId = null;
        }
        if (quizContainer) {
            quizContainer.classList.remove('time-alert-border-pulse-warning');
            quizContainer.classList.remove('time-alert-border-pulse-critical');
            quizContainer.classList.remove('time-alert-flash-effect');
        }

        // NOVO: Feedback de tempo esgotado
        if (questionTimeBarContainerEl) questionTimeBarContainerEl.classList.add('hidden');
        if (optionsContainer) optionsContainer.classList.add('options-really-dimmed');
        if (timeOutMessageEl) {
            timeOutMessageEl.textContent = "Tempo Esgotado!"; // Certifique-se que o texto está correto
            timeOutMessageEl.classList.remove('hidden');
        }
        if (postQuestionControlsEl) postQuestionControlsEl.classList.remove('hidden');


        const q = currentQuizQuestions[currentQuestionIndex];
        if (q) {
            playerAttempts.push({
                questionId: q.id,
                questionText: q.text,
                options: [...q.options],
                selectedOptionText: "Tempo esgotado",
                correctOptionIndex: q.correct,
                correctOptionText: q.options[q.correct],
                isCorrect: false
            });
        } else {
            console.warn("handleQuestionTimeout: q é undefined. currentQuestionIndex:", currentQuestionIndex, "currentQuizQuestions.length:", currentQuizQuestions.length);
        }


        Array.from(optionsContainer.children).forEach(child => {
            child.classList.add('disabled');
            if (child.dataset.isCorrect === 'true' && settings.showCorrectAnswerOnWrong) {
                child.classList.add('correct');
            }
        });

        if (nextQuestionBtn) {
            if (currentQuestionIndex >= currentQuizQuestions.length - 1) {
                nextQuestionBtn.textContent = quizCustomizations.texts.quizScreenFinalizeButton || DEFAULT_CUSTOMIZATIONS.texts.quizScreenFinalizeButton;
            } else {
                nextQuestionBtn.textContent = quizCustomizations.texts.quizScreenNextButton || DEFAULT_CUSTOMIZATIONS.texts.quizScreenNextButton;
            }
        }
        if (giveUpBtn) giveUpBtn.classList.add('hidden');
    }


    const handleOptionSelect = (selectedOptionDiv, questionId) => {
        clearInterval(questionTimerInterval);
        questionTimerInterval = null;
        clearInterval(flashInterval);
        flashInterval = null;
        if (timeBarAnimationId) {
            cancelAnimationFrame(timeBarAnimationId);
            timeBarAnimationId = null;
        }
        if (questionTimeBarContainerEl) questionTimeBarContainerEl.classList.add('hidden');
        if (timeOutMessageEl) timeOutMessageEl.classList.add('hidden'); // Garante que a msg de tempo esgotado não apareça

        if (quizContainer) {
            quizContainer.classList.remove('time-alert-border-pulse-warning');
            quizContainer.classList.remove('time-alert-border-pulse-critical');
            quizContainer.classList.remove('time-alert-flash-effect');
        }
        if (!optionsContainer || !nextQuestionBtn) return;
        const isCorrect = selectedOptionDiv.dataset.isCorrect === 'true';
        const q = currentQuizQuestions[currentQuestionIndex];

        playerAttempts.push({
            questionId: questionId,
            questionText: q.text,
            options: [...q.options],
            selectedOptionText: selectedOptionDiv.textContent,
            correctOptionIndex: q.correct,
            correctOptionText: q.options[q.correct],
            isCorrect: isCorrect
        });

        Array.from(optionsContainer.children).forEach(child => {
            child.classList.add('disabled');
            if (child.dataset.isCorrect === 'true') {
                if (!isCorrect && settings.showCorrectAnswerOnWrong) {
                    child.classList.add('correct');
                }
            }
        });
        if (isCorrect) { selectedOptionDiv.classList.add('correct'); score++; }
        else { selectedOptionDiv.classList.add('incorrect'); }

        if (nextQuestionBtn) {
            if (currentQuestionIndex >= currentQuizQuestions.length - 1) {
                nextQuestionBtn.textContent = quizCustomizations.texts.quizScreenFinalizeButton || DEFAULT_CUSTOMIZATIONS.texts.quizScreenFinalizeButton;
            } else {
                nextQuestionBtn.textContent = quizCustomizations.texts.quizScreenNextButton || DEFAULT_CUSTOMIZATIONS.texts.quizScreenNextButton;
            }
        }
        if (postQuestionControlsEl) postQuestionControlsEl.classList.remove('hidden');

        if (giveUpBtn) giveUpBtn.classList.add('hidden');
    };

    const endQuiz = () => {
        clearInterval(questionTimerInterval);
        questionTimerInterval = null;
        clearInterval(flashInterval);
        flashInterval = null;
        if (timeBarAnimationId) {
            cancelAnimationFrame(timeBarAnimationId);
            timeBarAnimationId = null;
        }
        if (quizContainer) {
            quizContainer.classList.remove('time-alert-border-pulse-warning');
            quizContainer.classList.remove('time-alert-border-pulse-critical');
            quizContainer.classList.remove('time-alert-flash-effect');
        }
        if (questionTimeBarContainerEl) questionTimeBarContainerEl.classList.add('hidden');
        if (timeOutMessageEl) timeOutMessageEl.classList.add('hidden');
        if (postQuestionControlsEl) postQuestionControlsEl.classList.add('hidden');
        if (optionsContainer) optionsContainer.classList.remove('options-really-dimmed');

        const totalSeconds = Math.floor((Date.now() - totalQuizStartTime) / 1000);
        currentPlayerTimestamp = new Date().toISOString();

        let currentParticipantsList = getFromLocalStorage('quizParticipants', []);
        currentParticipantsList.push({ name: playerName, phone: playerPhone, score, time: totalSeconds, timestamp: currentPlayerTimestamp, playerAttempts: [...playerAttempts] });
        saveToLocalStorage('quizParticipants', currentParticipantsList);
        participants = currentParticipantsList;

        if (settings.enablePrizeLock && score >= settings.minScoreForPrize) {
            let prizeWinners = getFromLocalStorage(PRIZE_WINNERS_LIST_KEY, []);
            if (!prizeWinners.some(winner => winner.phone === playerPhone)) {
                prizeWinners.push({ phone: playerPhone, timestamp: currentPlayerTimestamp });
                saveToLocalStorage(PRIZE_WINNERS_LIST_KEY, prizeWinners);
            }
        }

        const sortedParticipants = [...participants].sort((a, b) => b.score - a.score || a.time - b.time);
        const currentPlayerRank = sortedParticipants.findIndex(p => p.timestamp === currentPlayerTimestamp) + 1;

        if (resultPlayerNameTitleEl) { resultPlayerNameTitleEl.textContent = playerName + ","; resultPlayerNameTitleEl.classList.remove('hidden'); }
        if (resultTop3CongratsMessageEl) { resultTop3CongratsMessageEl.classList.add('hidden'); resultTop3CongratsMessageEl.textContent = ''; }

        if (currentPlayerRank > 0 && currentPlayerRank <= 3) {
            if (top3ModalMessageContentEl) {
                top3ModalMessageContentEl.innerHTML =
                    `<span class="msg-line-1">Parabéns, <span class="msg-player-name">${playerName}</span>!</span><br>` +
                    `<span class="msg-line-2">Você saneou todas as dúvidas e mostrou um conhecimento cristalino! 💎</span><br>` +
                    `<span class="msg-line-3"><span class="msg-rank-highlight">TOP ${currentPlayerRank}</span> com selo <span class="msg-caesb-highlight">CAESB</span> de aprovação!</span>`;
            }
            showTop3CongratsModal();
        }

        if (resultSummaryDetailsEl) resultSummaryDetailsEl.innerHTML = `<p>Seu Desempenho: <strong>${score}/${currentQuizQuestions.length > 0 ? currentQuizQuestions.length : settings.numberOfQuestions}</strong> acertos</p><p>Tempo: <strong>${formatTime(totalSeconds)}</strong></p><p>Ranking: <strong>${currentPlayerRank > 0 ? currentPlayerRank + 'º lugar' : 'N/A'}</strong></p>`;
        if (resultPrizeMessageEl) {
            if (score >= settings.minScoreForPrize) {
                resultPrizeMessageEl.textContent = quizCustomizations.texts.resultScreenPrizeWon || DEFAULT_CUSTOMIZATIONS.texts.resultScreenPrizeWon;
                resultPrizeMessageEl.className = 'result-message prize-won';
            } else {
                resultPrizeMessageEl.textContent = quizCustomizations.texts.resultScreenPrizeNotWon || DEFAULT_CUSTOMIZATIONS.texts.resultScreenPrizeNotWon;
                resultPrizeMessageEl.className = 'result-message prize-not-won';
            }
            resultPrizeMessageEl.classList.remove('hidden');
        }

        if (showIncorrectAnswersBtnRef) {
            const incorrectAttempts = playerAttempts.filter(attempt => !attempt.isCorrect);
            showIncorrectAnswersBtnRef.classList.toggle('hidden', incorrectAttempts.length === 0);
        }

        if (giveUpBtn) giveUpBtn.classList.add('hidden');
        showScreen('result-screen');
    };

    function handleGiveUp() {
        showConfirm('Tem certeza que deseja desistir do quiz? Seu progresso atual não será salvo.', () => {
            clearInterval(questionTimerInterval);
            questionTimerInterval = null;
            clearInterval(flashInterval);
            flashInterval = null;
            if (timeBarAnimationId) {
                cancelAnimationFrame(timeBarAnimationId);
                timeBarAnimationId = null;
            }
            if (questionTimeBarContainerEl) questionTimeBarContainerEl.classList.add('hidden');
            if (timeOutMessageEl) timeOutMessageEl.classList.add('hidden');
            if (postQuestionControlsEl) postQuestionControlsEl.classList.add('hidden');
            if (optionsContainer) optionsContainer.classList.remove('options-really-dimmed');

            if (quizContainer) {
                quizContainer.classList.remove('time-alert-border-pulse-warning');
                quizContainer.classList.remove('time-alert-border-pulse-critical');
                quizContainer.classList.remove('time-alert-flash-effect');
            }
            if (settings.giveUpLockoutMinutes > 0 && playerPhone) {
                let giveUpLockouts = getFromLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, []);
                giveUpLockouts = giveUpLockouts.filter(lockout => lockout.phone !== playerPhone);
                giveUpLockouts.push({ phone: playerPhone, timestamp: new Date().toISOString() });
                saveToLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, giveUpLockouts);
            }
            if (nomeInput) nomeInput.value = '';
            if (telefoneInput) telefoneInput.value = '';
            showScreen('initial-screen');
        }, 'warning');
    }

    const loadRanking = () => {
        if (!rankingListEl) return;
        rankingListEl.innerHTML = '';
        const displayCount = settings.rankingDisplayCount || DEFAULT_SETTINGS.rankingDisplayCount;
        const currentParticipants = getFromLocalStorage('quizParticipants', []);
        const sorted = currentParticipants.sort((a, b) => b.score - a.score || a.time - b.time).slice(0, displayCount);

        if (sorted.length === 0) { rankingListEl.innerHTML = '<li>Nenhum participante no ranking ainda.</li>'; return; }
        sorted.forEach((p, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${i + 1}. <span class="rank-name">${p.name}</span></span>
                            <span class="rank-score">${p.score} Acertos</span>
                            <span class="rank-time">${formatTime(p.time)}</span>`;
            rankingListEl.appendChild(li);
        });
    };

    function startFadeOut() {
        if (quizContainer && !isFadingToIdle) {
            const activeScreenId = document.querySelector('.screen.active')?.id;
            if (activeScreenId !== 'idle-screen') {
                console.log("startFadeOut: Iniciando esmaecimento...");
                quizContainer.classList.add('fading-to-idle');
                isFadingToIdle = true;
            }
        }
    }

    function resetIdleTimer() {
        const activeScreenId = document.querySelector('.screen.active')?.id;
        if (activeScreenId === 'idle-screen') {
            return;
        }

        clearTimeout(fadeOutTimer);
        clearTimeout(actualIdleTimer);

        if (quizContainer && isFadingToIdle) {
            quizContainer.classList.remove('fading-to-idle');
        }
        isFadingToIdle = false;

        let currentIdleTimeoutSeconds = parseInt(settings.idleTimeoutSeconds, 10) || DEFAULT_SETTINGS.idleTimeoutSeconds;
        let currentFadeOutLeadSeconds = parseInt(settings.fadeOutLeadTimeSeconds, 10) || DEFAULT_SETTINGS.fadeOutLeadTimeSeconds;

        if (currentFadeOutLeadSeconds >= currentIdleTimeoutSeconds) {
            console.warn(`resetIdleTimer: Tempo de esmaecimento (${currentFadeOutLeadSeconds}s) é maior ou igual ao tempo de idle (${currentIdleTimeoutSeconds}s). Ajustando tempo de esmaecimento para ${DEFAULT_SETTINGS.fadeOutLeadTimeSeconds}s.`);
            currentFadeOutLeadSeconds = DEFAULT_SETTINGS.fadeOutLeadTimeSeconds;
            if (currentFadeOutLeadSeconds >= currentIdleTimeoutSeconds) {
                 currentIdleTimeoutSeconds = currentFadeOutLeadSeconds + 15;
                 console.warn(`resetIdleTimer: Ajustando tempo total de idle para ${currentIdleTimeoutSeconds}s para ser maior que o esmaecimento.`);
            }
        }


        const totalIdleMs = currentIdleTimeoutSeconds * 1000;
        const fadeOutLeadMs = currentFadeOutLeadSeconds * 1000;
        const fadeOutStartTimeMs = totalIdleMs - fadeOutLeadMs;


        if (fadeOutStartTimeMs > 0) {
            fadeOutTimer = setTimeout(startFadeOut, fadeOutStartTimeMs);
        } else if (totalIdleMs > 0) {
            startFadeOut();
        }

        if (totalIdleMs > 0) {
            actualIdleTimer = setTimeout(() => {
                if (quizContainer) {
                     quizContainer.classList.remove('fading-to-idle');
                     quizContainer.classList.remove('time-alert-border-pulse-warning');
                     quizContainer.classList.remove('time-alert-border-pulse-critical');
                     quizContainer.classList.remove('time-alert-flash-effect');
                }
                isFadingToIdle = false;
                showScreen('idle-screen');
            }, totalIdleMs);
        } else {
            console.warn("resetIdleTimer: Tempo total de inatividade é zero ou negativo. Não foi possível agendar a tela de descanso.");
        }
    }


    const handleSimulatedScenario = (scenarioName) => {
        let testName, testRank, testScore, testTotalQuestions, testTime, testWonPrize;
        const getTestData = (keySuffix, defaultValue) => localStorage.getItem(`quiz_test_data_${keySuffix}`) ?? defaultValue;
        const clearAllTestData = () => { Object.keys(localStorage).filter(k => k.startsWith('quiz_test_data_')).forEach(k => localStorage.removeItem(k)); };

        const populateResultScreenBasics = (name, scoreVal, totalQVal, timeSecVal, rankVal) => {
            if (resultPlayerNameTitleEl) { resultPlayerNameTitleEl.textContent = name + ","; resultPlayerNameTitleEl.classList.remove('hidden'); }
            if (resultSummaryDetailsEl) resultSummaryDetailsEl.innerHTML = `<p>Seu Desempenho: <strong>${scoreVal}/${totalQVal}</strong> acertos</p><p>Tempo: <strong>${formatTime(timeSecVal)}</strong></p><p>Ranking: <strong>${rankVal > 0 ? rankVal + 'º' : 'N/A'}</strong> lugar</p>`;
        };
        const setPrizeMessage = (won) => {
            if (resultPrizeMessageEl) {
                resultPrizeMessageEl.textContent = won ? (quizCustomizations.texts.resultScreenPrizeWon || DEFAULT_CUSTOMIZATIONS.texts.resultScreenPrizeWon)
                                                     : (quizCustomizations.texts.resultScreenPrizeNotWon || DEFAULT_CUSTOMIZATIONS.texts.resultScreenPrizeNotWon);
                resultPrizeMessageEl.className = `result-message ${won ? 'prize-won' : 'prize-not-won'}`;
                resultPrizeMessageEl.classList.remove('hidden');
            }
        };

        switch (scenarioName) {
            case 'modal_already_won': showWinnerAlreadyModal(new Date().toISOString()); showScreen('initial-screen'); break;
            case 'modal_top3':
                testName = getTestData('name', "Jogador(a) VIP Teste"); testRank = parseInt(getTestData('rank', "1"));
                testTotalQuestions = settings.numberOfQuestions || DEFAULT_SETTINGS.numberOfQuestions;
                populateResultScreenBasics(testName, Math.floor(testTotalQuestions * 0.9), testTotalQuestions, 45, testRank); setPrizeMessage(true);
                if (top3ModalMessageContentEl) top3ModalMessageContentEl.innerHTML = `<span class="msg-line-1">Parabéns, <span class="msg-player-name">${testName}</span>!</span><br>...`;
                showScreen('result-screen'); showTop3CongratsModal(); break;
            case 'modal_incorrect_answers':
                playerAttempts = [ { questionId: 'sim1', questionText: "Cor do céu (Simulada)?", selectedOptionText: "Verde", correctOptionText: "Azul", isCorrect: false }, { questionId: 'sim2', questionText: "2+2 (Simulada)?", selectedOptionText: "5", correctOptionText: "4", isCorrect: false }];
                testTotalQuestions = settings.numberOfQuestions || DEFAULT_SETTINGS.numberOfQuestions;
                populateResultScreenBasics("Teste Gabarito", Math.floor(testTotalQuestions * 0.5), testTotalQuestions, 120, 8); setPrizeMessage(false);
                showScreen('result-screen'); displayIncorrectAnswers(); if (showIncorrectAnswersBtnRef) showIncorrectAnswersBtnRef.classList.remove('hidden'); break;
            case 'result_top1_winner':
                testName = getTestData('name', "Super Campeão Teste"); testScore = parseInt(getTestData('score', (settings.numberOfQuestions || DEFAULT_SETTINGS.numberOfQuestions).toString() )); testTotalQuestions = parseInt(getTestData('total_questions', (settings.numberOfQuestions || DEFAULT_SETTINGS.numberOfQuestions).toString() )); testTime = parseInt(getTestData('time_seconds', "25")); testRank = parseInt(getTestData('rank', "1")); testWonPrize = getTestData('won_prize', 'true') === 'true';
                populateResultScreenBasics(testName, testScore, testTotalQuestions, testTime, testRank); setPrizeMessage(testWonPrize);
                if (top3ModalMessageContentEl) top3ModalMessageContentEl.innerHTML = `<span class="msg-line-1">Parabéns, <span class="msg-player-name">${testName}</span>!</span><br>...`;
                showScreen('result-screen'); showTop3CongratsModal(); if (showIncorrectAnswersBtnRef) showIncorrectAnswersBtnRef.classList.add('hidden'); break;
            case 'result_non_top3_winner':
                testName = getTestData('name', "Bom Jogador Teste"); testScore = parseInt(getTestData('score', (Math.floor((settings.numberOfQuestions || DEFAULT_SETTINGS.numberOfQuestions) * 0.8)).toString() )); testTotalQuestions = parseInt(getTestData('total_questions', (settings.numberOfQuestions || DEFAULT_SETTINGS.numberOfQuestions).toString() )); testTime = parseInt(getTestData('time_seconds', "70")); testRank = parseInt(getTestData('rank', "4")); testWonPrize = getTestData('won_prize', 'true') === 'true';
                populateResultScreenBasics(testName, testScore, testTotalQuestions, testTime, testRank); setPrizeMessage(testWonPrize);
                showScreen('result-screen'); if (showIncorrectAnswersBtnRef) { playerAttempts = [{ questionId: 'sim_err', questionText: "Q Teste Errada", selectedOptionText: "X", correctOptionText: "Y", isCorrect: false }]; showIncorrectAnswersBtnRef.classList.remove('hidden');} break;
            case 'result_loser':
                testName = getTestData('name', "Participante Teste"); testScore = parseInt(getTestData('score', (Math.floor((settings.numberOfQuestions || DEFAULT_SETTINGS.numberOfQuestions) * 0.3)).toString() )); testTotalQuestions = parseInt(getTestData('total_questions', (settings.numberOfQuestions || DEFAULT_SETTINGS.numberOfQuestions).toString() )); testTime = parseInt(getTestData('time_seconds', "90")); testRank = parseInt(getTestData('rank', "15")); testWonPrize = getTestData('won_prize', 'false') === 'true';
                populateResultScreenBasics(testName, testScore, testTotalQuestions, testTime, testRank); setPrizeMessage(testWonPrize);
                showScreen('result-screen'); if (showIncorrectAnswersBtnRef) { playerAttempts = [{ questionId: 'sim_err2', questionText: "Q Teste Errada 2", selectedOptionText: "A", correctOptionText: "B", isCorrect: false }]; showIncorrectAnswersBtnRef.classList.remove('hidden');} break;
        }
        clearAllTestData();
    };

    initializeQuizApp();
});