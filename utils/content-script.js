// // ----------------------------
// // CONTENT-SCRIPT.JS
// // ----------------------------

// // 1️⃣ Floating Chat Toggle Button
// const floatBtn = document.createElement("button");
// floatBtn.id = "ai-chat-toggle";
// floatBtn.textContent = "🤖";
// floatBtn.className = `
//   fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
//   bg-gradient-to-br from-indigo-600 to-purple-600
//   text-white shadow-lg flex items-center justify-center
//   hover:scale-110 transition-transform
// `;
// document.body.appendChild(floatBtn);

// // 2️⃣ Chat Panel
// const chatPanel = document.createElement("div");
// chatPanel.id = "ai-chat-panel";
// chatPanel.className = `
//   fixed right-6 top-16 w-[400px] h-[calc(100vh-120px)]
//   rounded-2xl shadow-2xl bg-black/70 backdrop-blur-lg
//   z-50 flex flex-col overflow-hidden hidden
// `;
// document.body.appendChild(chatPanel);

// // 2a. Header
// const header = document.createElement("div");
// header.className = "flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white";
// header.innerHTML = `
//   <div>
//     <div class="text-xs font-semibold uppercase opacity-80">Currently Working On</div>
//     <div class="text-sm font-bold" id="chat-project-name">FiberHearts Dashboard</div>
//   </div>
//   <div class="text-xs px-2 py-1 rounded-full bg-black/20" id="chat-live-topic">Monitoring: Payment API</div>
// `;
// chatPanel.appendChild(header);

// // 2b. Messages container
// const messagesContainer = document.createElement("div");
// messagesContainer.id = "chat-messages";
// messagesContainer.className = "flex-1 overflow-auto p-4 space-y-3 bg-black/10";
// chatPanel.appendChild(messagesContainer);

// // 2c. Input bar
// const inputBar = document.createElement("div");
// inputBar.className = "p-3 bg-black/20 border-t border-white/10 flex items-center gap-2";
// inputBar.innerHTML = `
//   <input type="text" id="chat-input" class="flex-1 rounded-xl p-2 bg-black/10 text-white" placeholder="Ask anything..." />
//   <button id="chat-send" class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500">➤</button>
// `;
// chatPanel.appendChild(inputBar);

// // 3️⃣ Toggle Chat Panel Visibility
// floatBtn.addEventListener("click", () => {
//   chatPanel.classList.toggle("hidden");
// });

// // 4️⃣ Messaging Logic
// const input = document.getElementById("chat-input");
// const sendBtn = document.getElementById("chat-send");

// function addMessage(role, text) {
//   const msg = document.createElement("div");
//   msg.className = role === "user"
//     ? "text-right text-white bg-indigo-500/80 p-2 rounded-xl max-w-[80%] ml-auto"
//     : "text-left bg-white/80 text-black p-2 rounded-xl max-w-[80%]";
//   msg.textContent = text;
//   messagesContainer.appendChild(msg);
//   messagesContainer.scrollTop = messagesContainer.scrollHeight;
// }

// // Send button click
// sendBtn.addEventListener("click", () => {
//   const text = input.value.trim();
//   if (!text) return;
//   addMessage("user", text);
//   input.value = "";

//   // Send to background
//   chrome.runtime.sendMessage({ action: "chatMessage", message: text }, (resp) => {
//     addMessage("assistant", resp?.response || "No response from assistant");
//   });
// });

// // Enter key to send
// input.addEventListener("keydown", (e) => {
//   if (e.key === "Enter" && !e.shiftKey) {
//     e.preventDefault();
//     sendBtn.click();
//   }
// });
