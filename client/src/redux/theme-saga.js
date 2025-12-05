import { put, takeEvery, select, take } from 'redux-saga/effects';
import { createFlashMessage } from '../components/Flash/redux';
import { setTheme } from './actions';
import { actionTypes } from './action-types';
import { userThemeSelector } from './selectors';
import { getInitialTheme } from '../utils/theme';

function* toggleThemeSaga() {
  const data = { type: 'success', message: 'flash.updated-themes' };
  const currentTheme = localStorage.getItem('theme');
  const invertedTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', invertedTheme);
  yield put(setTheme(invertedTheme));
  yield put(createFlashMessage({ ...data }));
}

export function* initializeThemeSaga() {
  // Wait for the fetch userComplete action
  yield take(actionTypes.fetchUserComplete);

  const userTheme = yield select(userThemeSelector);
  const selectTheme = getInitialTheme(userTheme);

  localStorage.setItem('theme', selectTheme);
  yield put(setTheme(selectTheme));
}

export function createThemeSaga(types) {
  return [
    takeEvery(types.toggleTheme, toggleThemeSaga),
    takeEvery(types.initializeTheme, initializeThemeSaga)
  ];
}
