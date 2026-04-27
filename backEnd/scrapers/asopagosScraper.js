import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { randomDelay, humanType, humanClick, humanSelect } from "../helpers/humanBehavior.js";
import { Solver } from '@2captcha/captcha-solver';
import dotenv from 'dotenv';

dotenv.config();

const solver = new Solver(process.env.TWOCAPTCHA_API_KEY);

const ASOPAGOS_FORM_URL = "https://www.enlace-apb.com/interssi/descargarCertificacionPago.jsp";

/**
 * Mapeo de códigos a ETIQUETAS EXACTAS de Asopagos para el select de Tipo de Documento
 */
const DOC_LABEL_MAP = {
    "CC": "Cédula de Ciudadanía",
    "CD": "Carné Diplomático",
    "CE": "Cédula de Extranjería",
    "TI": "Tarjeta de Identidad",
    "RC": "Registro Civil",
    "SC": "Salvo conducto de permanencia",
    "PA": "Pasaporte",
    "PE": "Permiso Especial",
    "PT": "Permiso por Protección Temporal"
};

/**
 * Scraper de Asopagos
 * 
 * @param {Object} report - Datos del reporte
 * @param {string} downloadDir - Directorio de descargas
 */
export const scrapeAsopagos = async (report, downloadDir) => {
    const { contractor, platformData } = report;
    const { documentType, documentNumber, fullName } = contractor;
    const { mes, anio } = platformData;

    let browser = null;
    const MAX_RETRIES = 5; // Reducimos intentos ya que 2Captcha es más preciso

    // Hardcoded a sinValores para evitar el login (conValores requiere inicio de sesión)
    const finalTipoReporte = "sinValores";

    try {
        console.log(`\n🔍 Asopagos Scraper — Doc: ${documentType} ${documentNumber}`);

        browser = await chromium.launch({
            headless: process.env.HEADLESS !== "false",
            args: [
                "--disable-popup-blocking",
                "--disable-extensions",
            ]
        });

        const context = await browser.newContext({
            acceptDownloads: true,
            viewport: { width: 1280, height: 720 },
            ignoreHTTPSErrors: true,
            javaScriptEnabled: true,
        });

        const page = await context.newPage();

        // 1. Navegación inicial
        console.log("   📄 Navegando al formulario de Asopagos...");
        await page.goto(ASOPAGOS_FORM_URL, { waitUntil: "networkidle", timeout: 60000 });

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            console.log(`\n   🔄 Intento ${attempt} de ${MAX_RETRIES}...`);

            // 2. Asegurar que estamos en el formulario
            const currentUrl = page.url();
            if (currentUrl.includes("ServletEmpleado") || !currentUrl.includes("descargarCertificacionPago.jsp")) {
                console.log("   📄 Detectada página de error. Reintentando navegación...");
                await page.goto(ASOPAGOS_FORM_URL, { waitUntil: "networkidle" });
            }

            await page.waitForSelector("select#tipoID", { state: "visible", timeout: 15000 });

            // Llenado de campos
            console.log("   ✏️  Llenando datos del formulario...");
            const exactDocLabel = DOC_LABEL_MAP[documentType] || "Cédula de Ciudadanía";
            await page.selectOption("select#tipoID", { label: exactDocLabel });
            
            await page.fill("input#numeroID", ""); 
            await humanType(page, "input#numeroID", documentNumber);
            
            await page.fill("input#ano", "");
            await humanType(page, "input#ano", String(anio));
            
            await humanSelect(page, "select#mes", String(mes).padStart(2, '0'));
            await randomDelay(1500, 2500);

            // Seleccionar tipo de reporte
            await page.evaluate((val) => {
                const sel = document.querySelector("select#tipoReporte");
                if (sel) { sel.value = val; sel.dispatchEvent(new Event('change')); }
            }, finalTipoReporte);

            // 3. Resolución de CAPTCHA con 2Captcha
            console.log("   📸 Procesando CAPTCHA con 2Captcha...");
            const captchaSelector = "img#captcha_imgpop";
            
            let solverResult = null;
            try {
                await page.waitForSelector(captchaSelector, { state: "visible", timeout: 10000 });
                const captchaElement = await page.$(captchaSelector);
                const captchaPath = path.join(downloadDir, `asopagos_captcha_${Date.now()}.png`);
                await captchaElement.screenshot({ path: captchaPath });

                const imgBase64 = fs.readFileSync(captchaPath, { encoding: 'base64' });
                console.log("   ⏳ Esperando respuesta de 2Captcha...");
                
                solverResult = await solver.imageCaptcha({
                    body: imgBase64,
                    numeric: 4, // Alfanumérico
                    min_len: 3
                });

                if (fs.existsSync(captchaPath)) fs.unlinkSync(captchaPath);
                
                console.log(`   ✅ 2Captcha Resuelto: "${solverResult.data}"`);
                
                await page.fill("input#captchaIn", "");
                await humanType(page, "input#captchaIn", solverResult.data);
                await randomDelay(500, 1000);
            } catch (captchaError) {
                console.error(`   ⚠️ Fallo en fase de CAPTCHA: ${captchaError.message}`);
                continue; 
            }

            // 4. Envío y Descarga
            console.log("   🚀 Enviando consulta...");
            const downloadPromise = page.waitForEvent("download", { timeout: 40000 }).catch(() => null);
            await humanClick(page, "input#enviarConsRP");

            const finalDownload = await downloadPromise;

            if (finalDownload) {
                // Éxito: Reportamos buen captcha
                if (solverResult?.id) await solver.goodReport(solverResult.id).catch(() => {});

                const safeName = (fullName || "SIN_NOMBRE").replace(/\s+/g, "_").toUpperCase();
                const fileName = `ASOPAGOS_${safeName}_${anio}_${mes}.pdf`;
                const filePath = path.join(downloadDir, fileName);

                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                await finalDownload.saveAs(filePath);
                console.log(`   ✅ Certificado guardado en: ${filePath}`);

                await browser.close();
                return { success: true, filePath };
            } else {
                console.log("   ❌ No se detectó descarga. Verificando error...");
                await randomDelay(2000, 3000);

                const errorMessage = await page.evaluate(() => {
                    const body = document.body.innerText;
                    if (body.includes("Captcha incorrecto") || body.includes("caracteres ingresados no coinciden")) return "CAPTCHA_ERROR";
                    if (body.includes("No se encontraron registros") || body.includes("No existe")) return "NO_DATA";
                    return null;
                });

                if (errorMessage === "CAPTCHA_ERROR") {
                    console.log("   ⚠️ CAPTCHA rechazado por la web. Reportando error a 2Captcha...");
                    if (solverResult?.id) await solver.badReport(solverResult.id).catch(() => {});
                    await humanClick(page, "#image-recaptcha");
                    await randomDelay(1000, 2000);
                } else if (errorMessage === "NO_DATA") {
                    console.log("   ℹ️ No se encontraron registros.");
                    await browser.close();
                    return { success: false, error: "No se encontraron registros" };
                } else {
                    console.log("   ⚠️ Error desconocido o timeout de descarga. Reintentando...");
                    await humanClick(page, "#image-recaptcha");
                    await randomDelay(1000, 2000);
                }
            }
        }

        throw new Error(`Se alcanzaron los ${MAX_RETRIES} intentos sin éxito.`);

    } catch (error) {
        console.error(`   ❌ Error en Asopagos Scraper: ${error.message}`);
        if (browser) await browser.close().catch(() => { });
        return { success: false, error: error.message };
    }
};
