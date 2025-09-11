// functions/send-email.js
import nodemailer from 'nodemailer';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { nombre, comentario, rating } = JSON.parse(event.body || '{}');

    if (!nombre || !comentario || !rating) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos' }) };
    }

    // Configuración SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Enviar correo
    await transporter.sendMail({
      from: `"Valoraciones Web" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: 'Nueva valoración recibida',
      html: `
        <h2>Nueva valoración</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Comentario:</strong> ${comentario}</p>
        <p><strong>Rating:</strong> ${rating} ⭐</p>
      `
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
