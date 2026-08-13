/** Static-export-safe browser navigation helper. */
export function browserNavigate(url: string): void {
  window.location.assign(url);
}
