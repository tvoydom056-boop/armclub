/**
 * Phaser FIT замечает новый размер контейнера только в игровом цикле (раз в 500 мс), а refresh() берёт
 * запомненный размер родителя: пока цикл стоит, canvas остаётся старым и обрезается. Зовёт refresh на смену размера.
 */
export function observeStageSize(parent: HTMLElement, refresh: () => void): () => void {
  let pending = 0;
  const observer = new ResizeObserver(() => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      const { width, height } = parent.getBoundingClientRect();
      if (width > 0 && height > 0) refresh();
    });
  });
  observer.observe(parent);
  return () => {
    observer.disconnect();
    if (pending) cancelAnimationFrame(pending);
  };
}
