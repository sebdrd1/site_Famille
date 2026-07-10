/* ============================================
   JARVIS FAMILLE - Application Principale v1.1
   ============================================
   SPA vanilla JS, PWA-ready
   - Auth par membre (localStorage)
   - Navigation par pages
   - Mode TDAH (OpenDyslexic, contraste)
   - Mode Kids (couleurs vives)
   - TTS (lecture vocale)
   - Chat famille (localStorage)
   ============================================ */

var app = (function() {
  'use strict';

  // --- State ---
  var state = {
    currentMember: null,
    currentPage: 'home',
    tdahMode: false,
    chatMessages: [],
    photos: [],
    videos: []
  };

  // --- Members Config ---
  var MEMBERS = {
    seb:     { name: 'Seb',     avatar: '👨', role: 'Papa',   theme: 'famille', color: '#e94560' },
    elodie:  { name: 'Élodie',  avatar: '👩', role: 'Maman',  theme: 'famille', color: '#9b59b6' },
    mathias: { name: 'Mathias', avatar: '🦸', role: '10 ans', theme: 'kids',    color: '#2ecc71' },
    leana:   { name: 'Léana',   avatar: '👸', role: '6 ans',  theme: 'kids',    color: '#f39c12' }
  };

  // =====================
  // BOOT
  // =====================
  function boot() {
    var saved = localStorage.getItem('jarvis_member');
    if (saved && MEMBERS[saved]) {
      state.currentMember = saved;
      showApp();
    } else {
      showLogin();
    }
    updateDate();
    setInterval(updateDate, 60000);
  }

  // =====================
  // AUTH
  // =====================
  function login(memberId) {
    if (!MEMBERS[memberId]) return;
    
    // Reset everything first
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-tdah');
    
    state.currentMember = memberId;
    state.tdahMode = false;
    localStorage.setItem('jarvis_member', memberId);
    
    var m = MEMBERS[memberId];
    document.documentElement.setAttribute('data-theme', m.theme);
    
    // Auto-enable TDAH for kids
    if (memberId === 'mathias' || memberId === 'leana') {
      state.tdahMode = true;
      document.documentElement.setAttribute('data-tdah', 'true');
    }
    
    showApp();
    speak('Bienvenue ' + m.name + ' !');
  }

  function logout() {
    // Full reset
    state.currentMember = null;
    state.tdahMode = false;
    state.currentPage = 'home';
    localStorage.removeItem('jarvis_member');
    
    // Reset DOM
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-tdah');
    
    // Reset all pages
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }
    var homePage = document.getElementById('page-home');
    if (homePage) homePage.classList.add('active');
    
    // Reset nav buttons
    var navItems = document.querySelectorAll('.nav-item');
    for (var j = 0; j < navItems.length; j++) {
      navItems[j].classList.toggle('active', navItems[j].dataset.page === 'home');
    }
    
    // Stop any TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    showLogin();
  }

  // =====================
  // NAVIGATION
  // =====================
  function navigate(pageId) {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }
    var target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');
    
    var navItems = document.querySelectorAll('.nav-item');
    for (var j = 0; j < navItems.length; j++) {
      navItems[j].classList.toggle('active', navItems[j].dataset.page === pageId);
    }
    
    state.currentPage = pageId;
    window.scrollTo(0, 0);
  }

  // =====================
  // UI HELPERS
  // =====================
  function showLogin() {
    document.getElementById('splash').classList.add('fade-out');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
  }

  function showApp() {
    var m = MEMBERS[state.currentMember];
    document.getElementById('splash').classList.add('fade-out');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    
    document.getElementById('topbar-name').textContent = m.avatar + ' ' + m.name;
    document.getElementById('hero-avatar').textContent = m.avatar;
    document.getElementById('hero-welcome').textContent = 'Bienvenue ' + m.name + ' !';
    
    var uploadBtn = document.getElementById('btn-upload-photo');
    if (uploadBtn) {
      uploadBtn.classList.toggle('hidden', m.theme === 'kids');
    }
    
    navigate('home');
  }

  function updateDate() {
    var now = new Date();
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    var el = document.getElementById('hero-date');
    if (el) el.textContent = now.toLocaleDateString('fr-FR', options);
  }

  // =====================
  // TDAH MODE
  // =====================
  function toggleTDAH() {
    state.tdahMode = !state.tdahMode;
    if (state.tdahMode) {
      document.documentElement.setAttribute('data-tdah', 'true');
      speak('Mode TDAH active. Police adaptee et contraste renforce.');
    } else {
      document.documentElement.removeAttribute('data-tdah');
      speak('Mode TDAH desactive.');
    }
  }

  // =====================
  // TTS (Text-to-Speech)
  // =====================
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = state.tdahMode ? 0.85 : 1.0;
    var m = MEMBERS[state.currentMember];
    utterance.pitch = (m && m.theme === 'kids') ? 1.2 : 1.0;
    
    var indicator = document.getElementById('tts-indicator');
    var ttsText = document.getElementById('tts-text');
    if (indicator && ttsText) {
      ttsText.textContent = text.substring(0, 60) + (text.length > 60 ? '...' : '');
      indicator.classList.remove('hidden');
      utterance.onend = function() { indicator.classList.add('hidden'); };
      utterance.onerror = function() { indicator.classList.add('hidden'); };
    }
    
    window.speechSynthesis.speak(utterance);
  }

  function speakPage() {
    var page = document.getElementById('page-' + state.currentPage);
    if (page) {
      speak(page.textContent.replace(/\s+/g, ' ').trim().substring(0, 300));
    }
  }

  // =====================
  // CHAT
  // =====================
  function sendChat() {
    var input = document.getElementById('chat-input');
    var text = input.value.trim();
    if (!text) return;
    
    var m = MEMBERS[state.currentMember];
    var msg = {
      author: m.name,
      avatar: m.avatar,
      text: text,
      time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
      mine: true
    };
    
    state.chatMessages.push(msg);
    localStorage.setItem('jarvis_chat', JSON.stringify(state.chatMessages));
    renderChat();
    input.value = '';
    
    if (m.theme === 'kids') {
      setTimeout(function() {
        autoReply(m.name);
      }, 1000 + Math.random() * 2000);
    }
  }

  function autoReply(kidName) {
    var replies = [
      { author: 'Papa Seb', avatar: '👨', text: 'Super ' + kidName + ' ! 😊' },
      { author: 'Maman Élodie', avatar: '👩', text: 'Bravo ma puce ! 🌟' },
      { author: 'Papa Seb', avatar: '👨', text: 'Je suis fier de toi ! 💪' },
      { author: 'Maman Élodie', avatar: '👩', text: 'Tu es geniale ! 🎉' }
    ];
    var reply = replies[Math.floor(Math.random() * replies.length)];
    reply.time = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    reply.mine = false;
    state.chatMessages.push(reply);
    localStorage.setItem('jarvis_chat', JSON.stringify(state.chatMessages));
    renderChat();
  }

  function renderChat() {
    var container = document.getElementById('chat-messages');
    if (!container) return;
    
    var html = '';
    for (var i = 0; i < state.chatMessages.length; i++) {
      var msg = state.chatMessages[i];
      html += '<div class="chat-message ' + (msg.mine ? 'mine' : 'other') + '">';
      html += '<div class="msg-author">' + msg.avatar + ' ' + msg.author + '</div>';
      html += '<div class="msg-text">' + escapeHtml(msg.text) + '</div>';
      html += '<div class="msg-time">' + msg.time + '</div>';
      html += '</div>';
    }
    container.innerHTML = html || '<div class="chat-welcome"><p>Bienvenue dans le chat famille !</p><p class="small">Les messages sont sauvegardes localement.</p></div>';
    container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // =====================
  // GAMES
  // =====================
  function openGame(gameId) {
    var modal = document.getElementById('game-modal');
    var frame = document.getElementById('game-frame');
    var title = document.getElementById('game-modal-title');
    
    var games = {
      mathias: { title: 'Avengers - Mathias', file: 'assets/games/mathias/index.html' },
      leana:   { title: 'Nana Elsa - Leana', file: 'assets/games/leana/index.html' }
    };
    
    var game = games[gameId];
    if (game) {
      title.textContent = game.title;
      frame.src = game.file;
      modal.classList.remove('hidden');
    }
  }

  function closeGame() {
    var modal = document.getElementById('game-modal');
    var frame = document.getElementById('game-frame');
    frame.src = '';
    modal.classList.add('hidden');
  }

  // =====================
  // PHOTOS
  // =====================
  function uploadPhoto() {
    speak('La fonction d\'ajout de photos sera bientot disponible.');
    alert('Fonction a venir : upload depuis le PC ou le telephone.');
  }

  function openImage(src) {
    var modal = document.getElementById('image-modal');
    var img = document.getElementById('image-modal-img');
    img.src = src;
    modal.classList.remove('hidden');
  }

  function closeImage() {
    document.getElementById('image-modal').classList.add('hidden');
  }

  // =====================
  // PUBLIC API
  // =====================
  return {
    boot: boot,
    login: login,
    logout: logout,
    navigate: navigate,
    toggleTDAH: toggleTDAH,
    speak: speak,
    speakPage: speakPage,
    sendChat: sendChat,
    openGame: openGame,
    closeGame: closeGame,
    uploadPhoto: uploadPhoto,
    openImage: openImage,
    closeImage: closeImage
  };

})();

// Auto-boot
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() { app.boot(); }, 800);
});
