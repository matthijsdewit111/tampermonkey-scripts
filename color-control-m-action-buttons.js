// ==UserScript==
// @name         Color Control-M Workspace Action Buttons
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Makes Submit red and Find/Validate/Check In green
// @author       GitHub Copilot
// @match        https://*.controlm.com/ControlM/Planning*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function styleButton(selector, bgColor, textColor = 'white') {
        const btn = document.querySelector(selector);
        if (!btn) return;

        btn.style.background = bgColor;
        btn.style.color = textColor;
        btn.style.borderColor = bgColor;

        const icon = btn.querySelector('i');
        if (icon) {
            icon.style.color = textColor;
        }

        btn.querySelectorAll('span').forEach(span => {
            span.style.color = textColor;
        });
    }

    function styleButtons() {
        styleButton('[data-test="workspace-submit-btn"]', '#d32f2f');         // red
        styleButton('[data-test="workspace-job-search-button"]', '#2e7d32');  // green
        styleButton('[data-test="workspace-validate-btn"]', '#2e7d32');       // green
        styleButton('[data-test="workspace-check-in-btn"]', '#2e7d32');       // green
    }

    styleButtons();

    const observer = new MutationObserver(() => {
        styleButtons();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();