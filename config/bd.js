
//// biblioteca para a conexão com o bd
const mysql = require('mysql2');

////// Função que conecta ao banco de dados
const conectarBd = () => {
  const bd = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  ////// Tenta a conexão
  bd.connect((err) => {
    if (err) {
      console.error('Conexão falhou:', err);
    } else {
      console.log('Conectado ao banco de dados');
    }
  });

  ///// Retorna o bd
  return bd;
};

module.exports = { conectarBd };