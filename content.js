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
    pathComps = sitePath.split("/");
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
                        <div id="repobuddy-dropdown-list"></div>
                        <div id="repobuddy-dropdown-checkboxes"></div>
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

        repobuddySidebar = document.getElementById("repobuddy-sidebar")

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
        chevronButton.addEventListener("click", () => {
            if (chevronButton.src == chrome.runtime.getURL("assets/chevron-down.svg")) {
                chevronButton.src = chrome.runtime.getURL("assets/chevron-up.svg");
            } else {
                chevronButton.src = chrome.runtime.getURL("assets/chevron-down.svg");
            }
        });

        document.body.addEventListener("click", (event) => {
            if (dropdownButton.contains(event.target) || chevronButton.contains(event.target)) {
                showFileDropdown(dropdownContainer.style.visibility == "hidden" ? "visible" : "hidden");
            }
            else if (!dropdownContainer.contains(event.target)) {
                showFileDropdown("hidden");
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
            if (document.getElementById("repobuddy-sidebar")) injectSidebar();
        } else {
            document.body.removeChild(repobuddySidebar);
        }
    // Do something here
    }
});

observer.observe(document.body, { childList: true, subtree: true });


// GITHUB RETRIEVAL
async function getRepoPaths() {
    console.log('start');
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
            console.log(responseData.data);
            
            // clearing the dropdownList and dropdownCheckboxes
            dropdownList.innerHTML = "";
            dropdownCheckboxes.innerHTML = "";

            let fileDiv = document.createElement("div");
            dropdownList.appendChild(fileDiv);
            // convert pathnames to JSON-style fileHierarchy
            const fileHierarchy = {
                "type": "root", 
                "parentDiv": fileDiv, 
                "content": {}
            };
            for (let path of responseData.data) {
                let pathParts = path.split("/");
                let currFileLocation = fileHierarchy;
                
                for (let i = 0; i < pathParts.length; i++) {

                    let collapsibleFolder = document.createElement("div");
                    
                    let labelDiv = document.createElement("div");
                    labelDiv.style.display = "flex";
                    labelDiv.style.flexDirection = "row";

                    let collapsibleSection = document.createElement("div");
                    collapsibleSection.style.paddingLeft = "20px";
                    collapsibleSection.style.display = "flex";
                    collapsibleSection.style.flexDirection = "column";
                    collapsibleSection.height = "100px";
                    collapsibleSection.width = "100px";

                    let label = document.createElement("label");
                    label.className = "repobuddy-dropdown-label";
                    label.for = path;
                    label.innerHTML = pathParts[i];
                    console.log(pathParts[i]);
                    
                    let checkbox = document.createElement("input");
                    checkbox.className = "repobuddy-dropdown-checkbox"
                    checkbox.type = "checkbox";
                    checkbox.id = path;
                    checkbox.name = path;

                    // creating HTML elements, folder display
                    let folderFileIcon = document.createElement("img");
                    folderFileIcon.style.alignSelf = "center";
                    
                    if (i == pathParts.length-1) {
                        currFileLocation["content"][pathParts[i]] = {
                            "type": "file",
                            "content": path
                        };

                        folderFileIcon.width = "13";
                        folderFileIcon.height = "13";
                        folderFileIcon.style.marginRight = "5px"
                        folderFileIcon.src = chrome.runtime.getURL("assets/code.svg");
                        
                        labelDiv.appendChild(folderFileIcon);
                        labelDiv.appendChild(label)
                        dropdownCheckboxes.appendChild(checkbox);
                        collapsibleFolder.appendChild(labelDiv); // bundling all elements

                        currFileLocation['parentDiv'].appendChild(collapsibleFolder); // adding to DOM
                    } else {
                        if (!(pathParts[i] in currFileLocation["content"])) {
                            currFileLocation["content"][pathParts[i]] = {
                                "type": "folder",
                                "content": {},
                                "parentDiv": collapsibleSection, // add an ACTUAL subdiv for this
                            }
                            
                            folderFileIcon.width = "16";
                            folderFileIcon.height = "16";
                            folderFileIcon.src = chrome.runtime.getURL("assets/chevron-right.svg");
                            folderFileIcon.addEventListener("click", () => {
                                if (folderFileIcon.src == chrome.runtime.getURL("assets/chevron-right.svg")) {
                                    folderFileIcon.src = chrome.runtime.getURL("assets/chevron-down.svg");
                                } else {
                                    folderFileIcon.src = chrome.runtime.getURL("assets/chevron-right.svg");
                                }
                            })
    
                            labelDiv.appendChild(folderFileIcon);
                            labelDiv.appendChild(label);
                            dropdownCheckboxes.appendChild(checkbox);
                            collapsibleFolder.appendChild(labelDiv); // bundling label divs
                            collapsibleFolder.appendChild(collapsibleSection);
    
                            currFileLocation['parentDiv'].appendChild(collapsibleFolder); // adding to DOM
                        }
                        
                        // updating curr path
                        currFileLocation = currFileLocation["content"][pathParts[i]];
                    }
                }
            }
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