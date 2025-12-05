type Theme = 'dark' | 'light';

export function getInitialTheme(userPreference?: string): Theme {
  const localStorageTheme = localStorage.getItem('theme');
  const isSysThemeDark = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches;

  let selectTheme: Theme = 'light';

  if (localStorageTheme !== null) {
    selectTheme = localStorageTheme === 'dark' ? 'dark' : 'light';
  } else if (userPreference) {
    selectTheme = userPreference === 'night' ? 'dark' : 'light';
  } else if (isSysThemeDark) {
    selectTheme = 'dark';
  }

  return selectTheme;
}
