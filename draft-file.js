app.get('/fin-caixa', (req, res) => {
    // Pegamos as datas da URL. Se não vierem, pegamos o mês atual por padrão.
    const inicio = req.query.inicio;
    const fim = req.query.fim;

    let sql = `
        SELECT lc.*, tl.descricao as tipo_nome, tl.tipo 
        FROM fin_livro_caixa lc
        JOIN fin_tipos_lancamento tl ON lc.id_tipo_lancamento = tl.id
        WHERE lc.indicativo_exclusao = FALSE`;
    
    const params = [];

    if (inicio && fim) {
        sql += ` AND lc.data_lancamento BETWEEN ? AND ?`;
        params.push(inicio, fim);
    }

    sql += ` ORDER BY lc.data_lancamento DESC`;

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});