// // Page Analyzer - Extracts and analyzes current page context
// (function() {
//   'use strict';

//   class PageAnalyzer {
//     constructor() {
//       this.pageData = null;
//       this.updateInterval = null;
//       this.init();
//     }

//     init() {
//       this.analyzePage();
//       this.setupListeners();
      
//       // Re-analyze on navigation
//       this.observeNavigation();
      
//       console.log('✅ Page Analyzer initialized');
//     }

//     setupListeners() {
//       chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//         if (request.action === 'getPageContext') {
//           this.analyzePage();
//           sendResponse({ success: true, data: this.pageData });
//         } else if (request.action === 'refreshPageContext') {
//           this.analyzePage();
//           sendResponse({ success: true, data: this.pageData });
//         }
//         return true;
//       });
//     }

//     analyzePage() {
//       this.pageData = {
//         // Basic Info
//         url: window.location.href,
//         title: document.title,
//         domain: window.location.hostname,
//         path: window.location.pathname,
        
//         // Page Type Detection
//         pageType: this.detectPageType(),
        
//         // Content Analysis
//         mainContent: this.extractMainContent(),
//         headings: this.extractHeadings(),
//         links: this.extractLinks(),
//         images: this.extractImages(),
        
//         // Technical Details
//         language: document.documentElement.lang || 'en',
//         charset: document.characterSet,
        
//         // Meta Information
//         meta: this.extractMetadata(),
        
//         // Special Content
//         videos: this.extractVideos(),
//         codeBlocks: this.extractCodeBlocks(),
        
//         // Timestamps
//         timestamp: Date.now(),
//         loadTime: performance.now()
//       };

//       // Send to background
//       chrome.runtime.sendMessage({
//         action: 'pageAnalyzed',
//         data: this.pageData
//       });

//       return this.pageData;
//     }

//     detectPageType() {
//       const url = window.location.href.toLowerCase();
//       const domain = window.location.hostname.toLowerCase();

//       // YouTube
//       if (domain.includes('youtube.com')) {
//         if (url.includes('/watch')) return 'youtube-video';
//         if (url.includes('/playlist')) return 'youtube-playlist';
//         return 'youtube';
//       }

//       // GitHub
//       if (domain.includes('github.com')) {
//         if (url.includes('/blob/')) return 'github-file';
//         if (url.includes('/pull/')) return 'github-pr';
//         if (url.includes('/issues/')) return 'github-issue';
//         return 'github-repo';
//       }

//       // Stack Overflow
//       if (domain.includes('stackoverflow.com')) {
//         if (url.includes('/questions/')) return 'stackoverflow-question';
//         return 'stackoverflow';
//       }

//       // Documentation sites
//       if (domain.includes('docs.') || url.includes('/docs/')) {
//         return 'documentation';
//       }

//       // Blog detection
//       if (this.detectBlog()) return 'blog';

//       // Article detection
//       if (this.detectArticle()) return 'article';

//       // E-commerce
//       if (this.detectEcommerce()) return 'ecommerce';

//       return 'generic';
//     }

//     detectBlog() {
//       const indicators = [
//         document.querySelector('article'),
//         document.querySelector('[class*="blog"]'),
//         document.querySelector('[class*="post"]'),
//         document.querySelector('time[datetime]')
//       ];
//       return indicators.filter(Boolean).length >= 2;
//     }

//     detectArticle() {
//       const article = document.querySelector('article');
//       const hasHeadings = document.querySelectorAll('h1, h2, h3').length > 2;
//       const wordCount = document.body.textContent.split(/\s+/).length;
//       return article && hasHeadings && wordCount > 300;
//     }

//     detectEcommerce() {
//       const indicators = [
//         document.querySelector('[class*="price"]'),
//         document.querySelector('[class*="cart"]'),
//         document.querySelector('[class*="product"]'),
//         document.querySelector('button[class*="buy"]')
//       ];
//       return indicators.filter(Boolean).length >= 2;
//     }

//     extractMainContent() {
//       // Try to find main content area
//       const selectors = [
//         'main',
//         'article',
//         '[role="main"]',
//         '#content',
//         '.content',
//         '#main',
//         '.main'
//       ];

//       for (const selector of selectors) {
//         const element = document.querySelector(selector);
//         if (element) {
//           return {
//             text: this.cleanText(element.textContent).substring(0, 5000),
//             html: element.innerHTML.substring(0, 3000),
//             wordCount: element.textContent.split(/\s+/).length
//           };
//         }
//       }

//       // Fallback to body
//       return {
//         text: this.cleanText(document.body.textContent).substring(0, 5000),
//         wordCount: document.body.textContent.split(/\s+/).length
//       };
//     }

//     extractHeadings() {
//       const headings = [];
//       document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
//         headings.push({
//           level: parseInt(h.tagName.substring(1)),
//           text: this.cleanText(h.textContent),
//           id: h.id || null
//         });
//       });
//       return headings.slice(0, 20); // Limit to 20 headings
//     }

//     extractLinks() {
//       const links = [];
//       document.querySelectorAll('a[href]').forEach((link, index) => {
//         if (index < 30) { // Limit to 30 links
//           links.push({
//             text: this.cleanText(link.textContent),
//             href: link.href,
//             isExternal: !link.href.includes(window.location.hostname)
//           });
//         }
//       });
//       return links;
//     }

//     extractImages() {
//       const images = [];
//       document.querySelectorAll('img[src]').forEach((img, index) => {
//         if (index < 10) { // Limit to 10 images
//           images.push({
//             src: img.src,
//             alt: img.alt || '',
//             width: img.naturalWidth,
//             height: img.naturalHeight
//           });
//         }
//       });
//       return images;
//     }

//     extractMetadata() {
//       const meta = {};
      
//       // Open Graph tags
//       document.querySelectorAll('meta[property^="og:"]').forEach(tag => {
//         const property = tag.getAttribute('property').replace('og:', '');
//         meta[property] = tag.content;
//       });

//       // Twitter Card tags
//       document.querySelectorAll('meta[name^="twitter:"]').forEach(tag => {
//         const name = tag.getAttribute('name').replace('twitter:', '');
//         meta['twitter_' + name] = tag.content;
//       });

//       // Standard meta tags
//       const standardTags = ['description', 'keywords', 'author'];
//       standardTags.forEach(name => {
//         const tag = document.querySelector(`meta[name="${name}"]`);
//         if (tag) meta[name] = tag.content;
//       });

//       return meta;
//     }

//     extractVideos() {
//       const videos = [];
      
//       // YouTube
//       if (window.location.hostname.includes('youtube.com')) {
//         const videoId = new URLSearchParams(window.location.search).get('v');
//         if (videoId) {
//           videos.push({
//             platform: 'youtube',
//             id: videoId,
//             title: document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || '',
//             description: document.querySelector('#description')?.textContent.substring(0, 500) || ''
//           });
//         }
//       }

//       // Generic video tags
//       document.querySelectorAll('video').forEach((video, index) => {
//         if (index < 5) {
//           videos.push({
//             platform: 'html5',
//             src: video.src || video.querySelector('source')?.src,
//             duration: video.duration || null
//           });
//         }
//       });

//       return videos;
//     }

//     extractCodeBlocks() {
//       const codeBlocks = [];
      
//       document.querySelectorAll('pre code, pre, code').forEach((block, index) => {
//         if (index < 10 && block.textContent.length > 10) {
//           codeBlocks.push({
//             language: this.detectCodeLanguage(block),
//             code: block.textContent.substring(0, 500),
//             lines: block.textContent.split('\n').length
//           });
//         }
//       });

//       return codeBlocks;
//     }

//     detectCodeLanguage(block) {
//       const classList = Array.from(block.classList);
      
//       for (const cls of classList) {
//         if (cls.startsWith('language-')) {
//           return cls.replace('language-', '');
//         }
//         if (cls.startsWith('lang-')) {
//           return cls.replace('lang-', '');
//         }
//       }

//       // Try to detect from content
//       const code = block.textContent;
//       if (/^\s*(function|const|let|var|import|export)/.test(code)) return 'javascript';
//       if (/^\s*(def|class|import|from)/.test(code)) return 'python';
//       if (/^\s*(public|private|class|interface)/.test(code)) return 'java';
      
//       return 'unknown';
//     }

//     cleanText(text) {
//       return text
//         .replace(/\s+/g, ' ')
//         .replace(/\n+/g, ' ')
//         .trim();
//     }

//     observeNavigation() {
//       // Watch for URL changes (SPA navigation)
//       let lastUrl = window.location.href;
      
//       const observer = new MutationObserver(() => {
//         if (window.location.href !== lastUrl) {
//           lastUrl = window.location.href;
//           console.log('🔄 Navigation detected, re-analyzing page');
//           setTimeout(() => this.analyzePage(), 1000);
//         }
//       });

//       observer.observe(document.body, {
//         childList: true,
//         subtree: true
//       });
//     }

//     getPageSummary() {
//       if (!this.pageData) this.analyzePage();
      
//       return {
//         url: this.pageData.url,
//         title: this.pageData.title,
//         type: this.pageData.pageType,
//         wordCount: this.pageData.mainContent.wordCount,
//         headingsCount: this.pageData.headings.length,
//         hasCode: this.pageData.codeBlocks.length > 0,
//         hasVideo: this.pageData.videos.length > 0
//       };
//     }
//   }

//   // Create global instance
//   window.pageAnalyzer = new PageAnalyzer();

// })();