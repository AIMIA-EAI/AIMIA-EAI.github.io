export {};

const createArmPlayback = (root: HTMLElement) => {
  const arm = root.querySelector<SVGGElement>('[data-rm-arm]');
  if (!arm) return (_playing: boolean, _reduced: boolean) => {};
  const upper = arm.querySelector<SVGPathElement>('[data-arm-upper]')!;
  const upperHighlight = arm.querySelector<SVGPathElement>('[data-arm-upper-highlight]')!;
  const forearm = arm.querySelector<SVGPathElement>('[data-arm-forearm]')!;
  const forearmHighlight = arm.querySelector<SVGPathElement>('[data-arm-forearm-highlight]')!;
  const elbow = arm.querySelector<SVGCircleElement>('[data-arm-elbow]')!;
  const wrist = arm.querySelector<SVGCircleElement>('[data-arm-wrist]')!;
  const gripper = arm.querySelector<SVGPathElement>('[data-arm-gripper]')!;
  const cube = arm.querySelector<SVGRectElement>('[data-arm-cube]')!;
  const panel = arm.closest<HTMLElement>('[data-rm-panel]')!;
  const shoulder = { x: 521, y: 143 };
  const upperLength = 53;
  const forearmLength = 52;
  const halfCycle = 6000;
  let elapsed = 0;
  let lastTime: number | undefined;
  let frame: number | undefined;
  let seekFrame: number | undefined;

  const interpolate = (from: number, to: number, time: number, start: number, end: number) => {
    const t = Math.max(0, Math.min(1, (time - start) / (end - start)));
    return from + (to - from) * t * t * (3 - 2 * t);
  };
  const draw = (time: number) => {
    // Alternate the transfer direction so the cube never teleports between cycles.
    const forward = Math.floor(time / halfCycle) % 2 === 0;
    const from = forward ? 607 : 566;
    const to = forward ? 566 : 607;
    const t = (time % halfCycle) / halfCycle;
    let x = from;
    let y = 118;
    let opening = 14;
    let phase = 'ready';

    if (t >= 0.12 && t < 0.28) {
      y = interpolate(118, 144, t, 0.12, 0.28);
      phase = 'approach';
    } else if (t >= 0.28 && t < 0.36) {
      y = 144;
      opening = interpolate(14, 8, t, 0.28, 0.36);
      phase = 'grasp';
    } else if (t >= 0.36 && t < 0.48) {
      y = interpolate(144, 111, t, 0.36, 0.48);
      opening = 8;
      phase = 'lift';
    } else if (t >= 0.48 && t < 0.67) {
      x = interpolate(from, to, t, 0.48, 0.67);
      y = 111;
      opening = 8;
      phase = 'transfer';
    } else if (t >= 0.67 && t < 0.79) {
      x = to;
      y = interpolate(111, 144, t, 0.67, 0.79);
      opening = 8;
      phase = 'place';
    } else if (t >= 0.79 && t < 0.87) {
      x = to;
      y = 144;
      opening = interpolate(8, 14, t, 0.79, 0.87);
      phase = 'release';
    } else if (t >= 0.87) {
      x = to;
      y = interpolate(144, 118, t, 0.87, 0.99);
      phase = 'retract';
    }

    // Solve both joints from the tool position; the held cube shares that exact position.
    const wristY = y - 12;
    const dx = x - shoulder.x;
    const dy = wristY - shoulder.y;
    const distance = Math.hypot(dx, dy);
    const along = (upperLength ** 2 - forearmLength ** 2 + distance ** 2) / (2 * distance);
    const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
    const elbowX = shoulder.x + (along * dx + height * dy) / distance;
    const elbowY = shoulder.y + (along * dy - height * dx) / distance;
    const upperPath = `M${shoulder.x} ${shoulder.y}L${elbowX} ${elbowY}`;
    const forearmPath = `M${elbowX} ${elbowY}L${x} ${wristY}`;
    upper.setAttribute('d', upperPath);
    upperHighlight.setAttribute('d', upperPath);
    forearm.setAttribute('d', forearmPath);
    forearmHighlight.setAttribute('d', forearmPath);
    elbow.setAttribute('cx', String(elbowX));
    elbow.setAttribute('cy', String(elbowY));
    wrist.setAttribute('cx', String(x));
    wrist.setAttribute('cy', String(wristY));
    gripper.setAttribute(
      'd',
      `M${x} ${wristY}V${y - 7}M${x - opening} ${y - 7}H${x + opening}M${x - opening} ${y - 7}V${y + 7}M${x + opening} ${y - 7}V${y + 7}`,
    );
    const held = t >= 0.36 && t < 0.79;
    cube.setAttribute('x', String((held ? x : t < 0.36 ? from : to) - 7));
    cube.setAttribute('y', String((held ? y : 144) - 7));
    arm.dataset.armPhase = phase;
  };
  const tick = (time: number) => {
    if (lastTime !== undefined) elapsed += time - lastTime;
    lastTime = time;
    draw(elapsed);
    frame = requestAnimationFrame(tick);
  };
  panel.addEventListener('rm-seek', (event) => {
    const time = (event as CustomEvent<number>).detail;
    if (!Number.isFinite(time)) return;
    if (seekFrame !== undefined) cancelAnimationFrame(seekFrame);
    const target =
      Math.floor(elapsed / halfCycle) * halfCycle + Math.max(0, Math.min(halfCycle, time));
    const start = elapsed;
    const began = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seek = (now: number) => {
      const progress = reduced ? 1 : Math.min(1, (now - began) / 550);
      elapsed = start + (target - start) * progress * progress * (3 - 2 * progress);
      draw(elapsed);
      seekFrame = progress < 1 ? requestAnimationFrame(seek) : undefined;
    };
    lastTime = undefined;
    seek(began);
  });
  draw(0);
  return (playing: boolean, reduced: boolean) => {
    if (seekFrame !== undefined) cancelAnimationFrame(seekFrame);
    seekFrame = undefined;
    if (playing && !reduced && !panel.hidden) {
      if (frame === undefined) frame = requestAnimationFrame(tick);
    } else {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      lastTime = undefined;
      if (reduced && panel.dataset.demo === 'auto') draw(5500);
    }
  };
};

document.querySelectorAll<HTMLElement>('[data-research-motion]').forEach((root) => {
  if (root.dataset.rmInitialized === 'true') return;
  root.dataset.rmInitialized = 'true';
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-rm-tab]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-rm-panel]')];
  const pause = root.querySelector<HTMLButtonElement>('[data-rm-pause]')!;
  const pauseLabel = pause.querySelector<HTMLElement>('[data-rm-pause-label]')!;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const syncArmPlayback = createArmPlayback(root);
  let userPaused = false;
  let manualStep = false;

  const syncPlayback = () => {
    const reduced = motionPreference.matches;
    const bounds = root.getBoundingClientRect();
    const offscreen = bounds.bottom <= 0 || bounds.top >= window.innerHeight;
    const paused = userPaused || manualStep || reduced || offscreen || document.hidden;
    root.dataset.paused = String(paused);
    syncArmPlayback(!paused, reduced);
    pause.setAttribute('aria-pressed', String(userPaused || manualStep || reduced));
    pause.disabled = reduced;
    pauseLabel.textContent = reduced
      ? pause.dataset.reducedLabel!
      : userPaused || manualStep
        ? pause.dataset.playLabel!
        : pause.dataset.pauseLabel!;
  };
  const resetSteps = () => {
    manualStep = false;
    const embodied = panels.find((panel) => panel.dataset.rmPanel === 'embodied')!;
    embodied.dataset.demo = 'auto';
    const choices = [...embodied.querySelectorAll<HTMLButtonElement>('[data-rm-choice]')];
    choices.forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.rmChoice === 'auto')),
    );
    embodied.querySelector<HTMLElement>('[data-rm-status]')!.textContent = choices[0].dataset.note!;
  };
  const selectTab = (selected: HTMLButtonElement, focus = false) => {
    resetSteps();
    tabs.forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.rmPanel !== selected.dataset.rmTab;
    });
    syncPlayback();
    if (focus) selected.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      let next: number;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectTab(tabs[next], true);
    });
  });
  panels.forEach((panel) => {
    const choices = [...panel.querySelectorAll<HTMLButtonElement>('[data-rm-choice]')];
    const status = panel.querySelector<HTMLElement>('[data-rm-status]')!;
    choices.forEach((choice) =>
      choice.addEventListener('click', () => {
        const value = choice.dataset.rmChoice!;
        panel.dataset.demo = value;
        choices.forEach((button) => button.setAttribute('aria-pressed', String(button === choice)));
        status.textContent = choice.dataset.note!;
        if (panel.dataset.rmPanel === 'embodied') {
          manualStep = value !== 'auto';
          userPaused = false;
          syncPlayback();
          const times: Record<string, number> = {
            approach: 1450,
            grasp: 2050,
            transfer: 3500,
            release: 5100,
          };
          if (value in times)
            panel.dispatchEvent(new CustomEvent('rm-seek', { detail: times[value] }));
        }
        if (panel.dataset.rmPanel === 'multimodal') {
          const label = panel.querySelector<SVGTextElement>('.rm-svg-text.rm-accent');
          if (label)
            label.textContent =
              value === 'video'
                ? document.documentElement.lang.startsWith('zh')
                  ? '时序关联'
                  : 'temporal links'
                : value === 'detail'
                  ? document.documentElement.lang.startsWith('zh')
                    ? '局部细节'
                    : 'local details'
                  : document.documentElement.lang.startsWith('zh')
                    ? '视觉概念'
                    : 'visual concepts';
        }
        if (panel.dataset.rmPanel === 'ai-for-science') {
          const sequence = panel.querySelector('[data-rm-sequence]');
          if (sequence)
            sequence.textContent =
              value === 'a' ? 'V G L C A G' : value === 'g' ? 'A D L C A G' : 'A G L C A G';
          const curve = panel.querySelector('.rm-prediction-curve');
          const paths: Record<string, string> = {
            wild: 'M515 137c14-6 21-30 35-21s18 15 32-9 21-27 33-31',
            a: 'M515 137c14-16 21-15 35-31s18 9 32-9 21-12 33-35',
            g: 'M515 137c14 2 21-18 35-11s18-10 32-9 21-9 33-21',
          };
          curve?.setAttribute('d', paths[value]);
          const pointYs =
            value === 'a'
              ? [137, 106, 97, 62]
              : value === 'g'
                ? [137, 126, 117, 96]
                : [137, 116, 107, 76];
          panel
            .querySelectorAll<SVGCircleElement>('.rm-prediction-curve ~ circle')
            .forEach((point, index) => point.setAttribute('cy', String(pointYs[index])));
        }
      }),
    );
  });
  pause.addEventListener('click', () => {
    if (manualStep) {
      resetSteps();
      userPaused = false;
    } else userPaused = !userPaused;
    syncPlayback();
  });
  motionPreference.addEventListener('change', syncPlayback);
  document.addEventListener('visibilitychange', syncPlayback);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(syncPlayback, { threshold: 0.05 }).observe(root);
  }
  syncPlayback();
});
