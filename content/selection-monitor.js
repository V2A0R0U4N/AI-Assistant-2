// // Selection Monitor - Tracks user text selections in real-time
// (function() {
//   'use strict';

//   class SelectionMonitor {
//     constructor() {
//       this.lastSelection = null;
//       this.selectionTimeout = null;
//       this.isEnabled = true;
//       this.init();
//     }

//     init() {
//       this.setupListeners();
//       console.log('✅ Selection Monitor initialized');
//     }

//     setupListeners() {
//       // Track mouse up events for selection
//       document.addEventListener('mouseup', (e) => this.handleSelection(e));
      
//       // Track keyboard selections (Shift + Arrow keys)
//       document.addEventListener('keyup', (e) => {
//         if (e.shiftKey) {
//           this.handleSelection(e);
//         }
//       });

//       // Track double-click selections
//       document.addEventListener('dblclick', (e) => this.handleSelection(e));

//       // Listen for enable/disable commands
//       chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//         if (request.action === 'toggleSelectionMonitoring') {
//           this.isEnabled = request.enabled;
//           sendResponse({ success: true, enabled: this.isEnabled });
//         }
//       });
//     }

//     handleSelection(event) {
//       if (!this.isEnabled) return;

//       // Debounce to avoid excessive processing
//       clearTimeout(this.selectionTimeout);
      
//       this.selectionTimeout = setTimeout(() => {
//         const selection = window.getSelection();
//         const selectedText = selection.toString().trim();

//         if (selectedText && selectedText.length > 3) {
//           this.processSelection(selectedText, selection);
//         }
//       }, 300);
//     }

//     processSelection(text, selection) {
//       // Avoid duplicate processing
//       if (this.lastSelection === text) return;
//       this.lastSelection = text;

//       // Get surrounding context
//       const context = this.getSelectionContext(selection);
      
//       // Get page metadata
//       const pageInfo = {
//         url: window.location.href,
//         title: document.title,
//         domain: window.location.hostname
//       };

//       // Create selection data package
//       const selectionData = {
//         text: text,
//         context: context,
//         pageInfo: pageInfo,
//         timestamp: Date.now(),
//         wordCount: text.split(/\s+/).length,
//         type: this.detectSelectionType(text)
//       };

//       // Send to background script
//       chrome.runtime.sendMessage({
//         action: 'textSelected',
//         data: selectionData
//       });

//       // Show visual feedback
//       this.showSelectionPopup(text, selection);

//       console.log('📝 Text selected:', selectionData);
//     }

//     getSelectionContext(selection) {
//       try {
//         const range = selection.getRangeAt(0);
//         const container = range.commonAncestorContainer;
        
//         // Get parent element
//         const parentElement = container.nodeType === 3 
//           ? container.parentElement 
//           : container;

//         // Extract context (surrounding text)
//         const fullText = parentElement.textContent || '';
//         const selectedText = selection.toString();
//         const startIndex = fullText.indexOf(selectedText);
        
//         // Get 100 chars before and after
//         const contextBefore = fullText.substring(
//           Math.max(0, startIndex - 100), 
//           startIndex
//         ).trim();
        
//         const contextAfter = fullText.substring(
//           startIndex + selectedText.length,
//           Math.min(fullText.length, startIndex + selectedText.length + 100)
//         ).trim();

//         return {
//           before: contextBefore,
//           after: contextAfter,
//           fullParagraph: parentElement.textContent.substring(0, 500),
//           elementType: parentElement.tagName.toLowerCase(),
//           parentClasses: Array.from(parentElement.classList)
//         };
//       } catch (error) {
//         console.error('Error getting context:', error);
//         return { before: '', after: '', fullParagraph: '' };
//       }
//     }

//     detectSelectionType(text) {
//       // Detect if selection is code, link, email, etc.
//       if (/^https?:\/\//.test(text)) return 'url';
//       if (/^[\w.-]+@[\w.-]+\.\w+$/.test(text)) return 'email';
//       if (/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/.test(text)) return 'function';
//       if (/^\d+$/.test(text)) return 'number';
//       if (text.split('\n').length > 1) return 'multiline';
//       if (/[{}\[\]();]/.test(text)) return 'code';
//       return 'text';
//     }

//     showSelectionPopup(text, selection) {
//       // Remove existing popup
//       const existingPopup = document.getElementById('selection-ai-popup');
//       if (existingPopup) existingPopup.remove();

//       // Create popup
//       const popup = document.createElement('div');
//       popup.id = 'selection-ai-popup';
//       popup.style.cssText = `
//         position: absolute;
//         background: rgba(102, 126, 234, 0.95);
//         backdrop-filter: blur(10px);
//         color: white;
//         padding: 8px 16px;
//         border-radius: 20px;
//         font-size: 13px;
//         font-weight: 500;
//         box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
//         z-index: 999999;
//         cursor: pointer;
//         transition: all 0.2s;
//         display: flex;
//         align-items: center;
//         gap: 8px;
//         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//         border: 1px solid rgba(255, 255, 255, 0.3);
//       `;

//       popup.innerHTML = `
//         <span>🤖</span>
//         <span>Ask AI about this</span>
//       `;

//       // Position popup near selection
//       const range = selection.getRangeAt(0);
//       const rect = range.getBoundingClientRect();
      
//       popup.style.top = (window.scrollY + rect.top - 50) + 'px';
//       popup.style.left = (window.scrollX + rect.left) + 'px';

//       // Hover effect
//       popup.addEventListener('mouseenter', () => {
//         popup.style.transform = 'scale(1.05)';
//       });

//       popup.addEventListener('mouseleave', () => {
//         popup.style.transform = 'scale(1)';
//       });

//       // Click to open sidebar with selection
//       popup.addEventListener('click', () => {
//         chrome.runtime.sendMessage({
//           action: 'openSidebarWithSelection',
//           text: text
//         });
//         popup.remove();
//       });

//       document.body.appendChild(popup);

//       // Auto-remove after 3 seconds
//       setTimeout(() => {
//         if (popup && popup.parentElement) {
//           popup.style.opacity = '0';
//           setTimeout(() => popup.remove(), 300);
//         }
//       }, 3000);
//     }

//     destroy() {
//       this.isEnabled = false;
//       clearTimeout(this.selectionTimeout);
//       const popup = document.getElementById('selection-ai-popup');
//       if (popup) popup.remove();
//     }
//   }

//   // Create global instance
//   window.selectionMonitor = new SelectionMonitor();

// })();