require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const mysql = require('mysql2');

const app = express();
const port = 3000;

// Verifica las variables de entorno
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('IMGUR_CLIENT_ID:', process.env.IMGUR_CLIENT_ID);

// Configuración de multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configuración de MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conectado a la base de datos MySQL');
});

// Servir archivos estáticos
app.use(express.static('public'));

// Endpoint para subir imágenes
app.post('/upload', upload.single('image'), async (req, res) => {
    const image = req.file;

    if (!image) {
        return res.status(400).send('No se ha subido ninguna imagen');
    }

    // Esperar un tiempo para evitar la limitación de la tasa de solicitudes
    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo

    try {
        // Subir la imagen a Imgur
        const response = await axios.post('https://api.imgur.com/3/image', image.buffer, {
            headers: {
                Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
                'Content-Type': 'multipart/form-data'
            }
        });

        const imageUrl = response.data.data.link;

        // Guardar el enlace en la base de datos
        const query = 'INSERT INTO images (url) VALUES (?)';
        db.query(query, [imageUrl], (err, result) => {
            if (err) throw err;
            res.send('Imagen subida y enlace guardado en la base de datos');
        });
    } catch (error) {
        console.error('Error subiendo la imagen a Imgur:', error.response ? error.response.data : error.message);
        res.status(500).send('Error subiendo la imagen a Imgur');
    }
});

// Endpoint para obtener imágenes
app.get('/images', (req, res) => {
    const query = 'SELECT url FROM images';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
