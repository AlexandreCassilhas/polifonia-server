const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const svgCaptcha = require('svg-captcha');

const app = express();
const saltRounds = 10;
let sessionCaptcha = ""; // Variável global para validar o captcha

app.use(express.json({ limit: '5mb' }));
app.use(cors());

// 1. Conexão com o Banco de Dados
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'polifonia_db'
});

// Conectar ao MySQL
db.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err);
        return;
    }
    console.log('Conectado ao banco de dados MySQL da Polifonia!');
});

// --- ROTAS DE SEGURANÇA ---

// Rota do CAPTCHA (Onde estava a dar o erro 404)
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

// Rota para criar o Admin Inicial (Use uma vez para testar)
app.post('/setup-admin', async (req, res) => {
    try {
        const hash = await bcrypt.hash('123456', saltRounds);
        const sql = "INSERT INTO usuarios (nome, login, senha) VALUES ('Admin Polifonia', 'admin', ?)";
        db.query(sql, [hash], (err, result) => {
            if (err) return res.status(500).send(err);
            
            const userId = result.insertId;
            const sqlPerfil = "INSERT INTO usuario_perfis (usuario_id, perfil_id) VALUES (?, 1)";
            db.query(sqlPerfil, [userId], (err2) => {
                if (err2) return res.status(500).send(err2);
                res.send({ message: "Admin criado com sucesso!" });
            });
        });
    } catch (e) { res.status(500).send(e); }
});

// Rota de LOGIN com Bcrypt e Validação de Captcha
app.post('/login', (req, res) => {
    const { login, senha, captcha } = req.body; // 'login' aqui receberá o CPF vindo do frontend

    if (!captcha || captcha.toLowerCase() !== sessionCaptcha) {
        return res.status(401).send({ message: "Código CAPTCHA incorreto!" });
    }

    const query = `
        SELECT u.id, u.nome, u.senha, u.foto_perfil, GROUP_CONCAT(p.nome_perfil) as perfis 
        FROM usuarios u
        JOIN usuario_perfis up ON u.id = up.usuario_id
        JOIN perfis p ON p.id = up.perfil_id
        WHERE u.cpf = ?
        GROUP BY u.id`;

    db.query(query, [login.replace(/[^\d]+/g, '')], async (err, results) => {
        if (err) return res.status(500).send(err);
        
        if (results.length > 0) {
            const usuario = results[0];
            const senhaValida = await bcrypt.compare(senha, usuario.senha);

            if (senhaValida) {
                res.send({ 
                    auth: true, 
                    user: usuario.nome, 
                    foto: usuario.foto_perfil,
                    perfis: usuario.perfis.split(',') 
                });
            } else {
                res.status(401).send({ message: "Senha incorreta!" });
            }
        } else {
            res.status(401).send({ message: "CPF não encontrado!" });
        }
    });
});

// --- ROTA DE CADASTRO DE USUÁRIOS (COM AUDITORIA) ---
app.post('/usuarios', async (req, res) => {
    const { nome, email, celular, cpf, senha, foto, perfil_id, solicitantePerfis } = req.body;

    // Verificação de segurança: apenas Admins cadastram
    if (!solicitantePerfis || !solicitantePerfis.includes('Administrador')) {
        return res.status(403).send({ message: "Acesso negado. Apenas administradores podem criar utilizadores." });
    }

    try {
        const hash = await bcrypt.hash(senha, saltRounds);
        
        // Inserção do Utilizador (created_at e updated_at são automáticos no MySQL)
        const sqlUser = "INSERT INTO usuarios (nome, email, celular, cpf, senha, foto_perfil) VALUES (?, ?, ?, ?, ?, ?)";
        
        db.query(sqlUser, [nome, email, celular, cpf, hash, foto], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).send({ message: "Este CPF já está cadastrado!" });
                return res.status(500).send(err);
            }

            const userId = result.insertId;
            const sqlPerfil = "INSERT INTO usuario_perfis (usuario_id, perfil_id) VALUES (?, ?)";
            
            db.query(sqlPerfil, [userId, perfil_id], (err2) => {
                if (err2) return res.status(500).send(err2);
                res.send({ message: "Usuário criado com sucesso!" });
            });
        });
    } catch (e) { res.status(500).send(e); }
});


// --- ROTAS DE VENDAS (Mantenha as que já tínhamos) ---

// 2. Rota para SALVAR uma venda (POST)
app.post('/vendas', (req, res) => {
    const { comprador, itens, pagamento, total } = req.body;

    // Como o MySQL não guarda "arrays" diretamente, transformamos os itens em Texto (JSON)
    const itensJSON = JSON.stringify(itens);

    const query = "INSERT INTO vendas (comprador, itens, pagamento, total) VALUES (?, ?, ?, ?)";
    
    db.query(query, [comprador, itensJSON, pagamento, total], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send({ message: "Venda salva com sucesso!", id: result.insertId });
    });
});


// 3. Rota para BUSCAR todas as vendas (GET)
app.get('/vendas', (req, res) => {
    const query = "SELECT * FROM vendas ORDER BY created_at DESC";
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        // Transformamos o texto dos itens de volta para Objeto para o Frontend entender
        const vendasFormatadas = results.map(venda => ({
            ...venda,
            itens: JSON.parse(venda.itens)
        }));
        res.send(vendasFormatadas);
    });
});


// 4. Rota para REMOVER uma venda (DELETE)
app.delete('/vendas/:id', (req, res) => {
    const { id } = req.params;
    const query = "DELETE FROM vendas WHERE id = ?";

    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ message: "Venda removida com sucesso!" });
    });
});

// 5. Rota para ATUALIZAR uma venda (PUT)
app.put('/vendas/:id', (req, res) => {
    const { id } = req.params;
    const { comprador, total } = req.body;

    // O MySQL espera o ponto decimal para números, então garantimos que chegue correto
    const query = "UPDATE vendas SET comprador = ?, total = ? WHERE id = ?";

    db.query(query, [comprador, total, id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ message: "Venda atualizada com success!" });
    });
});



app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});