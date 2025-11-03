/* DOM Parser - Extract Code Blocks and Page Structure */
/* Integrates with ContextMonitor for privacy-first monitoring */
(function () {
    'use strict';

    if (window.CodeFlowDOMParserInitialized) return;
    window.DOMParserInitialized = true;

    class DOMContentParser {
        constructor() {
            console.log('[DOMParser] ✅ Initialized');
        }

        // Extract all code blocks from page
        extractCodeBlocks() {
            const codeBlocks = [];

            // Find code in pre/code tags
            document.querySelectorAll('pre code, pre, code[class*="language-"]').forEach((el, index) => {
                const content = el.textContent || el.innerText;
                if (content.trim().length > 10) {
                    codeBlocks.push({
                        id: `code_${index}`,
                        type: 'code_block',
                        content: content.trim(),
                        language: this.detectLanguage(el),
                        location: this.getElementPath(el),
                        lines: content.split('\n').length,
                        characters: content.length,
                        timestamp: Date.now()
                    });
                }
            });

            // Find CodeMirror editors (GitHub, JSFiddle, etc.)
            document.querySelectorAll('.CodeMirror').forEach((el, index) => {
                try {
                    const cm = el.CodeMirror;
                    if (cm && typeof cm.getValue === 'function') {
                        const content = cm.getValue();
                        if (content.trim().length > 10) {
                            codeBlocks.push({
                                id: `codemirror_${index}`,
                                type: 'code_editor',
                                content: content,
                                language: cm.getOption('mode') || 'unknown',
                                location: 'CodeMirror Editor',
                                lines: cm.lineCount(),
                                characters: content.length,
                                timestamp: Date.now()
                            });
                        }
                    }
                } catch (e) {
                    console.warn('[DOMParser] CodeMirror access failed:', e.message);
                }
            });

            // Find Monaco editors (VS Code Online, CodeSandbox)
            document.querySelectorAll('.monaco-editor').forEach((el, index) => {
                const content = el.textContent?.substring(0, 2000) || '';
                if (content.trim().length > 10) {
                    codeBlocks.push({
                        id: `monaco_${index}`,
                        type: 'code_editor',
                        content: content,
                        language: 'unknown',
                        location: 'Monaco Editor',
                        timestamp: Date.now()
                    });
                }
            });

            // Find Ace editors
            document.querySelectorAll('.ace_editor').forEach((el, index) => {
                try {
                    const editor = ace?.edit(el);
                    if (editor && typeof editor.getValue === 'function') {
                        const content = editor.getValue();
                        if (content.trim().length > 10) {
                            codeBlocks.push({
                                id: `ace_${index}`,
                                type: 'code_editor',
                                content: content,
                                language: editor.getSession()?.getMode()?.$id || 'unknown',
                                location: 'Ace Editor',
                                lines: editor.getSession()?.getLength() || 0,
                                timestamp: Date.now()
                            });
                        }
                    }
                } catch (e) {
                    console.warn('[DOMParser] Ace editor access failed:', e.message);
                }
            });

            if (codeBlocks.length > 0) {
                console.log(`[DOMParser] ✅ Found ${codeBlocks.length} code blocks`);
            }

            return codeBlocks;
        }

        // Detect programming language from element
        detectLanguage(element) {
            // Check class names
            const classes = element.className || '';
            const langMatch = classes.match(/language-(\w+)|lang-(\w+)|hljs-(\w+)/);
            if (langMatch) return langMatch[1] || langMatch[2] || langMatch[3];

            // Check data attributes
            const dataLang = element.getAttribute('data-language') ||
                element.getAttribute('data-lang');
            if (dataLang) return dataLang;

            // Check parent elements
            let parent = element.parentElement;
            for (let i = 0; i < 3 && parent; i++) {
                const parentClasses = parent.className || '';
                const parentLang = parentClasses.match(/language-(\w+)|lang-(\w+)/);
                if (parentLang) return parentLang[1] || parentLang[2];
                parent = parent.parentElement;
            }

            // Guess from content
            const content = element.textContent || '';
            if (content.includes('function') || content.includes('const ') || content.includes('let ')) return 'javascript';
            if (content.includes('def ') || content.includes('import ')) return 'python';
            if (content.includes('#include') || content.includes('int main')) return 'cpp';
            if (content.includes('public class') || content.includes('import java')) return 'java';
            if (content.includes('<?php')) return 'php';

            return 'unknown';
        }

        // Get element path for location tracking
        getElementPath(element) {
            const path = [];
            let current = element;

            while (current && current.nodeType === Node.ELEMENT_NODE && path.length < 5) {
                let selector = current.tagName.toLowerCase();
                if (current.id) selector += `#${current.id}`;
                else if (current.className) {
                    const classes = current.className.toString().split(' ').slice(0, 2).join('.');
                    if (classes) selector += `.${classes}`;
                }
                path.unshift(selector);
                current = current.parentElement;
            }

            return path.join(' > ');
        }

        // Extract page metadata
        extractPageMetadata() {
            return {
                url: window.location.href,
                title: document.title,
                description: document.querySelector('meta[name="description"]')?.content || '',
                domain: window.location.hostname,
                path: window.location.pathname,
                timestamp: Date.now()
            };
        }

        // Get visible text content (for context)
        getVisibleText() {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        const parent = node.parentElement;
                        if (!parent) return NodeFilter.FILTER_REJECT;

                        const style = window.getComputedStyle(parent);
                        if (style.display === 'none' || style.visibility === 'hidden') {
                            return NodeFilter.FILTER_REJECT;
                        }

                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );

            const texts = [];
            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (text.length > 20) texts.push(text);
                if (texts.length >= 50) break; // Limit for performance
            }

            return texts;
        }

        // Full page analysis (called by ContextMonitor)
        analyzePage() {
            console.log('[DOMParser] 📊 Analyzing page...');

            const analysis = {
                metadata: this.extractPageMetadata(),
                codeBlocks: this.extractCodeBlocks(),
                textContent: this.getVisibleText(),
                stats: {
                    totalCodeBlocks: 0,
                    totalCodeLines: 0,
                    totalText: 0,
                    timestamp: Date.now()
                }
            };

            // Calculate stats
            analysis.stats.totalCodeBlocks = analysis.codeBlocks.length;
            analysis.stats.totalCodeLines = analysis.codeBlocks.reduce((sum, block) => sum + (block.lines || 0), 0);
            analysis.stats.totalText = analysis.textContent.join(' ').length;

            console.log('[DOMParser] ✅ Analysis complete:', {
                codeBlocks: analysis.stats.totalCodeBlocks,
                lines: analysis.stats.totalCodeLines
            });

            return analysis;
        }

        // Get status (for debugging)
        getStatus() {
            return {
                initialized: true,
                timestamp: Date.now()
            };
        }
    }

    // Export globally (matches your existing pattern)
    window.CodeFlowDOMParser = new DOMContentParser();
    console.log('[DOMParser] ✅ Ready - waiting for monitoring to start');
})();
