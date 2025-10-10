(function() {
  'use strict';
  
  // Prevent multiple initializations
  if (window.aiChatInitialized) return;
  window.aiChatInitialized = true;

  // Load React, ReactDOM, and Framer Motion from CDN
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const loadStyles = () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
    document.head.appendChild(link);
  };

  // Initialize the chat interface
  async function initializeChat() {
    try {
      // Load Tailwind CSS
      loadStyles();

      // Load React libraries
      await loadScript('https://unpkg.com/react@18/umd/react.production.min.js');
      await loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js');
      await loadScript('https://unpkg.com/framer-motion@10/dist/framer-motion.js');

      console.log('✅ Libraries loaded');

      // Create root container
      const rootDiv = document.createElement('div');
      rootDiv.id = 'ai-chat-root';
      document.body.appendChild(rootDiv);

      // Wait for React to be available
      const React = window.React;
      const ReactDOM = window.ReactDOM;
      const motion = window.Motion;

      if (!React || !ReactDOM || !motion) {
        throw new Error('Failed to load required libraries');
      }

      // Create the chat interface component
      createChatInterface(React, ReactDOM, motion);

    } catch (error) {
      console.error('❌ Failed to initialize chat:', error);
    }
  }

  function createChatInterface(React, ReactDOM, motion) {
    const { useState, useEffect, useRef, createContext, useContext } = React;
    const { motion: Motion, AnimatePresence } = motion;

    // Theme Context
    const ThemeContext = createContext();

    const ThemeProvider = ({ children }) => {
      const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('ai-chat-theme');
        return saved || 'dark';
      });

      useEffect(() => {
        localStorage.setItem('ai-chat-theme', theme);
      }, [theme]);

      const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

      return React.createElement(ThemeContext.Provider, { value: { theme, toggleTheme } }, children);
    };

    const useTheme = () => useContext(ThemeContext);

    // Floating Toggle Button Component
    const FloatingToggle = ({ isOpen, onClick }) => {
      const { theme } = useTheme();
      
      return React.createElement(
        Motion.button,
        {
          onClick: onClick,
          className: `fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl z-[999998] flex items-center justify-center transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600'
              : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500'
          }`,
          whileHover: { scale: 1.1 },
          whileTap: { scale: 0.95 },
          animate: { 
            rotate: isOpen ? 180 : 0,
            opacity: isOpen ? 0.8 : 1
          },
          style: { display: isOpen ? 'none' : 'flex' }
        },
        React.createElement('svg', {
          className: 'w-6 h-6 text-white',
          fill: 'none',
          viewBox: '0 0 24 24',
          stroke: 'currentColor'
        }, React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
        }))
      );
    };

    // Theme Toggle Component
    const ThemeToggle = () => {
      const { theme, toggleTheme } = useTheme();
      
      return React.createElement(
        Motion.button,
        {
          onClick: toggleTheme,
          className: `relative w-12 h-6 rounded-full transition-colors duration-300 ${
            theme === 'dark' ? 'bg-indigo-600' : 'bg-blue-400'
          }`,
          whileTap: { scale: 0.95 }
        },
        React.createElement(Motion.div, {
          className: 'absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center',
          animate: { x: theme === 'dark' ? 0 : 24 },
          transition: { type: 'spring', stiffness: 500, damping: 30 }
        })
      );
    };

    // Message Bubble Component
    const MessageBubble = ({ message, isUser }) => {
      const { theme } = useTheme();
      
      return React.createElement(
        Motion.div,
        {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          className: `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`
        },
        React.createElement(
          'div',
          {
            className: `max-w-[80%] rounded-2xl px-4 py-3 ${
              isUser
                ? theme === 'dark'
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                : theme === 'dark'
                ? 'bg-gray-800/60 backdrop-blur-md text-gray-100 border border-gray-700/50'
                : 'bg-white/80 backdrop-blur-md text-gray-800 border border-gray-200/50'
            } shadow-lg`
          },
          React.createElement('p', {
            className: 'text-sm leading-relaxed whitespace-pre-wrap'
          }, message.text)
        )
      );
    };

    // Typing Indicator Component
    const TypingIndicator = () => {
      const { theme } = useTheme();
      
      return React.createElement(
        Motion.div,
        {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0 },
          className: 'flex justify-start mb-4'
        },
        React.createElement(
          'div',
          {
            className: `rounded-2xl px-4 py-3 ${
              theme === 'dark'
                ? 'bg-gray-800/60 backdrop-blur-md border border-gray-700/50'
                : 'bg-white/80 backdrop-blur-md border border-gray-200/50'
            }`
          },
          React.createElement(
            'div',
            { className: 'flex gap-1' },
            [0, 1, 2].map((i) =>
              React.createElement(Motion.div, {
                key: i,
                className: `w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-indigo-400' : 'bg-blue-500'}`,
                animate: { y: [0, -8, 0] },
                transition: { duration: 0.6, repeat: Infinity, delay: i * 0.15 }
              })
            )
          )
        )
      );
    };

    // Chat Header Component
    const ChatHeader = ({ currentProject, liveMonitoring, onClose }) => {
      const { theme } = useTheme();
      
      return React.createElement(
        'div',
        {
          className: `p-4 border-b ${
            theme === 'dark' 
              ? 'bg-gray-900/80 backdrop-blur-xl border-gray-800/50' 
              : 'bg-white/80 backdrop-blur-xl border-gray-200/50'
          }`
        },
        React.createElement(
          'div',
          { className: 'flex items-start justify-between mb-3' },
          React.createElement(
            'div',
            { className: 'flex items-center gap-3' },
            React.createElement(
              'div',
              {
                className: `w-10 h-10 rounded-xl flex items-center justify-center ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                } shadow-lg`
              },
              React.createElement('svg', {
                className: 'w-5 h-5 text-white',
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor'
              }, React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M13 10V3L4 14h7v7l9-11h-7z'
              }))
            ),
            React.createElement(
              'div',
              null,
              React.createElement('h2', {
                className: `font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`
              }, 'AI Assistant'),
              React.createElement(
                'div',
                { className: 'flex items-center gap-1.5' },
                React.createElement('div', { className: 'w-2 h-2 bg-green-500 rounded-full animate-pulse' }),
                React.createElement('span', {
                  className: `text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`
                }, 'Online')
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'flex items-center gap-2' },
            React.createElement(ThemeToggle),
            React.createElement(
              Motion.button,
              {
                onClick: onClose,
                className: `p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`,
                whileHover: { scale: 1.1 },
                whileTap: { scale: 0.95 }
              },
              React.createElement('svg', {
                className: 'w-5 h-5',
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor'
              }, React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M6 18L18 6M6 6l12 12'
              }))
            )
          )
        ),
        React.createElement(
          'div',
          {
            className: `space-y-2 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`
          },
          React.createElement(
            'div',
            {
              className: `flex items-start gap-2 p-2 rounded-lg ${
                theme === 'dark' ? 'bg-indigo-900/20' : 'bg-blue-50'
              }`
            },
            React.createElement('div', { className: 'flex-1' },
              React.createElement('span', { className: 'font-semibold' }, 'Currently Working On:'),
              React.createElement('p', {
                className: `mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`
              }, currentProject)
            )
          ),
          React.createElement(
            'div',
            {
              className: `flex items-start gap-2 p-2 rounded-lg ${
                theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'
              }`
            },
            React.createElement('div', { className: 'flex-1' },
              React.createElement('span', { className: 'font-semibold' }, 'Live Monitoring:'),
              React.createElement('p', {
                className: `mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`
              }, liveMonitoring)
            )
          )
        )
      );
    };

    // Chat Input Component
    const ChatInput = ({ onSend, onFileUpload, disabled }) => {
      const { theme } = useTheme();
      const [input, setInput] = useState('');
      const fileInputRef = useRef(null);
      
      const handleSend = () => {
        if (input.trim() && !disabled) {
          onSend(input.trim());
          setInput('');
        }
      };
      
      const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      };
      
      const handleFileClick = () => {
        fileInputRef.current?.click();
      };
      
      const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          onFileUpload(file);
          e.target.value = '';
        }
      };
      
      return React.createElement(
        'div',
        {
          className: `p-4 border-t ${
            theme === 'dark'
              ? 'bg-gray-900/80 backdrop-blur-xl border-gray-800/50'
              : 'bg-white/80 backdrop-blur-xl border-gray-200/50'
          }`
        },
        React.createElement(
          'div',
          {
            className: `flex items-end gap-2 p-2 rounded-2xl transition-all ${
              theme === 'dark'
                ? 'bg-gray-800/60 border border-gray-700/50'
                : 'bg-gray-50 border border-gray-200'
            }`
          },
          React.createElement('textarea', {
            value: input,
            onChange: (e) => setInput(e.target.value),
            onKeyPress: handleKeyPress,
            placeholder: 'Ask me anything...',
            disabled: disabled,
            className: `flex-1 bg-transparent resize-none outline-none px-2 py-2 max-h-32 ${
              theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
            }`,
            rows: 1
          }),
          React.createElement(
            'div',
            { className: 'flex items-center gap-1' },
            React.createElement('input', {
              ref: fileInputRef,
              type: 'file',
              className: 'hidden',
              onChange: handleFileChange,
              accept: 'image/*,.pdf,.doc,.docx,.txt'
            }),
            React.createElement(
              Motion.button,
              {
                onClick: handleFileClick,
                disabled: disabled,
                className: `p-2 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                } disabled:opacity-50 disabled:cursor-not-allowed`,
                whileHover: { scale: 1.05 },
                whileTap: { scale: 0.95 }
              },
              React.createElement('svg', {
                className: 'w-5 h-5',
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor'
              }, React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'
              }))
            ),
            React.createElement(
              Motion.button,
              {
                onClick: handleSend,
                disabled: disabled || !input.trim(),
                className: `p-2 rounded-xl transition-all shadow-lg ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500'
                } text-white disabled:opacity-50 disabled:cursor-not-allowed`,
                whileHover: { scale: 1.05 },
                whileTap: { scale: 0.95 }
              },
              React.createElement('svg', {
                className: 'w-5 h-5',
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor'
              }, React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
              }))
            )
          )
        ),
        React.createElement('p', {
          className: `text-xs mt-2 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`
        }, 'Press Enter to send • Shift+Enter for new line')
      );
    };

    // Main Chat Panel Component
    const ChatPanel = ({ isOpen, onClose }) => {
      const { theme } = useTheme();
      const [messages, setMessages] = useState(() => {
        const saved = sessionStorage.getItem('ai-chat-messages');
        return saved ? JSON.parse(saved) : [];
      });
      const [isTyping, setIsTyping] = useState(false);
      const [currentProject, setCurrentProject] = useState('FiberHearts Admin Dashboard');
      const [liveMonitoring, setLiveMonitoring] = useState('Payment Schema Integration');
      const messagesEndRef = useRef(null);
      
      useEffect(() => {
        sessionStorage.setItem('ai-chat-messages', JSON.stringify(messages));
      }, [messages]);
      
      useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, [messages, isTyping]);
      
      useEffect(() => {
        const handleMessage = (request, sender, sendResponse) => {
          if (request.action === 'updateProject') {
            setCurrentProject(request.project);
          } else if (request.action === 'updateMonitoring') {
            setLiveMonitoring(request.monitoring);
          } else if (request.action === 'receiveMessage') {
            setMessages(prev => [...prev, {
              text: request.message,
              isUser: false,
              timestamp: Date.now()
            }]);
            setIsTyping(false);
          }
          sendResponse({ success: true });
        };
        
        if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
          chrome.runtime.onMessage.addListener(handleMessage);
          return () => chrome.runtime.onMessage.removeListener(handleMessage);
        }
      }, []);
      
      const handleSend = (text) => {
        const userMessage = {
          text,
          isUser: true,
          timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setIsTyping(true);
        
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            action: 'chatMessage',
            message: text
          }, (response) => {
            if (response?.success) {
              setMessages(prev => [...prev, {
                text: response.response,
                isUser: false,
                timestamp: Date.now()
              }]);
            }
            setIsTyping(false);
          });
        } else {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              text: `Demo: Received "${text}". Connect to Chrome runtime for AI responses.`,
              isUser: false,
              timestamp: Date.now()
            }]);
            setIsTyping(false);
          }, 1500);
        }
      };
      
      const handleFileUpload = (file) => {
        console.log('File uploaded:', file.name);
        setMessages(prev => [...prev, {
          text: `📎 Uploaded: ${file.name}`,
          isUser: true,
          timestamp: Date.now()
        }]);
      };
      
      if (!isOpen) return null;
      
      return React.createElement(
        Motion.div,
        {
          initial: { x: '100%', opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: '100%', opacity: 0 },
          transition: { type: 'spring', damping: 25, stiffness: 200 },
          className: `fixed top-0 right-0 w-full sm:w-[440px] h-full shadow-2xl z-[999999] flex flex-col ${
            theme === 'dark'
              ? 'bg-gray-950/95 backdrop-blur-2xl'
              : 'bg-white/95 backdrop-blur-2xl'
          }`,
          style: {
            boxShadow: theme === 'dark'
              ? '-8px 0 40px rgba(0, 0, 0, 0.6)'
              : '-8px 0 40px rgba(0, 0, 0, 0.1)'
          }
        },
        React.createElement(ChatHeader, {
          currentProject: currentProject,
          liveMonitoring: liveMonitoring,
          onClose: onClose
        }),
        React.createElement(
          'div',
          { className: 'flex-1 overflow-y-auto p-4' },
          messages.length === 0
            ? React.createElement(
                Motion.div,
                {
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  className: 'h-full flex flex-col items-center justify-center text-center px-8'
                },
                React.createElement('h3', {
                  className: `text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`
                }, 'Welcome to Your AI Assistant'),
                React.createElement('p', {
                  className: `text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`
                }, 'Ask me anything about your code!')
              )
            : React.createElement(
                React.Fragment,
                null,
                messages.map((msg, idx) =>
                  React.createElement(MessageBubble, { key: idx, message: msg, isUser: msg.isUser })
                ),
                isTyping && React.createElement(TypingIndicator),
                React.createElement('div', { ref: messagesEndRef })
              )
        ),
        React.createElement(ChatInput, {
          onSend: handleSend,
          onFileUpload: handleFileUpload,
          disabled: isTyping
        })
      );
    };

    // Main App Component
    const App = () => {
      const [isOpen, setIsOpen] = useState(false);
      
      return React.createElement(
        ThemeProvider,
        null,
        React.createElement('div', { className: 'font-sans antialiased' },
          React.createElement(FloatingToggle, { isOpen: isOpen, onClick: () => setIsOpen(true) }),
          React.createElement(ChatPanel, { isOpen: isOpen, onClose: () => setIsOpen(false) })
        )
      );
    };

    // Render the app
    const root = ReactDOM.createRoot(document.getElementById('ai-chat-root'));
    root.render(React.createElement(App));
    
    console.log('✅ AI Chat Interface rendered successfully!');
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChat);
  } else {
    initializeChat();
  }

})();