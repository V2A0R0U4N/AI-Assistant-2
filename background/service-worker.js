/* Service Worker - Integrated with Google Gemini API */

// --- API Configuration ---
const GEMINI_API_KEY = "AIzaSyCZK64M10nVeeePewb0zOV04RhJesubWKk";
const GEMINI_MODEL = "gemini-2.5-flash";

console.log("[Service Worker] AI Assistant Started with Google Gemini");

chrome.runtime.onInstalled.addListener(() => {
    console.log("[Service Worker] Extension Installed");
    chrome.storage.local.set({
        taskDescription: "",
        monitoringEnabled: true
    });
});

// --- Command Listener for Keyboard Shortcuts ---
chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-sidebar") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSidebar" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error(`Error toggling sidebar: ${chrome.runtime.lastError.message}`);
                    }
                });
            }
        });
    }
});

// --- Main Message Handler from Content Scripts ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "chatMessage") {
        handleChatMessage(request, sendResponse);
        return true; // Indicates an asynchronous response.
    }
    return true;
});

// --- Core Gemini Chat Handler ---
async function handleChatMessage(request, sendResponse) {
    console.log("[Service Worker] Handling chat message for Gemini:", request.message);

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    // System prompt to guide the AI's behavior
    const systemPrompt = "You are CodeFlow AI, an expert coding assistant integrated into a browser extension. Your primary role is to help developers by answering questions, explaining code, debugging issues, and providing code snippets. Always format code snippets using markdown code blocks. Be concise and accurate.";

    const fullPrompt = `${systemPrompt}\n\nUser query: ${request.message}`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                // Gemini API uses a 'contents' structure
                contents: [{
                    parts: [{
                        text: fullPrompt
                    }]
                }],
                // Optional: Add safety settings
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("[Service Worker] Gemini API Error Response:", errorBody);
            throw new Error(`API Error: ${response.status} - ${errorBody.error?.message || 'Failed to get response'}`);
        }

        const data = await response.json();

        // Safely access the response text
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (responseText) {
            console.log("[Service Worker] Gemini API Success, sending response to UI.");
            sendResponse({
                success: true,
                response: responseText
            });
        } else {
            console.error("[Service Worker] Invalid Gemini response structure:", data);
            // Check for blocked responses due to safety settings
            if (data.candidates?.[0]?.finishReason === 'SAFETY') {
                throw new Error("Response was blocked due to safety settings. The prompt may have contained sensitive content.");
            }
            throw new Error("Received an empty or invalid response from the Gemini API.");
        }
    } catch (error) {
        console.error("[Service Worker] Gemini API Fetch Error:", error);
        sendResponse({
            success: false,
            response: `Sorry, there was an error processing your request: ${error.message}. Please check the service worker console for details.`
        });
    }
}