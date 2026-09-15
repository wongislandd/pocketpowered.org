const tour = document.getElementById("match-tour");
  if (tour) {
    const controls = tour.querySelectorAll("[data-view]");
    const explanations = tour.querySelectorAll("[data-explanation]");
    controls.forEach((button) => {
      button.addEventListener("click", () => {
        const view = button.dataset.view;
        if (!view) return;
        tour.dataset.focus = view;
        controls.forEach((control) => control.setAttribute("aria-pressed", String(control === button)));
        explanations.forEach((explanation) => { explanation.hidden = explanation.dataset.explanation !== view; });
      });
    });
  }
