export function showToast(message: string) {
  window.dispatchEvent(
    new CustomEvent<string>('schoolroom:toast', { detail: message }),
  );
}
