import { Solver } from "@2captcha/captcha-solver";
import fs from "fs";

/**
 * Utilidad para resolver captchas usando el servicio 2Captcha
 */
export const solveCaptchaWith2Captcha = async (imagePath) => {
    const apiKey = process.env.TWOCAPTCHA_API_KEY;

    if (!apiKey) {
        console.warn("   ⚠️  TWOCAPTCHA_API_KEY no configurado en el entorno.");
        return { success: false, error: "API Key missing" };
    }

    try {
        console.log("   🤖 Enviando imagen a 2Captcha...");
        const solver = new Solver(apiKey);

        // Leer la imagen y convertirla a base64
        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

        const result = await solver.imageCaptcha({
            body: imageBase64,
            numeric: 4, // 1: solo números, 2: solo letras, 3: ambos, 4: ambos (predeterminado)
            min_len: 3,
            max_len: 8
        });

        console.log(`   ✅ 2Captcha reconoció: "${result.data}"`);
        return {
            success: true,
            text: result.data,
            id: result.id
        };
    } catch (error) {
        console.error(`   ❌ Error en 2Captcha (Image): ${error.message}`);
        return { success: false, error: error.message };
    }
};

/**
 * Resuelve un reCAPTCHA V2 (checkbox) usando 2Captcha
 * 
 * @param {string} url - URL de la página donde está el captcha
 * @param {string} siteKey - Site Key del reCAPTCHA
 */
export const solveRecaptchaV2 = async (url, siteKey) => {
    const apiKey = process.env.TWOCAPTCHA_API_KEY;

    if (!apiKey) {
        console.warn("   ⚠️  TWOCAPTCHA_API_KEY no configurado.");
        return { success: false, error: "API Key missing" };
    }

    try {
        console.log("   🤖 Solicitando resolución de reCAPTCHA V2 a 2Captcha...");
        const solver = new Solver(apiKey);

        const result = await solver.recaptcha({
            pageurl: url,
            googlekey: siteKey
        });

        console.log("   ✅ reCAPTCHA V2 resuelto por 2Captcha.");
        return {
            success: true,
            data: result.data,
            id: result.id
        };
    } catch (error) {
        console.error(`   ❌ Error en 2Captcha (reCAPTCHA): ${error.message}`);
        return { success: false, error: error.message };
    }
};
