(() => {
  function initReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add('visible'), i * 80);
          }
        });
      },
      { threshold: 0.1 }
    );

    revealEls.forEach(el => observer.observe(el));
  }

  async function initFacts() {
    const els = document.querySelectorAll('[data-fact]');
    if (!els.length) return;

    try {
      const sources = [
        { url: '/api/facts', init: { cache: 'no-store' } },
        { url: 'facts.json', init: { cache: 'no-store' } }
      ];

      let facts = null;
      for (const s of sources) {
        try {
          const res = await fetch(s.url, s.init);
          if (!res.ok) continue;
          facts = await res.json();
          break;
        } catch {
          // try next source
        }
      }
      if (!facts) return;

      els.forEach(el => {
        const key = el.getAttribute('data-fact');
        const val = facts?.[key];
        if (val !== undefined && val !== null && val !== '' && val !== '—') {
          el.textContent = String(val);
        } else {
          el.textContent = '-';
        }
      });
    } catch {
      // Ignore if facts.json missing/unreachable
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initReveal();
      initFacts();
    });
  } else {
    initReveal();
    initFacts();
  }
})();

