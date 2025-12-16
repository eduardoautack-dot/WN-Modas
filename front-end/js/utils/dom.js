export const $ = (sel, parent = document) => parent.querySelector(sel);
export const $$ = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

export function scrollToElement(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
}