import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Modal behaviour: focus moves in, Tab stays inside, Escape closes (if `onClose`), focus returns on close. */
export function useDialog(ref: RefObject<HTMLElement>, open: boolean, onClose?: () => void): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const previous = document.activeElement as HTMLElement | null;
    const items = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    items()[0]?.focus();

    // Hide the page behind the dialog from keyboard, pointer and screen-reader virtual cursor.
    const root = el.closest('[role="dialog"]');
    const inerted = Array.from(root?.parentElement?.children ?? []).filter(
      (c): c is HTMLElement => c !== root && c instanceof HTMLElement && !c.inert,
    );
    inerted.forEach((c) => (c.inert = true));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!el.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      inerted.forEach((c) => (c.inert = false));
      previous?.focus?.();
    };
  }, [open, ref]);
}
