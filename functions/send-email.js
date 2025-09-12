// functions/send-email.js
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  try {
    // Aceptar solo POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // Parseo seguro del body
    const { nombre, comentario, rating } = JSON.parse(event.body || '{}');

    // Validaciones mínimas
    if (!nombre || !comentario || !rating) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Faltan datos' })
      };
    }

    // Comprobación de variables de entorno necesarias
    const { SMTP_HOST, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_EMAIL) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Faltan variables de entorno SMTP/NOTIFY_EMAIL' })
      };
    }

    // Crear transporter SMTP
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,          // p.ej. smtp.gmail.com
      port: 465,                // 465 SSL
      secure: true,             // true para 465
      auth: { user: SMTP_USER, pass: SMTP_PASS }
      // Si tu proveedor requiere configuraciones TLS especiales, añade aquí tls: { ... }
    });

    // Enviar correo
    await transporter.sendMail({
      from: `"Valoraciones Web" <${SMTP_USER}>`,
      to: NOTIFY_EMAIL,
      subject: 'Nueva valoración recibida',
      html: `
        <h2>Nueva valoración</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Comentario:</strong> ${comentario}</p>
        <p><strong>Rating:</strong> ${rating} ⭐</p>
      `
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Error enviando correo:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
