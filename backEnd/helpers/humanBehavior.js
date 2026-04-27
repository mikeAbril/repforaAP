/**
 * Utilidades para simular comportamiento humano en los scrapers.
 * Evita detección de bots mediante tipeo variable, pausas y movimientos.
 */

/**
 * Pausa aleatoria entre min y max milisegundos.
 * @param {number} min - Mínimo en ms
 * @param {number} max - Máximo en ms
 */
export const randomDelay = (min = 300, max = 800) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * Escribe texto carácter por carácter con delay variable (simula tipeo humano).
 * @param {import('playwright').Page} page
 * @param {string} selector - Selector CSS del input
 * @param {string} text - Texto a escribir
 */
export const humanType = async (page, selector, text) => {
    await page.click(selector);
    await randomDelay(200, 400);

    for (const char of text) {
        await page.type(selector, char, { delay: 0 });
        // Delay variable entre caracteres: 50-180ms
        const charDelay = Math.floor(Math.random() * 130) + 50;
        await new Promise((resolve) => setTimeout(resolve, charDelay));
    }

    await randomDelay(100, 300);
};

/**
 * Hace click en un elemento con una pausa previa aleatoria.
 * @param {import('playwright').Page} page
 * @param {string} selector - Selector CSS del elemento
 */
export const humanClick = async (page, selector) => {
    await randomDelay(200, 500);
    await page.click(selector);
    await randomDelay(300, 600);
};

/**
 * Selecciona una opción de un <select> con pausa humana.
 * @param {import('playwright').Page} page
 * @param {string} selector - Selector CSS del <select>
 * @param {string} value - Valor de la opción a seleccionar
 */
export const humanSelect = async (page, selector, value) => {
    await randomDelay(200, 400);
    await page.selectOption(selector, value);
    await randomDelay(300, 500);
};
