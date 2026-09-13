document.querySelectorAll('[data-cast-hero]').forEach((hero) => {
  const video = hero.querySelector('video');
  const toggle = hero.querySelector('[data-cast-toggle]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = motion.matches;
  let visible = false;
  let loaded = false;
  let userChose = false;
  toggle.hidden = false;
  const sync = () => {
    toggle.textContent = userPaused ? 'Play animation' : 'Pause animation';
    if (userPaused || !visible || document.hidden) {
      video.pause();
      return;
    }
    if (!loaded) {
      video.src = video.dataset.src;
      loaded = true;
    }
    video.play().catch(() => {
      // An interrupted play request is normal when scrolling out of view.
      if (!visible || document.hidden || userPaused) return;
      userPaused = true;
      toggle.textContent = 'Play animation';
    });
  };
  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    userChose = true;
    sync();
  });
  motion.addEventListener('change', () => {
    if (motion.matches) userPaused = true;
    else if (!userChose) userPaused = false;
    sync();
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }, { threshold: 0.15 }).observe(video);
  document.addEventListener('visibilitychange', sync);
  sync();
});
