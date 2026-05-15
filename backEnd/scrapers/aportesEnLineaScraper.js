import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { randomDelay, humanType, humanClick } from "../helpers/humanBehavior.js";
import { Solver } from '@2captcha/captcha-solver';


const APORTES_FORM_URL = "https://empresas.aportesenlinea.com/Autoservicio/CertificadoAportes.aspx";
const SITE_KEY = "6Lc6FDMUAAAAAKwQX0_xF92Z1MiUXm4sYbQ6bh6J";

const DOC_LABEL_MAP = {
    "CC": "Cédula de ciudadanía",
    "CE": "Cédula de extranjería",
    "TI": "Tarjeta de identidad",
    "PA": "Pasaporte"
};

export const scrapeAportesEnLinea = async (report, downloadDir) => {
    const { instructor, platformData } = report;
    const { documentType, documentNumber, eps, fullName, documentIssueDate, apiKey } = instructor;
    const { mesIni, anioIni, mesFin, anioFin, fechaExpedicion } = platformData; 

    if (!apiKey) {
        return { success: false, error: "API Key de 2Captcha no encontrada en el perfil del supervisor." };
    }

    const solver = new Solver(apiKey);
    
    const finalFechaExp = fechaExpedicion || (documentIssueDate ? new Date(documentIssueDate).toISOString().split('T')[0] : null);
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
            executablePath: process.env.CHROMIUM_PATH || undefined,
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

                // Fecha de Expedición (viene del instructor o platformData)
                if (finalFechaExp) {
                     // Las máscaras de fecha suelen causar problemas con tipeo humano char por char. Mejor inyectar directo o fill rápido.
                     await page.fill("input#contenido_txtFechaExp", finalFechaExp);
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
                console.log("   🚀 Enviando formulario e interceptando descarga...");
                
                let pdfBuffer = null;
                const responseListener = async (response) => {
                    try {
                        const contentType = response.headers()['content-type'];
                        if (contentType && contentType.includes('application/pdf')) {
                            const buffer = await response.body();
                            if (buffer && buffer.length > 1000) {
                                pdfBuffer = buffer;
                            }
                        }
                    } catch (e) {
                        // Ignorar errores al leer el body de respuestas incompletas
                    }
                };
                context.on('response', responseListener);

                // También monitoreamos descargas nativas por si acaso
                const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);

                await page.click("a#contenido_btnCalcular");

                console.log("   🪟 Esperando respuesta o popup con el PDF...");
                
                // Esperar a que caiga el PDF en buffer, o haya una descarga nativa
                let waitTime = 0;
                let download = null;
                while (!pdfBuffer && !download && waitTime < 25000) {
                    await new Promise(r => setTimeout(r, 500));
                    waitTime += 500;
                    if (!download) {
                        // Verifica si downloadPromise resolvió
                        Promise.race([downloadPromise, Promise.resolve(null)]).then(d => { if(d) download = d; });
                    }
                }

                context.off('response', responseListener);

                const safeName = (fullName || "SIN_NOMBRE").replace(/\s+/g, "_").toUpperCase();
                const fileName = `APORTES_${safeName}_${startAnio}_${startMes.toString().padStart(2, '0')}.pdf`;
                const filePath = path.join(downloadDir, fileName);

                if (download) {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    await download.saveAs(filePath);
                    console.log(`   ✅ Certificado PDF guardado exitosamente (vía evento download) en: ${filePath}`);
                    await browser.close();
                    return { success: true, filePath };
                }

                if (pdfBuffer) {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    fs.writeFileSync(filePath, pdfBuffer);
                    console.log(`   ✅ Certificado PDF guardado exitosamente (interceptado) en: ${filePath}`);
                    await browser.close();
                    return { success: true, filePath };
                }

                // Si no hay PDF, revisar errores
                console.log("   ❌ No se obtuvo el PDF, verificando posibles errores en la página...");
                const errorMsg = await page.evaluate(() => {
                    const summary = document.getElementById("contenido_ValidationSummary1");
                    if (summary && summary.style.display !== 'none' && summary.innerText.trim().length > 0) {
                        return summary.innerText.trim();
                    }
                    return null;
                });

                if (errorMsg) {
                    console.log(`   ⚠️ Error de la plataforma: ${errorMsg}`);
                    if (errorMsg.toLowerCase().includes("captcha") || errorMsg.toLowerCase().includes("seguridad")) {
                         if(solverResult.id) await solver.badReport(solverResult.id);
                         await page.goto(APORTES_FORM_URL, { waitUntil: "networkidle" }).catch(()=>{});
                         continue;
                    } else {
                         await browser.close();
                         return { success: false, error: errorMsg };
                    }
                }

                console.log("   ⚠️ Fallo silencioso, no hubo PDF ni error, reintentando...");
                await page.goto(APORTES_FORM_URL, { waitUntil: "networkidle" }).catch(()=>{});
                continue;

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
