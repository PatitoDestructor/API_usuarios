const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


const app = express();
app.use(cors());


// Iniciar el servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});

//Conexión para la base de datos
const db = new sqlite3.Database('./user.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Conectado a la base de datos.');
        createTable(); 
    }
});

app.use(bodyParser.json());


// Codigos
const recoveryCodes = {};

//Configuración del nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'modisteriadl@gmail.com',
        pass: 'qdjq yatp zozg msyi', 
    },
});

// Funcion para enviar correo
app.post('/enviarCorreo', (req, res) => {
    const { email } = req.body;

    const sql = 'SELECT * FROM usuarios WHERE gmail = ?';
    db.get(sql, [email], (err, row) => {

        if (err) {
            console.error('Error al obtener usuario por Gmail: ' + err.message);
            res.status(500).json({ status: 500, success: false });
        } 
        else {
            if (row) {
                const code = crypto.randomBytes(3).toString('hex'); // Genera un código aleatorio de 6 caracteres
                recoveryCodes[email] = code;

                // Configura el correo
                const mailOptions = {
                    from: 'modisteriadl@gmail.com',
                    to: email,
                    subject: '🎉🎊 Código de Recuperación de Contraseña 🎊🎉',
                    text: `Tu código de recuperación es: ${code}`,
                };

                // Envía el correo
                transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send({ message: 'Error al enviar el correo' });
                }
                res.status(200).send({ message: 'Código de recuperación enviado' });
            });

            } else {
                res.status(404).json({ status: 404, success: false, message:` Usuario con correo ${email} no encontrado `});
            }
        }
    });
});

app.post('/validarCodigo', (req, res) => {
    const { email, code } = req.body;

    if (recoveryCodes[email] === code) {
        res.status(200).send({ message: 'Código verificado' });
    } else {
        res.status(400).send({ message: 'Código incorrecto' });
    }
});

// Endpoint para actualizar la contraseña
app.put('/actualizarPass', (req, res) => {
    const { email, contraseña } = req.body;

    const sql = 'UPDATE usuarios SET contraseña = ? WHERE gmail = ?';
    db.run(sql, [contraseña, email], function(err) {
        if (err) {
            console.error('Error al actualizar la contraseña: ' + err.message);
            res.status(400).json({ status: 400, success: false });
        } else {
            if (this.changes > 0) {
                console.log(`usuarios con correo ${email} actualizado.`);
                delete recoveryCodes[email]; // Eliminamos el código de recuperación ya que fue utilizado
                res.status(200).json({ status: 200, success: true });
            } else {
                res.status(404).json({ status: 404, success: false, message: `usuarios con correo ${email} no encontrado` });
            }
        }
    });

});

// Función para crear la tabla
function createTable() {
    const sql = 'CREATE TABLE IF NOT EXISTS usuarios (id_usuario INTEGER PRIMARY KEY, nombre TEXT, apellido TEXT, gmail TEXT, contraseña TEXT)';
    db.run(sql, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Tabla "usuarios" creada o ya existe.');
        }
    });
}

// Ruta para manejar el inicio de sesión
app.post('/user/login', (req, res) => {
    const { gmail, contraseña } = req.body;
    const sql = 'SELECT * FROM usuarios WHERE gmail = ? AND contraseña = ?';
    db.get(sql, [gmail, contraseña], (err, row) => {
        if (err) {
            console.error('Error al buscar usuario:', err.message);
            res.status(500).json({ status: 500, success: false, error: 'Error al buscar usuario' });
        } else {
            if (row) {
                // Usuario encontrado, inicio de sesión exitoso
                res.status(200).json({ status: 200, success: true, data: row });
            } else {
                // Usuario no encontrado o credenciales incorrectas
                res.status(404).json({ status: 404, success: false, message: 'Correo o contraseña incorrectos' });
            }
        }
    });
});


// Ruta para manejar el POST
app.post('/user', (req, res) => {
    try {
        const { nombre, apellido, gmail, contraseña} = req.body;
        const sql = 'INSERT INTO usuarios (nombre, apellido, gmail, contraseña) VALUES (?, ?, ?, ?)';
        db.run(sql, [nombre, apellido,  gmail, contraseña], function(err) {
            if (err) {
                console.error('Error al insertar usuario: ' + err.message);
                res.status(400).json({ status: 400, success: false });
            } else {
                console.log(`Usuarios agregado con ID: ${this.lastID}`);
                res.status(201).json({ status: 201, success: true, id: this.lastID });
            }
        });
    } catch (error) {
        console.error('Error en la solicitud POST: ' + error.message);
        res.status(500).json({ status: 500, success: false });
    }
});


//get todos

app.get('/users', (req, res) => {
    const sql = 'SELECT * FROM usuarios';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener usuarios:', err.message);
            return res.status(500).json({ status: 500, success: false, error: 'Error al obtener usuarios' });
        }
        if (rows.length === 0) {
            return res.status(404).json({ status: 404, success: false, message: 'No se encontraron usuarios' });
        }
        res.status(200).json({ status: 200, success: true, data: rows });
    });
});


// Ruta para manejar el GET de una usuarios por ID
app.get('/user/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM usuarios WHERE id_usuario = ?';
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('Error al obtener usuario por ID: ' + err.message);
            res.status(500).json({ status: 500, success: false });
        } else {
            if (row) {
                res.json({ status: 200, success: true, data: row });
            } else {
                res.status(404).json({ status: 404, success: false, message:` usuario con ID ${id} no encontrada `});
            }
        }
    });
});


// Ruta para manejar el PUT de una usuarios por ID
app.put('/user/:id', (req, res) => {
    const id = req.params.id;
    const {nombre, apellido, gmail, contraseña} = req.body;
    const sql = 'UPDATE usuarios SET nombre = ?, apellido = ?, gmail = ?, contraseña = ? WHERE id_usuario = ?';
    db.run(sql, [nombre, apellido, gmail, contraseña, id], function(err) {
        if (err) {
            console.error('Error al actualizar usuarios: ' + err.message);
            res.status(400).json({ status: 400, success: false });
        } else {
            if (this.changes > 0) {
                console.log(`usuarios con ID ${id} actualizada.`);
                res.status(200).json({ status: 200, success: true });
            } else {
                res.status(404).json({ status: 404, success: false, message: `usuarios con ID ${id} no encontrada` });
            }
        }
    });
});


// Ruta para manejar el DELETE de una usuarios por ID
app.delete('/user/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM usuarios WHERE id_usuario = ?';
    db.run(sql, id, function(err) {
        if (err) {
            console.error('Error al eliminar usuario: ' + err.message);
            res.status(500).json({ status: 500, success: false });
        } else {
            if (this.changes > 0) {
                console.log(`usuario con ID ${id} eliminada.`);
                res.status(200).json({ status: 200, success: true });
            } else {
                res.status(404).json({ status: 404, success: false, message:` usuario con ID ${id} no encontrada `});
            }
        }
    });
});

