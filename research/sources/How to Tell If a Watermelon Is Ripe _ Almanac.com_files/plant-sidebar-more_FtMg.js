document.addEventListener('DOMContentLoaded', () => {

  // Only run on Plant pages.
  if (!document.body.classList.contains('content-type-plant')) {
    return;
  }

  const sidebar = document.querySelector('.layout__region--second');

  if (!sidebar) {
    return;
  }

  // Snapshot the sidebar blocks (in order) once, so the layout can be rebuilt
  // when the viewport crosses the mobile/desktop breakpoint.
  const blocks = Array.from(sidebar.children).filter(el =>
    el.classList.contains('block')
  );

  // Desktop keeps the first N blocks visible; mobile collapses every block
  // behind the "More Plant Details" toggle. 768px matches the theme's `md`
  // breakpoint.
  const desktopVisible = 6;
  const mobile = window.matchMedia('(max-width: 767px)');

  let details = null;

  // Move any collapsed blocks back into the sidebar (original order) and drop
  // the toggle, leaving a clean slate to rebuild from.
  const teardown = () => {
    if (!details) {
      return;
    }
    blocks.forEach(block => {
      if (details.contains(block)) {
        sidebar.appendChild(block);
      }
    });
    details.remove();
    details = null;
  };

  const layout = () => {
    const visibleCount = mobile.matches ? 0 : desktopVisible;

    teardown();

    // Nothing to collapse at this breakpoint.
    if (blocks.length <= visibleCount) {
      return;
    }

    details = document.createElement('details');
    details.className = 'plant-sidebar-more';

    const summary = document.createElement('summary');
    summary.textContent = 'More Plant Details';
    details.appendChild(summary);

    // Collapsed by default: no `open` attribute.
    blocks.slice(visibleCount).forEach(block => details.appendChild(block));
    sidebar.appendChild(details);
  };

  layout();
  mobile.addEventListener('change', layout);

});
