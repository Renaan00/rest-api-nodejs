const mysql = require('../mysql').pool;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.cadastrarUsuario = (req, res) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'SELECT * FROM usuarios WHERE email = ?', 
            [req.body.email], 
            (error, result) => {
                if (error) { return res.status(500).send({ error: error }) }
                if (result.length > 0) {
                    return res.status(409).send({ 
                        mensagem: 'Usuário ja cadastrado' 
                    });
                } else {
                    bcrypt.hash(req.body.senha, 10, (errBcypt, hash) => {
                        if (errBcypt) { return res.status(500).send({ error: error }) }
                        conn.query(
                            `INSERT INTO usuarios(email, senha) VALUES (?,?)`, 
                            [req.body.email, hash], 
                            (error, result) => {
                                conn.release();
                                if (error) { return res.status(500).send({ error: error }) }
                                const response = {
                                    mensagem: 'Usuário criado com sucesso',
                                    usuarioCriado: {
                                        id_usuario: result.insertId,
                                        email: req.body.email
                                    }
                                }
                                return res.status(201).send(response);
                            }
                        );
                    });
                } 
            }
        );
    });
}

exports.Login = (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        const query = "SELECT * FROM usuarios WHERE email = ?";
        conn.query(query, [req.body.email], (error, results, field) => {
            conn.release();
            if (error) { return res.status(500).send({ error: error }) }
            if (results.length < 1) {
                return res.status(401).send({ mensagem: 'Falha na autenticação' });
            }
            bcrypt.compare(req.body.senha, results[0].senha, (error, result) => {
                if (error) { 
                    return res.status(401).send({ mensagem: 'Falha na autenticação' });
                }
                if (result) {
                    const token = jwt.sign({
                        id_usuario: results[0].id_usuario,
                        email: results[0].email
                    },
                    process.env.JWT_KEY,
                    {
                        expiresIn: "1h"
                    });
                    return res.status(200).send({ 
                        mensagem: 'Autenticado com sucesso',
                        token: token
                    });
                }
                return res.status(401).send({ mensagem: 'Falha na autenticação' }); 
            });
        });
    });
}