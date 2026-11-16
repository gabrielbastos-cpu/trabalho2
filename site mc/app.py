import os
import sqlite3
from collections import defaultdict
from contextlib import contextmanager
from functools import wraps
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "mequi-experience-chave-secreta")

DB_PATH = "banco.db"
STATUS_PEDIDO_VALIDOS = {"Pendente", "Em preparo", "Concluído"}


# ========================================
# 1. DADOS FIXOS E REGRAS DE NEGÓCIO
# ========================================

PRODUTOS_INICIAIS = [
    ("Big Mac", 35.00, "hamburguer", "original.png"),
    ("McChicken", 24.00, "hamburguer", "mchincken.png"),
    ("McMelt", 28.00, "hamburguer", "mcmelt.png"),
    ("McDouble", 32.00, "hamburguer", "duploburguer.png"),
    ("McCheese", 26.00, "hamburguer", "cheese.png"),
    ("Quarteirão com Queijo", 29.00, "hamburguer", "quarterao.png"),
    ("McNífico", 34.00, "hamburguer", "nifico.png"),
    ("McTasty", 35.00, "hamburguer", "tasty.png"),
    ("McCrispy", 35.00, "hamburguer", "crispy.png"),

    ("Casquinha de Baunilha", 7.00, "sorvete", "baunilha.png"),
    ("Casquinha de Chocolate", 7.00, "sorvete", "chocolate.png"),
    ("Casquinha Mista", 7.00, "sorvete", "mista.png"),
    ("McShake de Morango", 15.00, "sorvete", "shakem.png"),
    ("McShake de Ovomaltine", 15.00, "sorvete", "shakeo.png"),
    ("McSundae de Chocolate", 10.00, "sorvete", "sundaec.png"),
    ("McSundae de Morango", 10.00, "sorvete", "sundaem.png"),
    ("McSundae de Caramelo", 10.00, "sorvete", "sundaeca.png"),
    ("McFlurry de Ovomaltine", 18.00, "sorvete", "mcfluryovo.png"),

    ("Batata pequena", 10.00, "acompanhamento", "batatap.png"),
    ("Batata média", 12.00, "acompanhamento", "batatam.png"),
    ("Batata grande", 15.00, "acompanhamento", "batatag.png"),
    ("Batata Grande com Cheddar", 18.00, "acompanhamento", "batatac.png"),
    ("Nuggets", 15.00, "acompanhamento", "Nuggets.png"),

    ("Coca-Cola", 8.00, "acompanhamento", "cocacolanormal.png"),
    ("Coca-Cola Zero", 8.00, "acompanhamento", "cocacolazero.png"),
    ("Fanta Laranja", 8.00, "acompanhamento", "fantalaranja.png"),
    ("Fanta Guaraná", 8.00, "acompanhamento", "fantaguarana.png"),
    ("Sprite", 8.00, "acompanhamento", "sprite.png"),
    ("Suco de Laranja", 10.00, "acompanhamento", "sucodelaranja.png"),
    ("Suco de Uva", 10.00, "acompanhamento", "sucodeuva.png"),

    ("Molho Ketchup", 2.00, "acompanhamento", "ketchup.png"),
    ("Molho Mostarda", 2.00, "acompanhamento", "mostarda.png"),
    ("Molho Barbecue", 2.00, "acompanhamento", "barbecue.png"),
]

PRECOS_COMBOS = {
    "Big Mac": 49.90,
    "McChicken": 39.90,
    "McMelt": 43.90,
    "McDouble": 45.90,
    "McCheese": 40.90,
    "Quarteirão com Queijo": 44.90,
    "McNífico": 49.90,
    "McTasty": 49.90,
    "McCrispy": 49.90,
}

BEBIDAS = {
    "Coca-Cola": 8.00,
    "Coca-Cola Zero": 8.00,
    "Fanta Laranja": 8.00,
    "Fanta Guaraná": 8.00,
    "Sprite": 8.00,
    "Suco de Laranja": 10.00,
    "Suco de Uva": 10.00,
    "Fanta": 8.00,
    "Água": 5.00,
}

MOLHOS = {
    "Sem molho": 0.00,
    "Ketchup": 0.00,
    "Mostarda": 0.00,
    "Barbecue": 0.00,
}

RECOMPENSAS_CLUBE = [
    {"nome_produto": "Casquinha de Baunilha", "pontos": 150, "descricao": "Troque seus pontos de boas-vindas por uma casquinha gelada!"},
    {"nome_produto": "Batata média", "pontos": 300, "descricao": "A McFritas mais amada do mundo por conta da casa."},
    {"nome_produto": "McSundae de Chocolate", "pontos": 350, "descricao": "Sobremesa cremosa com calda de chocolate."},
    {"nome_produto": "McChicken", "pontos": 700, "descricao": "Frango empanado crocante com maionese e alface."},
    {"nome_produto": "Big Mac", "pontos": 1000, "descricao": "O clássico de dois hambúrgueres grátis para você!"},
]


# ========================================
# 2. CONEXÃO E CONFIGURAÇÃO DO BANCO
# ========================================

@contextmanager
def obter_conexao():
    conexao = sqlite3.connect(DB_PATH)
    conexao.row_factory = sqlite3.Row
    conexao.execute("PRAGMA foreign_keys = ON")
    try:
        yield conexao
        conexao.commit()
    except Exception:
        conexao.rollback()
        raise
    finally:
        conexao.close()


def garantir_coluna(cursor, tabela, coluna, definicao):
    cursor.execute(f"PRAGMA table_info({tabela})")
    colunas_existentes = {row["name"] for row in cursor.fetchall()}
    if coluna not in colunas_existentes:
        cursor.execute(f"ALTER TABLE {tabela} ADD COLUMN {coluna} {definicao}")


def configurar_banco():
    with obter_conexao() as conexao:
        cursor = conexao.cursor()

        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS produtos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                preco REAL NOT NULL,
                categoria TEXT NOT NULL,
                imagem TEXT
            );

            CREATE TABLE IF NOT EXISTS pedidos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                total REAL NOT NULL,
                data DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'Pendente',
                cliente_id INTEGER
            );

            CREATE TABLE IF NOT EXISTS itens_pedido (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER NOT NULL,
                produto_id INTEGER NOT NULL,
                quantidade INTEGER NOT NULL,
                preco REAL NOT NULL,
                tipo TEXT DEFAULT 'individual',
                descricao TEXT DEFAULT '',
                FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
                FOREIGN KEY (produto_id) REFERENCES produtos(id)
            );

            CREATE TABLE IF NOT EXISTS combos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                produto_id INTEGER UNIQUE NOT NULL,
                preco_promocional REAL NOT NULL,
                FOREIGN KEY (produto_id) REFERENCES produtos(id)
            );

            CREATE TABLE IF NOT EXISTS funcionarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario TEXT UNIQUE NOT NULL,
                senha TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                senha TEXT NOT NULL,
                pontos INTEGER DEFAULT 150
            );
        """)

        # Migrações para bancos antigos
        garantir_coluna(cursor, "pedidos", "status", "TEXT DEFAULT 'Pendente'")
        garantir_coluna(cursor, "pedidos", "cliente_id", "INTEGER")
        garantir_coluna(cursor, "itens_pedido", "tipo", "TEXT DEFAULT 'individual'")
        garantir_coluna(cursor, "itens_pedido", "descricao", "TEXT DEFAULT ''")

        # Usuário padrão de funcionário
        cursor.execute("SELECT 1 FROM funcionarios WHERE usuario = ?", ("admin",))
        if cursor.fetchone() is None:
            cursor.execute(
                "INSERT INTO funcionarios (usuario, senha) VALUES (?, ?)",
                ("admin", generate_password_hash("Mequi2026!")),
            )

        # Popula produtos iniciais sem duplicar
        cursor.execute("SELECT nome FROM produtos")
        nomes_existentes = {row["nome"] for row in cursor.fetchall()}
        novos_produtos = [p for p in PRODUTOS_INICIAIS if p[0] not in nomes_existentes]

        if novos_produtos:
            cursor.executemany(
                "INSERT INTO produtos (nome, preco, categoria, imagem) VALUES (?, ?, ?, ?)",
                novos_produtos,
            )

        # Popula preços promocionais dos combos
        cursor.execute("SELECT id, nome FROM produtos")
        mapa_produtos = {row["nome"]: row["id"] for row in cursor.fetchall()}
        novos_combos = [
            (mapa_produtos[nome], preco)
            for nome, preco in PRECOS_COMBOS.items()
            if nome in mapa_produtos
        ]

        if novos_combos:
            cursor.executemany(
                "INSERT OR IGNORE INTO combos (produto_id, preco_promocional) VALUES (?, ?)",
                novos_combos,
            )


# ========================================
# 3. FUNÇÕES AUXILIARES E DECORATORS
# ========================================

def funcionario_obrigatorio(rota):
    @wraps(rota)
    def wrapper(*args, **kwargs):
        if "funcionario_id" not in session:
            return redirect(url_for("login"))
        return rota(*args, **kwargs)
    return wrapper


def eh_inteiro_positivo(valor, maximo=None):
    if not isinstance(valor, int) or isinstance(valor, bool) or valor <= 0:
        return False
    return maximo is None or valor <= maximo


def obter_cliente_logado():
    cliente_id = session.get("cliente_id")
    if not cliente_id:
        return None

    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        cursor.execute(
            "SELECT id, nome, email, pontos FROM clientes WHERE id = ?",
            (cliente_id,),
        )
        return cursor.fetchone()


def buscar_recompensas_clube():
    nomes = [item["nome_produto"] for item in RECOMPENSAS_CLUBE]
    placeholders = ",".join("?" for _ in nomes)

    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        cursor.execute(
            f"SELECT id, nome, imagem FROM produtos WHERE nome IN ({placeholders})",
            nomes,
        )
        produtos_por_nome = {row["nome"]: row for row in cursor.fetchall()}

    recompensas = []
    for item in RECOMPENSAS_CLUBE:
        prod = produtos_por_nome.get(item["nome_produto"])
        if prod:
            recompensas.append({
                "id": prod["id"],
                "nome": prod["nome"],
                "imagem": prod["imagem"],
                "pontos": item["pontos"],
                "descricao": item["descricao"],
            })
    return recompensas


def buscar_batatas(cursor):
    cursor.execute("""
        SELECT nome, preco FROM produtos
        WHERE nome IN ('Batata pequena', 'Batata média', 'Batata grande')
    """)
    return {item["nome"]: item["preco"] for item in cursor.fetchall()}


# ========================================
# 4. ROTAS PÚBLICAS (CARDÁPIO E CARRINHO)
# ========================================

@app.route("/")
def inicio():
    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        cursor.execute("SELECT * FROM produtos")
        produtos = cursor.fetchall()

        cursor.execute("SELECT produto_id, preco_promocional FROM combos")
        combos = {row["produto_id"]: row["preco_promocional"] for row in cursor.fetchall()}

    return render_template(
        "index.html",
        produtos=produtos,
        combos=combos,
        cliente=obter_cliente_logado(),
    )


@app.route("/carrinho")
def carrinho():
    return render_template("carrinho.html", cliente=obter_cliente_logado())


@app.route("/pedidos/<int:pedido_id>")
def pedido_confirmado(pedido_id):
    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        cursor.execute(
            "SELECT id, total, datetime(data, 'localtime') AS data, status FROM pedidos WHERE id = ?",
            (pedido_id,),
        )
        pedido = cursor.fetchone()

        if pedido is None:
            return "Pedido não encontrado", 404

        cursor.execute("""
            SELECT produtos.nome, itens_pedido.quantidade, itens_pedido.preco,
                   itens_pedido.tipo, itens_pedido.descricao
            FROM itens_pedido
            JOIN produtos ON produtos.id = itens_pedido.produto_id
            WHERE itens_pedido.pedido_id = ?
        """, (pedido_id,))
        itens = cursor.fetchall()

    return render_template("pedidos.html", pedido=pedido, itens=itens)


# ========================================
# 5. ROTAS DO CLUBE MÉQUI (CLIENTES)
# ========================================

@app.route("/clube")
def clube():
    return render_template(
        "clube.html",
        cliente=obter_cliente_logado(),
        recompensas=buscar_recompensas_clube(),
    )


@app.route("/clube/cadastrar", methods=["POST"])
def clube_cadastrar():
    nome = request.form.get("nome", "").strip()
    email = request.form.get("email", "").strip().lower()
    senha = request.form.get("senha", "")

    if not nome or not email or len(senha) < 4:
        return render_template(
            "clube.html",
            cliente=None,
            recompensas=buscar_recompensas_clube(),
            erro="Preencha todos os campos (senha mínima de 4 dígitos).",
        )

    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        cursor.execute("SELECT 1 FROM clientes WHERE email = ?", (email,))
        if cursor.fetchone() is not None:
            return render_template(
                "clube.html",
                cliente=None,
                recompensas=buscar_recompensas_clube(),
                erro="Este e-mail já está cadastrado no Clube Méqui.",
            )

        cursor.execute(
            "INSERT INTO clientes (nome, email, senha, pontos) VALUES (?, ?, ?, 150)",
            (nome, email, generate_password_hash(senha)),
        )
        cliente_id = cursor.lastrowid

    session["cliente_id"] = cliente_id
    session["cliente_nome"] = nome
    return redirect(url_for("clube"))


@app.route("/clube/entrar", methods=["POST"])
def clube_entrar():
    email = request.form.get("email", "").strip().lower()
    senha = request.form.get("senha", "")

    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        cursor.execute("SELECT * FROM clientes WHERE email = ?", (email,))
        cliente = cursor.fetchone()

    if cliente and check_password_hash(cliente["senha"], senha):
        session["cliente_id"] = cliente["id"]
        session["cliente_nome"] = cliente["nome"]
        return redirect(url_for("clube"))

    return render_template(
        "clube.html",
        cliente=None,
        recompensas=buscar_recompensas_clube(),
        erro="E-mail ou senha incorretos.",
    )


@app.route("/clube/sair")
def clube_sair():
    session.pop("cliente_id", None)
    session.pop("cliente_nome", None)
    return redirect(url_for("inicio"))


# ========================================
# 6. LOGIN E PAINEL DOS FUNCIONÁRIOS
# ========================================

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        usuario = request.form.get("usuario", "").strip()
        senha = request.form.get("senha", "")

        with obter_conexao() as conexao:
            cursor = conexao.cursor()
            cursor.execute("SELECT * FROM funcionarios WHERE usuario = ?", (usuario,))
            funcionario = cursor.fetchone()

        if funcionario and check_password_hash(funcionario["senha"], senha):
            session["funcionario_id"] = funcionario["id"]
            session["funcionario_usuario"] = funcionario["usuario"]
            return redirect(url_for("funcionarios"))

        return render_template("login.html", erro="Usuário ou senha incorretos")

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.pop("funcionario_id", None)
    session.pop("funcionario_usuario", None)
    return redirect(url_for("login"))


@app.route("/funcionarios")
@funcionario_obrigatorio
def funcionarios():
    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        cursor.execute("""
            SELECT id, total, datetime(data, 'localtime') AS data, status
            FROM pedidos
            ORDER BY id DESC
        """)
        pedidos = cursor.fetchall()

        cursor.execute("""
            SELECT itens_pedido.pedido_id, produtos.nome, itens_pedido.quantidade,
                   itens_pedido.preco, itens_pedido.tipo, itens_pedido.descricao
            FROM itens_pedido
            JOIN produtos ON produtos.id = itens_pedido.produto_id
        """)
        itens_por_pedido = defaultdict(list)
        for item in cursor.fetchall():
            itens_por_pedido[item["pedido_id"]].append(item)

    pedidos_com_itens = [
        {"dados": pedido, "itens": itens_por_pedido[pedido["id"]]}
        for pedido in pedidos
    ]
    return render_template("funcionarios.html", pedidos=pedidos_com_itens)


@app.route("/atualizar-status/<int:pedido_id>", methods=["POST"])
@funcionario_obrigatorio
def atualizar_status(pedido_id):
    novo_status = request.form.get("status")
    if novo_status not in STATUS_PEDIDO_VALIDOS:
        return "Status inválido", 400

    with obter_conexao() as conexao:
        conexao.execute(
            "UPDATE pedidos SET status = ? WHERE id = ?",
            (novo_status, pedido_id),
        )
    return redirect(url_for("funcionarios"))


@app.route("/excluir-pedido/<int:pedido_id>", methods=["POST"])
@funcionario_obrigatorio
def excluir_pedido(pedido_id):
    try:
        with obter_conexao() as conexao:
            conexao.execute("DELETE FROM itens_pedido WHERE pedido_id = ?", (pedido_id,))
            conexao.execute("DELETE FROM pedidos WHERE id = ?", (pedido_id,))
    except sqlite3.Error:
        return "Não foi possível excluir o pedido.", 500

    return redirect(url_for("funcionarios"))


# ========================================
# 7. FINALIZAÇÃO DE PEDIDO (API JSON)
# ========================================

def processar_item_pedido(item, cursor, batatas, mapa_recompensas):
    produto_id = item.get("id")
    quantidade = item.get("quantidade")
    tipo = item.get("tipo", "individual")

    if not eh_inteiro_positivo(produto_id) or not eh_inteiro_positivo(quantidade, maximo=50):
        raise ValueError("Produto ou quantidade inválida")

    cursor.execute("SELECT id, nome, preco FROM produtos WHERE id = ?", (produto_id,))
    produto = cursor.fetchone()
    if produto is None:
        raise ValueError("Produto não encontrado")

    if tipo == "individual":
        return produto_id, quantidade, produto["preco"], tipo, "", 0

    if tipo == "resgate":
        if "cliente_id" not in session:
            raise ValueError("Faça login no Clube Méqui para resgatar prêmios.")

        custo_pontos = mapa_recompensas.get(produto["nome"])
        if custo_pontos is None:
            raise ValueError("Recompensa inválida")

        descricao = f"Resgate Clube Méqui (-{custo_pontos} pts)"
        return produto_id, quantidade, 0.0, tipo, descricao, custo_pontos * quantidade

    if tipo == "combo":
        cursor.execute("SELECT preco_promocional FROM combos WHERE produto_id = ?", (produto_id,))
        combo = cursor.fetchone()
        if combo is None:
            raise ValueError("Combo indisponível")

        batata = item.get("batata")
        bebida = item.get("bebida")
        molho = item.get("molho", "Sem molho")

        if batata not in batatas or bebida not in BEBIDAS:
            raise ValueError("Opção de combo inválida")

        if molho not in MOLHOS:
            molho = "Sem molho"

        preco = (
            combo["preco_promocional"]
            + (batatas[batata] - batatas["Batata média"])
            + (BEBIDAS[bebida] - BEBIDAS["Coca-Cola"])
            + MOLHOS[molho]
        )
        descricao = f"{batata} + {bebida}" + (f" + Molho {molho}" if molho != "Sem molho" else "")
        return produto_id, quantidade, preco, tipo, descricao, 0

    raise ValueError("Tipo de item inválido")


@app.route("/finalizar-pedido", methods=["POST"])
def finalizar_pedido():
    dados = request.get_json(silent=True)

    if not dados or not isinstance(dados.get("itens"), list) or not dados["itens"]:
        return jsonify({"erro": "Carrinho vazio ou inválido"}), 400

    try:
        with obter_conexao() as conexao:
            cursor = conexao.cursor()
            batatas = buscar_batatas(cursor)
            mapa_recompensas = {r["nome_produto"]: r["pontos"] for r in RECOMPENSAS_CLUBE}

            total = 0.0
            pontos_gastos = 0
            itens_validos = []

            for item in dados["itens"]:
                prod_id, qtd, preco, tipo, desc, pts = processar_item_pedido(
                    item, cursor, batatas, mapa_recompensas
                )
                total += preco * qtd
                pontos_gastos += pts
                itens_validos.append((prod_id, qtd, preco, tipo, desc))

            cliente_id = session.get("cliente_id")

            # Valida e atualiza saldo de pontos do cliente logado
            if cliente_id:
                cursor.execute("SELECT pontos FROM clientes WHERE id = ?", (cliente_id,))
                cliente_db = cursor.fetchone()
                if cliente_db:
                    saldo_atual = cliente_db["pontos"]
                    if pontos_gastos > saldo_atual:
                        return jsonify({"erro": "Saldo de pontos insuficiente para este resgate!"}), 400

                    pontos_ganhos = int(total * 10)
                    novo_saldo = saldo_atual - pontos_gastos + pontos_ganhos
                    cursor.execute(
                        "UPDATE clientes SET pontos = ? WHERE id = ?",
                        (novo_saldo, cliente_id),
                    )

            cursor.execute(
                "INSERT INTO pedidos (total, cliente_id) VALUES (?, ?)",
                (total, cliente_id),
            )
            pedido_id = cursor.lastrowid

            cursor.executemany(
                """
                INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco, tipo, descricao)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [(pedido_id, *item) for item in itens_validos],
            )

        return jsonify({
            "mensagem": "Pedido registrado com sucesso!",
            "pedido_id": pedido_id,
            "total": total,
        })

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400
    except sqlite3.Error:
        return jsonify({"erro": "Não foi possível registrar o pedido"}), 500


if __name__ == "__main__":
    configurar_banco()
    app.run(debug=True)
