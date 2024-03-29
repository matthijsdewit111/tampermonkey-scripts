// ==UserScript==
// @name         Load all jira cloud tickets
// @namespace    http://tampermonkey.net/
// @version      2024-03-19
// @description  Main function is to load all jira tickets on the backlog page in jira cloud to allow ctrl+f/cmd+f
// @author       Matthijs de Wit
// @match        https://afklm.atlassian.net/jira/software/c/projects/*/boards/*/backlog*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let doneScrolling = false;
    const sectionListItemsMap = {};
    const uniqueClassId = "tmprmnky";

    const iterSections = (element, f) => {
        // iterates over all sections of the backlog and executes function f within each section, with an option to break the loop
        const sections = element.childNodes;
        for (let i = 2; i < element.childNodes.length; i++) {
            const section = element.childNodes[i];

            if (section.attributes['data-testid'] === undefined || section.attributes['data-testid'].value.endsWith("divider.container")) {
                continue;
            }

            const sectionId = section.attributes['data-testid'].value;
            // console.log("section id:", sectionId);
            // console.log(section);

            const lastDiv = Array.from(section.childNodes).findLast((x) => x.nodeName === "DIV");

            if (lastDiv === undefined) {
                console.warn(section)
                continue;
            }

            const cardList = lastDiv.childNodes[1];

            if (cardList === undefined || cardList.attributes['data-test-id'] === undefined) {
                continue;
            }

            const listDiv = cardList.firstChild;

            if (listDiv.attributes['data-test-id'] !== undefined && listDiv.attributes['data-test-id'].value.endsWith("empty-card-list")) {
                continue;
            }

            const breakLoop = f(sectionId, listDiv);
            if (breakLoop) break;
        }
    }

    const mainFunction = (cb) => {
        const element = document.querySelector('div[data-test-id="software-backlog.backlog-content.scrollable"]');
        // console.log(element);
        const scrollStepSize = Math.floor(element.clientHeight * 2);
        let currentPos = 0;
        const bottom = element.scrollHeight - element.clientHeight;

        let originalPos = 0;

        const syncRows = () => {
            // keeps manually added rows in sync, so when moving them around it works as expected.
            console.log("syncing rows");

            iterSections(element, (sectionId, listDiv) => {
                for (let jiraListItem of listDiv.childNodes) {
                    if (jiraListItem.nodeName !== "DIV") continue;
                    if (jiraListItem.classList.contains(uniqueClassId)) continue; // skip the ones added by this script

                    // now update the rows added by this script
                    for (let tmprListItem of listDiv.childNodes) {
                        if (tmprListItem.nodeName !== "DIV") continue;
                        if (!tmprListItem.classList.contains(uniqueClassId)) continue; // skip the ones added by jira

                        if (jiraListItem.style !== undefined && tmprListItem.style !== undefined &&
                           jiraListItem.style.top === tmprListItem.style.top) {
                            //console.log("jiraListItem", jiraListItem);
                            //console.log("tmprListItem", tmprListItem);

                            tmprListItem.innerHTML = jiraListItem.innerHTML;
                            break;
                        }
                    }
                }
            });
            setTimeout(syncRows, 10000); // sync every ten seconds
        }

        const fillInRows = () => {
            // manually force the rows into each section, and since they are added manually they are not bound to any jira code.
            console.log("start filling in rows into sections");

            iterSections(element, (sectionId, listDiv) => {
                // listDiv.replaceChildren(); // can't clear elements, page will crash
                // console.log("number of elements in section before insert:", listDiv.childElementCount);
                // console.log(listDiv);
                // console.log(Array.from(listDiv.childNodes).map((x) => x.style.top).join(','));
                // console.log(sectionListItemsMap[sectionId].map((x) => x.style.top).join(','));

                //const listDivItems = Array.from(listDiv.childNodes);
                for (let listItem of sectionListItemsMap[sectionId]) {
                    // lol, we don't need to check if elements already exist, this way works actually better
                    listItem.classList.add(uniqueClassId);
                    listItem.style.zIndex = -999; // make sure it's behind other elements
                    listDiv.appendChild(listItem);
                }

                console.log("number of elements in section after insert:", listDiv.childElementCount);
                // console.log(listDiv);
            });
            setTimeout(syncRows, 10000);
            cb(element); // don't forget to execute callback method
        }

        const scrollInSteps = () => {
            // iterate by scrolling over the page and storing rows in view into a map

            iterSections(element, (sectionId, listDiv) => {
                if (sectionListItemsMap[sectionId] === undefined) {
                    sectionListItemsMap[sectionId] = [];
                }

                console.log("number of elements in section:", listDiv.childElementCount);

                for (let listItem of listDiv.childNodes) {
                    if (listItem.nodeName !== "DIV") continue;
                    if(!sectionListItemsMap[sectionId].some((el) => el.style !== undefined && el.style.top === listItem.style.top)) {
                        sectionListItemsMap[sectionId].push(listItem.cloneNode(true));
                    }
                }
            });

            // scroll down a bit, unless at bottom, then scroll back to original position
            // console.log(currentPos);
            // console.log(bottom);
            if (currentPos < bottom) {
                currentPos += scrollStepSize;
                element.scroll({ top: currentPos, behavior: 'instant' });

            } else {
                // console.log("go back to original position");
                doneScrolling = true;
                element.onscroll = function() {};
                element.scroll({ top: originalPos, behavior: 'instant' });
                // console.log(sectionListItemsMap);
                setTimeout(fillInRows, 10); // don't know why, but calling it without timeout doesn't work as well.
            }
        }

        if (doneScrolling) {
            cb(element);
        } else {
            originalPos = element.scrollTop;
            element.onscroll = scrollInSteps;
            element.scroll({ top: currentPos, behavior: 'instant' });
            if (originalPos === currentPos) {
                // trigger scrollInSteps manually if the element.scroll doesn't scroll page (which would otherwise trigger it)
                scrollInSteps();
            }
        }
    }

    const findTicketWithText = (element, text) => {
        iterSections(element, (sectionId, listDiv) => {
            for (let listItem of listDiv.childNodes) {
                if (listItem.innerHTML.includes(text)) {
                    // console.log("found:", listItem);
                    listItem.scrollIntoView();
                    return true;
                }
            }
        });
    }

    window.onkeydown = function(e){
        if (e.key === "f" && (e.ctrlKey || e.metaKey)) {
            // console.log("ctrl+f or cmd+f");
            mainFunction((element) => {});
        } else if (e.key === "p" && !e.ctrlKey && !e.metaKey) {
            // console.log("only p, without ctrl or cmd");
            mainFunction((element) => {findTicketWithText(element, "**READY TO PLAN**")});
        } else if (e.key === "r" && !e.ctrlKey && !e.metaKey) {
            // console.log("only r, without ctrl or cmd");
            mainFunction((element) => {findTicketWithText(element, "**TO REFINE**")});
        } else if (e.key === "n" && !e.ctrlKey && !e.metaKey) {
            // console.log("only n, without ctrl or cmd");
            mainFunction((element) => {findTicketWithText(element, "**NEW TO BE CATEGORISED**")});
        }
    }
})();
