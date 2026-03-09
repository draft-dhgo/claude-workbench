(function() {
  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function updateToggleIcon(theme) {
    var iconEl = document.getElementById('theme-icon');
    if (iconEl) {
      iconEl.textContent = theme === 'dark' ? '\uD83C\uDF19' : '\u2600\uFE0F';
    }
  }

  function setTheme(theme, save) {
    document.documentElement.setAttribute('data-theme', theme);
    updateToggleIcon(theme);
    if (save) {
      try {
        localStorage.setItem('theme', theme);
      } catch (e) {
        // localStorage not available
      }
    }
  }

  function init() {
    var toggleBtn = document.getElementById('theme-toggle-btn');
    var currentTheme = getCurrentTheme();

    // 초기 아이콘 설정
    updateToggleIcon(currentTheme);

    // 초기 로드 transition 비활성화 해제
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        document.documentElement.classList.remove('no-transition');
      });
    });

    // 토글 버튼 클릭 핸들러
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        var current = getCurrentTheme();
        var next = current === 'dark' ? 'light' : 'dark';
        setTheme(next, true);
      });
    }

    // OS 테마 변경 감지
    try {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', function(e) {
          var hasUserPref;
          try {
            hasUserPref = localStorage.getItem('theme');
          } catch (err) {
            hasUserPref = null;
          }
          if (!hasUserPref) {
            var newTheme = e.matches ? 'dark' : 'light';
            setTheme(newTheme, false);
          }
        });
    } catch (e) {
      // matchMedia not available
    }
  }

  // DOMContentLoaded 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
