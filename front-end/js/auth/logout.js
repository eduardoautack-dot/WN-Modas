export function logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
}