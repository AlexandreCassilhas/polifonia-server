const express = require('express'); 
const mysql = require('mysql2'); 
const cors = require('cors'); 
const bcrypt = require('bcrypt'); 
const svgCaptcha = require('svg-captcha');

const app = express(); 
const saltRounds = 10; 
let sessionCaptcha = "";

// Aumentamos o limite para suportar a foto do produto app.use(express.json({ limit: '10mb' })); app.use(cors());

const db = mysql.createConnection({ 
  host: 'localhost', 
  user: 'root', 
  password: '', 
  database: 'polifonia_db' 
});

db.connect(err => { if (err) return console.error('Erro MySQL:', err);
   console.log('Conectado ao MySQL da Polifonia!'); 
  });

// --- ROTA DO CAPTCHA --- 
app.get('/captcha', (req, res) => { 
  const captcha = svgCaptcha.create({ 
    size: 4, 
    noise: 3, 
    color: true, 
    background: '#ffffff' 
  }); 
  sessionCaptcha = captcha.text.toLowerCase(); 
  res.type('svg'); 
  res.status(200).send(captcha.data);
});

// --- ROTA DE LOGIN (CPF) --- 
app.post('/login', (req, res) => { 
  const { login, senha, captcha } = req.body;

});

// --- ROTA DE CADASTRO DE USUÁRIOS --- 
app.post('/usuarios', async (req, res) => { 
  const { nome, email, celular, cpf, senha, foto, perfil_id, solicitantePerfis } = req.body;

});

// --- MÓDULO DE ESTOQUE ---

// 1. Cadastrar Produto (Com Imagem) app.post('/produtos', (req, res) => { const { nome, preco, estoque, codigo, imagem } = req.body; const sql = "INSERT INTO produtos (nome, preco, estoque, codigo_barras, imagem) VALUES (?, ?, ?, ?, ?)";

});

// 2. Listar Produtos (Para o Estoque e PDV) app.get('/produtos', (req, res) => { db.query("SELECT * FROM produtos ORDER BY nome ASC", (err, results) => { if (err) return res.status(500).send(err); res.send(results); }); });

// 3. Venda Inteligente (Baixa o Estoque automaticamente) app.post('/vendas', (req, res) => { const { comprador, vendedor, itens, pagamento, total } = req.body;

});

// --- ROTA DE DASHBOARD --- app.get('/dashboard-data', async (req, res) => { const hoje = new Date().toISOString().split('T')[0]; try { const sqlHoje = SELECT COUNT(*) as qtd_vendas, SUM(total) as total_faturado, AVG(total) as ticket_medio FROM vendas WHERE DATE(created_at) = ?; const sqlTopVendedores = SELECT vendedor, SUM(total) as total_vendido FROM vendas GROUP BY vendedor ORDER BY total_vendido DESC LIMIT 5; const sqlUltimos7Dias = SELECT DATE(created_at) as data, SUM(total) as total FROM vendas WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY data ASC;

});

// Rota de setup admin (caso precise) app.post('/setup-admin', async (req, res) => { try { const hash = await bcrypt.hash('123456', saltRounds); const sql = "INSERT INTO usuarios (nome, email, celular, cpf, senha) VALUES ('Admin Polifonia', 'admin@polifonia.com', '00000000000', '00000000000', ?)"; db.query(sql, [hash], (err, result) => { if (err) return res.status(500).send(err); const userId = result.insertId; db.query("INSERT INTO usuario_perfis VALUES (?, 1)", [userId], (e) => { if(e) return res.status(500).send(e); res.send({message: "Admin recriado"}); }); }); } catch(e) { res.status(500).send(e); } });

app.listen(3000, () => { console.log('Servidor Polifonia rodando em http://localhost:3000'); });