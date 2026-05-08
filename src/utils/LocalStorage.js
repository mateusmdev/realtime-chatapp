/**
 * LocalStorage.js — versão atualizada
 *
 * ÚNICA ADIÇÃO em relação ao original:
 * Métodos getFirebaseUid() e setFirebaseUid() para persistir o UID
 * do Firebase Auth entre sessões. O UID é necessário para derivar
 * a wrapping key PBKDF2 no CryptoService.
 *
 * O UID não é um dado sensível — é um identificador público do usuário
 * no Firebase. Armazená-lo no localStorage é seguro para este propósito.
 */

const KEY = import.meta.env.VITE_STORAGE_KEY

class LocalStorage {

  static getAccessToken() {
    return localStorage.getItem(KEY)
  }

  static setAccessToken(data) {
    localStorage.setItem(KEY, data)
  }

  static getIconList() {
    return localStorage.getItem('icon-list')
  }

  static setIconList(data) {
    localStorage.setItem('icon-list', data)
  }

  static getUserData() {
    return localStorage.getItem('user-data')
  }

  static setUserData(data) {
    localStorage.setItem('user-data', data)
  }

  static getUserPreferences() {
    return localStorage.getItem('user-preferences')
  }

  static setUserPreferences(data) {
    localStorage.setItem('user-preferences', data)
  }

  // ── NOVO ───────────────────────────────────────────────────────────────

  /**
   * Retorna o Firebase UID armazenado na sessão atual.
   * Retorna null se o usuário não estiver autenticado ou se o UID
   * ainda não foi persistido (ex.: primeira execução antes do login).
   *
   * @returns {string|null}
   */
  static getFirebaseUid() {
    return localStorage.getItem('firebase-uid')
  }

  /**
   * Persiste o Firebase UID após autenticação bem-sucedida.
   * Deve ser chamado em IndexController.authenticate() logo após
   * o retorno do signInWithPopup.
   *
   * @param {string} uid - user.uid retornado pelo Firebase Auth
   */
  static setFirebaseUid(uid) {
    localStorage.setItem('firebase-uid', uid)
  }

  // ── FIM NOVO ────────────────────────────────────────────────────────────

  static clearSession() {
    localStorage.removeItem(KEY)
    localStorage.removeItem('user-data')
    localStorage.removeItem('firebase-uid')   // NOVO: limpar UID na saída
  }
}

export default LocalStorage