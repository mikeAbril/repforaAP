import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { randomDelay, humanType, humanClick, humanSelect } from "../helpers/humanBehavior.js";
import { Solver } from '@2captcha/captcha-solver';
import dotenv from 'dotenv';

dotenv.config();

const solver = new Solver(process.env.TWOCAPTCHA_API_KEY);

const APORTES_FORM_URL = "https://empresas.aportesenlinea.com/Autoservicio/CertificadoAportes.aspx";
const SITE_KEY = "6Lc6FDMUAAAAAKwQX0_xF92Z1MiUXm4sYbQ6bh6J";

const DOC_LABEL_MAP = {
    "CC": "Cédula de ciudadanía",
    "CE": "Cédula de extranjería",
    "TI": "Tarjeta de identidad",
    "PA": "Pasaporte"
};

export const scrapeAportesEnLinea = async (report, downloadDir) => {
    const { contractor, platformData } = report;
    const { documentType, documentNumber, eps, fullName } = contractor;
    const { mesIni, anioIni, mesFin, anioFin, fechaExpedicion } = platformData; 
    
    // Si no vienen rangos, usamos el mes/año base para "desde" y "hasta"
    const startMes = mesIni || platformData.mes;
    const startAnio = anioIni || platformData.anio;
    const endMes = mesFin || platformData.mes;
    const endAnio = anioFin || platformData.anio;

    let browser = null;
    const MAX_RETRIES = 10;

    try {
        console.log(`\n🔍 Aportes en Línea Scraper — Doc: ${documentType} ${documentNumber}`);

        browser = await chromium.launch({
            headless: process.env.HEADLESS !== "false",
            args: ["--disable-popup-blocking", "--disable-extensions"],
        });

        const context = await browser.newContext({
            acceptDownloads: true,
            viewport: { width: 1280, height: 720 },
            ignoreHTTPSErrors: true,
            javaScriptEnabled: true,
        });

        const page = await context.newPage();

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            console.log(`\n   🔄 Intento ${attempt} de ${MAX_RETRIES}...`);

            try {
                // 1. Navegación al formulario
                const currentUrl = page.url();
                if (currentUrl === "about:blank" || !currentUrl.includes("CertificadoAportes.aspx")) {
                    console.log("   📄 Navegando al formulario de Aportes en Línea...");
                    await page.goto(APORTES_FORM_URL, { waitUntil: "networkidle", timeout: 60000 });
                }

                await page.waitForSelector("select#contenido_ddlTipoIdent", { state: "visible", timeout: 20000 });

                console.log("   🤖 Solucionando ReCaptcha v2...");
                // Iniciar 2Captcha asíncrono para ganar tiempo, capturando el error para evitar crash de Node
                let captchaError = null;
                const captchaPromise = solver.recaptcha({
                    pageurl: page.url(),
                    googlekey: SITE_KEY,
                }).catch(err => {
                    captchaError = err;
                    return null;
                });

                // 2. Llenar formulario mientras se resuelve el captcha
                console.log("   ✏️  Llenando datos del formulario...");

                // Use the exact labels provided by the user and mapped in DOC_LABEL_MAP
                const docLabel = DOC_LABEL_MAP[documentType] || "Cédula de ciudadanía";
                await page.selectOption("select#contenido_ddlTipoIdent", { label: docLabel });
                
                // Esperamos que las peticiones AJAX del UpdatePanel de ASP.NET terminen
                await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
                await randomDelay(1500, 2000);

                // Volvemos a ubicar los elementos post-recarga
                await page.waitForSelector("input#contenido_tbNumeroIdentificacion", { state: 'visible' });

                await page.fill("input#contenido_tbNumeroIdentificacion", "");
                await humanType(page, "input#contenido_tbNumeroIdentificacion", documentNumber);

                // Las opciones de mes de Aportes en Línea son los valores numéricos directos sin ceros a la izquierda (1-12)
                const extractMes = (m) => Number(m).toString();
                
                await page.selectOption("select#contenido_ddlAnioIni", String(startAnio));
                await randomDelay(300, 500);
                await page.selectOption("select#contenido_ddlMesIni", extractMes(startMes));
                await randomDelay(300, 500);

                await page.selectOption("select#contenido_ddlAnioFin", String(endAnio));
                await randomDelay(300, 500);
                await page.selectOption("select#contenido_ddlMesFin", extractMes(endMes));
                await randomDelay(300, 500);

                // EPS
                if (eps) {
                     console.log(`   ✏️  Buscando EPS: ${eps}...`);
                     await page.fill("input#contenido_txtAdmin", "");
                     await humanType(page, "input#contenido_txtAdmin", eps);
                     
                     // Esperar a que aparezca la lista de autocompletado de jQuery UI
                     try {
                         await page.waitForSelector("ul.ui-autocomplete li.ui-menu-item", { timeout: 5000 });
                         // Hacer clic en la primera sugerencia
                         await page.click("ul.ui-autocomplete li.ui-menu-item:first-child");
                         console.log("   ✅ Sugerencia de EPS seleccionada.");
                     } catch (e) {
                         console.log("   ⚠️ No apareció lista de sugerencias, continuando con Tab...");
                         await page.keyboard.press("Tab");
                     }
                     await randomDelay(800, 1200);
                }

                // Fecha de Expedición (viene del platformData)
                if (fechaExpedicion) {
                     // Las máscaras de fecha suelen causar problemas con tipeo humano char por char. Mejor inyectar directo o fill rápido.
                     await page.fill("input#contenido_txtFechaExp", fechaExpedicion);
                     await randomDelay(500, 800);
                     // Disparamos evento change por si acaso
                     await page.evaluate(() => {
                         const el = document.getElementById("contenido_txtFechaExp");
                         if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
                     });
                }

                // El radio button 'Activo' viene chequeado por defecto y está oculto, no es necesario hacer click.

                // 3. Esperar a 2Captcha
                console.log("   ⏳ Esperando token de 2Captcha...");
                const solverResult = await captchaPromise;
                
                if (captchaError) {
                    throw captchaError;
                }
                
                console.log(`   ✅ Token obtenido. Evaluando en el DOM...`);

                // Insert token in the hidden textarea and call the typical callback if needed
                await page.evaluate((token) => {
                    document.getElementById("g-recaptcha-response").innerHTML = token;
                    // Sometimes there's a callback, let's try calling it if it exists inside __doPostBack or standard form submit.
                }, solverResult.data);
                
                await randomDelay(1000, 2000);

                // 4. Submit
                console.log("   🚀 Enviando formulario...");
                // Aportes en Línea uses an asp:LinkButton which executes __doPostBack
                // The native ASP __doPostBack has 'arguments.caller' which fails under Playwright's strict mode page.evaluate.
                // We physically click the button instead.
                // En lugar de `download`, Aportes en Línea abre una nueva pestaña (popup) con el visor de PDF
                const popupPromise = page.waitForEvent('popup', { timeout: 30000 }).catch(() => null);

                await page.click("a#contenido_btnCalcular");

                console.log("   🪟 Esperando pestaña emergente con el PDF...");
                const popup = await popupPromise;

                if (popup) {
                    // Esperamos a que la nueva pestaña termine de cargar el PDF
                    await popup.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
                    
                    const pdfUrl = popup.url();
                    console.log(`   📄 PDF abierto en URL: ${pdfUrl}`);
                    
                    const safeName = (fullName || "SIN_NOMBRE").replace(/\s+/g, "_").toUpperCase();
                    const fileName = `APORTES_${safeName}_${startAnio}_${startMes.toString().padStart(2, '0')}.pdf`;
                    const filePath = path.join(downloadDir, fileName);

                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

                    // Descargar el contenido PDF de la nueva pestaña.
                    // Playwright no expone un método simple para "guardar como" una pestaña de PDF nativa.
                    // Pero podemos capturar la respuesta original o guardar el pdf impreso.
                    // La forma más confiable si es una URL es descargarla directamente. Si requiere sesión, Playwright context provee cookies.
                    const response = await popup.request.get(pdfUrl);
                    const buffer = await response.body();
                    fs.writeFileSync(filePath, buffer);
                    
                    console.log(`   ✅ Certificado PDF guardado exitosamente en: ${filePath}`);
                    
                    await popup.close();
                    await browser.close();
                    return { success: true, filePath };
                } else {
                    console.log("   ❌ No se abrió la pestaña del PDF, verificando posibles errores en la página...");
                    
                    // Look for ASP.NET error alerts or summary labels
                    const errorMsg = await page.evaluate(() => {
                        const summary = document.getElementById("contenido_ValidationSummary1");
                        if (summary && summary.style.display !== 'none' && summary.innerText.trim().length > 0) {
                            return summary.innerText.trim();
                        }
                        return null;
                    });

                    if (errorMsg) {
                        console.log(`   ⚠️ Error de la plataforma: ${errorMsg}`);
                        if (errorMsg.toLowerCase().includes("captcha")) {
                            // If captcha failed somehow
                             if(solverResult.id) await solver.badReport(solverResult.id);
                             await page.goto(APORTES_FORM_URL, { waitUntil: "networkidle" });
                             continue;
                        } else {
                             // Non-captcha error (e.g., No results)
                             await browser.close();
                             return { success: false, error: errorMsg };
                        }
                    }

                    // No error found but no download either. Retry
                    console.log("   ⚠️ Fallo silencioso, reintentando...");
                    await page.goto(APORTES_FORM_URL, { waitUntil: "networkidle" });
                    continue;
                }

            } catch (innerError) {
                console.log(`   ⚠️ Error en intento ${attempt}: ${innerError.message}`);
                // Refresh and try again
                await page.goto(APORTES_FORM_URL, { waitUntil: "networkidle" }).catch(() => {});
                await randomDelay(2000, 3000);
            }
        }

        throw new Error(`Se alcanzaron los ${MAX_RETRIES} intentos sin éxito.`);

    } catch (error) {
        console.error(`   ❌ Error Fatal en Aportes Scraper: ${error.message}`);
        if (browser) await browser.close().catch(() => { });
        return { success: false, error: error.message };
    }
};
