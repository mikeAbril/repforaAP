import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración del transportador (SMTP)
// Se predefine el host y el puerto (Gmail) para simplificar la configuración.
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true para puerto 465
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

/**
 * Función universal para enviar correos con estilo institucional SENA.
 * 
 * @param {string} to - Correo del destinatario.
 * @param {string} subject - Asunto del mensaje.
 * @param {string} htmlContent - Cuerpo del mensaje en formato HTML.
 */
export const sendEmail = async (to, subject, htmlContent) => {
    try {
        // Ruta absoluta a la imagen del logo (usando CID para embeberla)
        const logoPath = path.join(__dirname, '../assets/logo-sena.png');

        const mailOptions = {
            from: `"SENA - REGISTRO DE PLANILLAS" <${process.env.MAIL_USER}>`,
            to,
            subject,
            html: `
                <div style="background-color: #ffffff; border-radius: 20px; overflow: hidden; padding: 50px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #212529; min-height: 100%;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid rgba(0,0,0,0.05);">
                        
                        <!-- Header Institucional -->
                        <div style="background-color: #ffffff; padding: 40px; text-align: center; border-bottom: 6px solid #318335;">
                            <img src="cid:logoSena" alt="SENA" style="width: 120px; height: auto;">
                        </div>

                        <!-- Cuerpo del Mensaje -->
                        <div style="padding: 45px 40px; line-height: 1.8; font-size: 17px; color: #374151;">
                            ${htmlContent}
                        </div>

                        <!-- Pie de Página Cuadro -->
                        <div style="background-color: #318335; color: #ffffff; padding: 25px; text-align: center; font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
                            © REGISTRO DE PLANILLAS - SENA
                        </div>
                    </div>

                    <!-- Nota de Confidencialidad Externa -->
                    <div style="max-width: 580px; margin: 30px auto; text-align: center; font-size: 12px; color: #000000; line-height: 1.6; font-style: italic; font-weight: 500;">
                        Este correo electrónico y cualquier archivo adjunto son confidenciales y pueden contener información privilegiada. 
                        Si usted no es el destinatario previsto, por favor notifique al remitente de inmediato y elimine este mensaje. 
                        Cualquier divulgación, copia o distribución no autorizada está estrictamente prohibida.
                        <br><br>
                        Recibes este correo porque eres parte de la comunidad SENA y estás registrado en el sistema de registro de planillas SENA.
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: 'logo-sena.png',
                    path: logoPath,
                    cid: 'logoSena' // Referenciado en el <img> con src="cid:logoSena"
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Correo enviado con éxito. ID:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error al enviar el correo:', error);
        return { success: false, error: error.message };
    }
};
