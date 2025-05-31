// js/quiz/keyboard.js

// Module-scoped variables for the keyboard
let virtualKeyboardEl;
let keyboardResizeHandleEl;
let keyboardTargetInputElement = null;
let currentSettings = {}; // To store settings like enableVirtualKeyboard, virtualKeyboardHeight
let uiApplyVirtualKeyboardHeight; // Function from ui.js
let resetIdleTimerCallback; // Function from main.js

// Variables for resizing logic
let isResizingKeyboard = false;
let initialKeyboardHeightVh;
let initialPointerY;
const MIN_KEYBOARD_HEIGHT_VH = 20; // Keep these constants with the keyboard logic
const MAX_KEYBOARD_HEIGHT_VH = 60;
const DEFAULT_KEYBOARD_HEIGHT_VH = 30;


function createKeyboardResizeHandle() {
    if (!virtualKeyboardEl || document.getElementById('keyboard-resize-handle')) return;

    keyboardResizeHandleEl = document.createElement('div');
    keyboardResizeHandleEl.id = 'keyboard-resize-handle';
    virtualKeyboardEl.prepend(keyboardResizeHandleEl);

    keyboardResizeHandleEl.addEventListener('mousedown', startKeyboardResize);
    keyboardResizeHandleEl.addEventListener('touchstart', startKeyboardResize, { passive: false });
}

function startKeyboardResize(event) {
    if (event.type === 'touchstart') event.preventDefault();
    isResizingKeyboard = true;
    initialPointerY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;

    const currentHeightStyle = virtualKeyboardEl.style.height;
    if (currentHeightStyle && currentHeightStyle.endsWith('vh')) {
        initialKeyboardHeightVh = parseFloat(currentHeightStyle);
    } else {
        initialKeyboardHeightVh = currentSettings.virtualKeyboardHeight || DEFAULT_KEYBOARD_HEIGHT_VH;
    }

    virtualKeyboardEl.classList.add('resizing');

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

    if (uiApplyVirtualKeyboardHeight) {
        uiApplyVirtualKeyboardHeight(newHeightVh, MIN_KEYBOARD_HEIGHT_VH, MAX_KEYBOARD_HEIGHT_VH);
    }
}

function stopKeyboardResize() {
    if (!isResizingKeyboard) return;
    isResizingKeyboard = false;
    if (virtualKeyboardEl) virtualKeyboardEl.classList.remove('resizing');

    document.removeEventListener('mousemove', doKeyboardResize);
    document.removeEventListener('touchmove', doKeyboardResize);
    document.removeEventListener('mouseup', stopKeyboardResize);
    document.removeEventListener('touchend', stopKeyboardResize);

    // Persist the new height if needed (main.js should handle saving this to settings)
    // For now, this module just applies it visually.
}

function onVirtualKeyPress(key) {
    if (!keyboardTargetInputElement) return;
    switch (key) {
        case 'APAGAR': keyboardTargetInputElement.value = keyboardTargetInputElement.value.slice(0, -1); break;
        case 'ESPAÇO': if (keyboardTargetInputElement.id === 'nome') keyboardTargetInputElement.value += ' '; break;
        case 'OK':
            hideVirtualKeyboard();
            if (keyboardTargetInputElement) keyboardTargetInputElement.blur();
            break;
        default: keyboardTargetInputElement.value += key;
    }
    if (keyboardTargetInputElement) keyboardTargetInputElement.dispatchEvent(new Event('input'));
    if (resetIdleTimerCallback) resetIdleTimerCallback();
}

function createVirtualKeyboardInternal() {
    if (!virtualKeyboardEl || !keyboardTargetInputElement) {
        if (virtualKeyboardEl) virtualKeyboardEl.classList.add('hidden');
        return;
    }

    if (uiApplyVirtualKeyboardHeight) {
        uiApplyVirtualKeyboardHeight(
            parseFloat(virtualKeyboardEl.style.height) || currentSettings.virtualKeyboardHeight || DEFAULT_KEYBOARD_HEIGHT_VH,
            MIN_KEYBOARD_HEIGHT_VH,
            MAX_KEYBOARD_HEIGHT_VH
        );
    }

    virtualKeyboardEl.innerHTML = ''; // Clear previous keys
    if (currentSettings.enableVirtualKeyboard && keyboardResizeHandleEl) { // Check if handle exists
        virtualKeyboardEl.prepend(keyboardResizeHandleEl);
    } else if (currentSettings.enableVirtualKeyboard && !keyboardResizeHandleEl && virtualKeyboardEl) {
        // If handle was not created yet (e.g. first time), try to create it.
        createKeyboardResizeHandle();
    }


    let keySet;
    if (keyboardTargetInputElement.id === 'nome') {
        keySet = [['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'], ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'APAGAR'], ['ESPAÇO', 'OK']];
        virtualKeyboardEl.style.gridTemplateColumns = \`repeat(10, 1fr)\`;
    } else if (keyboardTargetInputElement.id === 'telefone') {
        keySet = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['APAGAR', '0', 'OK']];
        virtualKeyboardEl.style.gridTemplateColumns = 'repeat(3, 1fr)';
    } else {
        if (virtualKeyboardEl) virtualKeyboardEl.classList.add('hidden');
        return;
    }

    keySet.forEach((row, rowIndex) => {
        row.forEach(key => {
            const btn = document.createElement('button');
            btn.textContent = key;
            btn.addEventListener('click', () => onVirtualKeyPress(key));
            if (key === 'OK') btn.classList.add('ok-key-highlight');
            if (keyboardTargetInputElement.id === 'nome') {
                if (key === 'APAGAR' && rowIndex === 2) btn.style.gridColumn = 'span 3';
                if (key === 'ESPAÇO' && rowIndex === 3) btn.style.gridColumn = 'span 7';
                if (key === 'OK' && rowIndex === 3) btn.style.gridColumn = 'span 3';
            }
            virtualKeyboardEl.appendChild(btn);
        });
    });
    virtualKeyboardEl.classList.remove('hidden');
    virtualKeyboardEl.style.display = 'grid'; // Ensure display is grid
    if (keyboardResizeHandleEl) keyboardResizeHandleEl.classList.remove('hidden');
}

// --- Exported Functions ---

export function initKeyboard(settings, applyHeightFn, resetTimerFn) {
    virtualKeyboardEl = document.getElementById('virtual-keyboard');
    if (!virtualKeyboardEl) {
        console.error("Virtual keyboard element not found.");
        return;
    }
    currentSettings = settings;
    uiApplyVirtualKeyboardHeight = applyHeightFn; // Function from ui.js
    resetIdleTimerCallback = resetTimerFn; // Function from main.js

    if (currentSettings.enableVirtualKeyboard) {
        createKeyboardResizeHandle(); // Create resize handle if keyboard is generally enabled
    }
}

export function showVirtualKeyboard(targetElement) {
    if (!currentSettings.enableVirtualKeyboard || !virtualKeyboardEl) {
         if (virtualKeyboardEl) virtualKeyboardEl.classList.add('hidden');
         if (keyboardResizeHandleEl) keyboardResizeHandleEl.classList.add('hidden');
        return;
    }
    keyboardTargetInputElement = targetElement;
    createVirtualKeyboardInternal(); // Use the internal function
    if (resetIdleTimerCallback) resetIdleTimerCallback();
}

export function hideVirtualKeyboard() {
    if (virtualKeyboardEl) virtualKeyboardEl.classList.add('hidden');
    if (keyboardResizeHandleEl) keyboardResizeHandleEl.classList.add('hidden');
    if (resetIdleTimerCallback) resetIdleTimerCallback();
}

// This function might be called by main.js if settings change
export function updateKeyboardSettings(newSettings) {
    const oldEnableState = currentSettings.enableVirtualKeyboard;
    currentSettings = { ...currentSettings, ...newSettings };

    if (!virtualKeyboardEl) return;

    if (currentSettings.enableVirtualKeyboard) {
        if (!keyboardResizeHandleEl) { // If it didn't exist and now keyboard is enabled
            createKeyboardResizeHandle();
        }
        // If it's already visible and settings change (e.g. height), re-apply
        if (!virtualKeyboardEl.classList.contains('hidden') && keyboardTargetInputElement) {
             if (uiApplyVirtualKeyboardHeight) {
                uiApplyVirtualKeyboardHeight(currentSettings.virtualKeyboardHeight, MIN_KEYBOARD_HEIGHT_VH, MAX_KEYBOARD_HEIGHT_VH);
            }
        }
    } else { // Keyboard disabled
        virtualKeyboardEl.classList.add('hidden');
        if (keyboardResizeHandleEl) keyboardResizeHandleEl.classList.add('hidden');
    }
}
