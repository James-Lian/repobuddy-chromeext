"use strict";

function isRepository() {
    const domain = window.location.hostname;
    if (domain == "github.com") {
        const repoMeta = document.querySelector('meta[name="octolytics-dimension-repository_nwo"]');
        if (repoMeta) {
            return true;
        }
        return false;
    }
    return false;
}

function getOwnerAndRepo() {
    let sitePath = window.location.pathname
    let pathComps = sitePath.split("/");
    console.log(sitePath, pathComps);
    return { owner: pathComps[1], repo: pathComps[2] }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_IS_REPO") {
        // sendResponse(siteData);
    }
});

// DOCUMENT ELEMENTS
let repobuddySidebar;
let chatArea;
let inputBox;
let infoDisplay;
let closeButton;
let dropdownContainer;
let dropdownButton;
let dropdownList;
let dropdownCheckboxes;
let chevronButton;
let selectedFilesContainer;
let selectedFilesCounter;
let selectedFilesCounterText;
let selectedFilesCounterClear;
let selectedFiles;
let selectedFilesSendButton;

let keysPressed = {};

function injectSidebar() {
    if (document.getElementById("repobuddy-sidebar")) return;

    if (isRepository()) {
        console.log("This page is a GitHub repository.")

        const sidebar = document.createElement("div");
        sidebar.id = "repobuddy-sidebar";
        sidebar.innerHTML = `
            <div id="repobuddy-topbar">
                <button id="repobuddy-sidebar-close">Close</button>
                <div id="repobuddy-dropdown">
                    <div id="repobuddy-dropdown-container">
                        <div style="display: flex; flex-direction: row; align-items: stretch; flex: 1; padding: 0px 8px; min-height: 0;">
                            <div id="repobuddy-dropdown-list"></div>
                            <div id="repobuddy-dropdown-checkboxes"></div>
                        </div>
                        <div id="repobuddy-selected-files-container">
                            <div id="repobuddy-selected-files-counter"><span id="repobuddy-selected-files-counter-text">No files selected.</span><a id='repobuddy-selected-files-clear'>Clear</a></div>
                            <div id="repobuddy-selected-files"></div>
                            <button id="repobuddy-selected-files-send-button" disabled>Send (0) files</button>
                        </div>
                    </div>
                    <button id="repobuddy-dropdown-button">Select Files 🔽</button>
                    <img id="repobuddy-dropdown-chevron" width="20px" height="20px" />
                </div>
            </div>
            <div id="repobuddy-chat-area">
                <div id="repobuddy-info" style="text-align: center; font-size: small; color: gray; margin-top: 8px; margin-bottom: 10px;">Ask RepoBuddy about this repository... </div>
            </div>
            <textarea
                id="repobuddy-input-box"
                placeholder="Inquire about code... "
                autofocus
            ></textarea>
        `;
        document.body.appendChild(sidebar);
        document.body.style.marginRight = '300px';

        repobuddySidebar = document.getElementById("repobuddy-sidebar");

        // ATTACH EVENT LISTENERS
        chatArea = document.getElementById("repobuddy-chat-area");
        inputBox = document.getElementById("repobuddy-input-box");

        inputBox.addEventListener('input', () => {
            inputBox.style.height = "";
            inputBox.style.height = inputBox.scrollHeight + "px";
        });

        inputBox.addEventListener('keydown', trackInputBoxInputs);
        inputBox.addEventListener('keyup', createMessage);

        infoDisplay = document.getElementById("repobuddy-info");

        // Topbar
        closeButton = document.getElementById("repobuddy-sidebar-close");
        closeButton.addEventListener('click', () => {
            repobuddySidebar.style.display = "none";
            document.body.style.marginRight = '0px';
        })

        dropdownContainer = document.getElementById("repobuddy-dropdown-container");
        dropdownContainer.style.visibility = "hidden";
        dropdownCheckboxes = document.getElementById("repobuddy-dropdown-checkboxes");
        dropdownButton = document.getElementById("repobuddy-dropdown-button");
        dropdownList = document.getElementById("repobuddy-dropdown-list");

        // shared scrolling
        dropdownCheckboxes.addEventListener("scroll", () => {
            dropdownList.scrollTop = dropdownCheckboxes.scrollTop;
        });
        dropdownList.addEventListener("scroll", () => {
            dropdownCheckboxes.scrollTop = dropdownList.scrollTop;
        })

        chevronButton = document.getElementById("repobuddy-dropdown-chevron");
        chevronButton.src = chrome.runtime.getURL("assets/chevron-down.svg");
        chevronButton.style.cursor = "pointer";

        selectedFilesContainer = document.getElementById("repobuddy-selected-files-container");
        selectedFilesCounter = document.getElementById("repobuddy-selected-files-counter");
        selectedFilesCounterText = document.getElementById("repobuddy-selected-files-counter-text");
        selectedFilesCounterClear = document.getElementById("repobuddy-selected-files-clear");
        selectedFilesCounterClear.addEventListener("click", () => {
            selectedFilesCounterText.innerHTML = "No files selected.";
            selectedFilesSendButton.disabled = true;
            setTimeout(() => {
                for (let file of userSelectedFiles) {
                    file["checkbox"].checked = false;
                }
                userSelectedFiles.length = 0;
            }, 0)
            selectedFiles.innerHTML = "";
        });
        selectedFiles = document.getElementById("repobuddy-selected-files");
        selectedFilesSendButton = document.getElementById("repobuddy-selected-files-send-button");

        document.body.addEventListener("click", (event) => {
            if (dropdownButton.contains(event.target) || chevronButton.contains(event.target)) {
                showFileDropdown(dropdownContainer.style.visibility == "hidden" ? "visible" : "hidden");
                if (chevronButton.src == chrome.runtime.getURL("assets/chevron-down.svg")) {
                    chevronButton.src = chrome.runtime.getURL("assets/chevron-up.svg");
                } else {
                    chevronButton.src = chrome.runtime.getURL("assets/chevron-down.svg");
                }
            }
            else if (!dropdownContainer.contains(event.target)) {
                showFileDropdown("hidden");
                chevronButton.src = chrome.runtime.getURL("assets/chevron-down.svg");
            }
        })

        // add paths to dropdownList options
        getRepoPaths();
        

    } else {
        console.log("This page is not a GitHub repository.");
        alert("This page is not a Github repository.");
    }

}

injectSidebar();


function showSidebar() {
    document.body.style.marginRight = '300px';
}

function showFileDropdown(visibility) {
    dropdownContainer.style.visibility = visibility;
}


/// REFORMAT STUFF WHEN PAGE CHANGES, also run isRepo??
let currentUrl = location.href;

const observer = new MutationObserver(() => {
    if (location.href !== currentUrl) {
        console.log("URL changed:", location.href);
        currentUrl = location.href;
        if (isRepository()) {
            injectSidebar();
            document.body.style.marginRight = '300px';
        } else {
            if (repobuddySidebar) {
                document.body.removeChild(repobuddySidebar);
                document.body.style.marginRight = '0px';
            }
        }
    // Do something here
    }
});

observer.observe(document.body, { childList: true, subtree: true });


// file extensions that are commonly encoded in utf-8
let textFileExtensions = [
    ".adoc",
    ".astro",
    ".bash",
    ".bat",
    ".c",
    ".conf",
    ".cpp",
    ".cs",
    ".css",
    ".csv",
    ".dockerfile",
    ".env",
    ".gitattributes",
    ".gitignore",
    ".go",
    ".h",
    ".hpp",
    ".htm",
    ".html",
    ".ini",
    ".ipynb",
    ".java",
    ".js",
    ".json",
    ".jsx",
    ".kt",
    ".less",
    ".log",
    ".makefile",
    ".markdown",
    ".md",
    ".org",
    ".php",
    ".pl",
    ".ps1",
    ".py",
    ".r",
    ".rb",
    ".rs",
    ".rst",
    ".sass",
    ".scss",
    ".sh",
    ".swift",
    ".tex",
    ".toml",
    ".ts",
    ".tsv",
    ".tsx",
    ".txt",
    ".vue",
    ".xml",
    ".yaml",
    ".yml"
]

function isATextFile(filename) {
    for (let fileExt of textFileExtensions) {
        if (filename.endsWith(fileExt)) return true;
    }
    return false;
}

// files already previously rendered
let loadedFilesAndFolders = [];
let allFilePaths;
let allFileData;
let fileHierarchy;

// dynamically load files in folders when user clicks on them
// i.e. lazy loading
async function loadFilesFolders(folderPath) {
    let folderPathParts = [];
    let currFileLocation = fileHierarchy;
    
    if (folderPath !== "") {
        folderPathParts = folderPath.split("/");
        for (let part of folderPathParts) {
            currFileLocation = currFileLocation["content"][part];
        }
    }

    for (let path of allFilePaths) {
        if (loadedFilesAndFolders.includes(path)) {
            continue;
        };
        if (path.startsWith(folderPath) === true && folderPath !== path) {
            let pathParts = path.split("/");
            let newPathParts;
            if (folderPath !== "") {
                newPathParts = path.replace(folderPath + "/", "").split("/");
            }
            // it's a root folder
            else {
                newPathParts = path.split("/");
            }

            // Initializing DOM elements
            let collapsibleFolder = document.createElement("div");
            
            let labelDiv = document.createElement("div");
            labelDiv.style.display = "flex";
            labelDiv.style.flexDirection = "row";

            let collapsibleSection = document.createElement("div");
            collapsibleSection.style.paddingLeft = "20px";
            collapsibleSection.style.display = "none";
            collapsibleSection.style.flexDirection = "column";
            collapsibleSection.height = "100px";
            collapsibleSection.width = "100px";

            let label = document.createElement("label");
            label.className = "repobuddy-dropdown-label";
            label.innerHTML = newPathParts[0];
            
            let checkboxDiv = document.createElement("div");
            checkboxDiv.style.display = "none";
            checkboxDiv.className = "repobuddy-dropdown-subcheckboxes"
            let checkbox = document.createElement("input");
            checkbox.className = "repobuddy-dropdown-checkbox"
            checkbox.type = "checkbox";

            // creating HTML elements, folder display
            let folderFileIcon = document.createElement("img");
            folderFileIcon.style.alignSelf = "center";
            
            // it's a file
            if (pathParts.length - folderPathParts.length == 1) {
                console.log(path, pathParts.length, folderPathParts.length);
                // updating file hierarchy
                currFileLocation["content"][newPathParts[0]] = {
                    "type": "file",
                    "content": path,
                    "path": path,
                };

                // loading DOM elements for file UI
                folderFileIcon.width = "13";
                folderFileIcon.height = "13";
                folderFileIcon.style.marginRight = "5px";
                folderFileIcon.src = chrome.runtime.getURL("assets/code.svg");
                
                label.for = path;

                labelDiv.appendChild(folderFileIcon);
                labelDiv.appendChild(label);
                
                // checking if the file extension is typical of a file encoding that is utf-8, and is thus a text/code file that is valid for the LLM
                if (!isATextFile(path)) {
                    checkbox.disabled = true;
                }
                checkbox.id = path;
                checkbox.name = path;
                checkbox.addEventListener("change", () => {
                    handleSelectedFiles(path, checkbox.checked, checkbox);
                })

                // not the root folder
                if (currFileLocation['checkboxDiv']) {
                    currFileLocation['checkboxDiv'].appendChild(checkbox);
                } 
                // it's the root folder
                else {
                    dropdownCheckboxes.appendChild(checkbox);
                }
                collapsibleFolder.appendChild(labelDiv); // bundling all elements

                // store div element used to contain children files
                currFileLocation['parentDiv'].appendChild(collapsibleFolder); // adding to DOM
                // record loaded files
                loadedFilesAndFolders.push(path);
            } 
            // it's a folder, or a file within more subfolders
            else {
                // if folder does not already exist, create it
                if (!(newPathParts[0] in currFileLocation["content"])) {
                    currFileLocation["content"][newPathParts[0]] = {
                        "type": "folder",
                        "content": {},
                        "path": folderPath !== "" ? folderPath + "/" + newPathParts[0] : newPathParts[0],
                        "parentDiv": collapsibleSection, 
                        "checkboxDiv": checkboxDiv,
                    };

                    // loading DOM elements for file UI
                    folderFileIcon.width = "16";
                    folderFileIcon.height = "16";
                    folderFileIcon.src = chrome.runtime.getURL("assets/chevron-right.svg");
                    // folder collapsing functionality
                    folderFileIcon.addEventListener("click", () => {
                        if (folderFileIcon.src == chrome.runtime.getURL("assets/chevron-right.svg")) {
                            collapsibleSection.style.display = "flex";
                            checkboxDiv.style.display = "flex";
                            loadFilesFolders(folderPath !== "" ? folderPath + "/" + newPathParts[0] : newPathParts[0]);
                            folderFileIcon.src = chrome.runtime.getURL("assets/chevron-down.svg");
                        } else {
                            collapsibleSection.style.display = "none";
                            checkboxDiv.style.display = "none";
                            folderFileIcon.src = chrome.runtime.getURL("assets/chevron-right.svg");
                        }
                    })

                    labelDiv.appendChild(folderFileIcon);
                    label.for = folderPath !== "" ? folderPath + "/" + newPathParts[0] : newPathParts[0];
                    labelDiv.appendChild(label);

                    checkbox.id = folderPath !== "" ? folderPath + "/" + newPathParts[0] : newPathParts[0];
                    checkbox.name = folderPath !== "" ? folderPath + "/" + newPathParts[0] : newPathParts[0];
                    checkbox.style.visibility = "hidden";
                    if (currFileLocation['checkboxDiv']) {
                        currFileLocation['checkboxDiv'].appendChild(checkbox);
                        currFileLocation['checkboxDiv'].appendChild(checkboxDiv);
                    } 
                    // it's the root folder
                    else {
                        dropdownCheckboxes.appendChild(checkbox);
                        dropdownCheckboxes.appendChild(checkboxDiv);
                    }
                    collapsibleFolder.appendChild(labelDiv); // bundling label divs
                    collapsibleFolder.appendChild(collapsibleSection);

                    // store div elements used to contain children files
                    currFileLocation['parentDiv'].appendChild(collapsibleFolder); // adding to DOM
                    // record loaded files
                    loadedFilesAndFolders.push(folderPath !== "" ? folderPath + "/" + newPathParts[0] : newPathParts[0]);
                }

            }
        }
    }
}

let userSelectedFiles = [];
function handleSelectedFiles(filepath, checked, checkbox) {
    if (checked) {
        userSelectedFiles.push({"filepath": filepath, "checkbox": checkbox});
        selectedFiles.innerHTML = "";

        for (let i = 0; i < userSelectedFiles.length; i++) {
            let item = userSelectedFiles[i];

            let selectedFileButton = document.createElement('div');
            selectedFileButton.className = "repobuddy-selected-file-button"
            let selectedFileLabel = document.createElement('div');
            selectedFileLabel.innerHTML = item.filepath
            let selectedFileDelete = document.createElement('img');
            selectedFileDelete.width = 16;
            selectedFileDelete.height = 16;
            selectedFileDelete.src = chrome.runtime.getURL('assets/x.svg');
            
            selectedFileDelete.addEventListener("click", () => {
                // setTimeout so that the element is removed AFTER the document-wide click listener registers
                setTimeout(() => {
                    selectedFileButton.remove();
                    const itemToUncheck = userSelectedFiles.find(elem => elem.filepath === item.filepath)
                    itemToUncheck["checkbox"].checked = false;
                    userSelectedFiles = userSelectedFiles.filter(elem => elem.filepath !== item.filepath);
                }, 0)
            });
            
            selectedFileButton.appendChild(selectedFileLabel);
            selectedFileButton.appendChild(selectedFileDelete);

            selectedFiles.appendChild(selectedFileButton);

            userSelectedFiles[i]["selectedFileButton"] = selectedFileButton;
        }
    } else {
        for (let item of userSelectedFiles) {
            if (item.filepath === filepath) {
                item["selectedFileButton"].remove();
            }
        }
        userSelectedFiles = userSelectedFiles.filter(item => item.filepath !== filepath);
    }

    if (userSelectedFiles.length === 0) {
        selectedFilesCounterText.innerHTML = "No files selected."
        selectedFilesSendButton.disabled = true;
    } else {
        selectedFilesCounterText.innerHTML = `${userSelectedFiles.length} files selected.`
        selectedFilesSendButton.disabled = false;
    }
    selectedFilesSendButton.innerHTML = `Send (${userSelectedFiles.length}) files`
}

// GITHUB RETRIEVAL
async function getRepoPaths() {
    if (isRepository()) {
        const { owner, repo } = getOwnerAndRepo();
        const response = await fetch("https://repobuddy-service.vercel.app/api/githubInfo", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                owner: owner,
                repo: repo, 
                requestType: "repo-paths",
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            let unsortedFiles = responseData.filepaths;
            // sort by folder then file, and then alphabetically
            unsortedFiles.sort((a, b) => {
                let aPathParts = a.split("/");
                let bPathParts = b.split("/");
                if (aPathParts.length === 1 && bPathParts.length !== 1) {
                    return 1;
                } else if (bPathParts.length === 1 && aPathParts.length !== 1) {
                    return -1;
                } else if (aPathParts.length === 1 && bPathParts.length === 1) {
                    return a.localeCompare(b);
                }
                for (let i = 0; i < Math.min(aPathParts.length, bPathParts.length); i++) {
                    if (aPathParts[i] !== bPathParts[i]) {
                        if (i === aPathParts.length - 1) {
                            return 1;
                        } else if (i === bPathParts.length -1) {
                            return -1;
                        }
                        return aPathParts[i].localeCompare(bPathParts[i]);
                    }
                }
                // parent folders come before childrem
                if (aPathParts.length < bPathParts.length) {
                    return -1;
                } else {
                    return 1;
                }
            });

            allFilePaths = Array.from(unsortedFiles);
            allFileData = responseData.additionalData;
            
            // clearing the dropdownList and dropdownCheckboxes
            dropdownList.innerHTML = "";
            dropdownCheckboxes.innerHTML = "";

            // initialize div to contain all file UI
            let fileDiv = document.createElement("div");
            dropdownList.appendChild(fileDiv);

            // convert pathnames to JSON-style fileHierarchy
            fileHierarchy = {
                "type": "root", 
                "parentDiv": fileDiv, 
                "content": {},
            };
            loadFilesFolders(""); // load all files in root directory
        } else {
            console.log("RepoBuddy: An error occurred when retrieving repository filepaths. Retry... ");
        }
    }
}


// CHATTING FUNCTIONS

let history = [];

function trackInputBoxInputs(event) {
    keysPressed[event.key] = true;
}

function createMessage(event) {
    if (keysPressed["Enter"] && !keysPressed["Shift"]) {
        if (inputBox.value.trim() != "") {

            // creating UI content
            let msg = document.createElement("div");
            msg.className = "repobuddy-chat-bubbles user";
            msg.innerHTML = inputBox.value.trim();
            chatArea.appendChild(msg);
            
            // sending to LLM
            sendMsgToLLM(inputBox.value.trim());

            // adding to history
            history.push({
                role: "user",
                parts: [{ text: inputBox.value.trim() }]
            });
        }
        inputBox.value = "";
    }
    keysPressed = {};
}

async function sendMsgToLLM(msg) {
    try {
        const response = await fetch("https://repobuddy-service.vercel.app/api/gemini", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                'type': "LLM-msg",
                'content': {
                    'history': history,
                    'systemInstruction': "System prompt: You are an AI assistant (RepoBuddy) with the discernment and the experience of a senior software developer, created to aid programmers in interpreting and analyzing code on GitHub repositories, which is typically a time-consuming and complex task. You aim to simplify this task for programmers and improve their efficiency by providing insightful, concise explanations, short code snippets, and straightforward, explanatory answers to any of their inquiries regarding this repository. (Some examples of user inquiries: What libraries does this repository use? How does the machine learning component of this project work? After I've cloned this project, what should I do to initiate it?) Since your task is typically to explain code, keep in mind to provide concise, insightful explanations for any code snippets that you provide. When appropriate, such as when you are given extensive context regarding a project and the user asks you to explain it, you can provide causal relationships if possible concerning dependencies, how the code runs, and how it works. The user has the power to decide what files or context is shown to you. The expected format will be text or code. You may also be shown summaries of the file that are generated by another LLM if the file is too large. When you are fed files, the first line will preface with 'This is a file from the [repository-name] repository by [owner]'. The next line will be the file's path. The lines after that will be the file contents, or a summary. Here's an example of how you will be fed files: \nThis is a file from the ReactNativeExample repository by [octocat].\ncomponents/header.tsx\nimport { View, Text } from...\n\nAfter receiving such a file, respond simply with 'File received.'\n\nYou should respond only with text. If the user asks otherwise, explain that you are unable to do so.", 
                    'message': msg
                }
            })
        });
    
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let chunks = [];
    
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
    
            const chunk = decoder.decode(value, { stream: true });
            // Display chunk

            chunks.push(chunk);
        }

        console.log(chunks);

        history.push({
            role: "model",
            parts: [{ text: chunks.join("") }]
        })
    }
    catch (e) {
        console.log("RepoBuddy: An error occurred. Retry... ");
        console.log(e);
    }
}