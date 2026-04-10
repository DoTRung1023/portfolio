/* app.js — typography-first portfolio shared JS */

/* ── Live clock ── */
function tick() {
  const el = document.getElementById('clock');
  if (el) el.textContent = 'Adelaide, AU — ' + new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}
tick(); setInterval(tick, 1000);

/* ── Scroll animation engine ──
   Watches all elements with .anim, .anim-fade, .anim-left, .anim-right, .anim-scale
   Adds .on when they enter the viewport.
   Also handles counters ([data-count]) and mini-bar fills (.mbf).
*/
const animClasses = ['.anim', '.anim-fade', '.anim-left', '.anim-right', '.anim-scale'];

const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;

    const el = e.target;
    el.classList.add('on');

    /* Mini-bar fills inside this element */
    el.querySelectorAll('.mbf').forEach(f => f.classList.add('go'));

    /* Animated counters */
    el.querySelectorAll('[data-count]').forEach(counter => {
      const target = +counter.dataset.count;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 45));
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          counter.textContent = target + '+';
          clearInterval(timer);
        } else {
          counter.textContent = current;
        }
      }, 38);
    });

    obs.unobserve(el);
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

/* Auto-stagger children of lists */
function registerAnimations() {
  /* Observe all anim elements */
  document.querySelectorAll(animClasses.join(',')).forEach(el => obs.observe(el));

  /* Auto-stagger item-cards inside item-list */
  document.querySelectorAll('.item-list').forEach(list => {
    list.querySelectorAll('.item-card').forEach((card, i) => {
      if (!card.classList.contains('anim')) {
        card.classList.add('anim');
        card.style.transitionDelay = (i * 0.07) + 's';
        obs.observe(card);
      }
    });
  });

  /* Auto-stagger chip groups */
  document.querySelectorAll('.skill-chips').forEach(group => {
    group.querySelectorAll('.chip').forEach((chip, i) => {
      chip.style.transitionDelay = (i * 0.04) + 's';
      if (!chip.classList.contains('anim-scale')) {
        chip.classList.add('anim-scale');
        obs.observe(chip);
      }
    });
  });

  /* Auto-stagger photo slots */
  document.querySelectorAll('.photo-slot').forEach((slot, i) => {
    if (!slot.classList.contains('anim')) {
      slot.classList.add('anim');
      slot.style.transitionDelay = (i * 0.06) + 's';
      obs.observe(slot);
    }
  });
}

/* Run after DOM ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', registerAnimations);
} else {
  registerAnimations();
}

/* ── Hero stat counters (fire on load since they're above fold) ── */
document.addEventListener('DOMContentLoaded', () => {
  /* Small delay so animation isn't instant */
  setTimeout(() => {
    document.querySelectorAll('.hs-n[data-count]').forEach(el => {
      const target = +el.dataset.count;
      let n = 0;
      const step = Math.max(1, Math.ceil(target / 40));
      const t = setInterval(() => {
        n += step;
        if (n >= target) { el.textContent = target + '+'; clearInterval(t); }
        else el.textContent = n;
      }, 45);
    });
  }, 600);
});
