document.addEventListener('DOMContentLoaded', () => {
  const chatDisplay = document.getElementById('chat-display');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const themeToggle = document.getElementById('theme-toggle');
  const newChatBtn = document.getElementById('new-chat');
  const chatList = document.getElementById('chat-list');
  const chatTitle = document.getElementById('chat-title');

  // QUAN TRỌNG: Đang sử dụng biến JavaScript (lưu trong RAM)
  // Nếu muốn lưu vĩnh viễn, uncomment các dòng localStorage bên dưới
  let chats = [];
  let currentChatId = null;
  let isDark = false;

  // ===== CÁCH DÙNG localStorage (Chỉ khi chạy local) =====
  // Bước 1: Comment 3 dòng trên
  // Bước 2: Uncomment 3 dòng dưới đây:
  // let chats = JSON.parse(localStorage.getItem('chats')) || [];
  // let currentChatId = localStorage.getItem('currentChatId');
  // let isDark = localStorage.getItem('theme') === 'dark';

  // Tự động điều chỉnh chiều cao textarea
  function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
  }

  userInput.addEventListener('input', autoResizeTextarea);

  // Tạo hội thoại mới
  function createNewChat() {
    const newChat = {
      id: Date.now(),
      title: "Hội thoại mới",
      messages: []
    };
    chats.push(newChat);
    currentChatId = newChat.id;
    saveChats();
    renderSidebar();
    renderChat(newChat);
  }

  // Lưu chats
  function saveChats() {
    // Nếu dùng localStorage, uncomment dòng dưới:
    // localStorage.setItem('chats', JSON.stringify(chats));
    // localStorage.setItem('currentChatId', currentChatId);
  }

  // Render sidebar
  function renderSidebar() {
    chatList.innerHTML = '';
    chats.slice().reverse().forEach(chat => {
      const li = document.createElement('li');
      li.textContent = chat.title;
      li.classList.toggle('active', chat.id === currentChatId);
      li.onclick = () => {
        currentChatId = chat.id;
        renderChat(chat);
        renderSidebar();
      };
      chatList.appendChild(li);
    });
  }

  // Render một chat
  function renderChat(chat) {
    chatDisplay.innerHTML = '';
    chatTitle.textContent = chat.title;
    chat.messages.forEach(msg => {
      addMessage(msg.text, msg.sender, false, false);
    });
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
  }

  // Thêm tin nhắn
  function addMessage(text, sender, save = true, animated = true) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);

    if (animated) {
      messageDiv.style.animation = 'slideIn 0.3s ease-out';
    }

    messageDiv.textContent = text;
    chatDisplay.appendChild(messageDiv);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;

    if (save && currentChatId) {
      const chat = chats.find(c => c.id === currentChatId);
      chat.messages.push({ text, sender });
      
      // Cập nhật tiêu đề chat từ tin nhắn đầu tiên
      if (sender === 'user' && chat.title === "Hội thoại mới") {
        chat.title = text.slice(0, 30) + (text.length > 30 ? "..." : "");
      }
      
      saveChats();
      renderSidebar();
    }
  }

  // Gửi tin nhắn
  async function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === '') return;

    if (!currentChatId) createNewChat();
    
    addMessage(messageText, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    sendButton.disabled = true;
    userInput.disabled = true;

    // Hiển thị typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot');
    typingDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
        <span style="font-style: italic; opacity: 0.7;">Đang phân tích câu hỏi...</span>
      </div>
    `;
    chatDisplay.appendChild(typingDiv);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;

    try {
      // Gọi API backend
      const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: messageText,
          use_advanced: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      typingDiv.remove();
      
      // Hiển thị câu trả lời
      addMessage(data.answer, 'bot');
      
      // Hiển thị nguồn tham khảo (optional)
      if (data.sources && data.sources.length > 0) {
        const sourcesText = `\n\n📚 Nguồn tham khảo:\n${data.sources.slice(0, 3).map((s, i) => 
          `${i + 1}. ${s.source}`
        ).join('\n')}`;
        
        const sourcesDiv = document.createElement('div');
        sourcesDiv.classList.add('message', 'bot', 'sources');
        sourcesDiv.style.fontSize = '0.85em';
        sourcesDiv.style.opacity = '0.8';
        sourcesDiv.style.whiteSpace = 'pre-wrap';
        sourcesDiv.textContent = sourcesText;
        chatDisplay.appendChild(sourcesDiv);
      }
      
    } catch (error) {
      typingDiv.remove();
      
      let errorMessage = '⚠️ Xin lỗi, đã có lỗi xảy ra. ';
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Không thể kết nối đến server. Vui lòng đảm bảo backend đang chạy tại http://localhost:8000';
      } else {
        errorMessage += 'Vui lòng thử lại sau. Chi tiết: ' + error.message;
      }
      
      addMessage(errorMessage, 'bot');
      console.error('Error calling API:', error);
    } finally {
      sendButton.disabled = false;
      userInput.disabled = false;
      userInput.focus();
      chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }
  }

  // Event listeners
  sendButton.addEventListener('click', sendMessage);
  
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  newChatBtn.addEventListener('click', createNewChat);

  // Theme toggle
  themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    document.body.classList.toggle('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    
    // Nếu dùng localStorage, uncomment dòng dưới:
    // localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });

  // Khôi phục theme
  if (isDark) {
    document.body.classList.add('dark');
    themeToggle.textContent = '☀️';
  }

  // Khởi tạo
  if (chats.length === 0) {
    createNewChat();
  } else {
    currentChatId = chats[chats.length - 1].id;
    renderChat(chats[chats.length - 1]);
    renderSidebar();
  }
});