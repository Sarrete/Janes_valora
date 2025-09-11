// functions/upload-image.js
import crypto from 'crypto';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Validar variables de entorno
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const folder = 'valoraciones';

    if (!cloudName || !apiKey || !apiSecret) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Faltan variables de entorno de Cloudinary' })
      };
    }

    // Parsear body
    let file;
    try {
      const body = JSON.parse(event.body);
      file = body.file;
      if (!file) throw new Error('No se recibió el archivo');
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Body inválido o archivo no enviado' })
      };
    }

    // Generar firma
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    // Preparar datos para Cloudinary
    const formData = new URLSearchParams();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    // Subir a Cloudinary usando fetch nativo
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.error?.message || 'Error en Cloudinary' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Error interno' })
    };
  }
}
