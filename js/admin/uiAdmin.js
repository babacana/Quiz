// js/admin/uiAdmin.js

// Imports from shared utils will be added if needed (e.g. for getFromLocalStorage if ui needs it directly)
// For now, focusing on functions moved from original admin.js

// DOM Element references to be populated by initAdminUIElements
let adminPageContainerElement;
let htmlAdminEl; // For font size
let screensAdminNodeList;
// Add other specific admin UI elements as needed by the functions below

const ADMIN_FONT_SIZES_PX = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
let currentAdminFontStep = ADMIN_FONT_SIZES_PX.indexOf(18);
if (currentAdminFontStep === -1) {
    currentAdminFontStep = ADMIN_FONT_SIZES_PX.indexOf(16) !== -1 ? ADMIN_FONT_SIZES_PX.indexOf(16) : Math.floor(ADMIN_FONT_SIZES_PX.length / 2);
}

// Placeholder for DEFAULT_LOGO_SRC, should be passed or imported from a config
const ADMIN_DEFAULT_LOGO_SRC = 'assets/logo.png';

export function initAdminUIElements() {
    adminPageContainerElement = document.querySelector('.admin-page-container');
    htmlAdminEl = document.documentElement;
    screensAdminNodeList = document.querySelectorAll('.admin-page-container .screen');
    // Query other common admin UI elements here if needed by multiple functions
}

export function applyAdminFontSize() {
    if (!htmlAdminEl) htmlAdminEl = document.documentElement;
    if (currentAdminFontStep < 0) currentAdminFontStep = 0;
    if (currentAdminFontStep >= ADMIN_FONT_SIZES_PX.length) currentAdminFontStep = ADMIN_FONT_SIZES_PX.length - 1;
    htmlAdminEl.style.fontSize = `\${ADMIN_FONT_SIZES_PX[currentAdminFontStep]}px`;

    const decreaseBtn = document.getElementById('decrease-font'); // Assuming admin has these
    const increaseBtn = document.getElementById('increase-font');
    if (decreaseBtn) decreaseBtn.disabled = currentAdminFontStep === 0;
    if (increaseBtn) increaseBtn.disabled = currentAdminFontStep >= ADMIN_FONT_SIZES_PX.length - 1;
}

export function loadAdminFontPreference() {
    currentAdminFontStep = ADMIN_FONT_SIZES_PX.indexOf(18);
    if (currentAdminFontStep === -1) {
        currentAdminFontStep = ADMIN_FONT_SIZES_PX.indexOf(16) !== -1 ? ADMIN_FONT_SIZES_PX.indexOf(16) : Math.floor(ADMIN_FONT_SIZES_PX.length / 2);
    }
    applyAdminFontSize();
}
// These will be called by event listeners in main admin script
export function incrementAdminFontStep() {
    if (currentAdminFontStep < ADMIN_FONT_SIZES_PX.length - 1) {
        currentAdminFontStep++;
        applyAdminFontSize();
    }
}
export function decrementAdminFontStep() {
     if (currentAdminFontStep > 0) {
        currentAdminFontStep--;
        applyAdminFontSize();
    }
}


export function applyAdminCustomLogo(logoFileName, defaultLogoSrc = ADMIN_DEFAULT_LOGO_SRC) {
    const finalLogoSrc = logoFileName ? `assets/\${logoFileName}` : defaultLogoSrc;
    const logoElements = document.querySelectorAll('.admin-page-container .caesb-logo'); // Scope to admin
    logoElements.forEach(logoEl => {
        logoEl.src = finalLogoSrc;
        logoEl.onerror = () => {
            logoEl.src = defaultLogoSrc;
            // Optionally, display an error message using a shared alert or a dedicated UI element
            const logoStatusMessageEl = document.getElementById('logo-status-message');
            if (logoStatusMessageEl && logoFileName) {
                 logoStatusMessageEl.textContent = \`Erro: Arquivo '\${logoFileName}' não encontrado em 'assets/'. Usando logo padrão.\`;
                 logoStatusMessageEl.className = 'status-message error';
            }
        };
    });
    const logoPreviewImg = document.getElementById('logo-preview-img'); // Specific to settings screen
    if (logoPreviewImg) {
        logoPreviewImg.src = finalLogoSrc;
        logoPreviewImg.onerror = () => { logoPreviewImg.src = defaultLogoSrc; };
    }
}

export function applyAdminThemeCustomizations(quizCustomizationsData, defaultColors) {
    if (!document.body) return; // Should not happen on DOMContentLoaded
    const adminBody = document.body;
    // Use the quiz's main background for the admin body background
    const adminBgColor = quizCustomizationsData.colors.quizMainBackground || defaultColors.quizMainBackground;
    adminBody.style.backgroundColor = adminBgColor;
}

export function applyAdminCustomBackground(adminSettings, adminCustomizations, defaultAdminColors) {
    if (!document.body) return;
    const adminBody = document.body;

    if (adminSettings.enableCustomBackground && adminSettings.customBackgroundFileName) {
        const imgPath = \`assets/\${adminSettings.customBackgroundFileName}\`;
        adminBody.style.backgroundImage = \`url('\${imgPath}')\`;
        adminBody.style.backgroundSize = 'cover';
        adminBody.style.backgroundPosition = 'center bottom';
        adminBody.style.backgroundRepeat = 'no-repeat';
        adminBody.style.backgroundColor = ''; // Clear solid background color
    } else {
        adminBody.style.backgroundImage = ''; // Remove image
        // Fallback to theme color
        adminBody.style.backgroundColor = adminCustomizations.colors.quizMainBackground || defaultAdminColors.quizMainBackground;
    }
}

export function applyAdminDevModeVisuals(devModeActiveState) {
    if (!adminPageContainerElement) adminPageContainerElement = document.querySelector('.admin-page-container');
    if (adminPageContainerElement) {
        adminPageContainerElement.classList.toggle('admin-dev-mode-active', devModeActiveState);
    }
}

// showScreen and proceedWithShowScreen are complex and tightly coupled with loading data for each screen.
// They will be part of js/admin/main.js initially and call specific UI update functions from here
// or from other new modules like settingsManager.js, questionManager.js etc.
// For now, we define a simpler screen visibility toggle.
export function setAdminScreenVisibility(screenIdToShow) {
    if (!screensAdminNodeList) screensAdminNodeList = document.querySelectorAll('.admin-page-container .screen');

    screensAdminNodeList.forEach(screen => {
        screen.style.display = (screen.id === screenIdToShow) ? 'flex' : 'none';
        screen.classList.toggle('active', screen.id === screenIdToShow);
    });

    const adminLogoutIconBtn = document.getElementById('admin-logout-icon-btn');
    if (adminLogoutIconBtn) {
        adminLogoutIconBtn.classList.toggle('hidden', screenIdToShow === 'admin-login-screen');
    }
    if (screenIdToShow === 'admin-login-screen') {
        const adminLoginErrorEl = document.getElementById('admin-login-error');
        if (adminLoginErrorEl) adminLoginErrorEl.classList.add('hidden');
    }
}

// Placeholder for functions that would update specific screen content,
// e.g., populating forms or lists. These will be more detailed later.
// Example:
// export function displayAdminSettings(settingsData) { ... }
// export function displayAdminQuestions(questionsArray) { ... }

console.log('js/admin/uiAdmin.js loaded');
