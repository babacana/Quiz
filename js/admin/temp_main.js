// js/admin/temp_main.js
import {
    getFromLocalStorage as utilGetFromLocalStorage,
    saveToLocalStorage as utilSaveToLocalStorage,
    showAlert as utilShowAlert,
    showConfirm as utilShowConfirm,
    formatTime as utilFormatTime
} from '../shared/utils.js';
import * as uiAdmin from './uiAdmin.js';
import * as eventManager from './eventManager.js'; // Added import

// Constants and global-like variables
const DEV_MODE_LS_KEY = 'quizAdminDevMode';
let devModeActive = false;
const ADMIN_PASSWORD = "CAESB2025!";
const QUIZ_EVENT_KEY = 'quizCurrentEvent'; // This will be passed to eventManager
const QUIZ_CUSTOMIZATIONS_KEY = 'quizThemeCustomizations';

let allQuestions = [];
let participants = [];
let settings = {};
let currentEventAdminData = null; // temp_main.js will still hold a reference if needed for other logic
let quizCustomizations = {};

const ITEMS_PER_PAGE = 10;
let currentParticipantsPage = 1;
let participantsSortKey = 'timestamp';
let participantsSortDir = 'desc';
let currentStatsPage = 1;
let statsSortKey = 'text';
let statsSortDir = 'asc';

// Dirty state flags - managed by temp_main.js for now
let isSettingsDirty = false;
let isCustomizationsDirty = false;
let isQuestionFormDirty = false;
let isEventDirty = false; // This will be updated by event form interactions

let initialSettingsData = '';
let initialCustomizationsData = '';
let initialQuestionFormData = '';
let initialEventData = ''; // For event dirty checking

let navigationTargetScreen = null;
let navigationAction = null;

const DEFAULT_SETTINGS = { /* ... content as before ... */
    minScoreForPrize: 7, showCorrectAnswerOnWrong: true, rankingDisplayCount: 10,
    enablePrizeLock: true, customBackgroundFileName: '', enableCustomBackground: false,
    giveUpLockoutMinutes: 0, numberOfQuestions: 10, timePerQuestion: 30,
    idleTimeoutSeconds: 60, fadeOutLeadTimeSeconds: 5,
    difficultyPercentages: { facil: 40, moderado: 40, dificil: 20 },
    virtualKeyboardHeight: 30, enableVirtualKeyboard: true,
    enableTimeAlertBorderPulse: true, enableTimeAlertFlash: true
};
const DEFAULT_CUSTOMIZATIONS = { /* ... content as before ... */
    texts: { initialScreenTitle: "Bem-vindo ao Quiz!", initialScreenSlogan: "Água da CAESB, Patrimônio de Brasília.", initialScreenStartButton: "Iniciar Quiz", initialScreenRankingButton: "Ver Ranking", quizScreenNextButton: "Próxima Pergunta", quizScreenFinalizeButton: "Finalizar Quiz", resultScreenPrizeWon: "Parabéns, você ganhou um brinde!", resultScreenPrizeNotWon: "Que pena, não foi dessa vez. Tente novamente!", resultScreenRankingButton: "Ver Ranking", resultScreenPlayAgainButton: "Jogar Novamente", rankingScreenTitle: "Ranking Geral", rankingScreenBackButton: "Voltar ao Início", idleScreenCallToAction: "TOQUE PARA COMEÇAR", modalAlreadyWonTitle: "Segura a emoção, campeão(ã)! 🏆", modalAlreadyWonMessage: "Detectamos que você já faturou no nosso Quiz. Para a festa continuar e mais gente ganhar, a vez agora é de outro craque! Espalha a notícia!", modalIncorrectAnswersTitle: "Gabarito das Questões Erradas", inputNamePlaceholder: "Nome", inputPhonePlaceholder: "Telefone (DDD + Número)" },
    colors: { quizMainBackground: "#002244", quizPrimaryButtonBg: "#51cf66", quizPrimaryButtonText: "#ffffff", quizSecondaryButtonBg: "#003366", quizSecondaryButtonBorder: "#0056a0", quizSecondaryButtonText: "#ffffff", quizMainTextColor: "#ffffff", quizHighlightColor: "#61dafb", quizOptionBg: "#ffffff", quizOptionText: "#333333", quizOptionCorrectBg: "#51cf66", quizOptionIncorrectBg: "#ff6b6b" },
    fontSizes: { initialSloganFontSize: "clamp(1.1em, 4vw, 1.25em)", idleCallToActionFontSize: "clamp(2.8em, 7vw, 5.5em)", mainButtonsFontSize: "1.1em", questionTextFontSize: "clamp(1.1em, 3vw, 1.3em)" }
};
const CUSTOM_LOGO_FILENAME_KEY = 'quizCustomLogoFileName';
const DEFAULT_LOGO_SRC = "assets/logo.png";
const PRIZE_WINNERS_LIST_KEY = 'quizPrizeWinnersData';
const GIVE_UP_LOCKOUT_LIST_KEY = 'quizGiveUpLockoutData';

// Admin's getFromLocalStorage (uses utilGetFromLocalStorage internally)
const getFromLocalStorage = (key, defaultValue = {}) => {
    const storedValue = utilGetFromLocalStorage(key, undefined);
    let dataToProcess = storedValue !== undefined ? storedValue : defaultValue;
    try {
        if (key === 'quizQuestions' && Array.isArray(dataToProcess)) {
            return dataToProcess.map(q => ({ ...q, isDisabled: typeof q.isDisabled === 'boolean' ? q.isDisabled : false, difficulty: q.difficulty || 'facil' }));
        }
        if (key === QUIZ_CUSTOMIZATIONS_KEY && typeof dataToProcess === 'object' && dataToProcess !== null) {
            const texts = (typeof dataToProcess.texts === 'object' && dataToProcess.texts !== null) ? dataToProcess.texts : {};
            const colors = (typeof dataToProcess.colors === 'object' && dataToProcess.colors !== null) ? dataToProcess.colors : {};
            const fontSizes = (typeof dataToProcess.fontSizes === 'object' && dataToProcess.fontSizes !== null) ? dataToProcess.fontSizes : {};
            return { texts: { ...DEFAULT_CUSTOMIZATIONS.texts, ...texts }, colors: { ...DEFAULT_CUSTOMIZATIONS.colors, ...colors }, fontSizes: { ...DEFAULT_CUSTOMIZATIONS.fontSizes, ...fontSizes } };
        }
        if (key === 'quizSettings' && typeof dataToProcess === 'object' && dataToProcess !== null) {
             const processedSettings = { ...DEFAULT_SETTINGS, ...dataToProcess };
             processedSettings.difficultyPercentages = { ...DEFAULT_SETTINGS.difficultyPercentages, ...(dataToProcess.difficultyPercentages || {}) };
             return processedSettings;
        }
        return dataToProcess;
    } catch (e) {
        console.error(\`Error processing data for key \${key} in admin getFromLocalStorage:\`, e);
        return defaultValue;
    }
};

settings = getFromLocalStorage('quizSettings', DEFAULT_SETTINGS);
allQuestions = getFromLocalStorage('quizQuestions', []);
participants = getFromLocalStorage('quizParticipants', []);
currentEventAdminData = getFromLocalStorage(QUIZ_EVENT_KEY, null); // Still useful for main logic to know
quizCustomizations = getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, DEFAULT_CUSTOMIZATIONS);

// Helper function for capturing form data for dirty checking (event specific)
const getEventFormData = () => {
    // Query elements directly here as they are specific to this form's data capture
    const eventNameInputEl = document.getElementById('event-name-input');
    const eventStartTimeInputEl = document.getElementById('event-start-time-input');
    const eventEndTimeInputEl = document.getElementById('event-end-time-input');
    const eventEnableMessageCheckboxEl = document.getElementById('event-enable-message-checkbox');
    return JSON.stringify({
        eventName: eventNameInputEl ? eventNameInputEl.value : '',
        startTime: eventStartTimeInputEl ? eventStartTimeInputEl.value : '',
        endTime: eventEndTimeInputEl ? eventEndTimeInputEl.value : '',
        enableMessage: eventEnableMessageCheckboxEl ? eventEnableMessageCheckboxEl.checked : true
    });
};


// --- Functions related to event management are REMOVED from here ---
// - loadCurrentEventToUI
// - saveCurrentEventHandler
// - clearCurrentEvent
// --- End of removed event functions ---

const loadDevModeState = () => {
    devModeActive = utilGetFromLocalStorage(DEV_MODE_LS_KEY, 'false') === 'true';
    console.log("Modo DEV carregado:", devModeActive);
};

// DOMContentLoaded is the main entry point
document.addEventListener('DOMContentLoaded', () => {
    uiAdmin.initAdminUIElements();
    loadDevModeState();

    // Initialize settings, questions, etc. (already done globally)

    uiAdmin.loadAdminFontPreference();
    uiAdmin.applyAdminCustomLogo(utilGetFromLocalStorage(CUSTOM_LOGO_FILENAME_KEY, null), DEFAULT_LOGO_SRC);
    uiAdmin.applyAdminThemeCustomizations(quizCustomizations, DEFAULT_CUSTOMIZATIONS.colors);
    uiAdmin.applyAdminCustomBackground(settings, quizCustomizations, DEFAULT_CUSTOMIZATIONS.colors);
    uiAdmin.applyAdminDevModeVisuals(devModeActive);

    // DOM element references for event listeners
    const adminPasswordInput = document.getElementById('admin-password');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminLoginErrorEl = document.getElementById('admin-login-error');
    const adminLogoutIconBtn = document.getElementById('admin-logout-icon-btn');
    const adminDashboardCards = document.querySelectorAll('.admin-dashboard-card');
    const adminBackButtons = document.querySelectorAll('.admin-back-btn');
    const goToQuizBtn = document.getElementById('go-to-quiz-btn');
    const decreaseFontButton = document.getElementById('decrease-font');
    const increaseFontButton = document.getElementById('increase-font');

    // Event Screen specific DOM elements for initEventManager
    const eventNameInputEl = document.getElementById('event-name-input');
    const eventStartTimeInputEl = document.getElementById('event-start-time-input');
    const eventEndTimeInputEl = document.getElementById('event-end-time-input');
    const eventEnableMessageCheckboxEl = document.getElementById('event-enable-message-checkbox');
    const saveEventBtnEl = document.getElementById('save-event-btn');
    const clearEventBtnEl = document.getElementById('clear-event-btn');
    const eventConfigStatusMessageEl = document.getElementById('event-config-status-message');
    const currentEventDisplayEl = document.getElementById('current-event-display');

    eventManager.initEventManager(
        { // Dependencies
            showAlert: utilShowAlert,
            showConfirm: utilShowConfirm,
            getFromLocalStorage: getFromLocalStorage, // Pass admin's getFromLocalStorage
            saveToLocalStorage: utilSaveToLocalStorage,
            QUIZ_EVENT_KEY: QUIZ_EVENT_KEY
        },
        { // DOM Elements
            eventNameInput: eventNameInputEl,
            eventStartTimeInput: eventStartTimeInputEl,
            eventEndTimeInput: eventEndTimeInputEl,
            eventEnableMessageCheckbox: eventEnableMessageCheckboxEl,
            saveEventBtn: saveEventBtnEl, // Though listener is here, manager might need ref
            clearEventBtn: clearEventBtnEl, // ditto
            eventConfigStatusMessageEl: eventConfigStatusMessageEl,
            currentEventDisplayEl: currentEventDisplayEl
        }
    );

    // Event listeners for event management
    if (saveEventBtnEl) {
        saveEventBtnEl.addEventListener('click', () => {
            eventManager.saveCurrentEvent(false, {
                onSaveSuccess: (updatedEventData) => {
                    currentEventAdminData = updatedEventData; // Update main's copy
                    isEventDirty = false; // Reset dirty flag on successful save
                    initialEventData = getEventFormData(); // Recapture state
                },
                onSaveFailed: () => { /* Optionally handle */ }
            });
        });
    }
    if (clearEventBtnEl) {
        clearEventBtnEl.addEventListener('click', () => {
            eventManager.clearCurrentEventConfig({
                onClearSuccess: () => {
                    currentEventAdminData = null; // Update main's copy
                    isEventDirty = false;
                    initialEventData = getEventFormData(); // Recapture state (empty form)
                }
            });
        });
    }

    // Event listeners for event form dirty checking
    [eventNameInputEl, eventStartTimeInputEl, eventEndTimeInputEl, eventEnableMessageCheckboxEl].forEach(el => {
        if (el) {
            const eventType = el.type === 'checkbox' ? 'change' : 'input';
            el.addEventListener(eventType, () => {
                isEventDirty = (getEventFormData() !== initialEventData);
            });
        }
    });


    // showScreen and proceedWithShowScreen functions
    const showScreen = (screenId, forceNavigation = false) => {
        const activeScreenEl = document.querySelector('.admin-page-container .screen.active');
        let currentScreenDirtyFlag = false;
        let currentScreenSaveFunction = null;
        let currentScreenResetDirtyFunction = null;
        let currentScreenName = '';

        if (activeScreenEl) {
            if (activeScreenEl.id === 'admin-settings-screen' && isSettingsDirty) { /* ... as before ... */ }
            else if (activeScreenEl.id === 'admin-customization-screen' && isCustomizationsDirty) { /* ... as before ... */ }
            else if (activeScreenEl.id === 'admin-questions-screen' && isQuestionFormDirty /* ... */) { /* ... as before ... */ }
            else if (activeScreenEl.id === 'admin-event-screen' && isEventDirty) {
                currentScreenDirtyFlag = true;
                currentScreenSaveFunction = (isNav) => eventManager.saveCurrentEvent(isNav, {
                    onSaveSuccess: (updatedData) => { currentEventAdminData = updatedData; isEventDirty = false; initialEventData = getEventFormData(); },
                });
                currentScreenResetDirtyFunction = () => { isEventDirty = false; initialEventData = getEventFormData(); };
                currentScreenName = 'Gerenciar Evento';
            }
        }

        if (!forceNavigation && currentScreenDirtyFlag) {
            navigationTargetScreen = screenId;
            utilShowConfirm(
                \`Você tem alterações não salvas em "\${currentScreenName}". Deseja continuar?\`,
                {
                    onSaveAndProceed: () => {
                        if (currentScreenSaveFunction) {
                            const saveSuccessful = currentScreenSaveFunction(true);
                            if (saveSuccessful !== false) {
                                if (currentScreenResetDirtyFunction) currentScreenResetDirtyFunction();
                                proceedWithShowScreen(navigationTargetScreen);
                            }
                        }
                    },
                    onDiscardAndProceed: () => {
                        if (currentScreenResetDirtyFunction) currentScreenResetDirtyFunction();
                        proceedWithShowScreen(navigationTargetScreen);
                    },
                    onCancel: () => {
                        navigationTargetScreen = null;
                    }
                },
                'warning',
                { title: "Alterações Não Salvas", showSaveButton: true, saveButtonText: "Salvar e Sair", discardButtonText: "Sair sem Salvar", cancelButtonText: "Cancelar" }
            );
            return;
        }
        proceedWithShowScreen(screenId);
    };

    const proceedWithShowScreen = (screenId) => {
        uiAdmin.setAdminScreenVisibility(screenId);
        navigationTargetScreen = null;

        const devModeToggleCheckbox = document.getElementById('dev-mode-toggle');
        const logoFilenameInput = document.getElementById('logo-filename-input');
        const backgroundFilenameInput = document.getElementById('background-filename-input');
        const enableCustomBackgroundCheckbox = document.getElementById('enable-custom-background');


        if (screenId === 'admin-settings-screen') {
            if (devModeToggleCheckbox) devModeToggleCheckbox.checked = devModeActive;
            if (logoFilenameInput) logoFilenameInput.value = utilGetFromLocalStorage(CUSTOM_LOGO_FILENAME_KEY, '') || '';
            if (backgroundFilenameInput) backgroundFilenameInput.value = settings.customBackgroundFileName || '';
            if (enableCustomBackgroundCheckbox) enableCustomBackgroundCheckbox.checked = settings.enableCustomBackground;
            initialSettingsData = getSettingsFormData();
            isSettingsDirty = false;
        }
        else if (screenId === 'admin-customization-screen') {
            initialCustomizationsData = getCustomizationsFormData();
            isCustomizationsDirty = false;
        }
        else if (screenId === 'admin-questions-screen') {
            initialQuestionFormData = getQuestionFormData();
            isQuestionFormDirty = false;
        }
        else if (screenId === 'admin-event-screen') {
            eventManager.loadCurrentEventToUI();
            initialEventData = getEventFormData();
            isEventDirty = false;
        }
    };

    // Setup main event listeners
    if (goToQuizBtn) goToQuizBtn.addEventListener('click', () => attemptNavigation('index.html', 'redirect'));
    if (adminLoginBtn && adminPasswordInput && adminLoginErrorEl) {
        adminLoginBtn.addEventListener('click', () => {
            if (adminPasswordInput.value === ADMIN_PASSWORD) {
                adminPasswordInput.value = '';
                if(adminLoginErrorEl) adminLoginErrorEl.classList.add('hidden');

                settings = getFromLocalStorage('quizSettings', DEFAULT_SETTINGS);
                quizCustomizations = getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, DEFAULT_CUSTOMIZATIONS);
                devModeActive = utilGetFromLocalStorage(DEV_MODE_LS_KEY, 'false') === 'true';

                uiAdmin.loadAdminFontPreference();
                uiAdmin.applyAdminCustomLogo(utilGetFromLocalStorage(CUSTOM_LOGO_FILENAME_KEY, null), DEFAULT_LOGO_SRC);
                uiAdmin.applyAdminThemeCustomizations(quizCustomizations, DEFAULT_CUSTOMIZATIONS.colors);
                uiAdmin.applyAdminCustomBackground(settings, quizCustomizations, DEFAULT_CUSTOMIZATIONS.colors);
                uiAdmin.applyAdminDevModeVisuals(devModeActive);

                showScreen('admin-dashboard-screen');
            } else {
                if(adminLoginErrorEl) {
                    adminLoginErrorEl.classList.remove('hidden');
                    adminLoginErrorEl.textContent = 'Senha incorreta. Tente novamente.';
                }
            }
        });
        adminPasswordInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); adminLoginBtn.click(); }});
    }
    if (adminLogoutIconBtn) { adminLogoutIconBtn.addEventListener('click', () => { attemptNavigation('admin-login-screen'); });  }
    if(adminDashboardCards) adminDashboardCards.forEach(card => card.addEventListener('click', () => attemptNavigation(card.dataset.targetScreen)));
    if(adminBackButtons) adminBackButtons.forEach(button => button.addEventListener('click', () => attemptNavigation(button.dataset.targetScreen)));

    if(decreaseFontButton) decreaseFontButton.addEventListener('click', () => uiAdmin.decrementAdminFontStep());
    if(increaseFontButton) increaseFontButton.addEventListener('click', () => uiAdmin.incrementAdminFontStep());

    const attemptNavigation = (target, action = 'showScreen') => {
        const activeScreenEl = document.querySelector('.admin-page-container .screen.active');
        let isDirty = false;
        let dirtyScreenName = '';
        if (activeScreenEl) {
            if (activeScreenEl.id === 'admin-settings-screen' && isSettingsDirty) {isDirty = true; dirtyScreenName = 'Configurações Gerais';}
            else if (activeScreenEl.id === 'admin-customization-screen' && isCustomizationsDirty) {isDirty = true; dirtyScreenName = 'Personalização';}
            else if (activeScreenEl.id === 'admin-questions-screen' && isQuestionFormDirty && !document.getElementById('add-edit-question-form').classList.contains('hidden')) {isDirty = true; dirtyScreenName = 'Formulário de Questão';}
            else if (activeScreenEl.id === 'admin-event-screen' && isEventDirty) {isDirty = true; dirtyScreenName = 'Gerenciar Evento';}
        }

        if (isDirty) {
            utilShowConfirm(\`Você tem alterações não salvas em "\${dirtyScreenName}". Deseja sair sem salvar?\`, {
                onDiscardAndProceed: () => {
                    if (activeScreenEl.id === 'admin-settings-screen') isSettingsDirty = false;
                    else if (activeScreenEl.id === 'admin-customization-screen') isCustomizationsDirty = false;
                    else if (activeScreenEl.id === 'admin-questions-screen') isQuestionFormDirty = false;
                    else if (activeScreenEl.id === 'admin-event-screen') isEventDirty = false;

                    if (action === 'showScreen') showScreen(target, true);
                    else if (action === 'redirect') window.location.href = target;
                },
                onCancel: () => {}
            }, 'warning', { title: "Alterações Não Salvas", showSaveButton: false, discardButtonText: "Sair sem Salvar", cancelButtonText: "Continuar Editando" });
        } else {
            if (action === 'showScreen') showScreen(target, true);
            else if (action === 'redirect') window.location.href = target;
        }
    };

    // Initial screen display
    if (devModeActive) {
        console.warn("MODO DE DESENVOLVIMENTO ATIVADO: Login pulado.");
        settings = getFromLocalStorage('quizSettings', DEFAULT_SETTINGS);
        quizCustomizations = getFromLocalStorage(QUIZ_CUSTOMIZATIONS_KEY, DEFAULT_CUSTOMIZATIONS);

        uiAdmin.loadAdminFontPreference();
        uiAdmin.applyAdminCustomLogo(utilGetFromLocalStorage(CUSTOM_LOGO_FILENAME_KEY, null), DEFAULT_LOGO_SRC);
        uiAdmin.applyAdminThemeCustomizations(quizCustomizations, DEFAULT_CUSTOMIZATIONS.colors);
        uiAdmin.applyAdminCustomBackground(settings, quizCustomizations, DEFAULT_CUSTOMIZATIONS.colors);
        uiAdmin.applyAdminDevModeVisuals(devModeActive);
        showScreen('admin-dashboard-screen', true);
    } else {
        showScreen('admin-login-screen', true);
    }
    console.log('temp_main.js setup complete with eventManager integration.');
});
