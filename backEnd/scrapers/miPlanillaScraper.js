import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { randomDelay, humanType, humanClick } from "../helpers/humanBehavior.js";
import { Solver } from '@2captcha/captcha-solver';
import dotenv from 'dotenv';

dotenv.config();

// const solver = new Solver(process.env.TWOCAPTCHA_API_KEY); // Movido adentro de la función

const MI_PLANILLA_FORM_URL = "https://www.miplanilla.com/Private/Consultaplanillaindependiente.aspx";

const DOC_LABEL_MAP = {
    "CC": "Cédula Ciudadanía",
    "CE": "Cédula de Extranjería",
    "TI": "Tarjeta de Identidad",
    "RC": "Registro Civil",
    "PA": "Pasaporte",
    "CD": "Carnet Diplomático",
};

export const scrapeMiPlanilla = async (report, downloadDir) => {
    const { instructor, platformData } = report;
    const { documentType, documentNumber, fullName, apiKey } = instructor;
    const { numeroPlanilla, mes, anio, valorPagado } = platformData;
    const { fechaPagoDia, fechaPagoMes, fechaPagoAnio } = platformData;

    if (!apiKey) {
        return { success: false, error: "El supervisor no tiene configurada la API Key de 2Captcha." };
    }

    const solver = new Solver(apiKey);

    let browser = null;
    const MAX_RETRIES = 10;

    try {
        console.log(`\n🔍 Mi Planilla Scraper — Doc: ${documentType} ${documentNumber}`);

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

            // 1. Asegurar que estamos en el formulario y esperar estabilidad inicial
            const currentUrl = page.url();
            if (currentUrl === "about:blank" || !currentUrl.includes("Consultaplanillaindependiente.aspx") || currentUrl.includes("error")) {
                console.log("   📄 Navegando al formulario de Mi Planilla...");
                await page.goto(MI_PLANILLA_FORM_URL, { waitUntil: "load", timeout: 90000 });
            }

            await page.waitForSelector("select#cp1_ddlTipoDocumento", { state: "visible", timeout: 20000 });
            await page.waitForTimeout(2000); // Pequeña espera para que el CAPTCHA cargue bien

            // ==========================================================
            // 🛑 ESTRATEGIA: CAPTURAR PRIMERO, LLENAR DESPUÉS 🛑
            // ==========================================================
            console.log("   📸 Capturando CAPTCHA de entrada...");
            const captchaSelector = "img[src*='captchaImage.aspx']";
            const captchaInputSelector = "input#cp1_txtCaptcha";

            const captchaPath = path.join(downloadDir, `captcha_miplanilla_${Date.now()}.png`);
            try {
                const captchaElement = await page.$(captchaSelector);
                await captchaElement.screenshot({ path: captchaPath });
            } catch (e) {
                console.log("   ⚠️ No se pudo capturar el CAPTCHA, reintentando navegación...");
                await page.goto(MI_PLANILLA_FORM_URL, { waitUntil: "domcontentloaded" });
                continue;
            }

            // Leemos la imagen capturada para 2Captcha
            let captchaText = "";
            let solverResult = null;
            let captchaSuccess = false;

            try {
                console.log("   🤖 Enviando CAPTCHA a 2Captcha...");
                const imgBuffer = fs.readFileSync(captchaPath);
                const imgBase64 = imgBuffer.toString('base64');
                
                console.log("   ⏳ Esperando respuesta de 2Captcha...");
                solverResult = await solver.imageCaptcha({ 
                    body: imgBase64,
                    numeric: 1 // Según los docs y el README, es un captcha numérico
                });
                captchaText = solverResult.data;
                captchaSuccess = true;
                console.log(`   ✅ 2Captcha Resuelto. Código: "${captchaText}" (ID: ${solverResult.id})`);
            } catch (err) {
                console.log(`   ⚠️ Error de 2Captcha: ${err.message}`);
                captchaSuccess = false;
                await page.goto(MI_PLANILLA_FORM_URL, { waitUntil: "domcontentloaded" });
                continue;
            }

            // 2. Llenado del formulario
            console.log("   ✏️  Llenando datos del formulario...");

            try {
                // Tipo de Documento (Suele disparar postback, lo hacemos primero)
                const docLabel = DOC_LABEL_MAP[documentType] || "Cédula Ciudadanía";
                await page.selectOption("select#cp1_ddlTipoDocumento", { label: docLabel });
                await page.waitForTimeout(2000);

                // Documento y Planilla
                await page.fill("input#cp1_txtNumeroDocumento", "");
                await humanType(page, "input#cp1_txtNumeroDocumento", documentNumber);
                
                await page.fill("input#cp1_txtNumeroPlanilla", "");
                await humanType(page, "input#cp1_txtNumeroPlanilla", String(numeroPlanilla));

                // Fechas
                if (fechaPagoDia && fechaPagoMes && fechaPagoAnio) {
                    await page.selectOption("select#cp1_cmbDiaPago", String(fechaPagoDia));
                    await page.waitForTimeout(1000);
                    await page.selectOption("select#cp1_cmbMesPago", String(fechaPagoMes));
                    await page.waitForTimeout(1000);
                    await page.selectOption("select#cp1_ddlAnoPago", String(fechaPagoAnio));
                    await page.waitForTimeout(1000);
                }

                // Periodo de salud
                console.log(`   📅 Periodo: ${mes}-${anio}...`);
                await page.selectOption("select#cp1_ddlMesSalud", String(mes));
                await page.waitForTimeout(1000);
                await page.selectOption("select#cp1_ddlAnoSalud", String(anio));
                await page.waitForTimeout(1000);

                // Valor
                await page.fill("input#cp1_txtValorPagado", "");
                await humanType(page, "input#cp1_txtValorPagado", String(valorPagado));

            } catch (fillError) {
                console.log(`   ⚠️ Error llenando campos: ${fillError.message}. Reintentando...`);
                continue;
            }

            if (fs.existsSync(captchaPath)) fs.unlinkSync(captchaPath);

            if (!captchaSuccess || !captchaText) {
                console.log("   ⚠️ No se pudo obtener el CAPTCHA de 2Captcha. Recargando...");
                await page.goto(MI_PLANILLA_FORM_URL, { waitUntil: "domcontentloaded" });
                continue;
            }

            // 4. Digitar CAPTCHA y Enviar
            console.log("   🚀 Enviando consulta...");
            await page.fill(captchaInputSelector, "");
            await humanType(page, captchaInputSelector, captchaText);
            await page.waitForTimeout(1000);
            await humanClick(page, "input#cp1_ButtonConsultar");

            // 5. Validar Resultado
            await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => { });
            await randomDelay(2000, 3000);

            const errorMessage = await page.evaluate(() => {
                const body = document.body.innerText;
                // Mensajes de CAPTCHA incorrecto (varias formas posibles)
                if (body.includes("El código de verificación no coincide") || 
                    body.includes("Captcha incorrecto") ||
                    body.includes("El valor debe coincidir con el número que aparece")) {
                    return "CAPTCHA_ERROR";
                }
                if (body.includes("No se encontraron resultados") || body.includes("La planilla no existe")) {
                    return "NO_DATA";
                }
                return null;
            });

            if (errorMessage === "CAPTCHA_ERROR") {
                console.log("   ⚠️ CAPTCHA rechazado por la página. Reportando error a 2Captcha y reintentando...");
                if (solverResult && solverResult.id) {
                    try {
                        await solver.badReport(solverResult.id);
                        console.log(`   📢 Reporte enviado a 2Captcha (ID: ${solverResult.id})`);
                    } catch (e) {
                         console.log(`   ⚠️ Error enviando reporte a 2Captcha: ${e.message}`);
                    }
                }
                await page.goto(MI_PLANILLA_FORM_URL, { waitUntil: "domcontentloaded" });
                continue;
            } else if (errorMessage === "NO_DATA") {
                console.log("   ℹ️ No se encontraron registros.");
                await browser.close();
                return { success: false, error: "No se encontraron registros" };
            }

            // 6. Éxito - Reportar buen captcha y Exportar Tabla
            console.log("   ✅ Éxito Detectado. Procesando tabla a PDF...");
            if (solverResult && solverResult.id) {
                try {
                    await solver.goodReport(solverResult.id);
                    console.log(`   📢 Reporte de éxito enviado a 2Captcha (ID: ${solverResult.id})`);
                } catch (e) {
                     console.log(`   ⚠️ Error enviando reporte de éxito a 2Captcha: ${e.message}`);
                }
            }
            
            const tableSelector = ".tablaTable"; // Usar clase más genérica y estable
            try {
                // Diagnóstico preventivo
                const debugPagePath = path.join(downloadDir, `debug_result_${Date.now()}.png`);
                await page.screenshot({ path: debugPagePath });
                // Lo borraremos al final del try o en el catch

                await page.waitForSelector(tableSelector, { state: "visible", timeout: 30000 });
                
                // Ocultar elementos que estorben para la "evidencia" limpia
                await page.evaluate(() => {
                    const elementsToHide = [
                        '#header', '.footer', '.menu', 'input#cp1_ButtonConsultar',
                        '#cp1_UpdateProgress1', 'img#cp1_imgCaptcha'
                    ];
                    elementsToHide.forEach(sel => {
                        const el = document.querySelector(sel);
                        if (el) el.style.display = 'none';
                    });
                });

                const tableElement = await page.$(tableSelector);
                const tableImagePath = path.join(downloadDir, `table_evidence_${Date.now()}.png`);
                
                // Tomar captura con un poco de padding
                await tableElement.screenshot({ path: tableImagePath });

                const base64Image = fs.readFileSync(tableImagePath).toString('base64');
                
                // HTML Profesional para el PDF
                const htmlContent = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Arial', sans-serif; margin: 0; padding: 40px; color: #333; }
                        .header { border-bottom: 2px solid #ff6600; padding-bottom: 10px; margin-bottom: 30px; }
                        .header h1 { color: #ff6600; margin: 0; font-size: 24px; }
                        .info { margin-bottom: 30px; line-height: 1.6; }
                        .info b { color: #555; }
                        .evidence-container { text-align: center; border: 1px solid #ddd; padding: 20px; background: #fafafa; border-radius: 8px; }
                        .evidence-container img { max-width: 100%; border: 1px solid #ccc; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                        .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Evidencia de Pago - Mi Planilla (Compensar)</h1>
                    </div>
                    <div class="info">
                        <p><b>Contratista:</b> ${fullName}</p>
                        <p><b>Documento:</b> ${documentType} ${documentNumber}</p>
                        <p><b>Planilla:</b> ${numeroPlanilla}</p>
                        <p><b>Fecha de Consulta:</b> ${new Date().toLocaleString()}</p>
                    </div>
                    <div class="evidence-container">
                        <p style="text-align:left; font-weight:bold; color:#ff6600; font-size:14px; margin-top:0;">Tabla de Administradoras Pagadas:</p>
                        <img src="data:image/png;base64,${base64Image}" />
                    </div>
                    <div class="footer">
                        Documento generado automáticamente como evidencia de consulta en el portal Mi Planilla.
                    </div>
                </body>
                </html>`;

                const safeName = (fullName || "SIN_NOMBRE").replace(/\s+/g, "_").toUpperCase();
                const fileName = `MIPLANILLA_${safeName}_${anio}_${mes}.pdf`;
                const filePath = path.join(downloadDir, fileName);
                
                await page.setContent(htmlContent);
                await page.pdf({ 
                    path: filePath, 
                    format: "A4", 
                    printBackground: true,
                    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
                });

                if (fs.existsSync(tableImagePath)) fs.unlinkSync(tableImagePath);
                if (fs.existsSync(debugPagePath)) fs.unlinkSync(debugPagePath);
                console.log(`   ✅ PDF guardado: ${filePath}`);
                
                await browser.close();
                return { success: true, filePath };
            } catch (err) {
                console.log(`   ❌ Error procesando resultados: ${err.message}`);
                await browser.close();
                return { success: false, error: "Error procesando resultados" };
            }
        }
        throw new Error(`Se alcanzaron los ${MAX_RETRIES} intentos.`);
    } catch (error) {
        console.error(`   ❌ Error Mi Planilla: ${error.message}`);
        if (browser) await browser.close().catch(() => { });
        return { success: false, error: error.message };
    }
};
