document.addEventListener('DOMContentLoaded', () => {

    // Chave para o localStorage do Modo Desenvolvedor
    const DEV_MODE_LS_KEY = 'quizAdminDevMode';
    let devModeActive = false; // Estado do Modo Desenvolvedor

    const ADMIN_PASSWORD = "CAESB2025!";
    const QUIZ_EVENT_KEY = 'quizCurrentEvent';
    const QUIZ_CUSTOMIZATIONS_KEY = 'quizThemeCustomizations';

    const screens = document.querySelectorAll('.screen');
    const adminPageContainer = document.querySelector('.admin-page-container');

    let allQuestions = [];
    let participants = [];
    let settings = {};
    let currentEventAdminData = null;
    let quizCustomizations = {};

    const ITEMS_PER_PAGE = 10;

    let currentParticipantsPage = 1;
    let participantsSortKey = 'timestamp';
    let participantsSortDir = 'desc';

    let currentStatsPage = 1;
    let statsSortKey = 'text';
    let statsSortDir = 'asc';

    let isSettingsDirty = false;
    let isCustomizationsDirty = false;
    let isQuestionFormDirty = false;
    let isEventDirty = false;

    let initialSettingsData = '';
    let initialCustomizationsData = '';
    let initialQuestionFormData = '';
    let initialEventData = '';

    let navigationTargetScreen = null;
    let navigationAction = null;

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
        virtualKeyboardHeight: 30,
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

    const CUSTOM_LOGO_FILENAME_KEY = 'quizCustomLogoFileName';
    const DEFAULT_LOGO_SRC = "assets/logo.png";
    const PRIZE_WINNERS_LIST_KEY = 'quizPrizeWinnersData';
    const GIVE_UP_LOCKOUT_LIST_KEY = 'quizGiveUpLockoutData';

    const htmlEl = document.documentElement;
    const fontSizesInPx = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
    let currentFontStepIndex = fontSizesInPx.indexOf(18);
    if (currentFontStepIndex === -1) {
        currentFontStepIndex = fontSizesInPx.indexOf(16) !== -1 ? fontSizesInPx.indexOf(16) : Math.floor(fontSizesInPx.length / 2);
    }

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
        const handler = () => { cleanup(); };
        const onOverlayClick = (event) => { if (event.target === modal) { cleanup(); } };
        okBtn.addEventListener('click', handler);
        modal.addEventListener('click', onOverlayClick);
    }

    function showConfirm(message, callbacks = {}, type = 'default', options = {}) {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const titleEl = document.getElementById('confirm-modal-title');
        const saveProceedBtn = document.getElementById('confirm-save-proceed-btn');
        const discardProceedBtn = document.getElementById('confirm-proceed-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        if (!modal || !msgEl || !saveProceedBtn || !discardProceedBtn || !cancelBtn || !titleEl) {
            console.error("Confirm modal elements not found.");
            if (confirm(message)) { if (typeof callbacks.onSaveAndProceed === 'function') callbacks.onSaveAndProceed(); else if (typeof callbacks.onDiscardAndProceed === 'function') callbacks.onDiscardAndProceed(); }
            else { if (typeof callbacks.onCancel === 'function') callbacks.onCancel(); }
            return;
        }

        titleEl.textContent = options.title || "Confirmação";
        msgEl.textContent = message;

        if (options.showSaveButton) {
            saveProceedBtn.classList.remove('hidden');
            saveProceedBtn.textContent = options.saveButtonText || "Salvar e Sair";
        } else {
            saveProceedBtn.classList.add('hidden');
        }

        discardProceedBtn.textContent = options.discardButtonText || "Sair sem Salvar";
        cancelBtn.textContent = options.cancelButtonText || "Cancelar";

        modal.classList.remove('modal-type-danger', 'modal-type-warning');
        if (type === 'danger') {
            modal.classList.add('modal-type-danger');
            discardProceedBtn.classList.remove('btn-success');
            discardProceedBtn.classList.add('btn-danger');
        } else if (type === 'warning') {
            modal.classList.add('modal-type-warning');
        } else {
            discardProceedBtn.classList.remove('btn-danger');
            discardProceedBtn.classList.add('btn-success');
        }

        modal.classList.remove('hidden');

        const cleanup = () => {
            modal.classList.add('hidden');
            saveProceedBtn.removeEventListener('click', onSave);
            discardProceedBtn.removeEventListener('click', onDiscard);
            cancelBtn.removeEventListener('click', onCancelClick);
            modal.removeEventListener('click', onOverlayClick);
        };

        const onSave = () => { cleanup(); if (typeof callbacks.onSaveAndProceed === 'function') callbacks.onSaveAndProceed(); };
        const onDiscard = () => { cleanup(); if (typeof callbacks.onDiscardAndProceed === 'function') callbacks.onDiscardAndProceed(); };
        const onCancelClick = () => { cleanup(); if (typeof callbacks.onCancel === 'function') callbacks.onCancel(); };
        const onOverlayClick = (event) => { if (event.target === modal) { onCancelClick(); } };

        saveProceedBtn.addEventListener('click', onSave);
        discardProceedBtn.addEventListener('click', onDiscard);
        cancelBtn.addEventListener('click', onCancelClick);
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
            logoEl.onerror = () => { logoEl.src = DEFAULT_LOGO_SRC; const logoStatusMessageEl = document.getElementById('logo-status-message'); if (logoStatusMessageEl && logoFileName) { logoStatusMessageEl.textContent = `Erro: Arquivo '${logoFileName}' não encontrado em 'assets/'. Usando logo padrão.`; logoStatusMessageEl.className = 'status-message error'; } };
        });
        const logoPreviewImg = document.getElementById('logo-preview-img');
        if (logoPreviewImg) { logoPreviewImg.src = logoSrc; logoPreviewImg.onerror = () => { logoPreviewImg.src = DEFAULT_LOGO_SRC; }; }
    };
    const loadCustomLogo = () => { const customLogoFileName = localStorage.getItem(CUSTOM_LOGO_FILENAME_KEY); applyCustomLogo(customLogoFileName); };

    const applyAdminThemeCustomizations = () => {
        const adminBody = document.body;
        const adminBgColor = quizCustomizations.colors.quizMainBackground || DEFAULT_CUSTOMIZATIONS.colors.quizMainBackground;
        adminBody.style.backgroundColor = adminBgColor;
    };

    const applyCustomBackground = () => {
        const currentSettings = getFromLocalStorage('quizSettings', DEFAULT_SETTINGS);
        const currentCustomizations = getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, DEFAULT_CUSTOMIZATIONS);
        const adminBody = document.body;

        if (currentSettings.enableCustomBackground && currentSettings.customBackgroundFileName) {
            const imgPath = `assets/${currentSettings.customBackgroundFileName}`;
            adminBody.style.backgroundImage = `url('${imgPath}')`;
            adminBody.style.backgroundSize = 'cover';
            adminBody.style.backgroundPosition = 'center bottom';
            adminBody.style.backgroundRepeat = 'no-repeat';
            adminBody.style.backgroundColor = '';
        } else {
            adminBody.style.backgroundImage = '';
            adminBody.style.backgroundColor = currentCustomizations.colors.quizMainBackground || DEFAULT_CUSTOMIZATIONS.colors.quizMainBackground;
        }
    };
    const formatTime = (s) => { if (isNaN(s) || s < 0) return "00:00"; return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

    const loadDevModeState = () => {
        devModeActive = localStorage.getItem(DEV_MODE_LS_KEY) === 'true';
        console.log("Modo DEV carregado:", devModeActive);
    };

    const applyDevModeVisuals = () => {
        if (adminPageContainer) {
            if (devModeActive) {
                adminPageContainer.classList.add('admin-dev-mode-active');
            } else {
                adminPageContainer.classList.remove('admin-dev-mode-active');
            }
        }
    };
    loadDevModeState();

    settings = { ...DEFAULT_SETTINGS, ...getFromLocalStorage('quizSettings', DEFAULT_SETTINGS) };
    allQuestions = getFromLocalStorage('quizQuestions', []);
    participants = getFromLocalStorage('quizParticipants', []);
    currentEventAdminData = getFromLocalStorage(QUIZ_EVENT_KEY, null);
    quizCustomizations = getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, DEFAULT_CUSTOMIZATIONS);

    loadCustomLogo();
    applyAdminThemeCustomizations();
    applyCustomBackground();
    applyDevModeVisuals();

    const adminPasswordInput = document.getElementById('admin-password');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminLoginErrorEl = document.getElementById('admin-login-error');
    const adminLogoutIconBtn = document.getElementById('admin-logout-icon-btn');
    const adminDashboardCards = document.querySelectorAll('.admin-dashboard-card');
    const adminBackButtons = document.querySelectorAll('.admin-back-btn');
    const eventNameInput = document.getElementById('event-name-input');
    const eventStartTimeInput = document.getElementById('event-start-time-input');
    const eventEndTimeInput = document.getElementById('event-end-time-input');
    const eventEnableMessageCheckbox = document.getElementById('event-enable-message-checkbox');
    const saveEventBtn = document.getElementById('save-event-btn');
    const clearEventBtn = document.getElementById('clear-event-btn');
    const eventConfigStatusMessageEl = document.getElementById('event-config-status-message');
    const currentEventDisplayEl = document.getElementById('current-event-display');
    const addQuestionFormBtn = document.getElementById('add-question-form-btn');
    const addEditQuestionForm = document.getElementById('add-edit-question-form');
    const editQuestionIdInput = document.getElementById('edit-question-id');
    const questionInput = document.getElementById('question-input');
    const optionInputs = [document.getElementById('option1-input'), document.getElementById('option2-input'), document.getElementById('option3-input'), document.getElementById('option4-input')];
    const questionDifficultyInput = document.getElementById('question-difficulty-input');
    const correctOptionRadios = document.getElementsByName('correct-option');
    const saveQuestionBtn = document.getElementById('save-question-btn');
    const cancelEditQuestionBtn = document.getElementById('cancel-edit-question-btn');
    const questionsListUl = document.getElementById('questions-list');
    const totalQuestionsCountEl = document.getElementById('total-questions-count');
    const searchQuestionsInput = document.getElementById('search-questions-input');
    const exportQuestionsJsonBtn = document.getElementById('export-questions-json-btn');
    const exportQuestionsCsvBtn = document.getElementById('export-questions-csv-btn');
    const importQuestionsFileEl = document.getElementById('import-questions-file');
    const importQuestionsBtn = document.getElementById('import-questions-btn');
    const addQuestionsModeCheckbox = document.getElementById('add-questions-mode-checkbox');
    const questionsImportExportStatusMessageEl = document.getElementById('questions-import-export-status-message');

    const numberOfQuestionsInput = document.getElementById('number-of-questions');
    const timePerQuestionInput = document.getElementById('time-per-question');
    const idleTimeoutSecondsInput = document.getElementById('idle-timeout-seconds');
    const fadeOutLeadTimeSecondsInput = document.getElementById('fade-out-lead-time-seconds');
    const devModeToggleCheckbox = document.getElementById('dev-mode-toggle');
    const difficultyPercentageFacilInput = document.getElementById('difficulty-percentage-facil');
    const difficultyPercentageModeradoInput = document.getElementById('difficulty-percentage-moderado');
    const difficultyPercentageDificilInput = document.getElementById('difficulty-percentage-dificil');
    const difficultyPercentageSumErrorEl = document.getElementById('difficulty-percentage-sum-error');
    const virtualKeyboardHeightInput = document.getElementById('virtual-keyboard-height');
    const enableVirtualKeyboardToggleCheckbox = document.getElementById('enable-virtual-keyboard-toggle');
    const enableTimeAlertBorderPulseToggle = document.getElementById('enable-time-alert-border-pulse-toggle');
    const enableTimeAlertFlashToggle = document.getElementById('enable-time-alert-flash-toggle');


    const minScorePrizeInput = document.getElementById('min-score-prize');
    const showCorrectAnswerCheckbox = document.getElementById('show-correct-answer-on-wrong');
    const rankingDisplayCountInput = document.getElementById('ranking-display-count');
    const enablePrizeLockCheckbox = document.getElementById('enable-prize-lock');
    const clearPrizeWinnersBtn = document.getElementById('clear-prize-winners-btn');
    const giveUpLockoutMinutesInput = document.getElementById('give-up-lockout-minutes');
    const clearGiveUpLockoutBtn = document.getElementById('clear-give-up-lockout-btn');
    const logoFilenameInput = document.getElementById('logo-filename-input');
    const logoPreviewImg = document.getElementById('logo-preview-img');
    const restoreDefaultLogoBtn = document.getElementById('restore-default-logo-btn');
    const logoStatusMessageEl = document.getElementById('logo-status-message');
    const backgroundFilenameInput = document.getElementById('background-filename-input');
    const enableCustomBackgroundCheckbox = document.getElementById('enable-custom-background');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsStatusMessageEl = document.getElementById('settings-status-message');
    const resetSettingButtons = document.querySelectorAll('.btn-reset-setting');

    const filterSectionHeader = document.querySelector('#admin-reports-screen .collapsible-header');
    const filterSectionContent = document.querySelector('#admin-reports-screen .collapsible-content');
    const filterCollapseIcon = document.querySelector('#admin-reports-screen .collapse-icon');

    const searchParticipantsInput = document.getElementById('search-participants-input');
    const filterPeriodRadios = document.querySelectorAll('input[name="report-filter-period"]');
    const filterDaysRangeInput = document.getElementById('filter-days-range');
    const filterPrizeWinnersCheckbox = document.getElementById('filter-prize-winners');
    const participantsTableBody = document.getElementById('participants-table-body');
    const participantsTotalCountEl = document.getElementById('participants-total-count');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const deleteAllParticipantsBtn = document.getElementById('delete-all-participants-btn');

    const participantsPrevPageBtn = document.getElementById('participants-prev-page-btn');
    const participantsNextPageBtn = document.getElementById('participants-next-page-btn');
    const participantsPageInfo = document.getElementById('participants-page-info');

    const avgScoreStatEl = document.getElementById('avg-score-stat');
    const totalParticipationsStatEl = document.getElementById('total-participations-stat');
    const questionStatsTableBodyEl = document.getElementById('question-stats-table-body');
    const noStatsMessageEl = document.getElementById('no-stats-message');

    const statsPrevPageBtn = document.getElementById('stats-prev-page-btn');
    const statsNextPageBtn = document.getElementById('stats-next-page-btn');
    const statsPageInfo = document.getElementById('stats-page-info');

    const exportBackupBtn = document.getElementById('export-backup-btn');
    const importBackupFileEl = document.getElementById('import-backup-file');
    const importBackupBtn = document.getElementById('import-backup-btn');
    const backupStatusMessageEl = document.getElementById('backup-status-message');
    const participantDetailsModal = document.getElementById('participant-details-modal');
    const participantDetailsTitle = document.getElementById('participant-details-title');
    const participantInfoSection = document.getElementById('participant-info-section');
    const participantAnswersList = document.getElementById('participant-answers-list');
    const participantModalActions = document.getElementById('participant-modal-actions');
    const closeParticipantModalBtn = participantDetailsModal?.querySelector('.modal-close-icon-btn');
    const decreaseFontButton = document.getElementById('decrease-font');
    const increaseFontButton = document.getElementById('increase-font');
    const goToQuizBtn = document.getElementById('go-to-quiz-btn');

    const saveCustomizationsBtn = document.getElementById('save-customizations-btn');
    const restoreDefaultCustomizationsBtn = document.getElementById('restore-default-customizations-btn');
    const customizationStatusMessageEl = document.getElementById('customization-status-message');

    // Referências para a nova tela de Dashboard Analítico
    const analyticsPeriodFilter = document.getElementById('analytics-period-filter');
    const kpiTotalParticipations = document.getElementById('kpi-total-participations');
    const kpiAvgScore = document.getElementById('kpi-avg-score');
    const kpiAvgTime = document.getElementById('kpi-avg-time');
    const kpiSuccessRate = document.getElementById('kpi-success-rate');
    const participationsByHourChartEl = document.getElementById('analytics-participations-by-hour-chart');
    const scoreDistributionChartEl = document.getElementById('analytics-score-distribution-chart');
    const topDifficultQuestionsUl = document.getElementById('analytics-top-difficult-questions');
    const topEasyQuestionsUl = document.getElementById('analytics-top-easy-questions');


    const getSettingsFormData = () => JSON.stringify({
        numberOfQuestions: numberOfQuestionsInput.value,
        timePerQuestion: timePerQuestionInput.value,
        idleTimeoutSeconds: idleTimeoutSecondsInput.value,
        fadeOutLeadTimeSeconds: fadeOutLeadTimeSecondsInput.value,
        difficultyPercentages: {
            facil: difficultyPercentageFacilInput.value,
            moderado: difficultyPercentageModeradoInput.value,
            dificil: difficultyPercentageDificilInput.value
        },
        minScoreForPrize: minScorePrizeInput.value,
        showCorrectAnswerOnWrong: showCorrectAnswerCheckbox.checked,
        rankingDisplayCount: rankingDisplayCountInput.value,
        enablePrizeLock: enablePrizeLockCheckbox.checked,
        giveUpLockoutMinutes: giveUpLockoutMinutesInput.value,
        logoFilename: logoFilenameInput.value,
        customBackgroundFileName: backgroundFilenameInput.value,
        enableCustomBackground: enableCustomBackgroundCheckbox.checked,
        virtualKeyboardHeight: virtualKeyboardHeightInput.value,
        enableVirtualKeyboard: enableVirtualKeyboardToggleCheckbox.checked,
        enableTimeAlertBorderPulse: enableTimeAlertBorderPulseToggle.checked,
        enableTimeAlertFlash: enableTimeAlertFlashToggle.checked
    });

    const getCustomizationsFormData = () => {
        const texts = {};
        document.querySelectorAll('#admin-customization-screen [id^="custom-text-"]').forEach(el => texts[el.id.replace('custom-text-', '')] = el.value);
        const colors = {};
        document.querySelectorAll('#admin-customization-screen [id^="custom-color-"]').forEach(el => colors[el.id.replace('custom-color-', '')] = el.value);
        const fontSizes = {};
        document.querySelectorAll('#admin-customization-screen [id^="custom-fontSize-"]').forEach(el => fontSizes[el.id.replace('custom-fontSize-', '')] = el.value);
        return JSON.stringify({ texts, colors, fontSizes });
    };

    const getQuestionFormData = () => JSON.stringify({
        text: questionInput.value,
        options: optionInputs.map(opt => opt.value),
        correct: Array.from(correctOptionRadios).findIndex(r => r.checked),
        difficulty: questionDifficultyInput.value
    });

    const getEventFormData = () => JSON.stringify({
        eventName: eventNameInput.value,
        startTime: eventStartTimeInput.value,
        endTime: eventEndTimeInput.value,
        enableMessage: eventEnableMessageCheckbox.checked
    });

    const checkDirtyState = (section) => {
        switch(section) {
            case 'settings': isSettingsDirty = (getSettingsFormData() !== initialSettingsData); break;
            case 'customizations': isCustomizationsDirty = (getCustomizationsFormData() !== initialCustomizationsData); break;
            case 'question': isQuestionFormDirty = (getQuestionFormData() !== initialQuestionFormData); break;
            case 'event': isEventDirty = (getEventFormData() !== initialEventData); break;
        }
    };

    const resetDirtyFlagAndCaptureState = (section) => {
        switch(section) {
            case 'settings': isSettingsDirty = false; initialSettingsData = getSettingsFormData(); break;
            case 'customizations': isCustomizationsDirty = false; initialCustomizationsData = getCustomizationsFormData(); break;
            case 'question': isQuestionFormDirty = false; initialQuestionFormData = getQuestionFormData(); break;
            case 'event': isEventDirty = false; initialEventData = getEventFormData(); break;
        }
    };

    const showScreen = (screenId, forceNavigation = false) => {
        const activeScreenEl = document.querySelector('.screen.active');
        let currentScreenDirtyFlag = false;
        let currentScreenSaveFunction = null;
        let currentScreenResetDirtyFunction = null;
        let currentScreenName = '';

        if (activeScreenEl) {
            if (activeScreenEl.id === 'admin-settings-screen' && isSettingsDirty) {
                currentScreenDirtyFlag = true;
                currentScreenSaveFunction = saveSettingsHandler;
                currentScreenResetDirtyFunction = () => resetDirtyFlagAndCaptureState('settings');
                currentScreenName = 'Configurações Gerais';
            } else if (activeScreenEl.id === 'admin-customization-screen' && isCustomizationsDirty) {
                currentScreenDirtyFlag = true;
                currentScreenSaveFunction = saveQuizCustomizationsHandler;
                currentScreenResetDirtyFunction = () => resetDirtyFlagAndCaptureState('customizations');
                currentScreenName = 'Personalização do Quiz';
            } else if (activeScreenEl.id === 'admin-questions-screen' && isQuestionFormDirty && !addEditQuestionForm.classList.contains('hidden')) {
                currentScreenDirtyFlag = true;
                currentScreenSaveFunction = saveQuestionHandler;
                currentScreenResetDirtyFunction = () => resetDirtyFlagAndCaptureState('question');
                currentScreenName = 'Formulário de Questão';
            } else if (activeScreenEl.id === 'admin-event-screen' && isEventDirty) {
                currentScreenDirtyFlag = true;
                currentScreenSaveFunction = saveCurrentEventHandler;
                currentScreenResetDirtyFunction = () => resetDirtyFlagAndCaptureState('event');
                currentScreenName = 'Gerenciar Evento';
            }
        }

        if (!forceNavigation && currentScreenDirtyFlag) {
            navigationTargetScreen = screenId;
            navigationAction = 'showScreen';
            showConfirm(
                `Você tem alterações não salvas em "${currentScreenName}". Deseja continuar?`,
                {
                    onSaveAndProceed: () => {
                        if (currentScreenSaveFunction) {
                            const saveSuccessful = currentScreenSaveFunction(true); // Passa true para indicar navegação
                            if (saveSuccessful) {
                                if (currentScreenResetDirtyFunction) currentScreenResetDirtyFunction();
                                proceedWithShowScreen(screenId);
                            }
                        }
                    },
                    onDiscardAndProceed: () => {
                        if (currentScreenResetDirtyFunction) currentScreenResetDirtyFunction();
                        proceedWithShowScreen(screenId);
                    },
                    onCancel: () => {
                        navigationTargetScreen = null;
                        navigationAction = null;
                    }
                },
                'warning',
                {
                    title: "Alterações Não Salvas",
                    showSaveButton: true,
                    saveButtonText: "Salvar e Sair",
                    discardButtonText: "Sair sem Salvar",
                    cancelButtonText: "Cancelar"
                }
            );
            return;
        }

        proceedWithShowScreen(screenId);
    };

    const proceedWithShowScreen = (screenId) => {
        screens.forEach(screen => { screen.style.display = screen.id === screenId ? 'flex' : 'none'; screen.classList.toggle('active', screen.id === screenId); });
        const currentAdminLogoutIconBtn = document.getElementById('admin-logout-icon-btn');
        if (screenId === 'admin-login-screen') {
            const currentAdminLoginErrorEl = document.getElementById('admin-login-error');
            if (currentAdminLoginErrorEl) currentAdminLoginErrorEl.classList.add('hidden');
            if(currentAdminLogoutIconBtn) currentAdminLogoutIconBtn.classList.add('hidden');
        } else {
            if(currentAdminLogoutIconBtn) currentAdminLogoutIconBtn.classList.remove('hidden');
        }

        if (screenId === 'admin-settings-screen') {
            loadAdminSettingsToUI();
            if (devModeToggleCheckbox) devModeToggleCheckbox.checked = devModeActive;
            resetDirtyFlagAndCaptureState('settings');
            if (settingsStatusMessageEl) settingsStatusMessageEl.textContent = '';
            if (logoStatusMessageEl) logoStatusMessageEl.textContent = '';
            loadCustomLogo();
            if (logoFilenameInput) { logoFilenameInput.value = localStorage.getItem(CUSTOM_LOGO_FILENAME_KEY) || ''; }
            if (backgroundFilenameInput) { backgroundFilenameInput.value = settings.customBackgroundFileName || DEFAULT_SETTINGS.customBackgroundFileName; }
            if (enableCustomBackgroundCheckbox) { enableCustomBackgroundCheckbox.checked = settings.enableCustomBackground; }
        }
        else if (screenId === 'admin-customization-screen') { loadAdminCustomizationsToUI(); resetDirtyFlagAndCaptureState('customizations'); if(customizationStatusMessageEl) customizationStatusMessageEl.textContent = ''; }
        else if (screenId === 'admin-questions-screen') { setQuestionFormVisibility(false); loadAdminQuestions(); resetDirtyFlagAndCaptureState('question'); }
        else if (screenId === 'admin-event-screen') { loadCurrentEventToUI(); resetDirtyFlagAndCaptureState('event'); if (eventConfigStatusMessageEl) eventConfigStatusMessageEl.textContent = '';}
        else if (screenId === 'admin-reports-screen') {
            currentParticipantsPage = 1;
            applyFiltersAndRenderParticipants();
            if (filterSectionContent && !filterSectionContent.classList.contains('expanded')) {
                filterSectionContent.style.maxHeight = null;
                if (filterSectionHeader) filterSectionHeader.classList.add('collapsed');
                if (filterCollapseIcon) filterCollapseIcon.textContent = '►';
            } else if (filterSectionContent && filterSectionContent.classList.contains('expanded')) {
                filterSectionContent.style.maxHeight = filterSectionContent.scrollHeight + "px";
                if (filterSectionHeader) filterSectionHeader.classList.remove('collapsed');
                if (filterCollapseIcon) filterCollapseIcon.textContent = '▼';
            }
        }
        else if (screenId === 'admin-backup-screen') { if (backupStatusMessageEl) backupStatusMessageEl.textContent = ''; }
        else if (screenId === 'admin-stats-screen') {
            currentStatsPage = 1;
            loadAdminStats();
        }
        else if (screenId === 'admin-analytics-screen') {
            renderAnalyticsDashboard();
        }
        navigationTargetScreen = null;
        navigationAction = null;
    };

    function loadCurrentEventToUI() {
        currentEventAdminData = getFromLocalStorage(QUIZ_EVENT_KEY, null);
        if (currentEventAdminData) {
            if (eventNameInput) eventNameInput.value = currentEventAdminData.eventName || '';
            if (eventStartTimeInput) eventStartTimeInput.value = currentEventAdminData.startTime || '';
            if (eventEndTimeInput) eventEndTimeInput.value = currentEventAdminData.endTime || '';
            if (eventEnableMessageCheckbox) eventEnableMessageCheckbox.checked = typeof currentEventAdminData.enableOutOfPeriodMessage === 'boolean' ? currentEventAdminData.enableOutOfPeriodMessage : true;
            if (currentEventDisplayEl) {
                currentEventDisplayEl.innerHTML = `
                    <p><strong>Nome:</strong> ${currentEventAdminData.eventName || '<em>Não definido</em>'}</p>
                    <p><strong>Início:</strong> ${currentEventAdminData.startTime ? new Date(currentEventAdminData.startTime).toLocaleString('pt-BR') : '<em>Não definido</em>'}</p>
                    <p><strong>Fim:</strong> ${currentEventAdminData.endTime ? new Date(currentEventAdminData.endTime).toLocaleString('pt-BR') : '<em>Não definido</em>'}</p>
                    <p><strong>Mensagens de Período Ativas:</strong> ${currentEventAdminData.enableOutOfPeriodMessage ? 'Sim' : 'Não'}</p>
                `;
            }
        } else {
            if (eventNameInput) eventNameInput.value = '';
            if (eventStartTimeInput) eventStartTimeInput.value = '';
            if (eventEndTimeInput) eventEndTimeInput.value = '';
            if (eventEnableMessageCheckbox) eventEnableMessageCheckbox.checked = false;
            if (currentEventDisplayEl) currentEventDisplayEl.innerHTML = '<p>Nenhum evento configurado.</p>';
        }
        initialEventData = getEventFormData();
        isEventDirty = false;
    }

    function saveCurrentEventHandler(isNavigating = false) {
        const eventName = eventNameInput.value.trim();
        const startTime = eventStartTimeInput.value;
        const endTime = eventEndTimeInput.value;
        const enableMessage = eventEnableMessageCheckbox.checked;
        if (!startTime || !endTime) { showAlert('As datas de início e fim do evento são obrigatórias.', 'warning'); if (eventConfigStatusMessageEl) { eventConfigStatusMessageEl.textContent = 'Datas de início e fim são obrigatórias.'; eventConfigStatusMessageEl.className = 'status-message error'; } return false; }
        if (new Date(endTime) <= new Date(startTime)) { showAlert('A data de fim deve ser posterior à data de início.', 'warning'); if (eventConfigStatusMessageEl) { eventConfigStatusMessageEl.textContent = 'Data de fim deve ser posterior à de início.'; eventConfigStatusMessageEl.className = 'status-message error'; } return false; }
        const eventData = { eventName: eventName, startTime: startTime, endTime: endTime, enableOutOfPeriodMessage: enableMessage };
        saveToLocalStorage(QUIZ_EVENT_KEY, eventData);
        currentEventAdminData = eventData;
        resetDirtyFlagAndCaptureState('event');
        loadCurrentEventToUI();
        if (!isNavigating && eventConfigStatusMessageEl) {
            eventConfigStatusMessageEl.textContent = 'Evento salvo com sucesso!';
            eventConfigStatusMessageEl.className = 'status-message success';
            setTimeout(() => { if(eventConfigStatusMessageEl) eventConfigStatusMessageEl.textContent = ''; }, 3000);
        }
        return true;
    }

    function clearCurrentEvent() {
        showConfirm('Tem certeza que deseja limpar e desativar o evento atual? O quiz voltará a funcionar sem restrições de período.',
        {
            onDiscardAndProceed: () => {
                localStorage.removeItem(QUIZ_EVENT_KEY);
                currentEventAdminData = null;
                resetDirtyFlagAndCaptureState('event');
                loadCurrentEventToUI();
                if (eventConfigStatusMessageEl) { eventConfigStatusMessageEl.textContent = 'Evento limpo/desativado.'; eventConfigStatusMessageEl.className = 'status-message'; setTimeout(() => { if(eventConfigStatusMessageEl) eventConfigStatusMessageEl.textContent = ''; }, 3000); }
            }
        }, 'warning', { discardButtonText: "Sim, Limpar" });
    }

    function setQuestionFormVisibility(showForm) {
        if (addEditQuestionForm && addQuestionFormBtn) {
            if (showForm) {
                addEditQuestionForm.classList.remove('hidden'); addEditQuestionForm.style.display = 'block';
                addQuestionFormBtn.classList.add('hidden');
                if (editQuestionIdInput && !editQuestionIdInput.value) {
                    if (questionInput) questionInput.value = '';
                    optionInputs.forEach(input => { if (input) input.value = ''; });
                    if (correctOptionRadios && correctOptionRadios.length > 0) correctOptionRadios[0].checked = true;
                    if (questionDifficultyInput) questionDifficultyInput.value = 'facil';
                }
                initialQuestionFormData = getQuestionFormData();
                isQuestionFormDirty = false;
                setTimeout(() => { if (addEditQuestionForm && typeof addEditQuestionForm.scrollIntoView === 'function') { addEditQuestionForm.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 50);
            } else {
                addEditQuestionForm.classList.add('hidden'); addEditQuestionForm.style.display = 'none';
                addQuestionFormBtn.classList.remove('hidden'); addQuestionFormBtn.style.display = 'block';
                if (editQuestionIdInput) editQuestionIdInput.value = '';
                isQuestionFormDirty = false;
            }
        }
    }

    function loadAdminSettingsToUI() {
        settings = { ...DEFAULT_SETTINGS, ...getFromLocalStorage('quizSettings', DEFAULT_SETTINGS) };
        if (numberOfQuestionsInput) numberOfQuestionsInput.value = settings.numberOfQuestions;
        if (timePerQuestionInput) timePerQuestionInput.value = settings.timePerQuestion;
        if (idleTimeoutSecondsInput) idleTimeoutSecondsInput.value = settings.idleTimeoutSeconds;
        if (fadeOutLeadTimeSecondsInput) fadeOutLeadTimeSecondsInput.value = settings.fadeOutLeadTimeSeconds;
        if (devModeToggleCheckbox) devModeToggleCheckbox.checked = devModeActive;
        if (difficultyPercentageFacilInput) difficultyPercentageFacilInput.value = settings.difficultyPercentages.facil;
        if (difficultyPercentageModeradoInput) difficultyPercentageModeradoInput.value = settings.difficultyPercentages.moderado;
        if (difficultyPercentageDificilInput) difficultyPercentageDificilInput.value = settings.difficultyPercentages.dificil;
        if (minScorePrizeInput) minScorePrizeInput.value = settings.minScoreForPrize;
        if (showCorrectAnswerCheckbox) showCorrectAnswerCheckbox.checked = settings.showCorrectAnswerOnWrong;
        if (rankingDisplayCountInput) rankingDisplayCountInput.value = settings.rankingDisplayCount;
        if (enablePrizeLockCheckbox) enablePrizeLockCheckbox.checked = settings.enablePrizeLock;
        if (backgroundFilenameInput) backgroundFilenameInput.value = settings.customBackgroundFileName;
        if (enableCustomBackgroundCheckbox) enableCustomBackgroundCheckbox.checked = settings.enableCustomBackground;
        if (giveUpLockoutMinutesInput) giveUpLockoutMinutesInput.value = settings.giveUpLockoutMinutes;
        const customLogoFileName = localStorage.getItem(CUSTOM_LOGO_FILENAME_KEY);
        if (logoFilenameInput) logoFilenameInput.value = customLogoFileName || '';
        applyCustomLogo(customLogoFileName);
        if (virtualKeyboardHeightInput) virtualKeyboardHeightInput.value = settings.virtualKeyboardHeight;
        if (enableVirtualKeyboardToggleCheckbox) enableVirtualKeyboardToggleCheckbox.checked = settings.enableVirtualKeyboard;
        if (enableTimeAlertBorderPulseToggle) enableTimeAlertBorderPulseToggle.checked = settings.enableTimeAlertBorderPulse;
        if (enableTimeAlertFlashToggle) enableTimeAlertFlashToggle.checked = settings.enableTimeAlertFlash;
        initialSettingsData = getSettingsFormData();
        isSettingsDirty = false;
    }

    function loadAdminQuestions() {
        if (!questionsListUl || !totalQuestionsCountEl) return;
        allQuestions = getFromLocalStorage('quizQuestions', []);
        const searchTerm = searchQuestionsInput ? searchQuestionsInput.value.toLowerCase() : "";
        const filteredQuestions = searchTerm ? allQuestions.filter(q => q.text.toLowerCase().includes(searchTerm)) : allQuestions;

        questionsListUl.innerHTML = '';
        totalQuestionsCountEl.textContent = filteredQuestions.length;

        if (filteredQuestions.length === 0) {
            questionsListUl.innerHTML = `<li>Nenhuma questão ${searchTerm ? 'encontrada com o termo "' + searchTerm + '"' : 'cadastrada'}.</li>`;
            return;
        }

        filteredQuestions.forEach((q) => {
            const originalIndex = allQuestions.findIndex(aq => aq.id === q.id);
            const li = document.createElement('li');
            li.classList.toggle('disabled-question', q.isDisabled === true);

            const toggleBtnText = q.isDisabled ? 'Habilitar' : 'Desabilitar';
            const toggleBtnClass = q.isDisabled ? 'enabled-q' : 'disabled-q';
            const difficultyText = q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : 'N/A';

            li.innerHTML = `
                <span class="question-number">${originalIndex + 1}. </span>
                <span class="question-item-text">${q.text.substring(0, 60)}${q.text.length > 60 ? '...' : ''}</span>
                <span class="question-item-difficulty difficulty-${q.difficulty || 'na'}">${difficultyText}</span>
                <div class="actions">
                    <button class="btn-toggle-q-status ${toggleBtnClass}" data-id="${q.id}" aria-label="${toggleBtnText} questão ${q.id}">${toggleBtnText}</button>
                    <button class="edit-q-btn" data-id="${q.id}" aria-label="Editar questão ${q.id}">Editar</button>
                    <button class="delete-q-btn" data-id="${q.id}" aria-label="Excluir questão ${q.id}">Excluir</button>
                </div>`;
            questionsListUl.appendChild(li);
        });

        questionsListUl.querySelectorAll('.edit-q-btn').forEach(b => b.addEventListener('click', e => handleEditQuestion(e.target.dataset.id)));
        questionsListUl.querySelectorAll('.delete-q-btn').forEach(b => b.addEventListener('click', e => handleDeleteQuestion(e.target.dataset.id)));
        questionsListUl.querySelectorAll('.btn-toggle-q-status').forEach(b => b.addEventListener('click', e => toggleQuestionDisabledState(e.target.dataset.id, 'admin-questions-screen')));
    }

    function toggleQuestionDisabledState(questionId, sourceScreenId = null) {
        allQuestions = getFromLocalStorage('quizQuestions', []);
        const questionIndex = allQuestions.findIndex(q => q.id === questionId);
        if (questionIndex > -1) {
            allQuestions[questionIndex].isDisabled = !allQuestions[questionIndex].isDisabled;
            saveToLocalStorage('quizQuestions', allQuestions);

            const currentScreenId = document.querySelector('.screen.active')?.id;

            if (sourceScreenId === 'admin-questions-screen' && currentScreenId === 'admin-questions-screen') {
                loadAdminQuestions();
            } else if (sourceScreenId === 'admin-stats-screen' && currentScreenId === 'admin-stats-screen') {
                loadAdminStats();
            } else {
                if (currentScreenId === 'admin-questions-screen') loadAdminQuestions();
                if (currentScreenId === 'admin-stats-screen') loadAdminStats();
            }
            showAlert(`Questão ${allQuestions[questionIndex].isDisabled ? 'desabilitada' : 'habilitada'} com sucesso.`);
        } else {
            showAlert('Erro: Questão não encontrada.', 'warning');
        }
    }


    function sortData(dataArray, key, direction) {
        return [...dataArray].sort((a, b) => {
            let valA = a[key];
            let valB = b[key];

            if (key === 'score' || key === 'time' || key === 'total' || key === 'correct' || key === 'incorrect') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            } else if (key === 'timestamp') {
                valA = new Date(valA).getTime() || 0;
                valB = new Date(valB).getTime() || 0;
            } else if (key === 'accuracy') {
                valA = parseFloat(a.total > 0 ? (a.correct / a.total) * 100 : -1) ;
                valB = parseFloat(b.total > 0 ? (b.correct / b.total) * 100 : -1) ;
                 if (isNaN(valA)) valA = -1;
                 if (isNaN(valB)) valB = -1;
            } else {
                valA = String(valA ?? '').toLowerCase();
                valB = String(valB ?? '').toLowerCase();
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function updateSortIcons(tableId, currentKey, currentDir) {
        const tableHeaders = document.querySelectorAll(`#${tableId} th[data-sort-key]`);
        tableHeaders.forEach(th => {
            const iconSpan = th.querySelector('.sort-icon');
            if (iconSpan) {
                if (th.dataset.sortKey === currentKey) {
                    iconSpan.textContent = currentDir === 'asc' ? '▲' : '▼';
                } else {
                    iconSpan.textContent = '';
                }
            }
        });
    }

    function applyFiltersAndRenderParticipants() {
        if (!participantsTableBody) return;
        let localParticipants = getFromLocalStorage('quizParticipants', []);
        const prizeWinnersList = getFromLocalStorage(PRIZE_WINNERS_LIST_KEY, []);
        const searchTerm = searchParticipantsInput ? searchParticipantsInput.value.toLowerCase() : "";
        let filterPeriod = 'all';
        if (filterPeriodRadios) filterPeriodRadios.forEach(radio => { if (radio.checked) filterPeriod = radio.value; });
        const filterDays = filterDaysRangeInput ? parseInt(filterDaysRangeInput.value) || 0 : 0;
        const onlyPrizeWinners = filterPrizeWinnersCheckbox ? filterPrizeWinnersCheckbox.checked : false;

        let filteredData = localParticipants;
        if (filterPeriod === 'today') { const today = new Date().toISOString().split('T')[0]; filteredData = filteredData.filter(p => p.timestamp?.startsWith(today)); }
        else if (filterPeriod === 'range' && filterDays > 0) { const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - filterDays); cutoff.setHours(0, 0, 0, 0); filteredData = filteredData.filter(p => new Date(p.timestamp) >= cutoff); }
        if (onlyPrizeWinners) { filteredData = filteredData.filter(p => prizeWinnersList.some(winner => winner.phone === p.phone)); }
        if (searchTerm) { filteredData = filteredData.filter(p => (p.name && p.name.toLowerCase().includes(searchTerm)) || (p.phone && p.phone.toLowerCase().includes(searchTerm))); }

        const sortedData = sortData(filteredData, participantsSortKey, participantsSortDir);

        const totalItems = sortedData.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
        currentParticipantsPage = Math.max(1, Math.min(currentParticipantsPage, totalPages));

        const startIndex = (currentParticipantsPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedData = sortedData.slice(startIndex, endIndex);

        renderParticipantsTable(paginatedData, prizeWinnersList, startIndex);
        updatePaginationControls('participants', currentParticipantsPage, totalPages);
        updateSortIcons('participants-table', participantsSortKey, participantsSortDir);
    }

    function renderParticipantsTable(participantsToRender, prizeWinnersList, globalStartIndex = 0) {
        if (participantsTotalCountEl) {
            const allLocalParticipants = getFromLocalStorage('quizParticipants', []);
            participantsTotalCountEl.textContent = allLocalParticipants.length;
        }
        if (!participantsTableBody) return;
        participantsTableBody.innerHTML = '';
        if (participantsToRender.length === 0) {
            const colCount = document.querySelector('#participants-table thead tr')?.cells.length || 7;
            participantsTableBody.innerHTML = `<tr><td colspan="${colCount}">Nenhum participante encontrado com os filtros atuais.</td></tr>`;
            return;
        }
        participantsToRender.forEach((p, index) => {
            const row = participantsTableBody.insertRow();
            row.dataset.timestamp = p.timestamp;
            row.classList.add('participant-row');
            row.insertCell().textContent = globalStartIndex + index + 1;
            const nameCell = row.insertCell(); nameCell.textContent = p.name || 'N/A'; nameCell.classList.add('participant-name-cell');
            row.insertCell().textContent = p.phone || 'N/A';
            row.insertCell().textContent = (typeof p.score === 'number') ? p.score : 'N/A';
            row.insertCell().textContent = (typeof p.time === 'number') ? formatTime(p.time) : 'N/A';
            const wonPrize = prizeWinnersList.some(winner => winner.phone === p.phone && p.score >= settings.minScoreForPrize);
            const prizeCell = row.insertCell(); prizeCell.innerHTML = wonPrize ? '<span class="prize-icon">🏆</span>' : '—'; prizeCell.classList.add('text-center');
            row.insertCell().textContent = p.timestamp ? new Date(p.timestamp).toLocaleString('pt-BR') : 'N/A';
            row.addEventListener('click', () => showParticipantDetails(p.timestamp));
        });
    }

    function updatePaginationControls(type, currentPage, totalPages) {
        const prevBtn = document.getElementById(`${type}-prev-page-btn`);
        const nextBtn = document.getElementById(`${type}-next-page-btn`);
        const pageInfoEl = document.getElementById(`${type}-page-info`);

        if (pageInfoEl) pageInfoEl.textContent = `Página ${currentPage} de ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    }

    function showParticipantDetails(timestamp) {
        const allLocalParticipants = getFromLocalStorage('quizParticipants', []);
        const participant = allLocalParticipants.find(p => p.timestamp === timestamp);
        if (!participant || !participantDetailsModal) return;
        if(participantDetailsTitle) participantDetailsTitle.textContent = participant.name || "Detalhes do Participante";
        const allSorted = [...allLocalParticipants].sort((a, b) => b.score - a.score || a.time - b.time);
        const rank = allSorted.findIndex(p => p.timestamp === timestamp) + 1;
        if(participantInfoSection) {
            participantInfoSection.innerHTML = `
                <p><strong>Telefone:</strong> ${participant.phone || 'N/A'}</p>
                <p><strong>Data:</strong> ${new Date(participant.timestamp).toLocaleString('pt-BR')}</p>
                <p><strong>Pontuação:</strong> ${participant.score} acertos</p>
                <p><strong>Tempo:</strong> ${formatTime(participant.time)}</p>
                <p><strong>Ranking na Ocasião:</strong> ${rank > 0 ? `${rank}º` : 'N/A'}</p>
            `;
        }
        if(participantAnswersList) {
            participantAnswersList.innerHTML = '';
            if (participant.playerAttempts && participant.playerAttempts.length > 0) {
                participant.playerAttempts.forEach(attempt => {
                    const itemDiv = document.createElement('div'); itemDiv.classList.add('question-review-item'); const isCorrect = attempt.isCorrect;
                    itemDiv.innerHTML = `<h4>${attempt.questionText}</h4><p class="user-answer ${isCorrect ? 'correct-text' : 'incorrect-text'}">Sua resposta: ${attempt.selectedOptionText} ${isCorrect ? '✔️' : '❌'}</p>${!isCorrect ? `<p class="correct-answer-review">Resposta correta: ${attempt.correctOptionText}</p>` : ''}`;
                    participantAnswersList.appendChild(itemDiv);
                });
            } else { participantAnswersList.innerHTML = '<p>Não há detalhes de respostas disponíveis para esta participação.</p>'; }
        }
        if(participantModalActions) {
            participantModalActions.innerHTML = '';
            const prizeWinners = getFromLocalStorage(PRIZE_WINNERS_LIST_KEY, []);
            if (prizeWinners.some(winner => winner.phone === participant.phone)) { const unpremBtn = document.createElement('button'); unpremBtn.textContent = 'Despremiar'; unpremBtn.className = 'btn-secondary btn-warning'; unpremBtn.onclick = () => { showConfirm(`Tem certeza que deseja remover o prêmio de ${participant.name}? Ele(a) poderá jogar para ganhar novamente.`, { onDiscardAndProceed: () => { removePrizeWinner(participant.phone); closeParticipantDetailsModal(); } }, 'warning', { discardButtonText: "Sim, Despremiar" }); }; participantModalActions.appendChild(unpremBtn); }
            const giveUpLockouts = getFromLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, []);
            if (giveUpLockouts.some(lockout => lockout.phone === participant.phone)) { const unlockBtn = document.createElement('button'); unlockBtn.textContent = 'Destravar (Desistência)'; unlockBtn.className = 'btn-secondary'; unlockBtn.onclick = () => { showConfirm(`Tem certeza que deseja destravar ${participant.name}? Ele(a) poderá jogar novamente imediatamente.`, { onDiscardAndProceed: () => { removeGiveUpLock(participant.phone); closeParticipantDetailsModal(); } }, 'warning', { discardButtonText: "Sim, Destravar" }); }; participantModalActions.appendChild(unlockBtn); }
            const deleteBtn = document.createElement('button'); deleteBtn.textContent = 'Excluir Participante'; deleteBtn.className = 'btn btn-danger'; deleteBtn.onclick = () => { showConfirm(`Tem certeza que deseja excluir permanentemente o registro de ${participant.name}?`, { onDiscardAndProceed: () => { handleDeleteParticipant(participant.timestamp); closeParticipantDetailsModal(); } }, 'danger', { discardButtonText: "Sim, Excluir" }); }; participantModalActions.appendChild(deleteBtn);
        }
        participantDetailsModal.classList.remove('hidden');
    }

    function closeParticipantDetailsModal() { if(participantDetailsModal) participantDetailsModal.classList.add('hidden'); }
    function removePrizeWinner(phone) { let prizeWinners = getFromLocalStorage(PRIZE_WINNERS_LIST_KEY, []); prizeWinners = prizeWinners.filter(winner => winner.phone !== phone); saveToLocalStorage(PRIZE_WINNERS_LIST_KEY, prizeWinners); showAlert('Participante removido da lista de premiados com sucesso!'); applyFiltersAndRenderParticipants(); }
    function removeGiveUpLock(phone) { let giveUpLockouts = getFromLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, []); giveUpLockouts = giveUpLockouts.filter(lockout => lockout.phone !== phone); saveToLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, giveUpLockouts); showAlert('Participante destravado com sucesso!');}
    function handleDeleteParticipant(participantTimestamp) { if (!participantTimestamp) return; participants = getFromLocalStorage('quizParticipants', []); participants = participants.filter(p => p.timestamp !== participantTimestamp); saveToLocalStorage('quizParticipants', participants); applyFiltersAndRenderParticipants(); showAlert('Participante excluído com sucesso.'); }
    function handleDeleteAllParticipants() { showConfirm('Tem certeza que deseja excluir TODOS os participantes? Esta ação não pode ser desfeita.', { onDiscardAndProceed: () => { participants = []; saveToLocalStorage('quizParticipants', []); currentParticipantsPage = 1; applyFiltersAndRenderParticipants(); showAlert('Todos os participantes foram excluídos.'); } }, 'danger', { discardButtonText: "Sim, Excluir Todos" }); }
    function clearGiveUpLockoutData() { showConfirm('Tem certeza que deseja limpar a lista de bloqueio por desistência? Isso permitirá que todos os jogadores que desistiram possam jogar novamente imediatamente.', { onDiscardAndProceed: () => { localStorage.removeItem(GIVE_UP_LOCKOUT_LIST_KEY); if (settingsStatusMessageEl) { settingsStatusMessageEl.textContent = 'Lista de bloqueio por desistência foi limpa!'; settingsStatusMessageEl.className = 'status-message success'; setTimeout(() => { if (settingsStatusMessageEl.textContent.includes('desistência')) settingsStatusMessageEl.textContent = ''; }, 3000); } } }, 'warning', { discardButtonText: "Sim, Limpar" }); }

    function handleEditQuestion(id) {
        allQuestions = getFromLocalStorage('quizQuestions', []);
        if (!questionInput || !optionInputs.every(i => i) || !correctOptionRadios || !editQuestionIdInput || !questionDifficultyInput) return;
        const questionToEdit = allQuestions.find(q => q.id === id); if (!questionToEdit) return;
        editQuestionIdInput.value = questionToEdit.id;
        questionInput.value = questionToEdit.text;
        questionDifficultyInput.value = questionToEdit.difficulty || 'facil';
        const options = questionToEdit.options || [];
        optionInputs.forEach((input, index) => { if (input) input.value = options[index] || ''; });
        if (correctOptionRadios && correctOptionRadios.length > 0) { Array.from(correctOptionRadios).forEach(radio => radio.checked = false); if (typeof questionToEdit.correct === 'number' && questionToEdit.correct >= 0 && questionToEdit.correct < options.length && questionToEdit.correct < correctOptionRadios.length) { correctOptionRadios[questionToEdit.correct].checked = true; } else { if (options.length > 0 && correctOptionRadios.length > 0) { correctOptionRadios[0].checked = true; }}}
        setQuestionFormVisibility(true);
    }

    function saveQuestionHandler(isNavigating = false) {
        allQuestions = getFromLocalStorage('quizQuestions', []);
        if (!questionInput || !editQuestionIdInput || !optionInputs.every(i => i) || !correctOptionRadios || !questionDifficultyInput) return false;
        const questionText = questionInput.value.trim();
        const options = optionInputs.map(input => input.value.trim()).filter(opt => opt !== "");
        const difficulty = questionDifficultyInput.value;

        if (!questionText) { showAlert('O texto da pergunta não pode estar vazio.'); return false; }
        if (options.length < 2) { showAlert('A questão deve ter pelo menos duas opções preenchidas.'); return false; }
        let originallyCheckedRadioIndex = Array.from(correctOptionRadios).findIndex(r => r.checked);
        let correctOptionText = '';
        if (originallyCheckedRadioIndex !== -1 && optionInputs[originallyCheckedRadioIndex]) { correctOptionText = optionInputs[originallyCheckedRadioIndex].value.trim(); }
        let correctOptionIndex = options.indexOf(correctOptionText);
        if (correctOptionIndex === -1 && options.length > 0) { showAlert('A opção correta selecionada é inválida ou foi removida por estar vazia. A primeira opção válida será marcada como correta.'); correctOptionIndex = 0; }

        const currentEditId = editQuestionIdInput.value;
        if (currentEditId) {
            const questionIndex = allQuestions.findIndex(q => q.id === currentEditId);
            if (questionIndex > -1) {
                allQuestions[questionIndex].text = questionText;
                allQuestions[questionIndex].options = options;
                allQuestions[questionIndex].correct = correctOptionIndex;
                allQuestions[questionIndex].difficulty = difficulty;
            } else {
                console.error("Error: Question to edit not found with ID:", currentEditId); return false;
            }
        } else {
            const newQuestion = {
                id: `q${Date.now()}`,
                text: questionText,
                options: options,
                correct: correctOptionIndex,
                isDisabled: false,
                difficulty: difficulty
            };
            allQuestions.push(newQuestion);
        }
        saveToLocalStorage('quizQuestions', allQuestions);
        resetDirtyFlagAndCaptureState('question');
        loadAdminQuestions();
        setQuestionFormVisibility(false);
        if (!isNavigating) showAlert(currentEditId ? 'Questão atualizada com sucesso!' : 'Nova questão salva com sucesso!');
        return true;
    }

    function handleDeleteQuestion(id) {
        showConfirm('Excluir esta questão?',
        {
            onDiscardAndProceed: () => {
                allQuestions = getFromLocalStorage('quizQuestions', []);
                allQuestions = allQuestions.filter(q => q.id !== id);
                saveToLocalStorage('quizQuestions', allQuestions);
                loadAdminQuestions();
                loadAdminStats();
                showAlert('Questão excluída.');
            }
        }, 'danger', { discardButtonText: "Sim, Excluir" });
    }

    function exportData(data, filename, type) {
        const isEmptyData = (!data || (Array.isArray(data) && data.length === 0) && (typeof data !== 'object' || Object.keys(data).length === 0) );
        if (type !== 'backup' && isEmptyData) { showAlert(`Não há dados para exportar.`); return; }
        if (type === 'backup' && isEmptyData) { if (backupStatusMessageEl) { backupStatusMessageEl.textContent = 'Não há dados para exportar no backup.'; backupStatusMessageEl.className = 'status-message error'; } else { showAlert("Não há dados para exportar no backup."); } return; }
         if (type === 'backup' && (!data.quizQuestions?.length && !data.quizParticipants?.length && !data.quizSettings && !data[QUIZ_EVENT_KEY] && !data[CUSTOM_LOGO_FILENAME_KEY] && !data[GIVE_UP_LOCKOUT_LIST_KEY]?.length && !data[PRIZE_WINNERS_LIST_KEY]?.length && !data[QUIZ_CUSTOMIZATIONS_KEY])) { if (backupStatusMessageEl) { backupStatusMessageEl.textContent = 'Não há dados significativos para exportar no backup.'; backupStatusMessageEl.className = 'status-message error'; } else { showAlert("Não há dados significativos para exportar no backup."); } return; }
        let dataString = ''; let mimeType = '';
        if (type === 'backup' || type.startsWith('json_')) { dataString = JSON.stringify(data, null, 2); mimeType = 'application/json;charset=utf-8;'; }
        else if (type.startsWith('csv_')) { if (!Array.isArray(data) || data.length === 0) { showAlert(`Não há dados para exportar em CSV.`); return; } const headers = Object.keys(data[0]); const csvRows = [ headers.join(','), ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName], (key, value) => value === undefined ? '' : value)).join(',')) ]; dataString = "\uFEFF" + csvRows.join('\r\n'); mimeType = 'text/csv;charset=utf-8;'; }
        else { console.error("Tipo de exportação desconhecido:", type); return; }
        const blob = new Blob([dataString], { type: mimeType }); const link = document.createElement('a');
        if (link.download !== undefined) { const url = URL.createObjectURL(blob); link.setAttribute('href', url); link.setAttribute('download', filename); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
            if (type === 'backup' && backupStatusMessageEl) { backupStatusMessageEl.textContent = 'Backup exportado com sucesso!'; backupStatusMessageEl.className = 'status-message success'; }
            else if (type.includes('questions') && questionsImportExportStatusMessageEl) { questionsImportExportStatusMessageEl.textContent = `Questões exportadas para ${type.split('_')[0].toUpperCase()} com sucesso!`; questionsImportExportStatusMessageEl.className = 'status-message success'; setTimeout(() => { if(questionsImportExportStatusMessageEl) questionsImportExportStatusMessageEl.textContent = ''; }, 3000); }
            else if (type.includes('participants')) { showAlert('Relatório de participantes exportado com sucesso!'); }
        } else { showAlert("Download de arquivo não suportado pelo seu navegador."); }
    }
    function exportParticipantsHandler(format) {
        const allLocalParticipants = getFromLocalStorage('quizParticipants', []); const prizeWinnersList = getFromLocalStorage(PRIZE_WINNERS_LIST_KEY, []);
        const searchTerm = searchParticipantsInput ? searchParticipantsInput.value.toLowerCase() : ""; let filterPeriod = 'all'; if(filterPeriodRadios) filterPeriodRadios.forEach(radio => { if (radio.checked) filterPeriod = radio.value; }); const filterDays = filterDaysRangeInput ? parseInt(filterDaysRangeInput.value) || 0 : 0; const onlyPrizeWinners = filterPrizeWinnersCheckbox ? filterPrizeWinnersCheckbox.checked : false;
        let participantsToExport = allLocalParticipants;
        if (filterPeriod === 'today') { const today = new Date().toISOString().split('T')[0]; participantsToExport = participantsToExport.filter(p => p.timestamp?.startsWith(today)); }
        else if (filterPeriod === 'range' && filterDays > 0) { const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - filterDays); cutoff.setHours(0,0,0,0); participantsToExport = participantsToExport.filter(p => new Date(p.timestamp) >= cutoff); }
        if (onlyPrizeWinners) { participantsToExport = participantsToExport.filter(p => prizeWinnersList.some(winner => winner.phone === p.phone) && p.score >= settings.minScoreForPrize ); }
        if (searchTerm) { participantsToExport = participantsToExport.filter(p => (p.name && p.name.toLowerCase().includes(searchTerm)) || (p.phone && p.phone.toLowerCase().includes(searchTerm))); }

        participantsToExport = sortData(participantsToExport, participantsSortKey, participantsSortDir);

        if (participantsToExport.length === 0) { showAlert("Não há participantes (com os filtros atuais) para exportar."); return; }
        const filename = `relatorio_participantes_${new Date().toISOString().split('T')[0]}.${format}`; const dataType = `${format}_participants`;
        if (format === 'csv') { const flattenedParticipants = participantsToExport.map(({ playerAttempts, ...rest }) => { const wonPrizeStatus = prizeWinnersList.some(winner => winner.phone === rest.phone) && rest.score >= settings.minScoreForPrize; return {...rest, wonPrize: wonPrizeStatus ? 'Sim' : 'Não'}; }); exportData(flattenedParticipants, filename, dataType); }
        else { exportData(participantsToExport, filename, dataType); }
    }
    function exportQuestionsHandler(format) {
        const questionsToExport = getFromLocalStorage('quizQuestions', []);
        if (questionsToExport.length === 0) { if (questionsImportExportStatusMessageEl) { questionsImportExportStatusMessageEl.textContent = "Não há questões para exportar."; questionsImportExportStatusMessageEl.className = 'status-message error'; } else { showAlert("Não há questões para exportar."); } return; }
        const filename = `questoes_quiz_${new Date().toISOString().split('T')[0]}.${format}`; const dataType = `${format}_questions`;
        if (format === 'csv') {
            const flattenedQuestions = questionsToExport.map(q => ({
                id: q.id,
                text: q.text,
                option1: q.options[0] || '',
                option2: q.options[1] || '',
                option3: q.options[2] || '',
                option4: q.options[3] || '',
                correctOptionIndex: q.correct,
                correctOptionText: q.options[q.correct] || '',
                isDisabled: q.isDisabled || false,
                difficulty: q.difficulty || 'facil'
            }));
            exportData(flattenedQuestions, filename, dataType);
        }
        else { exportData(questionsToExport, filename, dataType); }
    }
    function exportCompleteBackup() {
        const backupData = {
            quizQuestions: getFromLocalStorage('quizQuestions', []),
            quizParticipants: getFromLocalStorage('quizParticipants', []),
            quizSettings: getFromLocalStorage('quizSettings', DEFAULT_SETTINGS),
            [QUIZ_EVENT_KEY]: getFromLocalStorage(QUIZ_EVENT_KEY, null),
            quizQuestionsInitialized: localStorage.getItem('quizQuestions_initialized') || 'false',
            [CUSTOM_LOGO_FILENAME_KEY]: localStorage.getItem(CUSTOM_LOGO_FILENAME_KEY) || null,
            [GIVE_UP_LOCKOUT_LIST_KEY]: getFromLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, []),
            [PRIZE_WINNERS_LIST_KEY]: getFromLocalStorage(PRIZE_WINNERS_LIST_KEY, []),
            [QUIZ_CUSTOMIZATIONS_KEY]: getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, DEFAULT_CUSTOMIZATIONS),
            [DEV_MODE_LS_KEY]: localStorage.getItem(DEV_MODE_LS_KEY) || 'false'
        };
        const date = new Date(); const formattedDate = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
        exportData(backupData, `backup_quiz_caesb_${formattedDate}.json`, 'backup');
    }
    function handleImportBackup() {
        if (!importBackupFileEl?.files?.length) { showAlert('Por favor, selecione um arquivo de backup.'); return; }
        const file = importBackupFileEl.files[0]; const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (importedData && typeof importedData.quizSettings !== 'undefined') {
                    showConfirm("Importar este backup? TODOS os dados atuais (incluindo evento, questões, participantes, configurações e personalizações) serão sobrescritos.",
                    {
                        onDiscardAndProceed: () => {
                            const questionsWithDefaults = (importedData.quizQuestions || []).map(q => ({
                                ...q,
                                isDisabled: typeof q.isDisabled === 'boolean' ? q.isDisabled : false,
                                difficulty: q.difficulty || 'facil'
                            }));
                            saveToLocalStorage('quizQuestions', questionsWithDefaults);
                            saveToLocalStorage('quizParticipants', importedData.quizParticipants || []);

                            const importedSettings = importedData.quizSettings || {};
                            const mergedSettings = {
                                ...DEFAULT_SETTINGS,
                                ...importedSettings,
                                difficultyPercentages: {
                                    ...DEFAULT_SETTINGS.difficultyPercentages,
                                    ...(importedSettings.difficultyPercentages || {})
                                }
                            };
                            saveToLocalStorage('quizSettings', mergedSettings);

                            if (importedData[QUIZ_EVENT_KEY]) { saveToLocalStorage(QUIZ_EVENT_KEY, importedData[QUIZ_EVENT_KEY]); } else { localStorage.removeItem(QUIZ_EVENT_KEY); }
                            localStorage.setItem('quizQuestions_initialized', importedData.quizQuestionsInitialized || 'false');
                            if (importedData[CUSTOM_LOGO_FILENAME_KEY]) { localStorage.setItem(CUSTOM_LOGO_FILENAME_KEY, importedData[CUSTOM_LOGO_FILENAME_KEY]); } else { localStorage.removeItem(CUSTOM_LOGO_FILENAME_KEY); }
                            saveToLocalStorage(GIVE_UP_LOCKOUT_LIST_KEY, importedData[GIVE_UP_LOCKOUT_LIST_KEY] || []);
                            saveToLocalStorage(PRIZE_WINNERS_LIST_KEY, importedData[PRIZE_WINNERS_LIST_KEY] || []);

                            const importedCustomizations = importedData[QUIZ_CUSTOMIZATIONS_KEY] || {};
                            const mergedCustomizations = {
                                texts: { ...DEFAULT_CUSTOMIZATIONS.texts, ...(importedCustomizations.texts || {}) },
                                colors: { ...DEFAULT_CUSTOMIZATIONS.colors, ...(importedCustomizations.colors || {}) },
                                fontSizes: { ...DEFAULT_CUSTOMIZATIONS.fontSizes, ...(importedCustomizations.fontSizes || {}) }
                            };
                            saveToLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, mergedCustomizations);

                            localStorage.setItem(DEV_MODE_LS_KEY, importedData[DEV_MODE_LS_KEY] || 'false');
                            loadDevModeState();
                            applyDevModeVisuals();

                            loadAdminDataAndUpdateUI();
                            if (backupStatusMessageEl) { backupStatusMessageEl.textContent = 'Backup importado com sucesso! Dados atualizados.'; backupStatusMessageEl.className = 'status-message success'; }
                        }
                    }, 'danger', { discardButtonText: "Sim, Importar" });
                } else { throw new Error("Arquivo de backup inválido ou corrompido. Estrutura de dados esperada não encontrada."); }
            } catch (e) { if (backupStatusMessageEl) { backupStatusMessageEl.textContent = `Erro ao importar: ${e.message}`; backupStatusMessageEl.className = 'status-message error'; } else { showAlert(`Erro ao importar: ${e.message}`); } }
            finally { if (importBackupFileEl) importBackupFileEl.value = ''; }
        };
        reader.onerror = () => { if (backupStatusMessageEl) { backupStatusMessageEl.textContent = 'Erro ao ler o arquivo.'; backupStatusMessageEl.className = 'status-message error'; } else { showAlert('Erro ao ler o arquivo.'); } };
        reader.readAsText(file);
    }

    function handleImportQuestions() {
        if (!importQuestionsFileEl?.files?.length) {
            showAlert('Por favor, selecione um arquivo JSON de questões.');
            return;
        }
        const file = importQuestionsFileEl.files[0];
        const reader = new FileReader();
        const addMode = addQuestionsModeCheckbox ? addQuestionsModeCheckbox.checked : false;
        let questionsAddedCount = 0;
        let questionsUpdatedCount = 0;

        reader.onload = (event) => {
            try {
                const importedRawData = JSON.parse(event.target.result);
                if (!Array.isArray(importedRawData)) {
                    throw new Error("O arquivo JSON deve conter um array de objetos de questão.");
                }

                importedRawData.forEach((q, index) => {
                    if (!q.text || !Array.isArray(q.options) || typeof q.correct !== 'number' || q.options.length === 0 || q.correct < 0 || q.correct >= q.options.length) {
                        throw new Error(`Questão ${index + 1} no arquivo JSON tem estrutura inválida (campos 'text', 'options' ou 'correct' ausentes/inválidos).`);
                    }
                });

                const processedImportedQuestions = importedRawData.map((q_json, index) => {
                    const processedQ = {
                        text: q_json.text,
                        options: q_json.options,
                        correct: q_json.correct,
                        difficulty: q_json.difficulty || 'facil',
                        isDisabled: typeof q_json.isDisabled === 'boolean' ? q_json.isDisabled : false,
                        id: (q_json.id && String(q_json.id).trim() !== '') ? String(q_json.id).trim() : `q_imported_${Date.now()}_${index}`
                    };
                    return processedQ;
                });

                let currentQuestions = getFromLocalStorage('quizQuestions', []);

                if (addMode) {
                    processedImportedQuestions.forEach(importedQ => {
                        const existingQuestionIndex = currentQuestions.findIndex(q => q.id === importedQ.id);
                        if (existingQuestionIndex > -1) {
                            currentQuestions[existingQuestionIndex] = importedQ;
                            questionsUpdatedCount++;
                        } else {
                            currentQuestions.push(importedQ);
                            questionsAddedCount++;
                        }
                    });
                } else {
                    currentQuestions = processedImportedQuestions;
                    questionsAddedCount = currentQuestions.length;
                    questionsUpdatedCount = 0;
                }

                saveToLocalStorage('quizQuestions', currentQuestions);
                loadAdminQuestions();
                loadAdminStats();

                let successMessage = "Importação concluída. ";
                if (addMode) {
                    successMessage += `${questionsAddedCount} questão(ões) nova(s) adicionada(s), ${questionsUpdatedCount} questão(ões) existente(s) atualizada(s).`;
                } else {
                    successMessage += `${questionsAddedCount} questão(ões) importada(s) (todas as anteriores foram substituídas).`;
                }

                if (questionsImportExportStatusMessageEl) {
                    questionsImportExportStatusMessageEl.textContent = successMessage;
                    questionsImportExportStatusMessageEl.className = 'status-message success';
                    setTimeout(() => { if(questionsImportExportStatusMessageEl) questionsImportExportStatusMessageEl.textContent = ''; }, 5000);
                } else {
                    showAlert(successMessage);
                }

            } catch (e) {
                if (questionsImportExportStatusMessageEl) {
                    questionsImportExportStatusMessageEl.textContent = `Erro ao importar questões: ${e.message}`;
                    questionsImportExportStatusMessageEl.className = 'status-message error';
                } else {
                    showAlert(`Erro ao importar questões: ${e.message}`);
                }
            } finally {
                if (importQuestionsFileEl) importQuestionsFileEl.value = '';
            }
        };
        reader.readAsText(file);
    }


    function loadAdminDataAndUpdateUI() {
        settings = { ...DEFAULT_SETTINGS, ...getFromLocalStorage('quizSettings', DEFAULT_SETTINGS) };
        allQuestions = getFromLocalStorage('quizQuestions', []);
        participants = getFromLocalStorage('quizParticipants', []);
        currentEventAdminData = getFromLocalStorage(QUIZ_EVENT_KEY, null);
        quizCustomizations = getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, DEFAULT_CUSTOMIZATIONS);

        loadAdminSettingsToUI();
        applyCustomBackground();
        applyAdminThemeCustomizations();

        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            if (activeScreen.id === 'admin-questions-screen') loadAdminQuestions();
            else if (activeScreen.id === 'admin-reports-screen') { currentParticipantsPage = 1; applyFiltersAndRenderParticipants(); }
            else if (activeScreen.id === 'admin-stats-screen') { currentStatsPage = 1; loadAdminStats(); }
            else if (activeScreen.id === 'admin-event-screen') loadCurrentEventToUI();
            else if (activeScreen.id === 'admin-customization-screen') loadAdminCustomizationsToUI();
            else if (activeScreen.id === 'admin-analytics-screen') {
                 renderAnalyticsDashboard();
            }
        }
    }
    function loadAdminStats() {
        if (!avgScoreStatEl || !totalParticipationsStatEl || !questionStatsTableBodyEl || !noStatsMessageEl) return;
        const localParticipants = getFromLocalStorage('quizParticipants', []);
        const localAllQuestions = getFromLocalStorage('quizQuestions', []);

        if (localParticipants.length === 0 && localAllQuestions.length === 0) {
            avgScoreStatEl.textContent = "-";
            totalParticipationsStatEl.textContent = "0";
            questionStatsTableBodyEl.innerHTML = `<tr><td colspan="6">Nenhuma questão cadastrada para exibir estatísticas.</td></tr>`;
            noStatsMessageEl.classList.add('hidden');
            updatePaginationControls('stats', 1, 1);
            updateSortIcons('question-stats-table', statsSortKey, statsSortDir);
            return;
        }
        if (localParticipants.length === 0) {
            avgScoreStatEl.textContent = "-";
            totalParticipationsStatEl.textContent = "0";
        } else {
            let totalScoreSum = 0;
            localParticipants.forEach(p => { totalScoreSum += (p.score || 0); });
            const averageScore = localParticipants.length > 0 ? (totalScoreSum / localParticipants.length).toFixed(2) : "0.00";
            avgScoreStatEl.textContent = averageScore;
            totalParticipationsStatEl.textContent = localParticipants.length;
        }

        const questionPerformance = {};
        localAllQuestions.forEach(q => {
            questionPerformance[q.id] = {
                id: q.id,
                text: q.text,
                displayText: q.text.substring(0,50) + (q.text.length > 50 ? "..." : ""),
                correct: 0,
                incorrect: 0,
                total: 0,
                isDisabled: q.isDisabled
            };
        });
        localParticipants.forEach(participant => {
            if (participant.playerAttempts && Array.isArray(participant.playerAttempts)) {
                participant.playerAttempts.forEach(attempt => {
                    const questionId = attempt.questionId;
                    if (!questionId || !questionPerformance[questionId]) return;
                    questionPerformance[questionId].total++;
                    if (attempt.isCorrect) { questionPerformance[questionId].correct++; }
                    else { questionPerformance[questionId].incorrect++; }
                });
            }
        });

        let performanceArray = Object.values(questionPerformance);
        performanceArray = sortData(performanceArray, statsSortKey, statsSortDir);

        const totalItems = performanceArray.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
        currentStatsPage = Math.max(1, Math.min(currentStatsPage, totalPages));

        const startIndex = (currentStatsPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedData = performanceArray.slice(startIndex, endIndex);

        questionStatsTableBodyEl.innerHTML = '';
        if (paginatedData.length === 0) {
            noStatsMessageEl.classList.remove('hidden');
            noStatsMessageEl.textContent = "Nenhuma estatística de questão para exibir.";
            if(localAllQuestions.length === 0) noStatsMessageEl.textContent = "Nenhuma questão cadastrada.";
        } else {
            noStatsMessageEl.classList.add('hidden');
            paginatedData.forEach(stat => {
                const row = questionStatsTableBodyEl.insertRow();
                row.classList.toggle('disabled-question-row', stat.isDisabled === true);

                row.insertCell().textContent = stat.displayText;
                row.insertCell().textContent = stat.total;
                row.insertCell().textContent = stat.correct;
                row.insertCell().textContent = stat.incorrect;
                const accuracy = stat.total > 0 ? ((stat.correct / stat.total) * 100).toFixed(1) + '%' : 'N/A';
                row.insertCell().textContent = accuracy;

                const actionsCell = row.insertCell();
                const toggleBtn = document.createElement('button');
                toggleBtn.dataset.id = stat.id;
                toggleBtn.classList.add('btn-toggle-q-status');
                if (stat.isDisabled) {
                    toggleBtn.textContent = 'Habilitar';
                    toggleBtn.classList.add('enabled-q');
                } else {
                    toggleBtn.textContent = 'Desabilitar';
                    toggleBtn.classList.add('disabled-q');
                }
                toggleBtn.addEventListener('click', (e) => toggleQuestionDisabledState(e.target.dataset.id, 'admin-stats-screen'));
                actionsCell.appendChild(toggleBtn);
            });
        }
        updatePaginationControls('stats', currentStatsPage, totalPages);
        updateSortIcons('question-stats-table', statsSortKey, statsSortDir);
    }

    function loadAdminCustomizationsToUI() {
        quizCustomizations = getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, DEFAULT_CUSTOMIZATIONS);

        for (const key in DEFAULT_CUSTOMIZATIONS.texts) {
            const inputEl = document.getElementById(`custom-text-${key}`);
            if (inputEl) {
                inputEl.value = quizCustomizations.texts[key] || DEFAULT_CUSTOMIZATIONS.texts[key];
            }
        }
        for (const key in DEFAULT_CUSTOMIZATIONS.colors) {
            const inputEl = document.getElementById(`custom-color-${key}`);
            if (inputEl) {
                inputEl.value = quizCustomizations.colors[key] || DEFAULT_CUSTOMIZATIONS.colors[key];
            }
        }
        for (const key in DEFAULT_CUSTOMIZATIONS.fontSizes) {
            const inputEl = document.getElementById(`custom-fontSize-${key}`);
            if (inputEl) {
                inputEl.value = quizCustomizations.fontSizes[key] || DEFAULT_CUSTOMIZATIONS.fontSizes[key];
            }
        }
        initialCustomizationsData = getCustomizationsFormData();
        isCustomizationsDirty = false;
    }

    function saveQuizCustomizationsHandler(isNavigating = false) {
        const newCustomizations = {
            texts: {},
            colors: {},
            fontSizes: {}
        };

        for (const key in DEFAULT_CUSTOMIZATIONS.texts) {
            const inputEl = document.getElementById(`custom-text-${key}`);
            newCustomizations.texts[key] = inputEl ? (inputEl.value.trim() || DEFAULT_CUSTOMIZATIONS.texts[key]) : DEFAULT_CUSTOMIZATIONS.texts[key];
        }
        for (const key in DEFAULT_CUSTOMIZATIONS.colors) {
            const inputEl = document.getElementById(`custom-color-${key}`);
            newCustomizations.colors[key] = inputEl ? inputEl.value : DEFAULT_CUSTOMIZATIONS.colors[key];
        }
        for (const key in DEFAULT_CUSTOMIZATIONS.fontSizes) {
            const inputEl = document.getElementById(`custom-fontSize-${key}`);
            newCustomizations.fontSizes[key] = inputEl ? (inputEl.value.trim() || DEFAULT_CUSTOMIZATIONS.fontSizes[key]) : DEFAULT_CUSTOMIZATIONS.fontSizes[key];
        }

        saveToLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, newCustomizations);
        quizCustomizations = newCustomizations;
        resetDirtyFlagAndCaptureState('customizations');
        applyAdminThemeCustomizations();
        applyCustomBackground();

        if(!isNavigating && customizationStatusMessageEl) {
            customizationStatusMessageEl.textContent = 'Personalizações salvas com sucesso!';
            customizationStatusMessageEl.className = 'status-message success';
            setTimeout(() => { if(customizationStatusMessageEl) customizationStatusMessageEl.textContent = ''; }, 3000);
        }
        return true;
    }

    function restoreDefaultQuizCustomizations() {
        showConfirm("Tem certeza que deseja restaurar todas as personalizações para os valores padrão? Suas alterações atuais serão perdidas.",
        {
            onDiscardAndProceed: () => {
                const defaultsCopy = JSON.parse(JSON.stringify(DEFAULT_CUSTOMIZATIONS));
                saveToLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, defaultsCopy);
                quizCustomizations = defaultsCopy;
                loadAdminCustomizationsToUI();
                applyAdminThemeCustomizations();
                applyCustomBackground();

                if(customizationStatusMessageEl) {
                    customizationStatusMessageEl.textContent = 'Personalizações restauradas para o padrão.';
                    customizationStatusMessageEl.className = 'status-message';
                    setTimeout(() => { if(customizationStatusMessageEl) customizationStatusMessageEl.textContent = ''; }, 3000);
                }
            }
        }, 'warning', { discardButtonText: "Sim, Restaurar" });
    }

    function setupEventTestButtons() {
        const createSimulatedEvent = (status, enableMessages) => {
            const now = new Date();
            let startTime, endTime;
            const oneDay = 24 * 60 * 60 * 1000;

            if (status === 'before') {
                startTime = new Date(now.getTime() + oneDay);
                endTime = new Date(now.getTime() + 2 * oneDay);
            } else if (status === 'after') {
                startTime = new Date(now.getTime() - 2 * oneDay);
                endTime = new Date(now.getTime() - oneDay);
            } else {
                startTime = new Date(now.getTime() - oneDay);
                endTime = new Date(now.getTime() + oneDay);
            }

            return {
                eventName: `Evento Teste (${status} - Msgs ${enableMessages ? 'ON' : 'OFF'})`,
                startTime: startTime.toISOString().slice(0, 16),
                endTime: endTime.toISOString().slice(0, 16),
                enableOutOfPeriodMessage: enableMessages
            };
        };

        const testEventScenario = (status, enableMessages) => {
            const simulatedEvent = createSimulatedEvent(status, enableMessages);
            localStorage.setItem(QUIZ_EVENT_KEY, JSON.stringify(simulatedEvent));
            localStorage.setItem('quiz_test_action', 'goto_screen');
            localStorage.setItem('quiz_test_target', 'initial-screen');
            window.open('index.html', '_blank');
            setTimeout(() => {
                localStorage.removeItem(QUIZ_EVENT_KEY);
                currentEventAdminData = getFromLocalStorage(QUIZ_EVENT_KEY, null);
            }, 2000);
        };

        document.getElementById('test-event-before-start')?.addEventListener('click', () => testEventScenario('before', true));
        document.getElementById('test-event-after-end')?.addEventListener('click', () => testEventScenario('after', true));
        document.getElementById('test-event-during')?.addEventListener('click', () => testEventScenario('during', true));
        document.getElementById('test-event-messages-disabled-outside-period')?.addEventListener('click', () => {
            testEventScenario('before', false);
        });
    }
    setupEventTestButtons();

    (function setupOtherTestButtons() {
        const tests = {
            'test-goto-initial': ['goto_screen', 'initial-screen'],
            'test-goto-quiz': ['goto_screen', 'quiz-screen'],
            'test-goto-result': ['goto_screen', 'result-screen'],
            'test-goto-ranking': ['goto_screen', 'ranking-screen'],
            'test-goto-idle': ['goto_screen', 'idle-screen'],
            'test-modal-already-won': ['simulate_scenario', 'modal_already_won'],
            'test-modal-top3': ['simulate_scenario', 'modal_top3', { name: 'Admin Teste Top', rank: '2' }],
            'test-modal-incorrect-answers': ['simulate_scenario', 'modal_incorrect_answers'],
            'test-result-top1-winner': ['simulate_scenario', 'result_top1_winner', { name: 'Ganhador #1', score: 10, total_questions: 10, time_seconds: 30, rank: 1, won_prize: 'true' }],
            'test-result-non-top3-winner': ['simulate_scenario', 'result_non_top3_winner', { name: 'Bom Desempenho', score: 7, total_questions: 10, time_seconds: 60, rank: 4, won_prize: 'true' }],
            'test-result-loser': ['simulate_scenario', 'result_loser', { name: 'Não Premiado', score: 4, total_questions: 10, time_seconds: 90, rank: 12, won_prize: 'false' }]
        };
        for (const [id, params] of Object.entries(tests)) {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => {
                localStorage.setItem('quiz_test_action', params[0]);
                localStorage.setItem('quiz_test_target', params[1]);
                if (params[2]) Object.entries(params[2]).forEach(([k, v]) => localStorage.setItem(`quiz_test_data_${k}`, v));
                window.open('index.html', '_blank');
            });
        }
    })();

    loadFontPreference();
    if (decreaseFontButton) decreaseFontButton.addEventListener('click', () => { if (currentFontStepIndex > 0) { currentFontStepIndex--; applyFontSize(); } });
    if (increaseFontButton) increaseFontButton.addEventListener('click', () => { if (currentFontStepIndex < fontSizesInPx.length - 1) { currentFontStepIndex++; applyFontSize(); } });

    const attemptNavigation = (target, action = 'showScreen') => {
        const activeScreenEl = document.querySelector('.screen.active');
        let isDirty = false;
        let saveFn = null;
        let resetFn = null;
        let screenName = '';

        if (activeScreenEl) {
            if (activeScreenEl.id === 'admin-settings-screen' && isSettingsDirty) { isDirty = true; saveFn = saveSettingsHandler; resetFn = () => resetDirtyFlagAndCaptureState('settings'); screenName = 'Configurações Gerais'; }
            else if (activeScreenEl.id === 'admin-customization-screen' && isCustomizationsDirty) { isDirty = true; saveFn = saveQuizCustomizationsHandler; resetFn = () => resetDirtyFlagAndCaptureState('customizations'); screenName = 'Personalização'; }
            else if (activeScreenEl.id === 'admin-questions-screen' && isQuestionFormDirty && !addEditQuestionForm.classList.contains('hidden')) { isDirty = true; saveFn = saveQuestionHandler; resetFn = () => resetDirtyFlagAndCaptureState('question'); screenName = 'Formulário de Questão'; }
            else if (activeScreenEl.id === 'admin-event-screen' && isEventDirty) { isDirty = true; saveFn = saveCurrentEventHandler; resetFn = () => resetDirtyFlagAndCaptureState('event'); screenName = 'Gerenciar Evento'; }
        }

        if (isDirty) {
            showConfirm(
                `Você tem alterações não salvas em "${screenName}". Deseja continuar?`,
                {
                    onSaveAndProceed: () => {
                        if (saveFn && saveFn(true)) {
                            if(resetFn) resetFn();
                            if (action === 'showScreen') proceedWithShowScreen(target);
                            else if (action === 'redirect') window.location.href = target;
                        }
                    },
                    onDiscardAndProceed: () => {
                        if(resetFn) resetFn();
                        if (action === 'showScreen') proceedWithShowScreen(target);
                        else if (action === 'redirect') window.location.href = target;
                    },
                    onCancel: () => {}
                },
                'warning',
                { title: "Alterações Não Salvas", showSaveButton: true }
            );
        } else {
            if (action === 'showScreen') proceedWithShowScreen(target);
            else if (action === 'redirect') window.location.href = target;
        }
    };

    if (goToQuizBtn) goToQuizBtn.addEventListener('click', () => attemptNavigation('index.html', 'redirect'));
    if (adminLoginBtn && adminPasswordInput && adminLoginErrorEl) { adminLoginBtn.addEventListener('click', () => { if (adminPasswordInput.value === ADMIN_PASSWORD) { adminPasswordInput.value = ''; adminLoginErrorEl.classList.add('hidden'); loadAdminDataAndUpdateUI(); proceedWithShowScreen('admin-dashboard-screen'); } else { adminLoginErrorEl.classList.remove('hidden'); adminLoginErrorEl.textContent = 'Senha incorreta. Tente novamente.'; } }); adminPasswordInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); adminLoginBtn.click(); } }); }
    if (adminLogoutIconBtn) { adminLogoutIconBtn.addEventListener('click', () => { if (adminLoginErrorEl) adminLoginErrorEl.classList.add('hidden'); attemptNavigation('admin-login-screen'); }); }
    if(adminDashboardCards) adminDashboardCards.forEach(card => card.addEventListener('click', () => attemptNavigation(card.dataset.targetScreen)));
    if(adminBackButtons) adminBackButtons.forEach(button => button.addEventListener('click', () => attemptNavigation(button.dataset.targetScreen)));

    if (addQuestionFormBtn) addQuestionFormBtn.addEventListener('click', () => { if(editQuestionIdInput) editQuestionIdInput.value = ''; setQuestionFormVisibility(true); });
    if (cancelEditQuestionBtn) cancelEditQuestionBtn.addEventListener('click', () => { setQuestionFormVisibility(false); resetDirtyFlagAndCaptureState('question'); });
    if (saveQuestionBtn) saveQuestionBtn.addEventListener('click', () => saveQuestionHandler());
    if (searchQuestionsInput) searchQuestionsInput.addEventListener('input', loadAdminQuestions);

    function saveSettingsHandler(isNavigating = false) {
        const numQuestionsVal = numberOfQuestionsInput ? parseInt(numberOfQuestionsInput.value) : DEFAULT_SETTINGS.numberOfQuestions;
        const timePerQuestionVal = timePerQuestionInput ? parseInt(timePerQuestionInput.value) : DEFAULT_SETTINGS.timePerQuestion;
        const idleTimeoutVal = idleTimeoutSecondsInput ? parseInt(idleTimeoutSecondsInput.value) : DEFAULT_SETTINGS.idleTimeoutSeconds;
        const fadeOutLeadTimeVal = fadeOutLeadTimeSecondsInput ? parseInt(fadeOutLeadTimeSecondsInput.value) : DEFAULT_SETTINGS.fadeOutLeadTimeSeconds;
        const minScoreNum = minScorePrizeInput ? parseInt(minScorePrizeInput.value) : DEFAULT_SETTINGS.minScoreForPrize;
        const rankCountNum = rankingDisplayCountInput && rankingDisplayCountInput.value.trim() !== '' ? parseInt(rankingDisplayCountInput.value) : DEFAULT_SETTINGS.rankingDisplayCount;
        const giveUpLockoutNum = giveUpLockoutMinutesInput ? parseInt(giveUpLockoutMinutesInput.value) : DEFAULT_SETTINGS.giveUpLockoutMinutes;
        const keyboardHeightVal = virtualKeyboardHeightInput ? parseInt(virtualKeyboardHeightInput.value) : DEFAULT_SETTINGS.virtualKeyboardHeight;
        const enableKeyboardVal = enableVirtualKeyboardToggleCheckbox ? enableVirtualKeyboardToggleCheckbox.checked : DEFAULT_SETTINGS.enableVirtualKeyboard;
        const enableBorderPulseVal = enableTimeAlertBorderPulseToggle ? enableTimeAlertBorderPulseToggle.checked : DEFAULT_SETTINGS.enableTimeAlertBorderPulse;
        const enableFlashVal = enableTimeAlertFlashToggle ? enableTimeAlertFlashToggle.checked : DEFAULT_SETTINGS.enableTimeAlertFlash;

        const percFacil = difficultyPercentageFacilInput ? parseInt(difficultyPercentageFacilInput.value) : DEFAULT_SETTINGS.difficultyPercentages.facil;
        const percModerado = difficultyPercentageModeradoInput ? parseInt(difficultyPercentageModeradoInput.value) : DEFAULT_SETTINGS.difficultyPercentages.moderado;
        const percDificil = difficultyPercentageDificilInput ? parseInt(difficultyPercentageDificilInput.value) : DEFAULT_SETTINGS.difficultyPercentages.dificil;

        if (isNaN(numQuestionsVal) || numQuestionsVal < 1 ||
            isNaN(timePerQuestionVal) || timePerQuestionVal < 5 || timePerQuestionVal > 120 ||
            isNaN(idleTimeoutVal) || idleTimeoutVal < 15 || idleTimeoutVal > 600 ||
            isNaN(fadeOutLeadTimeVal) || fadeOutLeadTimeVal < 3 || fadeOutLeadTimeVal > 30 ||
            isNaN(minScoreNum) || minScoreNum < 1 ||
            isNaN(rankCountNum) || rankCountNum < 1 ||
            isNaN(giveUpLockoutNum) || giveUpLockoutNum < 0 ||
            isNaN(keyboardHeightVal) || keyboardHeightVal < 20 || keyboardHeightVal > 60 ||
            isNaN(percFacil) || percFacil < 0 || percFacil > 100 ||
            isNaN(percModerado) || percModerado < 0 || percModerado > 100 ||
            isNaN(percDificil) || percDificil < 0 || percDificil > 100
            ) {
            showAlert('Verifique os valores numéricos nas configurações. São inválidos ou estão fora dos limites permitidos.', 'warning');
            return false;
        }
        if (fadeOutLeadTimeVal >= idleTimeoutVal) {
            showAlert('O tempo do aviso de esmaecimento deve ser menor que o tempo total para o modo descanso.', 'warning');
            return false;
        }
        if (minScoreNum > numQuestionsVal) {
            showAlert('A pontuação mínima para brinde não pode ser maior que o número de perguntas.', 'warning');
            return false;
        }
        if ((percFacil + percModerado + percDificil) !== 100) {
            if(difficultyPercentageSumErrorEl) difficultyPercentageSumErrorEl.classList.remove('hidden');
            showAlert('A soma dos percentuais de dificuldade deve ser 100%.', 'warning');
            return false;
        } else {
             if(difficultyPercentageSumErrorEl) difficultyPercentageSumErrorEl.classList.add('hidden');
        }

        settings = {
            numberOfQuestions: numQuestionsVal,
            timePerQuestion: timePerQuestionVal,
            idleTimeoutSeconds: idleTimeoutVal,
            fadeOutLeadTimeSeconds: fadeOutLeadTimeVal,
            minScoreForPrize: minScoreNum,
            showCorrectAnswerOnWrong: showCorrectAnswerCheckbox ? showCorrectAnswerCheckbox.checked : DEFAULT_SETTINGS.showCorrectAnswerOnWrong,
            rankingDisplayCount: rankCountNum,
            enablePrizeLock: enablePrizeLockCheckbox ? enablePrizeLockCheckbox.checked : DEFAULT_SETTINGS.enablePrizeLock,
            customBackgroundFileName: backgroundFilenameInput ? backgroundFilenameInput.value.trim() : DEFAULT_SETTINGS.customBackgroundFileName,
            enableCustomBackground: enableCustomBackgroundCheckbox ? enableCustomBackgroundCheckbox.checked : DEFAULT_SETTINGS.enableCustomBackground,
            giveUpLockoutMinutes: giveUpLockoutNum,
            difficultyPercentages: {
                facil: percFacil,
                moderado: percModerado,
                dificil: percDificil
            },
            virtualKeyboardHeight: keyboardHeightVal,
            enableVirtualKeyboard: enableKeyboardVal,
            enableTimeAlertBorderPulse: enableBorderPulseVal,
            enableTimeAlertFlash: enableFlashVal
        };
        saveToLocalStorage('quizSettings', settings);
        resetDirtyFlagAndCaptureState('settings');

        const filename = logoFilenameInput ? logoFilenameInput.value.trim() : '';
        if (filename) {
            const tempImg = new Image();
            tempImg.src = `assets/${filename}`;
            tempImg.onload = () => {
                localStorage.setItem(CUSTOM_LOGO_FILENAME_KEY, filename);
                applyCustomLogo(filename);
                if(logoStatusMessageEl) { logoStatusMessageEl.textContent = 'Logotipo salvo.'; logoStatusMessageEl.className = 'status-message success';}
            };
            tempImg.onerror = () => {
                if(logoStatusMessageEl) { logoStatusMessageEl.textContent = `Erro: Logo '${filename}' não encontrado em 'assets/'.`; logoStatusMessageEl.className = 'status-message error';}
            };
        } else {
            localStorage.removeItem(CUSTOM_LOGO_FILENAME_KEY);
            applyCustomLogo(null);
            if(logoStatusMessageEl) { logoStatusMessageEl.textContent = 'Logotipo padrão restaurado.'; logoStatusMessageEl.className = 'status-message';}
        }
        applyCustomBackground();
        if(!isNavigating && settingsStatusMessageEl) {
            settingsStatusMessageEl.textContent = 'Configurações salvas com sucesso!';
            settingsStatusMessageEl.className = 'status-message success';
            setTimeout(() => { if(settingsStatusMessageEl) settingsStatusMessageEl.textContent = ''; }, 3000);
        }
        return true;
    }

    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => saveSettingsHandler());

    if(resetSettingButtons) {
        resetSettingButtons.forEach(button => {
            button.addEventListener('click', () => {
                const key = button.dataset.settingKey;
                if (DEFAULT_SETTINGS.hasOwnProperty(key)) {
                    const defaultValue = DEFAULT_SETTINGS[key];
                    let inputElement = document.getElementById(key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)) ||
                                     document.querySelector(`[name="${key}"]`) ||
                                     document.getElementById(key) ||
                                     document.getElementById(`${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}-toggle`);


                    if (key === 'enableTimeAlertBorderPulse' && enableTimeAlertBorderPulseToggle) inputElement = enableTimeAlertBorderPulseToggle;
                    else if (key === 'enableTimeAlertFlash' && enableTimeAlertFlashToggle) inputElement = enableTimeAlertFlashToggle;
                    else if (key === 'enableVirtualKeyboard' && enableVirtualKeyboardToggleCheckbox) inputElement = enableVirtualKeyboardToggleCheckbox;


                    if (inputElement) {
                        if (inputElement.type === 'checkbox') { inputElement.checked = defaultValue; }
                        else { inputElement.value = defaultValue; }
                        checkDirtyState('settings');
                        if (settingsStatusMessageEl) { settingsStatusMessageEl.textContent = `Campo '${key}' resetado para o padrão. Salve para aplicar.`; settingsStatusMessageEl.className = 'status-message'; }
                    } else { console.warn("Não foi possível encontrar o elemento de input para a configuração:", key); }
                }
            });
        });
    }
    if (clearPrizeWinnersBtn) clearPrizeWinnersBtn.addEventListener('click', () => showConfirm('Limpar a lista de TODOS os ganhadores de brindes? Esta ação não pode ser desfeita.', { onDiscardAndProceed: () => { localStorage.removeItem(PRIZE_WINNERS_LIST_KEY); showAlert('Lista de ganhadores de brindes limpa!'); currentParticipantsPage = 1; applyFiltersAndRenderParticipants(); } }, 'danger', { discardButtonText: "Sim, Limpar" }));
    if (clearGiveUpLockoutBtn) clearGiveUpLockoutBtn.addEventListener('click', clearGiveUpLockoutData);
    if (exportBackupBtn) exportBackupBtn.addEventListener('click', exportCompleteBackup);
    if (importBackupBtn) importBackupBtn.addEventListener('click', handleImportBackup);
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportParticipantsHandler('csv'));
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => exportParticipantsHandler('json'));
    if (exportQuestionsJsonBtn) exportQuestionsJsonBtn.addEventListener('click', () => exportQuestionsHandler('json'));
    if (exportQuestionsCsvBtn) exportQuestionsCsvBtn.addEventListener('click', () => exportQuestionsHandler('csv'));
    if (importQuestionsBtn) importQuestionsBtn.addEventListener('click', handleImportQuestions);
    if (deleteAllParticipantsBtn) deleteAllParticipantsBtn.addEventListener('click', handleDeleteAllParticipants);
    if (logoFilenameInput) { logoFilenameInput.addEventListener('input', () => { const filename = logoFilenameInput.value.trim(); if (logoPreviewImg) { if (filename) { logoPreviewImg.src = `assets/${filename}`; logoPreviewImg.onerror = () => { logoPreviewImg.src = DEFAULT_LOGO_SRC; }; } else { logoPreviewImg.src = DEFAULT_LOGO_SRC; } } checkDirtyState('settings'); }); }
    if (restoreDefaultLogoBtn) restoreDefaultLogoBtn.addEventListener('click', () => { if(logoFilenameInput) logoFilenameInput.value = ''; if(logoPreviewImg) logoPreviewImg.src = DEFAULT_LOGO_SRC; if(logoStatusMessageEl) { logoStatusMessageEl.textContent = 'Logotipo padrão restaurado (clique em Salvar Configurações para aplicar).'; logoStatusMessageEl.className = 'status-message';} checkDirtyState('settings'); });

    if(filterPeriodRadios) [...filterPeriodRadios].forEach(el => { el.addEventListener('change', () => { currentParticipantsPage = 1; applyFiltersAndRenderParticipants(); }); });
    if(filterPrizeWinnersCheckbox) filterPrizeWinnersCheckbox.addEventListener('change', () => { currentParticipantsPage = 1; applyFiltersAndRenderParticipants(); });
    if(searchParticipantsInput) searchParticipantsInput.addEventListener('input', () => { currentParticipantsPage = 1; applyFiltersAndRenderParticipants(); });
    if(filterDaysRangeInput) { filterDaysRangeInput.addEventListener('input', () => { if (document.querySelector('input[name="report-filter-period"][value="range"]:checked')) { currentParticipantsPage = 1; applyFiltersAndRenderParticipants(); } }); const rangeRadio = document.getElementById('filter-range'); if(rangeRadio && filterDaysRangeInput) filterDaysRangeInput.disabled = !rangeRadio.checked; if(filterPeriodRadios) { filterPeriodRadios.forEach(radio => { radio.addEventListener('change', () => { if (filterDaysRangeInput) filterDaysRangeInput.disabled = radio.value !== 'range'; }); }); } }
    if (participantsPrevPageBtn) participantsPrevPageBtn.addEventListener('click', () => { if (currentParticipantsPage > 1) { currentParticipantsPage--; applyFiltersAndRenderParticipants(); } });
    if (participantsNextPageBtn) participantsNextPageBtn.addEventListener('click', () => { currentParticipantsPage++; applyFiltersAndRenderParticipants(); });

    if (statsPrevPageBtn) statsPrevPageBtn.addEventListener('click', () => { if (currentStatsPage > 1) { currentStatsPage--; loadAdminStats(); } });
    if (statsNextPageBtn) statsNextPageBtn.addEventListener('click', () => { currentStatsPage++; loadAdminStats(); });

    document.querySelectorAll('#participants-table th[data-sort-key]').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sortKey;
            if (participantsSortKey === key) {
                participantsSortDir = participantsSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                participantsSortKey = key;
                participantsSortDir = (key === 'score' || key === 'time' || key === 'timestamp') ? 'desc' : 'asc';
            }
            currentParticipantsPage = 1;
            applyFiltersAndRenderParticipants();
        });
    });

    document.querySelectorAll('#question-stats-table th[data-sort-key]').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sortKey;
            if (statsSortKey === key) {
                statsSortDir = statsSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                statsSortKey = key;
                statsSortDir = (key === 'total' || key === 'correct' || key === 'incorrect' || key === 'accuracy') ? 'desc' : 'asc';
            }
            currentStatsPage = 1;
            loadAdminStats();
        });
    });


    if(closeParticipantModalBtn) closeParticipantModalBtn.addEventListener('click', closeParticipantDetailsModal);
    if(participantDetailsModal) participantDetailsModal.addEventListener('click', (e) => { if(e.target === participantDetailsModal) closeParticipantDetailsModal(); });
    if (saveEventBtn) saveEventBtn.addEventListener('click', () => saveCurrentEventHandler());
    if (clearEventBtn) clearEventBtn.addEventListener('click', clearCurrentEvent);

    if (filterSectionHeader && filterSectionContent && filterCollapseIcon) {
        filterSectionContent.style.maxHeight = null;
        filterSectionContent.classList.remove('expanded');
        filterSectionHeader.classList.add('collapsed');
        filterCollapseIcon.textContent = '►';

        filterSectionHeader.addEventListener('click', () => {
            const isExpanded = filterSectionContent.classList.toggle('expanded');
            filterSectionHeader.classList.toggle('collapsed', !isExpanded);
            if (isExpanded) {
                filterSectionContent.style.maxHeight = filterSectionContent.scrollHeight + "px";
                filterCollapseIcon.textContent = '▼';
            } else {
                filterSectionContent.style.maxHeight = null;
                filterCollapseIcon.textContent = '►';
            }
        });
    }

    if (saveCustomizationsBtn) saveCustomizationsBtn.addEventListener('click', () => saveQuizCustomizationsHandler());
    if (restoreDefaultCustomizationsBtn) restoreDefaultCustomizationsBtn.addEventListener('click', restoreDefaultQuizCustomizations);

    const formSectionsForDirtyCheck = [
        { section: 'settings', formId: 'admin-settings-screen', inputsSelector: '#admin-settings-screen input, #admin-settings-screen select' },
        { section: 'customizations', formId: 'admin-customization-screen', inputsSelector: '#admin-customization-screen input, #admin-customization-screen textarea, #admin-customization-screen select' },
        { section: 'question', formId: 'add-edit-question-form', inputsSelector: '#add-edit-question-form input, #add-edit-question-form textarea, #add-edit-question-form select' },
        { section: 'event', formId: 'admin-event-screen', inputsSelector: '#admin-event-screen input, #admin-event-screen select' }
    ];

    formSectionsForDirtyCheck.forEach(config => {
        const formElement = document.getElementById(config.formId);
        if (formElement) {
            formElement.addEventListener('input', (event) => {
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
                    checkDirtyState(config.section);
                }
            });
             formElement.addEventListener('change', (event) => {
                if (['INPUT', 'SELECT'].includes(event.target.tagName)) {
                     checkDirtyState(config.section);
                }
            });
        }
    });

    window.addEventListener('beforeunload', (event) => {
        if (isSettingsDirty || isCustomizationsDirty || isQuestionFormDirty || isEventDirty) {
            event.preventDefault();
            event.returnValue = '';
        }
    });

    if (devModeToggleCheckbox) {
        devModeToggleCheckbox.checked = devModeActive;
        devModeToggleCheckbox.addEventListener('change', () => {
            devModeActive = devModeToggleCheckbox.checked;
            localStorage.setItem(DEV_MODE_LS_KEY, devModeActive);
            applyDevModeVisuals();
            showAlert(`Modo Desenvolvedor ${devModeActive ? 'ATIVADO' : 'DESATIVADO'}. A alteração no login terá efeito no próximo carregamento da página.`);
        });
    }

    // Função para renderizar o Dashboard Analítico
    function renderAnalyticsDashboard() {
        if (!analyticsPeriodFilter || !kpiTotalParticipations || !kpiAvgScore || !kpiAvgTime || !kpiSuccessRate ||
            !participationsByHourChartEl || !scoreDistributionChartEl || !topDifficultQuestionsUl || !topEasyQuestionsUl) {
            console.warn("Elementos do Dashboard Analítico não encontrados. A renderização foi abortada.");
            return;
        }

        const allLocalParticipants = getFromLocalStorage('quizParticipants', []);
        const allLocalQuestions = getFromLocalStorage('quizQuestions', []);
        const currentSettings = getFromLocalStorage('quizSettings', DEFAULT_SETTINGS);
        const period = analyticsPeriodFilter.value;
        let filteredParticipants = [];

        const today = new Date();
        const todayDateString = today.toISOString().split('T')[0];

        if (period === 'today') {
            filteredParticipants = allLocalParticipants.filter(p => p.timestamp && p.timestamp.startsWith(todayDateString));
        } else if (period === 'last3days') {
            const threeDaysAgo = new Date(today);
            threeDaysAgo.setDate(today.getDate() - 2);
            threeDaysAgo.setHours(0, 0, 0, 0);
            filteredParticipants = allLocalParticipants.filter(p => {
                if (!p.timestamp) return false;
                const participantDate = new Date(p.timestamp);
                return participantDate >= threeDaysAgo;
            });
        } else { // 'all'
            filteredParticipants = [...allLocalParticipants];
        }

        // KPIs
        const totalParticipations = filteredParticipants.length;
        kpiTotalParticipations.textContent = totalParticipations;

        if (totalParticipations === 0) {
            kpiAvgScore.textContent = "-";
            kpiAvgTime.textContent = "-";
            kpiSuccessRate.textContent = "-";
            participationsByHourChartEl.innerHTML = '<p class="chart-placeholder-text">Sem dados de participação para este período.</p>';
            scoreDistributionChartEl.innerHTML = '<p class="chart-placeholder-text">Sem dados de pontuação para este período.</p>';
            topDifficultQuestionsUl.innerHTML = '<li>Sem dados de questões para este período.</li>';
            topEasyQuestionsUl.innerHTML = '<li>Sem dados de questões para este período.</li>';
            return;
        }

        let totalScoreSum = 0;
        filteredParticipants.forEach(p => { totalScoreSum += (p.score || 0); });
        const averageScore = (totalScoreSum / totalParticipations).toFixed(2);
        kpiAvgScore.textContent = averageScore;

        let totalTimeSum = 0;
        filteredParticipants.forEach(p => { totalTimeSum += (p.time || 0); });
        const averageTimeSeconds = Math.round(totalTimeSum / totalParticipations);
        kpiAvgTime.textContent = formatTime(averageTimeSeconds);

        const minScoreForPrize = currentSettings.minScoreForPrize || DEFAULT_SETTINGS.minScoreForPrize;
        const successfulParticipants = filteredParticipants.filter(p => (p.score || 0) >= minScoreForPrize).length;
        const successRate = ((successfulParticipants / totalParticipations) * 100).toFixed(1);
        kpiSuccessRate.textContent = `${successRate}%`;

        // Gráfico: Participações por Hora
        const participationsByHour = Array(24).fill(0);
        filteredParticipants.forEach(p => {
            if (p.timestamp) {
                const hour = new Date(p.timestamp).getHours();
                participationsByHour[hour]++;
            }
        });
        renderBarChart(participationsByHourChartEl, participationsByHour, (hour) => `${String(hour).padStart(2, '0')}:00`);

        // Gráfico: Distribuição de Pontuações
        const maxPossibleScore = currentSettings.numberOfQuestions || DEFAULT_SETTINGS.numberOfQuestions;
        const scoreDistribution = Array(maxPossibleScore + 1).fill(0);
        filteredParticipants.forEach(p => {
            if (typeof p.score === 'number' && p.score >= 0 && p.score <= maxPossibleScore) {
                scoreDistribution[p.score]++;
            }
        });
        renderBarChart(scoreDistributionChartEl, scoreDistribution, (score) => `${score} Acerto(s)`);

        // Listas: Questões Mais Difíceis e Mais Fáceis
        const questionPerformance = {};
        allLocalQuestions.forEach(q => {
            if (!q.isDisabled) { // Considerar apenas questões habilitadas
                 questionPerformance[q.id] = { id: q.id, text: q.text, correct: 0, total: 0 };
            }
        });

        filteredParticipants.forEach(participant => {
            if (participant.playerAttempts && Array.isArray(participant.playerAttempts)) {
                participant.playerAttempts.forEach(attempt => {
                    if (questionPerformance[attempt.questionId]) { // Verifica se a questão ainda existe e está habilitada
                        questionPerformance[attempt.questionId].total++;
                        if (attempt.isCorrect) {
                            questionPerformance[attempt.questionId].correct++;
                        }
                    }
                });
            }
        });

        const performanceArray = Object.values(questionPerformance).filter(q => q.total > 0); // Apenas questões respondidas

        performanceArray.forEach(q => {
            q.accuracy = (q.correct / q.total) * 100;
        });

        // Mais Difíceis (menor taxa de acerto, mais respondidas como desempate)
        const difficultQuestions = [...performanceArray].sort((a, b) => {
            if (a.accuracy !== b.accuracy) {
                return a.accuracy - b.accuracy; // Menor acurácia primeiro
            }
            return b.total - a.total; // Mais respondidas como desempate
        }).slice(0, 5);

        // Mais Fáceis (maior taxa de acerto, mais respondidas como desempate)
        const easyQuestions = [...performanceArray].sort((a, b) => {
             if (a.accuracy !== b.accuracy) {
                return b.accuracy - a.accuracy; // Maior acurácia primeiro
            }
            return b.total - a.total; // Mais respondidas como desempate
        }).slice(0, 5);

        renderQuestionList(topDifficultQuestionsUl, difficultQuestions, "Nenhuma questão difícil encontrada com os filtros atuais.");
        renderQuestionList(topEasyQuestionsUl, easyQuestions, "Nenhuma questão fácil encontrada com os filtros atuais.");
    }

    function renderBarChart(containerEl, dataArray, labelFormatter) {
        containerEl.innerHTML = ''; // Limpa o conteúdo anterior
        const maxCount = Math.max(...dataArray, 0);

        if (maxCount === 0) {
            containerEl.innerHTML = '<p class="chart-placeholder-text">Sem dados para exibir neste gráfico.</p>';
            return;
        }

        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'analytics-bar-chart-wrapper';

        dataArray.forEach((count, index) => {
            const barContainer = document.createElement('div');
            barContainer.className = 'bar-item-container';

            const bar = document.createElement('div');
            bar.className = 'bar';
            const barHeightPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            bar.style.height = `${barHeightPercentage}%`;
            bar.title = `${labelFormatter(index)}: ${count} participações`; // Tooltip

            const barValue = document.createElement('span');
            barValue.className = 'bar-value';
            barValue.textContent = count > 0 ? count : ''; // Só mostra valor se > 0

            const barLabel = document.createElement('span');
            barLabel.className = 'bar-label';
            barLabel.textContent = labelFormatter(index);

            bar.appendChild(barValue);
            barContainer.appendChild(bar);
            barContainer.appendChild(barLabel);
            chartWrapper.appendChild(barContainer);
        });
        containerEl.appendChild(chartWrapper);
    }

    function renderQuestionList(ulElement, questionsArray, emptyMessage) {
        ulElement.innerHTML = '';
        if (questionsArray.length === 0) {
            const li = document.createElement('li');
            li.textContent = emptyMessage;
            li.className = 'empty-list-message';
            ulElement.appendChild(li);
            return;
        }
        questionsArray.forEach(q => {
            const li = document.createElement('li');
            const questionTextShort = q.text.length > 60 ? q.text.substring(0, 57) + "..." : q.text;
            li.textContent = `${questionTextShort} (${q.accuracy.toFixed(1)}% acerto, ${q.total} resp.)`;
            li.title = `${q.text}\nAcertos: ${q.correct}, Total: ${q.total}`;
            ulElement.appendChild(li);
        });
    }


    // Event listener para o filtro de período do Dashboard Analítico
    if (analyticsPeriodFilter) {
        analyticsPeriodFilter.addEventListener('change', renderAnalyticsDashboard);
    }


    if (devModeActive) {
        console.warn("MODO DE DESENVOLVIMENTO ATIVADO: Login pulado.");
        loadAdminDataAndUpdateUI();
        proceedWithShowScreen('admin-dashboard-screen');
    } else {
        const initialAdminLoginErrorEl = document.getElementById('admin-login-error');
        if (initialAdminLoginErrorEl) initialAdminLoginErrorEl.classList.add('hidden');
        proceedWithShowScreen('admin-login-screen');
    }

});