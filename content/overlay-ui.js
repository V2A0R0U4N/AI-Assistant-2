// Overlay UI - Beautiful glassmorphism interface

class AssistantOverlay {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.isDragging = false;
        this.position = { x: window.innerWidth - 420, y: 80 };
        this.currentSuggestions = [];
    }

    // Create the main overlay structure
    createOverlay() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'codeflow-assistant';
        this.container.className = 'codeflow-overlay';

        // Apply glassmorphism styles
        this.container.style.cssText = `
      position: fixed;
      top: ${this.position.y}px;
      right: 20px;
      width: 380px;
      max-height: 600px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

        // Header
        const header = document.createElement('div');
        header.className = 'codeflow-header';
        header.style.cssText = `
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
    `;

        header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 10px #4ade80;"></div>
        <span style="color: white; font-weight: 600; font-size: 14px;">CodeFlow AI</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="codeflow-minimize" style="background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 18px;">−</button>
        <button id="codeflow-close" style="background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 18px;">×</button>
      </div>
    `;

        // Task overview section
        const taskSection = document.createElement('div');
        taskSection.className = 'codeflow-task';
        taskSection.style.cssText = `
      padding: 16px 20px;
      background: rgba(100, 100, 255, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;

        taskSection.innerHTML = `
      <div style="color: rgba(255,255,255,0.7); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Current Task</div>
      <div id="codeflow-task-text" style="color: white; font-size: 13px; line-height: 1.5;">
        Set your task description in the popup...
      </div>
      <button id="codeflow-edit-task" style="
        margin-top: 10px;
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: white;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      ">Edit Task</button>
    `;

        // Content area (suggestions, next steps, warnings)
        const content = document.createElement('div');
        content.className = 'codeflow-content';
        content.style.cssText = `
      padding: 20px;
      max-height: 400px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.3) transparent;
    `;

        content.innerHTML = `
      <div id="codeflow-suggestions"></div>
      <div id="codeflow-next-steps"></div>
      <div id="codeflow-warnings"></div>
    `;

        // Status footer
        const footer = document.createElement('div');
        footer.className = 'codeflow-footer';
        footer.style.cssText = `
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

        footer.innerHTML = `
      <div style="color: rgba(255,255,255,0.5); font-size: 11px;">
        <span id="codeflow-status">Monitoring...</span>
      </div>
      <div style="color: rgba(255,255,255,0.5); font-size: 11px;">
        <span id="codeflow-time">Just now</span>
      </div>
    `;

        // Assemble
        this.container.appendChild(header);
        this.container.appendChild(taskSection);
        this.container.appendChild(content);
        this.container.appendChild(footer);

        // Add to page
        document.body.appendChild(this.container);

        // Setup event listeners
        this.setupEventListeners(header);

        // Add custom scrollbar styles
        this.addScrollbarStyles();
    }

    // Setup event listeners
    setupEventListeners(header) {
        // Dragging functionality
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;

            this.isDragging = true;
            offsetX = e.clientX - this.container.offsetLeft;
            offsetY = e.clientY - this.container.offsetTop;

            this.container.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;

            this.container.style.left = `${x}px`;
            this.container.style.top = `${y}px`;
            this.container.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.container.style.cursor = 'default';
            }
        });

        // Close button
        document.getElementById('codeflow-close').addEventListener('click', () => {
            this.hide();
            chrome.runtime.sendMessage({ action: 'toggleAssistant' });
        });

        // Minimize button
        document.getElementById('codeflow-minimize').addEventListener('click', () => {
            this.toggleMinimize();
        });

        // Edit task button
        document.getElementById('codeflow-edit-task').addEventListener('click', () => {
            this.showTaskEditor();
        });

        // Hover effects for buttons
        const buttons = this.container.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', (e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            });
            btn.addEventListener('mouseleave', (e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
            });
        });
    }

    // Add scrollbar styles
    addScrollbarStyles() {
        const style = document.createElement('style');
        style.textContent = `
      .codeflow-content::-webkit-scrollbar {
        width: 6px;
      }
      .codeflow-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
      }
      .codeflow-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 10px;
      }
      .codeflow-content::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .suggestion-card {
        animation: slideIn 0.3s ease-out;
        margin-bottom: 12px;
        padding: 14px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        transition: all 0.2s;
      }
      
      .suggestion-card:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateX(-4px);
      }
      
      .warning-card {
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.3);
      }
      
      .step-card {
        background: rgba(59, 130, 246, 0.15);
        border-color: rgba(59, 130, 246, 0.3);
      }
    `;
        document.head.appendChild(style);
    }

    // Show the overlay
    show() {
        if (!this.container) {
            this.createOverlay();
        }
        this.container.style.display = 'block';
        this.container.style.animation = 'slideIn 0.3s ease-out';
        this.isVisible = true;
    }

    // Hide the overlay
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        this.isVisible = false;
    }

    // Toggle minimize
    toggleMinimize() {
        const content = this.container.querySelector('.codeflow-content');
        const taskSection = this.container.querySelector('.codeflow-task');
        const footer = this.container.querySelector('.codeflow-footer');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            taskSection.style.display = 'block';
            footer.style.display = 'flex';
            this.container.style.maxHeight = '600px';
        } else {
            content.style.display = 'none';
            taskSection.style.display = 'none';
            footer.style.display = 'none';
            this.container.style.maxHeight = '60px';
        }
    }

    // Update task description
    updateTask(taskText) {
        const taskElement = document.getElementById('codeflow-task-text');
        if (taskElement) {
            taskElement.textContent = taskText || 'No task description set';
        }
    }

    // Show task editor modal
    showTaskEditor() {
        const modal = document.createElement('div');
        modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999999;
    `;

        modal.innerHTML = `
      <div style="
        background: rgba(30, 30, 30, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 16px;
        padding: 24px;
        width: 500px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      ">
        <h3 style="color: white; margin: 0 0 16px 0; font-size: 18px;">Edit Task Description</h3>
        <textarea id="task-input" style="
          width: 100%;
          height: 120px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 12px;
          color: white;
          font-size: 14px;
          font-family: inherit;
          resize: none;
        " placeholder="Describe what you're working on..."></textarea>
        <div style="display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end;">
          <button id="cancel-task" style="
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: white;
            cursor: pointer;
          ">Cancel</button>
          <button id="save-task" style="
            padding: 10px 20px;
            background: rgba(59, 130, 246, 0.8);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
          ">Save Task</button>
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        // Get current task
        chrome.storage.local.get('taskDescription', (data) => {
            document.getElementById('task-input').value = data.taskDescription || '';
        });

        // Event listeners
        document.getElementById('cancel-task').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('save-task').addEventListener('click', () => {
            const taskText = document.getElementById('task-input').value;
            this.updateTask(taskText);
            chrome.runtime.sendMessage({ action: 'taskUpdate', task: taskText });
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // Update with AI suggestions
    updateSuggestions(data) {
        const suggestionsContainer = document.getElementById('codeflow-suggestions');
        const nextStepsContainer = document.getElementById('codeflow-next-steps');
        const warningsContainer = document.getElementById('codeflow-warnings');

        // Clear previous content
        suggestionsContainer.innerHTML = '';
        nextStepsContainer.innerHTML = '';
        warningsContainer.innerHTML = '';

        // Add suggestions
        if (data.suggestions && data.suggestions.length > 0) {
            const title = document.createElement('div');
            title.style.cssText = `
        color: rgba(255,255,255,0.7);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px;
        font-weight: 600;
      `;
            title.textContent = '💡 Suggestions';
            suggestionsContainer.appendChild(title);

            data.suggestions.forEach((suggestion, index) => {
                const card = this.createSuggestionCard(suggestion, index);
                suggestionsContainer.appendChild(card);
            });
        }

        // Add next steps
        if (data.nextSteps && data.nextSteps.length > 0) {
            const title = document.createElement('div');
            title.style.cssText = `
        color: rgba(255,255,255,0.7);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 20px 0 12px 0;
        font-weight: 600;
      `;
            title.textContent = '🎯 Next Steps';
            nextStepsContainer.appendChild(title);

            data.nextSteps.forEach((step, index) => {
                const card = this.createStepCard(step, index);
                nextStepsContainer.appendChild(card);
            });
        }

        // Add warnings
        if (data.warnings && data.warnings.length > 0) {
            const title = document.createElement('div');
            title.style.cssText = `
        color: rgba(239, 68, 68, 0.9);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 20px 0 12px 0;
        font-weight: 600;
      `;
            title.textContent = '⚠️ Potential Issues';
            warningsContainer.appendChild(title);

            data.warnings.forEach((warning, index) => {
                const card = this.createWarningCard(warning, index);
                warningsContainer.appendChild(card);
            });
        }

        // Update status
        this.updateStatus('Updated');
    }

    // Create suggestion card
    createSuggestionCard(suggestion, index) {
        const card = document.createElement('div');
        card.className = 'suggestion-card';
        card.style.animationDelay = `${index * 0.1}s`;

        card.innerHTML = `
      <div style="color: white; font-size: 13px; line-height: 1.6; margin-bottom: 8px;">
        ${this.escapeHtml(suggestion.text)}
      </div>
      ${suggestion.code ? `
        <pre style="
          background: rgba(0, 0, 0, 0.3);
          padding: 10px;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 12px;
          color: #4ade80;
          margin: 8px 0;
        "><code>${this.escapeHtml(suggestion.code)}</code></pre>
      ` : ''}
      ${suggestion.action ? `
        <button onclick="navigator.clipboard.writeText('${this.escapeHtml(suggestion.code)}')" style="
          margin-top: 8px;
          padding: 6px 12px;
          background: rgba(74, 222, 128, 0.2);
          border: 1px solid rgba(74, 222, 128, 0.4);
          border-radius: 6px;
          color: #4ade80;
          font-size: 11px;
          cursor: pointer;
        ">Copy Code</button>
      ` : ''}
    `;

        return card;
    }

    // Create step card
    createStepCard(step, index) {
        const card = document.createElement('div');
        card.className = 'suggestion-card step-card';
        card.style.animationDelay = `${index * 0.1}s`;

        card.innerHTML = `
      <div style="display: flex; gap: 12px;">
        <div style="
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          font-size: 12px;
          font-weight: 600;
        ">${index + 1}</div>
        <div style="flex: 1; color: white; font-size: 13px; line-height: 1.6;">
          ${this.escapeHtml(step.text)}
        </div>
      </div>
    `;

        return card;
    }

    // Create warning card
    createWarningCard(warning, index) {
        const card = document.createElement('div');
        card.className = 'suggestion-card warning-card';
        card.style.animationDelay = `${index * 0.1}s`;

        card.innerHTML = `
      <div style="color: #fca5a5; font-size: 13px; line-height: 1.6; margin-bottom: 6px;">
        <strong>${this.escapeHtml(warning.title)}</strong>
      </div>
      <div style="color: rgba(255, 255, 255, 0.8); font-size: 12px; line-height: 1.5;">
        ${this.escapeHtml(warning.description)}
      </div>
      ${warning.fix ? `
        <div style="
          margin-top: 8px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          color: #4ade80;
          font-size: 12px;
        ">
          Fix: ${this.escapeHtml(warning.fix)}
        </div>
      ` : ''}
    `;

        return card;
    }

    // Update status
    updateStatus(status) {
        const statusElement = document.getElementById('codeflow-status');
        const timeElement = document.getElementById('codeflow-time');

        if (statusElement) {
            statusElement.textContent = status;
        }

        if (timeElement) {
            timeElement.textContent = 'Just now';
        }
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Show debug help
    showDebugHelp(help) {
        const warningsContainer = document.getElementById('codeflow-warnings');

        const debugCard = document.createElement('div');
        debugCard.className = 'suggestion-card warning-card';
        debugCard.innerHTML = `
      <div style="color: #fca5a5; font-size: 13px; font-weight: 600; margin-bottom: 8px;">
        🐛 Debug Assistance
      </div>
      <div style="color: rgba(255, 255, 255, 0.9); font-size: 12px; line-height: 1.6;">
        ${this.escapeHtml(help.explanation)}
      </div>
      ${help.solution ? `
        <div style="
          margin-top: 12px;
          padding: 10px;
          background: rgba(74, 222, 128, 0.15);
          border: 1px solid rgba(74, 222, 128, 0.3);
          border-radius: 6px;
        ">
          <div style="color: #4ade80; font-size: 11px; font-weight: 600; margin-bottom: 6px;">
            SUGGESTED FIX
          </div>
          <div style="color: white; font-size: 12px;">
            ${this.escapeHtml(help.solution)}
          </div>
        </div>
      ` : ''}
    `;

        warningsContainer.appendChild(debugCard);
    }
}

// Global instance
let assistantOverlay = null;

// Exported functions for content-script.js
function showAssistantUI() {
    if (!assistantOverlay) {
        assistantOverlay = new AssistantOverlay();
    }
    assistantOverlay.show();

    // Load task description
    chrome.storage.local.get('taskDescription', (data) => {
        assistantOverlay.updateTask(data.taskDescription);
    });
}

function hideAssistantUI() {
    if (assistantOverlay) {
        assistantOverlay.hide();
    }
}

function updateAssistantUI(data) {
    if (assistantOverlay && assistantOverlay.isVisible) {
        assistantOverlay.updateSuggestions(data);
    }
}

function showDebugHelp(help) {
    if (assistantOverlay && assistantOverlay.isVisible) {
        assistantOverlay.showDebugHelp(help);
    }
}