const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const sendIcon = document.getElementById('send-icon');
const loadingSpinner = document.getElementById('loading-spinner');
const clearChatButton = document.getElementById('clear-chat-button');

const CHAT_HISTORY_KEY = 'gemini-chat-history';
let chatHistory = [];

// --- core Functions ---

function saveHistory() {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
}

function renderHistory() {
    chatContainer.innerHTML = '';
    if (chatHistory.length === 0) {
        appendMessage("Hello! I'm AI chatbot . How can I help you today?", 'bot', false);
    } else {
        chatHistory.forEach(item => {
            const message = item.parts[0].text;
            const role = item.role === 'model' ? 'bot' : 'user';
            appendMessage(message, role, false);
        });
    }
}

function loadHistory() {
    const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (savedHistory) {
        chatHistory = JSON.parse(savedHistory);
    }
    renderHistory();
}

function clearHistory() {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    chatHistory = [];
    renderHistory();
}

function appendMessage(message, sender, shouldSave = true) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `flex items-start gap-3 ${sender === 'user' ? 'justify-end' : ''}`;

    const avatar = document.createElement('div');
    avatar.className = 'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0';
    avatar.textContent = sender === 'user' ? 'U' : 'G';
    avatar.classList.add(sender === 'user' ? 'bg-indigo-500' : 'bg-green-500');

    const messageContent = document.createElement('div');
    let messageClasses = 'p-4 rounded-lg max-w-md';
    if (sender === 'user') {
        messageClasses += ' bg-green-600 text-white';
    } else {
        messageClasses += ' bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
    messageContent.className = messageClasses;

    message = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    message = message.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 text-white p-3 rounded-md my-2 overflow-x-auto"><code>$1</code></pre>');

    messageContent.innerHTML = `<p>${message}</p>`;

    if (sender === 'user') {
        messageWrapper.appendChild(messageContent);
        messageWrapper.appendChild(avatar);
    } else {
        messageWrapper.appendChild(avatar);
        messageWrapper.appendChild(messageContent);
    }

    chatContainer.appendChild(messageWrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (shouldSave) {
        saveHistory();
    }
}

function setLoading(isLoading) {
    // safe guards for elements that might be missing
    if (loadingSpinner) {
        if (isLoading) loadingSpinner.classList.remove('hidden');
        else loadingSpinner.classList.add('hidden');
    }
    if (sendIcon) {
        if (isLoading) sendIcon.classList.add('hidden');
        else sendIcon.classList.remove('hidden');
    }
    if (sendButton) {
        sendButton.disabled = !!isLoading;
    }
}
//api key 
async function getGeminiResponse(prompt) {
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    saveHistory();

    const payload = { contents: chatHistory };
    const apiKey = "AIzaSyDWGWzNOZ5Sgl7nnzadSy9iNelvnIBE6s4";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message);
        }
        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 && result.candidates[0].content?.parts?.length > 0) {
            const botResponse = result.candidates[0].content.parts[0].text;
            chatHistory.push({ role: "model", parts: [{ text: botResponse }] });
            saveHistory();
            return botResponse;
        } else {
            const finishReason = result.candidates?.[0]?.finishReason;
            return finishReason === 'SAFETY' ? "I cannot respond to that due to safety settings." : "I'm sorry, I couldn't generate a response.";
        }
    } catch (error) {
        chatHistory.pop();
        saveHistory();
        return `An error occurred: ${error.message}`;
    }
}

async function typeMessage(message, sender) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `flex items-start gap-3 ${sender === 'user' ? 'justify-end' : ''}`;

    const avatar = document.createElement('div');
    avatar.className = 'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0';
    avatar.textContent = sender === 'user' ? 'U' : 'G';
    avatar.classList.add(sender === 'user' ? 'bg-indigo-500' : 'bg-green-500');

    const messageContent = document.createElement('div');
    let messageClasses = 'p-4 rounded-lg max-w-md';
    if (sender === 'user') {
        messageClasses += ' bg-green-600 text-white';
    } else {
        messageClasses += ' bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
    messageContent.className = messageClasses;

    if (sender === 'bot') {
        messageContent.innerHTML = '<p></p>';
    } else {
        messageContent.innerHTML = `<p>${message}</p>`;
    }

    if (sender === 'user') {
        messageWrapper.appendChild(messageContent);
        messageWrapper.appendChild(avatar);
    } else {
        messageWrapper.appendChild(avatar);
        messageWrapper.appendChild(messageContent);
    }

    chatContainer.appendChild(messageWrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (sender === 'bot') {
        const p = messageContent.querySelector('p');
        let i = 0;
        while (i < message.length) {
            let nextChunk = message[i];
            if (message.slice(i, i+3) === '```') {
                const end = message.indexOf('```', i+3);
                if (end !== -1) {
                    nextChunk = message.slice(i, end+3);
                    i = end+3;
                } else {
                    nextChunk = message.slice(i);
                    i = message.length;
                }
            } else {
                i++;
            }
            let display = p.innerHTML + nextChunk;
            display = display.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            display = display.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 text-white p-3 rounded-md my-2 overflow-x-auto"><code>$1</code></pre>');
            p.innerHTML = display;
            chatContainer.scrollTop = chatContainer.scrollHeight;
            await new Promise(res => setTimeout(res, 15));
        }
    }
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    appendMessage(userMessage, 'user');
    userInput.value = '';
    setLoading(true);

    const placeholder = document.createElement('div');
    placeholder.className = 'flex items-start gap-3';
    placeholder.innerHTML = `
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 bg-green-500">G</div>
        <div class="p-4 rounded-lg max-w-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"><p>...</p></div>
    `;
    chatContainer.appendChild(placeholder);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const botMessage = await getGeminiResponse(userMessage);

    chatContainer.removeChild(placeholder);

    await typeMessage(botMessage, 'bot');
    setLoading(false);
});

clearChatButton.addEventListener('click', clearHistory);
window.addEventListener('load', loadHistory);
