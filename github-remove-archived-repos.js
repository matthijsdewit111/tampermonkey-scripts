// ==UserScript==
// @name         Hide Internal Archive Repos
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Remove "Internal archive" repos from GitHub team list
// @author       OpenAI ChatGPT
// @match        https://github.com/orgs/*/teams/*/repositories*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("Tampermonkey script is running!");

    function removeInternalArchiveRepos() {
        console.log("running function");
        // Select all repo list items
        document.querySelectorAll('.table-list-item.js-team-row').forEach(li => {
            // Find all Label spans
            let labels = li.querySelectorAll('.Label');
            for(let label of labels) {
                if(label.textContent.trim() === "Internal archive" || label.textContent.trim() === "Private archive") {
                    // Remove the repo row if label matches
                    li.remove();
                    break;
                }
            }
        });
    }

    // Initial call
    removeInternalArchiveRepos();

    // Observe DOM changes in the repo list container
    const repoListContainer = document.querySelector('#org-team-repositories ul.team-listing');
    if (repoListContainer) {
        const observer = new MutationObserver(mutations => {
            // Wait for mutations to settle, then run the function
            setTimeout(removeInternalArchiveRepos, 100);
        });
        observer.observe(repoListContainer, {childList: true, subtree: true});
    }

    // Also listen to PJAX/Turbo navigation events, just in case
    document.addEventListener('pjax:end', removeInternalArchiveRepos);
    document.addEventListener('turbo:load', removeInternalArchiveRepos);

})();
