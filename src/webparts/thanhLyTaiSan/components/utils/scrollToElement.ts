export function scrollToElement(
  element: HTMLElement | undefined,
  options?: ScrollIntoViewOptions
): void {
  if (!element || typeof element.scrollIntoView !== 'function') {
    return;
  }

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest',
    ...options
  });
}
