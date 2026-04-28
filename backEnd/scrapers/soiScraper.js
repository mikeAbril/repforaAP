import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { randomDelay, humanType, humanClick, humanSelect } from "../helpers/humanBehavior.js";

/**
 * Mapeo de tipos de documento del backend a las ETIQUETAS EXACTAS (labels) del select de SOI.
 */
const DOC_LABEL_MAP = {
    "CC": "Cédula de ciudadanía",
    "CD": "Carné diplomático",
    "CE": "Cédula de extranjería",
    "PA": "Pasaporte",
    "PE": "Permiso especial permanencia",
    "PT": "Permiso por protección temporal",
    "RC": "REGISTRO CIVIL",
    "SC": "Salvo conducto",
    "TI": "Tarjeta de identidad"
};

const SOI_URL = "https://servicio.nuevosoi.com.co/soi/certificadoAportesCotizante.do";

/**
 * Ejecuta el scraper de SOI para un reporte específico.
 * La URL lleva directo al formulario de certificados — todos los campos son visibles.
 *
 * Flujo:
 * 1. Llenar aportante (tipo doc + número)
 * 2. Llenar cotizante (tipo doc + número) — mismos datos para independientes
 * 3. Seleccionar EPS, Mes, Año
 * 4. Click "Descargar PDF"
 *
 * @param {Object} report - Datos del reporte con instructor populado
 * @param {string} downloadDir - Ruta absoluta donde guardar el PDF
 * @returns {Promise<{ success: boolean, filePath?: string, error?: string }>}
 */
export const scrapeSoi = async (report, downloadDir) => {
    const { instructor, platformData } = report;
    const { documentType, documentNumber, eps } = instructor;
    const { mes, anio } = platformData;

    if (!eps) {
        return { success: false, error: "La EPS es obligatoria para la plataforma SOI." };
    }

    let browser = null;

    try {
        console.log(`\n🔍 SOI Scraper — Doc: ${documentType} ${documentNumber}`);
        console.log(`   EPS: ${eps} | Periodo: ${mes}/${anio}`);

        // 1. Lanzar navegador
        browser = await chromium.launch({
            headless: process.env.HEADLESS !== "false",
        });

        const context = await browser.newContext({
            acceptDownloads: true,
            viewport: { width: 1280, height: 720 },
        });

        const page = await context.newPage();

        // 2. Navegar al formulario (llega directo, sin botones intermedios)
        console.log("   📄 Navegando a SOI...");
        await page.goto(SOI_URL, { waitUntil: "networkidle" });
        await randomDelay(1500, 2500);

        // 3. Llenar datos del APORTANTE (sección superior)
        console.log("   ✏️  Llenando datos del aportante...");
        const exactDocLabel = DOC_LABEL_MAP[documentType] || "Cédula de ciudadanía";
        await randomDelay(200, 400);
        await page.selectOption("#tipoDocumentoAportante", { label: exactDocLabel });
        await randomDelay(300, 500);
        await humanType(page, 'input[name="numeroDocumentoAportante"]', documentNumber);

        // 4. Llenar datos del COTIZANTE (sección inferior, mismos datos para independientes)
        console.log("   ✏️  Llenando datos del cotizante...");
        await randomDelay(200, 400);
        await page.selectOption("#tipoDocumentoCotizante", { label: exactDocLabel });
        await randomDelay(300, 500);
        await humanType(page, "#numeroDocumentoCotizante", documentNumber);

        // 5. Seleccionar EPS por su ETIQUETA EXACTA (label)
        console.log(`   🏥 Seleccionando EPS exacta: ${eps}...`);
        
        // Verificar si la opción existe antes de seleccionar para evitar timeout de 30s
        const options = await page.$$eval('#administradoraSalud option', opts => opts.map(o => o.text.trim()));
        if (!options.includes(eps)) {
            console.log("   ❌ La EPS proporcionada no existe en el menú de SOI.");
            console.log("   📋 Opciones disponibles en SOI:", options.slice(0, 5).join(", "), "...");
            throw new Error(`La EPS '${eps}' no es válida para SOI. Verifique que coincida exactamente con las opciones del formulario.`);
        }

        await randomDelay(200, 400);
        await page.selectOption("#administradoraSalud", { label: eps });
        await randomDelay(300, 500);

        // 6. Seleccionar Mes y Año
        console.log(`   📅 Seleccionando periodo: ${mes}/${anio}...`);
        await humanSelect(page, "#periodoLiqSaludMes", String(parseInt(mes)));
        await humanSelect(page, "#periodoLiqSaludAnnio", String(anio));

        // 7. Click en "Descargar PDF" e interceptar la descarga
        console.log("   📥 Descargando PDF...");
        await randomDelay(800, 1500);

        // Interceptar la descarga con manejo de errores específicos de la plataforma
        let download;
        try {
            [download] = await Promise.all([
                page.waitForEvent("download", { timeout: 30000 }),
                page.click("button:has-text('Descargar PDF')"),
            ]);
        } catch (downloadError) {
            // Si hay timeout, buscar si hay mensajes de error en la página
            const errorMsg = await page.evaluate(() => {
                // Buscar divs de alerta o mensajes de error típicos de SOI
                const selectors = ['.f-error', '.mensajeError', '.alert-danger', '#mensajesError'];
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el && el.innerText.trim()) return el.innerText.trim();
                }
                return null;
            });

            if (errorMsg) {
                console.log(`   ⚠️ SOI reportó un mensaje: "${errorMsg}"`);
                throw new Error(`SOI: ${errorMsg}`);
            }

            // Capturar pantalla para diagnóstico si no se encontró mensaje pero hubo timeout
            const screenshotPath = path.join(downloadDir, `error_soi_${documentNumber}.png`);
            await page.screenshot({ path: screenshotPath });
            console.log(`   📸 Captura de pantalla de error guardada en: ${screenshotPath}`);
            
            throw downloadError;
        }

        // 8. Guardar el archivo descargado (SOI descarga un ZIP)
        const zipFileName = `${documentType}_${documentNumber}_${anio}_${mes}.zip`;
        const zipPath = path.join(downloadDir, zipFileName);
        await download.saveAs(zipPath);

        console.log(`   📦 ZIP guardado temporalmente en: ${zipPath}`);

        // 9. Extraer el PDF del ZIP
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();

        let pdfFileName = zipEntries.find(entry => entry.entryName.toLowerCase().endsWith('.pdf'))?.entryName;

        if (!pdfFileName) {
            throw new Error("No se encontró ningún archivo PDF dentro del ZIP descargado de SOI.");
        }

        // Extraer a la misma carpeta
        zip.extractAllTo(downloadDir, true);

        // Renombrar el PDF extraído a nuestro formato
        const extractedPdfPath = path.join(downloadDir, pdfFileName);
        const finalFileName = `${documentType}_${documentNumber}_${anio}_${mes}.pdf`;
        const finalFilePath = path.join(downloadDir, finalFileName);

        // Si el finalFilePath ya existe, borrarlo primero
        if (fs.existsSync(finalFilePath)) {
            fs.unlinkSync(finalFilePath);
        }

        fs.renameSync(extractedPdfPath, finalFilePath);

        // Limpiar el ZIP temporal
        fs.unlinkSync(zipPath);

        console.log(`   ✅ PDF extraído y guardado en: ${finalFilePath}`);

        await browser.close();

        return { success: true, filePath: finalFilePath };
    } catch (error) {
        console.error(`   ❌ Error en SOI Scraper: ${error.message}`);

        if (browser) {
            await browser.close().catch(() => { });
        }

        return { success: false, error: error.message };
    }
};
