# -*- coding: utf-8 -*-
"""
Dashboard do endividamento das famílias
=======================================
FONTE PRINCIPAL : PEIC (CNC) – Pesquisa de Endividamento e Inadimplência do Consumidor (dados digitados abaixo)
FONTE DE CONTEXTO: Banco Central do Brasil (SGS) – endividamento, comprometimento da renda, juros, inadimplência...

O que este script faz
  1. Carrega os dados do PEIC (embutidos no script) e extrai as séries do SGS/BCB.
  2. Consolida tudo em Polars (base mensal), cria séries derivadas e variações.
  3. Imprime no terminal os números (níveis, variações, estatísticas, correlações PEIC × BCB, defasagens).
  4. Gera UM único arquivo HTML (dashboard offline) com abas, filtros, rótulos simples e uma aba
     "Entenda os dados" explicando cada indicador em linguagem simples.
  5. Exporta a base em Parquet/CSV.

COMO ATUALIZAR O PEIC NO MÊS SEGUINTE: acrescente UM valor ao final de CADA lista em PEIC_DADOS.

Dependências:  pip install polars requests plotly python-dateutil
"""
from __future__ import annotations

import json
import time
import webbrowser
from datetime import date
from pathlib import Path

import polars as pl
import requests
from dateutil.relativedelta import relativedelta
from plotly.offline import get_plotlyjs  # embute o plotly.js no HTML (funciona offline)

# ============================================================
# CONFIGURAÇÃO
# ============================================================
ANOS_ANALISE = 5          # janela do botão "5 anos" (contexto BCB de longo prazo)
ANOS_BUFFER = 1           # anos extras baixados do BCB (necessários p/ variação 12m e defasagens)
PASTA_SAIDA = Path("saida_endividamento")
ARQUIVO_HTML = "dashboard_endividamento.html"
ABRIR_NAVEGADOR = True
PLOTLY_JS = "inline"      # "inline" = HTML offline (~5 MB) | "cdn" = HTML leve (precisa de internet)
TIMEOUT = 30
TENTATIVAS = 3

BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados"
URL_PLOTLY_CDN = "https://cdn.plot.ly/plotly-3.0.1.min.js"

# Impressão completa no terminal (sem "...")
pl.Config.set_tbl_rows(-1)
pl.Config.set_tbl_cols(-1)
pl.Config.set_tbl_width_chars(250)
pl.Config.set_fmt_str_lengths(120)
pl.Config.set_tbl_formatting("ASCII_MARKDOWN")

# ============================================================
# DADOS DO PEIC (fonte principal)  –  1 valor por mês, a partir de PEIC_INICIO
#   Todas as listas precisam ter o MESMO tamanho (o script confere).
#   "Não sabe" e "Não respondeu" (0,0% em todos os meses) foram omitidos.
# ============================================================
PEIC_INICIO = date(2025, 7, 1)   # jul/25
PEIC_DADOS: dict[str, list[float]] = {
    # --- Visão geral (% do total de famílias) ---
    "p_endiv":       [78.5, 78.8, 79.2, 79.5, 79.2, 78.9, 79.5, 80.2, 80.4, 80.9, 81.6, 81.6, 82.0],
    "p_atraso":      [30.0, 30.4, 30.5, 30.5, 30.0, 29.4, 29.3, 29.6, 29.6, 29.7, 29.9, 29.9, 29.8],
    "p_sem_cond":    [12.7, 12.8, 13.0, 13.2, 12.9, 12.6, 12.7, 12.6, 12.3, 12.3, 12.3, 12.2, 12.3],
    # --- Tipo de dívida (% dos endividados; a família pode ter mais de um tipo) ---
    "p_cartao":      [84.5, 84.5, 84.2, 84.4, 84.6, 85.1, 85.4, 85.0, 84.9, 85.0, 84.6, 84.7, 85.3],
    "p_cheque_esp":  [3.3, 3.3, 3.2, 3.1, 3.1, 3.3, 3.4, 3.5, 3.6, 3.6, 3.5, 3.4, 3.4],
    "p_cheque_pre":  [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.2, 0.2, 0.2],
    "p_consig":      [4.9, 5.1, 5.3, 5.5, 5.7, 5.8, 6.0, 6.3, 6.6, 6.7, 6.9, 7.0, 7.1],
    "p_pessoal":     [10.6, 11.0, 11.4, 11.6, 11.8, 12.1, 12.2, 12.3, 12.6, 12.9, 13.1, 13.2, 13.0],
    "p_carne":       [16.8, 16.6, 16.6, 16.7, 16.6, 16.2, 15.9, 16.0, 16.0, 16.1, 16.1, 16.1, 16.1],
    "p_carro":       [9.2, 9.0, 8.8, 8.7, 8.6, 8.6, 8.7, 8.9, 9.1, 9.1, 9.1, 9.0, 9.0],
    "p_casa":        [9.3, 9.2, 9.2, 9.4, 9.7, 9.6, 9.6, 9.8, 9.7, 9.7, 10.0, 9.9, 9.6],
    "p_outras":      [2.8, 2.8, 2.8, 2.8, 2.7, 2.6, 2.5, 2.6, 2.6, 2.6, 2.7, 2.6, 2.5],
    # --- Tempo e renda ---
    "p_dias_atraso": [64.2, 64.4, 64.7, 64.7, 64.3, 64.3, 64.8, 65.1, 65.1, 65.1, 65.0, 64.8, 64.6],
    "p_meses_comp":  [7.1, 7.1, 7.1, 7.2, 7.1, 7.1, 7.2, 7.2, 7.2, 7.2, 7.2, 7.2, 7.2],
    "p_renda":       [29.4, 29.3, 29.3, 29.6, 29.5, 29.5, 29.7, 29.7, 29.6, 29.4, 29.3, 29.3, 29.5],
}
_tam = {len(v) for v in PEIC_DADOS.values()}
assert len(_tam) == 1, f"As listas do PEIC têm tamanhos diferentes: { {k: len(v) for k, v in PEIC_DADOS.items()} }"
PEIC_MESES: list[date] = [PEIC_INICIO + relativedelta(months=i) for i in range(_tam.pop())]
PEIC_FIM = PEIC_MESES[-1]

G_PEIC_1, G_PEIC_2, G_PEIC_3 = "PEIC – Visão geral", "PEIC – Tipo de dívida", "PEIC – Tempo e renda"


def _peic(id_, curto, grupo, unidade, nome, simples, leia, tipo="pct", **kw) -> dict:
    return dict(id=id_, curto=curto, grupo=grupo, unidade=unidade, tipo=tipo, nome=nome,
                descricao=simples, simples=simples, leia=leia, fonte="PEIC", casas=1, **kw)


CATALOGO_PEIC: list[dict] = [
    _peic("p_endiv", "Famílias endividadas", G_PEIC_1, "% do total de famílias",
          "Famílias endividadas (% do total de famílias)",
          "De cada 100 famílias pesquisadas, quantas têm alguma dívida (cartão, carnê, financiamento, consignado etc.).",
          "Estar endividada é comum e não significa estar com problema: muita gente paga as dívidas em dia."),
    _peic("p_atraso", "Famílias com dívidas em atraso", G_PEIC_1, "% do total de famílias",
          "Famílias com dívidas em atraso (% do total de famílias)",
          "De cada 100 famílias, quantas têm pelo menos uma conta ou dívida atrasada.",
          "É o indicador de “aperto” mais direto: quando sobe, mais famílias estão deixando de pagar em dia."),
    _peic("p_sem_cond", "Não terão condição de pagar", G_PEIC_1, "% do total de famílias",
          "Famílias que não terão condição de pagar as dívidas em atraso (% do total de famílias)",
          "De cada 100 famílias, quantas dizem que não vão conseguir pagar as dívidas que estão atrasadas.",
          "É a parte mais grave da inadimplência: o atraso que a própria família considera sem solução."),
    _peic("p_cartao", "Cartão de crédito", G_PEIC_2, "% dos endividados", "Dívida em cartão de crédito (% dos endividados)",
          "Entre as famílias endividadas, a parcela que deve no cartão de crédito.",
          "A soma dos tipos passa de 100% porque a mesma família pode ter vários tipos de dívida."),
    _peic("p_cheque_esp", "Cheque especial", G_PEIC_2, "% dos endividados", "Dívida em cheque especial (% dos endividados)",
          "Entre as famílias endividadas, a parcela que usa o limite do cheque especial.",
          "Uma das modalidades mais caras; valor baixo indica pouco uso."),
    _peic("p_cheque_pre", "Cheque pré-datado", G_PEIC_2, "% dos endividados", "Dívida em cheque pré-datado (% dos endividados)",
          "Entre as famílias endividadas, a parcela com cheques pré-datados.",
          "Modalidade pouco usada hoje; variações pequenas não são relevantes."),
    _peic("p_consig", "Crédito consignado", G_PEIC_2, "% dos endividados", "Dívida em crédito consignado (% dos endividados)",
          "Entre as famílias endividadas, a parcela com empréstimo descontado direto da folha ou do benefício.",
          "Costuma ter juros menores; se cresce, mais famílias estão recorrendo a esse empréstimo."),
    _peic("p_pessoal", "Crédito pessoal", G_PEIC_2, "% dos endividados", "Dívida em crédito pessoal (% dos endividados)",
          "Entre as famílias endividadas, a parcela com empréstimo pessoal (não ligado a um bem).",
          "Em geral tem juros mais altos que o consignado."),
    _peic("p_carne", "Carnês", G_PEIC_2, "% dos endividados", "Dívida em carnês (% dos endividados)",
          "Entre as famílias endividadas, a parcela que paga compras parceladas em carnê.",
          "Compras a prazo no varejo."),
    _peic("p_carro", "Financiamento de carro", G_PEIC_2, "% dos endividados", "Financiamento de carro (% dos endividados)",
          "Entre as famílias endividadas, a parcela que está pagando um carro financiado.",
          "Dívida ligada a um bem; costuma ser de prazo longo."),
    _peic("p_casa", "Financiamento de casa", G_PEIC_2, "% dos endividados", "Financiamento de casa (% dos endividados)",
          "Entre as famílias endividadas, a parcela que está pagando um imóvel financiado.",
          "Dívida de prazo muito longo, ligada a um bem."),
    _peic("p_outras", "Outras dívidas", G_PEIC_2, "% dos endividados", "Outras dívidas (% dos endividados)",
          "Entre as famílias endividadas, a parcela com dívidas que não se encaixam nos tipos acima.", ""),
    _peic("p_dias_atraso", "Tempo médio de atraso (dias)", G_PEIC_3, "dias",
          "Tempo médio de pagamento em atraso (dias)",
          "Entre as famílias com contas atrasadas, há quantos dias, em média, o atraso dura.",
          "Quanto maior, mais antigo é o atraso e mais difícil costuma ser resolver.",
          tipo="num", suf=" dias", uvar="dias"),
    _peic("p_meses_comp", "Tempo médio de comprometimento (meses)", G_PEIC_3, "meses",
          "Tempo médio de comprometimento com dívida (meses)",
          "Por quantos meses, em média, as famílias endividadas ficam comprometidas com as dívidas (medida da pesquisa).",
          "Quanto maior, mais longas são as dívidas.", tipo="num", suf=" meses", uvar="meses"),
    _peic("p_renda", "Renda comprometida com dívidas", G_PEIC_3, "% da renda",
          "Parcela média da renda comprometida com dívida (% da renda)",
          "De cada R$ 100 de renda, quantos reais, em média, vão para pagar dívidas segundo as famílias.",
          "É a medida do PEIC mais parecida com o “comprometimento da renda” do Banco Central."),
]

# ============================================================
# CATÁLOGO DO BANCO CENTRAL (contexto)
#   tipo "pct"  -> variação medida em pontos percentuais (p.p.)
#   tipo "val"  -> variação medida em % (séries em R$)
#   tipo "num"  -> variação medida na própria unidade (dias, meses)
#   sa_id       -> código da versão COM ajuste sazonal (usada pelo filtro do dashboard)
#   oculta      -> série auxiliar (não aparece nos seletores; é usada pelo filtro sazonal)
#   verificada  -> False = código não conferido no catálogo do BCB; confira unidade/valores
# ============================================================
CATALOGO_BCB: list[dict] = [
    # --- Endividamento ---------------------------------------------------------------
    dict(id="29037", curto="Endividamento (% da renda 12m)", grupo="Endividamento", unidade="% da renda", tipo="pct",
         nome="Endividamento das famílias com o SFN (% da renda acumulada em 12 meses)",
         descricao="Dívida das famílias com o Sistema Financeiro Nacional ÷ renda das famílias acumulada nos últimos 12 meses (RNDBF)."),
    dict(id="29038", curto="Endividamento ex-habitacional", grupo="Endividamento", unidade="% da renda", tipo="pct",
         nome="Endividamento das famílias, exceto crédito habitacional (% da renda 12m)",
         descricao="Mesma medida do endividamento, excluindo o crédito habitacional (isola o crédito de consumo)."),
    # --- Comprometimento da renda (sem ajuste sazonal + versões com ajuste) ----------
    dict(id="29265", curto="Comprometimento – serviço da dívida", grupo="Comprometimento da renda", unidade="% da renda",
         tipo="pct", sa_id="29034",
         nome="Comprometimento da renda com o serviço da dívida",
         descricao="Pagamentos esperados do serviço da dívida (juros + amortização) ÷ renda mensal das famílias, em média móvel trimestral."),
    dict(id="29264", curto="Comprometimento – juros", grupo="Comprometimento da renda", unidade="% da renda",
         tipo="pct", sa_id="29033",
         nome="Comprometimento da renda com juros da dívida",
         descricao="Parcela da renda mensal comprometida apenas com juros da dívida, em média móvel trimestral."),
    dict(id="29263", curto="Comprometimento – amortização", grupo="Comprometimento da renda", unidade="% da renda",
         tipo="pct", sa_id="29036",
         nome="Comprometimento da renda com amortização da dívida",
         descricao="Parcela da renda mensal comprometida com amortização do principal da dívida, em média móvel trimestral."),
    dict(id="29266", curto="Comprometimento – ex-habitacional", grupo="Comprometimento da renda", unidade="% da renda",
         tipo="pct", sa_id="29035",
         nome="Comprometimento da renda com o serviço da dívida, exceto crédito habitacional",
         descricao="Comprometimento da renda com o serviço da dívida excluindo o crédito habitacional, em média móvel trimestral."),
    dict(id="29034", curto="Comprometimento – serviço da dívida (aj. sazonal)", grupo="Comprometimento – ajuste sazonal",
         unidade="% da renda", tipo="pct", oculta=True,
         nome="Comprometimento da renda com o serviço da dívida – com ajuste sazonal", descricao="Versão com ajuste sazonal da série 29265."),
    dict(id="29033", curto="Comprometimento – juros (aj. sazonal)", grupo="Comprometimento – ajuste sazonal",
         unidade="% da renda", tipo="pct", oculta=True,
         nome="Comprometimento da renda com juros – com ajuste sazonal", descricao="Versão com ajuste sazonal da série 29264."),
    dict(id="29036", curto="Comprometimento – amortização (aj. sazonal)", grupo="Comprometimento – ajuste sazonal",
         unidade="% da renda", tipo="pct", oculta=True,
         nome="Comprometimento da renda com amortização – com ajuste sazonal", descricao="Versão com ajuste sazonal da série 29263."),
    dict(id="29035", curto="Comprometimento – ex-habitacional (aj. sazonal)", grupo="Comprometimento – ajuste sazonal",
         unidade="% da renda", tipo="pct", oculta=True,
         nome="Comprometimento da renda ex-habitacional – com ajuste sazonal", descricao="Versão com ajuste sazonal da série 29266."),
    # --- Custo do crédito ------------------------------------------------------------
    dict(id="4189", curto="Selic efetiva (a.a.)", grupo="Custo do crédito", unidade="% a.a.", tipo="pct",
         nome="Taxa Selic acumulada no mês, anualizada (base 252)",
         descricao="Taxa básica de juros efetiva, acumulada no mês e anualizada. Referência do custo do dinheiro."),
    dict(id="432", curto="Meta Selic (Copom)", grupo="Custo do crédito", unidade="% a.a.", tipo="pct", diaria=True,
         nome="Meta da taxa Selic definida pelo Copom (último valor do mês)",
         descricao="Meta da Selic definida pelo Copom. Série diária; o script usa o último valor de cada mês."),
    dict(id="25435", curto="Juros médios do crédito PF (a.m.)", grupo="Custo do crédito", unidade="% a.m.", tipo="pct", casas=2,
         nome="Taxa média mensal de juros das operações de crédito – Pessoas físicas – Total",
         descricao="Taxa média das novas operações de crédito contratadas no mês (livre + direcionado), ponderada pelo valor das concessões. Conferir unidade nos valores."),
    # --- Crédito e inadimplência -----------------------------------------------------
    dict(id="20633", curto="Concessões de crédito PF", grupo="Crédito e inadimplência", unidade="R$ bilhões", tipo="val",
         escala=0.001, pre="R$ ", suf=" bi", casas=1,
         nome="Concessões de crédito – Pessoas físicas – Total (R$ bilhões)",
         descricao="Valor das novas operações de crédito contratadas no mês (crédito livre + direcionado). Origem em R$ milhões, exibido em R$ bilhões."),
    dict(id="20541", curto="Saldo da carteira PF", grupo="Crédito e inadimplência", unidade="R$ bilhões", tipo="val",
         escala=0.001, pre="R$ ", suf=" bi", casas=1, verificada=False,
         nome="Saldo da carteira de crédito – Pessoas físicas – Total (R$ bilhões)",
         descricao="Estoque da carteira de crédito das famílias no fim do mês. Código deduzido de painel de terceiros: confirme no catálogo do BCB."),
    dict(id="21084", curto="Inadimplência PF", grupo="Crédito e inadimplência", unidade="% da carteira", tipo="pct",
         nome="Inadimplência da carteira de crédito – Pessoas físicas – Total",
         descricao="Percentual da carteira com ao menos uma parcela em atraso superior a 90 dias."),
    # --- Contexto macro (opcional) ----------------------------------------------------
    dict(id="433", curto="IPCA mensal", grupo="Contexto macro", unidade="% a.m.", tipo="pct", verificada=False,
         nome="IPCA – variação mensal", descricao="Inflação mensal (IBGE). Código não conferido no catálogo do BCB nesta sessão."),
    dict(id="24369", curto="Desocupação (PNAD)", grupo="Contexto macro", unidade="% da força de trabalho", tipo="pct",
         verificada=False, nome="Taxa de desocupação – PNAD Contínua (IBGE)",
         descricao="Taxa de desocupação das pessoas de 14 anos ou mais (IBGE). Código não conferido no catálogo do BCB nesta sessão."),
    # --- Derivadas (calculadas aqui) --------------------------------------------------
    dict(id="d_part_juros", curto="Participação dos juros no serviço da dívida", grupo="Derivadas", unidade="% do serviço",
         tipo="pct", sa_id="d_part_juros_sa", derivada=True,
         nome="Participação dos juros no serviço da dívida (29264 ÷ 29265)",
         descricao="Quanto do comprometimento total da renda corresponde a juros (e não a amortização)."),
    dict(id="d_part_juros_sa", curto="Participação dos juros (aj. sazonal)", grupo="Derivadas", unidade="% do serviço",
         tipo="pct", oculta=True, derivada=True,
         nome="Participação dos juros no serviço da dívida – com ajuste sazonal (29033 ÷ 29034)",
         descricao="Versão com ajuste sazonal da participação dos juros."),
    dict(id="d_conc_12m", curto="Concessões PF acumuladas 12m", grupo="Derivadas", unidade="R$ bilhões", tipo="val",
         pre="R$ ", suf=" bi", casas=1, derivada=True,
         nome="Concessões de crédito PF acumuladas em 12 meses (R$ bilhões)",
         descricao="Soma móvel de 12 meses das concessões PF; remove a sazonalidade do fluxo de novos contratos."),
    dict(id="d_ipca12", curto="IPCA acumulado 12m", grupo="Derivadas", unidade="% a.a.", tipo="pct", derivada=True,
         nome="IPCA acumulado em 12 meses", descricao="Composição dos últimos 12 IPCAs mensais."),
    dict(id="d_juro_real", curto="Juro real ex-post (Selic vs IPCA 12m)", grupo="Derivadas", unidade="% a.a.", tipo="pct",
         derivada=True, nome="Juro real ex-post: (1+Selic a.a.) ÷ (1+IPCA 12m) − 1",
         descricao="Selic efetiva anualizada deflacionada pelo IPCA acumulado em 12 meses."),
]

# Explicações em linguagem simples (aba "Entenda os dados"): id -> (o que é, como ler)
SIMPLES_BCB: dict[str, tuple[str, str]] = {
    "29037": ("Compara tudo o que as famílias devem aos bancos com tudo o que elas ganham em 12 meses. Em 50%, a dívida equivale a metade da renda de um ano.",
              "Subir = a dívida cresce mais rápido que a renda."),
    "29038": ("O mesmo indicador acima, sem o financiamento de imóveis. Mostra o peso das dívidas do dia a dia (cartão, empréstimos).",
              "Subir = mais dívida de consumo em relação à renda."),
    "29265": ("De cada R$ 100 que a família recebe por mês, quanto já está comprometido com parcelas de dívida (juros + parte do principal). É uma média dos últimos 3 meses.",
              "Subir = as parcelas pesam mais no orçamento mensal."),
    "29264": ("A parte do orçamento mensal que vai só para juros.", "Subir = o custo da dívida pesa mais."),
    "29263": ("A parte do orçamento mensal que vai para abater o valor devido (amortização).", "Subir = a família está pagando mais “principal” por mês."),
    "29266": ("O comprometimento da renda sem considerar o financiamento de imóveis.", "Subir = as parcelas de consumo pesam mais."),
    "4189": ("A taxa básica de juros da economia, como efetivamente praticada. Serve de referência para o custo do crédito.",
             "Subir = o crédito tende a ficar mais caro com o tempo."),
    "432": ("A meta de juros definida pelo Copom (Banco Central); é um valor por reunião, mantido até a próxima decisão.",
            "Mudanças indicam o rumo da política de juros."),
    "25435": ("A taxa de juros média que as pessoas pagam nos novos empréstimos, por mês.", "Subir = tomar crédito está mais caro."),
    "20633": ("Quanto de crédito novo os bancos liberaram às famílias no mês.", "Subir = mais crédito sendo contratado (varia com as épocas do ano)."),
    "20541": ("O total que as famílias devem aos bancos no fim do mês.", "Subir = a carteira de crédito às famílias está crescendo."),
    "21084": ("De cada 100 reais emprestados às famílias, quantos estão com parcela atrasada há mais de 90 dias.", "Subir = mais calote no sistema bancário."),
    "433": ("A inflação do mês (preços ao consumidor).", "Subir = preços subindo mais rápido, o que aperta o orçamento."),
    "24369": ("A parcela das pessoas que procuram trabalho e não encontram.", "Subir = menos renda de trabalho para pagar dívidas."),
    "d_part_juros": ("Do total de parcelas que a família paga, quanto é juros (o resto é amortização).", "Subir = o aperto vem mais do custo do crédito."),
    "d_conc_12m": ("A soma do crédito novo concedido nos últimos 12 meses; suaviza as oscilações de fim de ano.", "Subir = mais crédito novo ao longo do ano."),
    "d_ipca12": ("A inflação acumulada nos últimos 12 meses.", "Subir = o custo de vida cresceu mais no ano."),
    "d_juro_real": ("A Selic descontada a inflação: o custo “de verdade” do dinheiro.", "Subir = o dinheiro está mais caro em termos reais."),
}

CATALOGO: list[dict] = CATALOGO_PEIC + CATALOGO_BCB
for _c in CATALOGO:
    _c.setdefault("fonte", "BCB")
    if _c["fonte"] == "BCB":
        _c["grupo"] = "BCB – " + _c["grupo"]
        _s = SIMPLES_BCB.get(_c["id"])
        _c.setdefault("simples", _s[0] if _s else _c["descricao"])
        _c.setdefault("leia", _s[1] if _s else "")
    _c.setdefault("casas", 2)
    _c.setdefault("pre", "")
    _c.setdefault("suf", "%" if _c["tipo"] == "pct" and "%" in _c["unidade"] else "")
    _c.setdefault("escala", 1.0)
    _c.setdefault("oculta", False)
    _c.setdefault("derivada", False)
    _c.setdefault("verificada", True)
    _c.setdefault("sa_id", None)
    _c.setdefault("uvar", {"pct": "p.p.", "val": "%"}.get(_c["tipo"], _c["unidade"]))
CAT = {c["id"]: c for c in CATALOGO}
GRUPOS_ORDEM = [G_PEIC_1, G_PEIC_2, G_PEIC_3] + [
    "BCB – " + g for g in ["Endividamento", "Comprometimento da renda", "Comprometimento – ajuste sazonal",
                           "Custo do crédito", "Crédito e inadimplência", "Contexto macro", "Derivadas"]]


# ============================================================
# UTILITÁRIOS DE TERMINAL
# ============================================================
def secao(titulo: str) -> None:
    print("\n" + "=" * 110)
    print(titulo)
    print("=" * 110)


def mm_aaaa(d) -> str:
    return d.strftime("%m/%Y") if d is not None else "–"


# ============================================================
# EXTRAÇÃO
# ============================================================
def series_peic() -> dict[str, pl.DataFrame]:
    """Transforma PEIC_DADOS em DataFrames [data, valor] (um por indicador)."""
    return {sid: pl.DataFrame({"data": PEIC_MESES, "valor": [float(x) for x in vals]})
            for sid, vals in PEIC_DADOS.items()}


def baixar_serie(sessao: requests.Session, cfg: dict, data_ini: date, data_fim: date):
    """Retorna (DataFrame mensal [data, valor] ou None, mensagem de status)."""
    url = BASE_URL.format(codigo=cfg["id"])
    params = {"formato": "json", "dataInicial": data_ini.strftime("%d/%m/%Y"),
              "dataFinal": data_fim.strftime("%d/%m/%Y")}
    dados, ultimo_erro = None, None
    for tentativa in range(1, TENTATIVAS + 1):
        try:
            r = sessao.get(url, params=params, timeout=TIMEOUT)
            if r.status_code in (400, 404):
                return None, f"HTTP {r.status_code} (código inexistente ou sem dados no período)"
            r.raise_for_status()
            dados = r.json()
            break
        except (requests.RequestException, ValueError) as erro:
            ultimo_erro = erro
            time.sleep(1.5 * tentativa)
    if dados is None:
        return None, f"falha após {TENTATIVAS} tentativas: {ultimo_erro}"
    if not dados:
        return None, "API retornou lista vazia"

    df = (
        pl.DataFrame(dados)
        .select(pl.col("data").cast(pl.Utf8), pl.col("valor").cast(pl.Utf8))
        .with_columns(
            pl.col("data").str.strptime(pl.Date, "%d/%m/%Y", strict=False).dt.truncate("1mo"),
            (pl.col("valor").str.replace(",", ".").cast(pl.Float64, strict=False) * cfg["escala"]),
        )
        .drop_nulls("data")
        .sort("data")
        # séries diárias (ex.: meta Selic) -> último valor de cada mês; mensais não mudam
        .group_by("data", maintain_order=True)
        .agg(pl.col("valor").last())
        .sort("data")
    )
    return df, "ok"


def extrair_todas(data_ini: date, data_fim: date):
    """Junta PEIC (embutido) + BCB (API). Retorna (dict de séries, DataFrame de log)."""
    resultados, log = {}, []
    for sid, df in series_peic().items():
        resultados[sid] = df
        log.append({"id": sid, "serie": CAT[sid]["curto"], "fonte": "PEIC", "status": "embutido no script",
                    "linhas": df.height, "primeira": df["data"].min(), "ultima": df["data"].max(),
                    "codigo_conferido": True})
    sessao = requests.Session()
    sessao.headers.update({"User-Agent": "Mozilla/5.0 (analise-tcc-endividamento)"})
    for cfg in CATALOGO_BCB:
        if cfg["derivada"]:
            continue
        df, status = baixar_serie(sessao, cfg, data_ini, data_fim)
        if df is not None:
            resultados[cfg["id"]] = df
        log.append({
            "id": cfg["id"], "serie": cfg["curto"], "fonte": "BCB", "status": status,
            "linhas": 0 if df is None else df.height,
            "primeira": None if df is None else df["data"].min(),
            "ultima": None if df is None else df["data"].max(),
            "codigo_conferido": cfg["verificada"],
        })
        print(f"  [{cfg['id']:>6}] {cfg['curto']:<48} {status}")
    return resultados, pl.DataFrame(log)


# ============================================================
# CONSOLIDAÇÃO (Polars)
# ============================================================
def montar_base(series: dict[str, pl.DataFrame]) -> pl.DataFrame:
    d_min = min(df["data"].min() for df in series.values())
    # séries diárias (meta Selic) não estendem a base além da última divulgação das séries mensais
    mensais = [df for sid, df in series.items() if not CAT[sid].get("diaria")] or list(series.values())
    d_max = max(df["data"].max() for df in mensais)
    base = pl.DataFrame({"data": pl.date_range(d_min, d_max, interval="1mo", eager=True)})
    for sid, df in series.items():
        base = base.join(df.rename({"valor": sid}), on="data", how="left")
    cols = set(base.columns)

    derivadas = []
    if {"29264", "29265"} <= cols:
        derivadas.append((pl.col("29264") / pl.col("29265") * 100).alias("d_part_juros"))
    if {"29033", "29034"} <= cols:
        derivadas.append((pl.col("29033") / pl.col("29034") * 100).alias("d_part_juros_sa"))
    if "20633" in cols:
        derivadas.append(pl.col("20633").rolling_sum(window_size=12).alias("d_conc_12m"))
    if "433" in cols:
        derivadas.append(
            (((pl.col("433") / 100 + 1).log().rolling_sum(window_size=12)).exp() - 1).mul(100).alias("d_ipca12")
        )
    if derivadas:
        base = base.with_columns(derivadas)
    if {"4189", "d_ipca12"} <= set(base.columns):
        base = base.with_columns(
            (((pl.col("4189") / 100 + 1) / (pl.col("d_ipca12") / 100 + 1) - 1) * 100).alias("d_juro_real")
        )
    # NaN -> null (divisões por zero etc.)
    base = base.with_columns([pl.col(c).fill_nan(None) for c in base.columns if c != "data"])
    return base


def variacoes(base: pl.DataFrame, lag: int) -> pl.DataFrame:
    """Variação em `lag` meses: % para séries em R$ ("val"); diferença simples (p.p., dias, meses) para as demais."""
    exprs = []
    for c in base.columns:
        if c == "data":
            continue
        if CAT[c]["tipo"] == "val":
            exprs.append(((pl.col(c) / pl.col(c).shift(lag) - 1) * 100).alias(c))
        else:
            exprs.append((pl.col(c) - pl.col(c).shift(lag)).alias(c))
    return base.select("data", *exprs).with_columns([pl.col(c).fill_nan(None) for c in base.columns if c != "data"])


# ============================================================
# ESTATÍSTICAS
# ============================================================
def estatisticas_df(janela: pl.DataFrame, var12: pl.DataFrame, var1: pl.DataFrame) -> pl.DataFrame:
    linhas = []
    for c in [c for c in janela.columns if c != "data"]:
        sub = janela.select("data", c).drop_nulls()
        if sub.height == 0:
            continue
        v, d = sub[c], sub["data"]
        ultimo, d_ult = v[-1], d[-1]

        def _var(frame):
            x = frame.filter(pl.col("data") == d_ult)[c]
            return None if x.len() == 0 else x[0]

        linhas.append({
            "id": c, "fonte": CAT[c]["fonte"], "serie": CAT[c]["curto"], "n": sub.height,
            "media": v.mean(), "mediana": v.median(), "dp": v.std(),
            "min": v.min(), "mes_min": mm_aaaa(d[v.arg_min()]),
            "max": v.max(), "mes_max": mm_aaaa(d[v.arg_max()]),
            "p25": v.quantile(0.25, interpolation="linear"), "p75": v.quantile(0.75, interpolation="linear"),
            "ultimo": ultimo, "mes_ultimo": mm_aaaa(d_ult),
            "percentil_ultimo": float((v <= ultimo).mean() * 100),
            "var_mensal": _var(var1), "var_12m": _var(var12),
            "unid_var": CAT[c]["uvar"],
        })
    out = pl.DataFrame(linhas)
    return out.with_columns(pl.col(pl.Float64).round(2))


def corr_par(df: pl.DataFrame, a: str, b: str):
    if a == b:  # diagonal da matriz
        n = df[a].drop_nulls().len()
        return (1.0 if n >= 5 else None), n
    sub = df.select(a, b).drop_nulls()
    if sub.height < 5:
        return None, sub.height
    r = sub.select(pl.corr(a, b)).item()
    return (None if r is None or r != r else float(r)), sub.height


def matriz_corr(df: pl.DataFrame, ids: list[str]) -> pl.DataFrame:
    linhas = []
    for a in ids:
        linha = {"serie": f"{a} {CAT[a]['curto']}"}
        for b in ids:
            r, _ = corr_par(df, a, b)
            linha[b] = None if r is None else round(r, 2)
        linhas.append(linha)
    return pl.DataFrame(linhas)


def pares_mais_correlacionados(df: pl.DataFrame, ids: list[str], topo: int = 30, so_cruzados: bool = False) -> pl.DataFrame:
    """Pares com maior |r|. so_cruzados=True mantém apenas pares PEIC × BCB."""
    linhas = []
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            if so_cruzados and CAT[a]["fonte"] == CAT[b]["fonte"]:
                continue
            r, n = corr_par(df, a, b)
            if r is not None:
                linhas.append({"serie_a": f"({CAT[a]['fonte']}) {CAT[a]['curto']}", "serie_b": f"({CAT[b]['fonte']}) {CAT[b]['curto']}",
                               "r": round(r, 3), "abs_r": round(abs(r), 3), "n": n})
    if not linhas:
        return pl.DataFrame()
    return pl.DataFrame(linhas).sort("abs_r", descending=True).head(topo).drop("abs_r")


def tabela_defasagens(full: pl.DataFrame, ini: date, fim: date, alvos: list[str], drivers: list[str],
                      max_lag: int = 6, min_n: int = 8, ks: tuple = (0, 1, 2, 3, 6)) -> pl.DataFrame:
    """Correlação entre driver(t-k) e alvo(t), com t dentro da janela [ini, fim].
    k>0: o driver ANTECEDE o alvo em k meses (o driver pode vir de antes da janela)."""
    linhas = []
    for alvo in alvos:
        for drv in drivers:
            if drv == alvo:
                continue
            rs = {}
            for k in range(0, max_lag + 1):
                sub = (full.select("data", pl.col(drv).shift(k).alias("x"), pl.col(alvo).alias("y"))
                       .filter((pl.col("data") >= ini) & (pl.col("data") <= fim)).drop_nulls())
                if sub.height >= min_n:
                    r = sub.select(pl.corr("x", "y")).item()
                    if r is not None and r == r:
                        rs[k] = (float(r), sub.height)
            if not rs:
                continue
            k_best = max(rs, key=lambda k: abs(rs[k][0]))
            linha = {"alvo (PEIC)": CAT[alvo]["curto"], "driver": f"({CAT[drv]['fonte']}) {CAT[drv]['curto']}"}
            for k in ks:
                linha[f"r_k{k}"] = None if k not in rs else round(rs[k][0], 2)
            linha.update({"melhor_k": k_best, "r_melhor": round(rs[k_best][0], 2), "n": rs[k_best][1]})
            linhas.append(linha)
    return pl.DataFrame(linhas).sort(["alvo (PEIC)", "r_melhor"], descending=[False, True]) if linhas else pl.DataFrame()


# ============================================================
# PAYLOAD PARA O DASHBOARD
# ============================================================
def _lista(df: pl.DataFrame, col: str) -> list:
    out = []
    for v in df[col].to_list():
        out.append(None if v is None or v != v else round(float(v), 4))
    return out


def montar_payload(base, var12, var1, log_df) -> dict:
    datas_d = base["data"].to_list()
    datas = [d.isoformat() for d in datas_d]
    series = {}
    for c in base.columns:
        if c == "data" or base[c].null_count() == base.height:
            continue
        series[c] = {"lvl": _lista(base, c), "chg12": _lista(var12, c), "chg1": _lista(var1, c)}

    log = {r["id"]: r for r in log_df.to_dicts()}
    catalogo = []
    for c in CATALOGO:
        item = {k: c[k] for k in ("id", "curto", "nome", "grupo", "unidade", "tipo", "casas", "pre", "suf", "descricao", "simples",
                                  "leia", "oculta", "derivada", "verificada", "sa_id", "fonte", "uvar")}
        item["ok"] = c["id"] in series
        if c["id"] in series:
            ult = base.select("data", c["id"]).drop_nulls()["data"].max()
            item["ultima"] = ult.strftime("%Y-%m")
        info = log.get(c["id"])
        item["status"] = info["status"] if info else ("derivada" if c["derivada"] else "—")
        catalogo.append(item)

    ini_peic = datas_d.index(PEIC_MESES[0])
    fim_peic = datas_d.index(PEIC_MESES[-1])
    return {
        "datas": datas, "series": series, "catalogo": catalogo,
        "meta": {"gerado": date.today().strftime("%d/%m/%Y"), "ini_peic": ini_peic, "fim_peic": fim_peic,
                 "anos_analise": ANOS_ANALISE,
                 "fonte": "PEIC/CNC (principal) + Banco Central do Brasil – SGS (api.bcb.gov.br)"},
    }


def gerar_html(payload: dict, caminho: Path) -> None:
    if PLOTLY_JS == "inline":
        plotly_tag = "<script>" + get_plotlyjs() + "</script>"
    else:
        plotly_tag = '<script src="' + URL_PLOTLY_CDN + '" charset="utf-8"></script>'
    dados = json.dumps(payload, ensure_ascii=False, allow_nan=False).replace("</", "<\\/")
    html = HTML_TEMPLATE.replace("__DATA__", dados).replace("__PLOTLY__", plotly_tag)
    caminho.write_text(html, encoding="utf-8")


# ============================================================
# TEMPLATE DO DASHBOARD (HTML + CSS + JS)
# ============================================================
HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Endividamento das famílias – PEIC e Banco Central</title>
__PLOTLY__
<style>
  :root{--azul:#1F4E79;--laranja:#E07A5F;--verde:#4F8A6B;--verm:#C0504D;--cinza:#666;--borda:#E5E5E5;--fundo:#FAFAFA}
  *{box-sizing:border-box}
  body{margin:0;font-family:"Segoe UI",Arial,sans-serif;color:#222;background:var(--fundo);font-size:14px}
  header{padding:18px 28px 10px;background:#fff;border-bottom:1px solid var(--borda)}
  header h1{margin:0;font-size:21px;color:var(--azul)}
  header .sub{margin:4px 0 0;color:var(--cinza);font-size:12.5px}
  #barra{position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid var(--borda);padding:10px 28px;display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}
  #barra label{display:flex;flex-direction:column;font-size:11.5px;color:var(--cinza);gap:3px}
  select,input[type=number]{font:inherit;padding:5px 8px;border:1px solid #ccc;border-radius:6px;background:#fff;min-width:110px}
  button{font:inherit;padding:6px 11px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer}
  button:hover{background:#f0f4f8}
  .qbtns{display:flex;gap:5px}
  #fInfo{font-size:12px;color:var(--cinza);margin-left:auto;align-self:center}
  nav#tabs{display:flex;gap:4px;padding:10px 28px 0;background:#fff;border-bottom:1px solid var(--borda);flex-wrap:wrap}
  nav#tabs button{border:none;border-bottom:3px solid transparent;border-radius:0;background:none;padding:9px 14px;font-weight:600;color:var(--cinza)}
  nav#tabs button.ativo{color:var(--azul);border-bottom-color:var(--azul)}
  main{padding:18px 28px 40px;max-width:1750px;margin:0 auto}
  section.tab{display:none}section.tab.ativo{display:block}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
  @media(max-width:1150px){.grid{grid-template-columns:1fr}}
  .card{background:#fff;border:1px solid var(--borda);border-radius:10px;padding:14px 16px;margin-bottom:0}
  .card h3{margin:0 0 4px;font-size:15px;color:#222}
  .card .desc{margin:0 0 8px;color:var(--cinza);font-size:12.5px;line-height:1.45}
  .card .stats{font-size:11.5px;color:#555;line-height:1.55;margin-top:6px;border-top:1px dashed var(--borda);padding-top:6px}
  .card .nota{color:#999;font-size:11px;margin-top:3px}
  .vazio{padding:40px 10px;text-align:center;color:#999}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px;margin-bottom:16px}
  .kpi{background:#fff;border:1px solid var(--borda);border-radius:10px;padding:12px 14px}
  .kpi .nome{font-size:12px;color:var(--cinza);min-height:30px}
  .kpi .valor{font-size:26px;font-weight:700;color:var(--azul);margin:2px 0}
  .kpi .data{font-size:11px;color:#999}
  .kpi .delta{font-size:12px;margin-top:5px}
  .up{color:var(--verm)}.down{color:var(--verde)}.neutro{color:var(--cinza)}
  .kpi .rng{font-size:11px;color:#888;margin-top:5px}
  .leitura ul{margin:6px 0 0;padding-left:18px;line-height:1.65}
  .ctrl{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;margin-bottom:14px}
  .checks{display:flex;flex-wrap:wrap;gap:10px;flex:1 1 600px}
  .checks fieldset{border:1px solid var(--borda);border-radius:8px;padding:6px 10px;min-width:190px}
  .checks legend{font-size:11.5px;color:var(--cinza);padding:0 4px}
  .checks label{display:block;font-size:12.5px;padding:1.5px 0;cursor:pointer}
  .aviso{background:#FFF8E6;border:1px solid #F1DDA5;border-radius:8px;padding:9px 12px;font-size:12.5px;color:#6b5a1b;margin:10px 0;line-height:1.5}
  .erro{background:#FDECEA;border:1px solid #E6B3AE;border-radius:8px;padding:12px 14px;margin:14px 28px;color:#7a1f18;font-size:13px}
  table.t{border-collapse:collapse;width:100%;font-size:12.5px;background:#fff}
  table.t th,table.t td{border-bottom:1px solid var(--borda);padding:6px 9px;text-align:right;white-space:nowrap}
  table.t th{background:#F3F6F9;position:sticky;top:0;cursor:pointer;color:#333}
  table.t td:first-child,table.t th:first-child{text-align:left}
  .scroll{overflow:auto;max-height:560px;border:1px solid var(--borda);border-radius:8px;background:#fff}
  h2.sec{font-size:16px;margin:22px 0 8px;color:var(--azul)}
  .badge{font-size:10.5px;padding:1px 6px;border-radius:10px;background:#FDECEA;color:#a33;margin-left:6px}
  .fonte{font-size:10.5px;padding:1px 7px;border-radius:10px;margin-left:6px;font-weight:600;vertical-align:middle}
  .f-PEIC{background:#E3EEF8;color:#1F4E79}.f-BCB{background:#F4E9E3;color:#9a4a30}
  /* guia */
  .guia p{line-height:1.6;margin:6px 0}
  .guia .duas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
  @media(max-width:900px){.guia .duas{grid-template-columns:1fr}}
  .guia ol,.guia ul{line-height:1.7;margin:6px 0;padding-left:20px}
  .guia dt{font-weight:700;margin-top:8px;color:var(--azul)}
  .guia dd{margin:2px 0 0 0;line-height:1.55}
  .guia details{background:#fff;border:1px solid var(--borda);border-radius:10px;margin:10px 0;padding:6px 14px}
  .guia summary{cursor:pointer;font-weight:700;color:var(--azul);padding:6px 0}
  .gcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin:8px 0 12px}
  .gcard{border:1px solid var(--borda);border-radius:8px;padding:10px 12px;background:#FCFCFD}
  .gcard .gt{font-weight:700;font-size:13.5px}
  .chip{font-size:10.5px;background:#EEF2F6;color:#456;border-radius:10px;padding:1px 7px;margin-left:6px;font-weight:600}
  .gcard p{margin:5px 0;font-size:12.5px;line-height:1.5}
  .gcard .leia{color:#555}.gcard .ult{color:#888;font-size:11.5px}
</style>
</head>
<body>
<header>
  <h1>Endividamento das famílias – PEIC e Banco Central</h1>
  <p class="sub" id="subtitulo"></p>
</header>

<div id="barra">
  <label>De <select id="fIni"></select></label>
  <label>Até <select id="fFim"></select></label>
  <div class="qbtns" id="qbtns">
    <button data-q="peic">Período PEIC</button><button data-q="24">24M</button>
    <button data-q="padrao">5 anos</button><button data-q="tudo">Tudo</button>
  </div>
  <label>Comprometimento da renda (BCB)
    <select id="fSa"><option value="0">Sem ajuste sazonal</option><option value="1">Com ajuste sazonal</option></select></label>
  <label>Rótulos nos gráficos
    <select id="fRot">
      <option value="auto">Automático (simples)</option>
      <option value="extremos">Só início, fim, mín. e máx.</option>
      <option value="todos">Todos os pontos</option>
      <option value="nenhum">Sem rótulos</option>
    </select></label>
  <span id="fInfo"></span>
</div>

<nav id="tabs">
  <button data-tab="geral" class="ativo">Visão geral (PEIC)</button>
  <button data-tab="guia">Entenda os dados</button>
  <button data-tab="causas">PEIC × Banco Central</button>
  <button data-tab="explorar">Explorador</button>
  <button data-tab="corr">Correlações e defasagens</button>
  <button data-tab="saz">Sazonalidade (BCB)</button>
  <button data-tab="dados">Estatísticas e dados</button>
</nav>

<main>
  <section class="tab ativo" id="tab-geral">
    <h2 class="sec" style="margin-top:0">Como estão as famílias <span class="fonte f-PEIC">PEIC</span></h2>
    <div class="kpis" id="kpisPeic"></div>
    <div class="card leitura" id="leitura"></div>
    <div style="height:16px"></div>
    <div class="grid" id="gridGeral"></div>
    <h2 class="sec">Contexto do Banco Central <span class="fonte f-BCB">BCB</span></h2>
    <div class="kpis" id="kpisBcb"></div>
  </section>

  <section class="tab guia" id="tab-guia">
    <div class="card">
      <h3>Como usar este painel</h3>
      <ol>
        <li>Escolha o período em <b>De / Até</b> (no topo). Ao abrir, o painel mostra os meses cobertos pelo PEIC.</li>
        <li>Cada aba responde a uma pergunta: <b>Visão geral</b> – como estão as famílias? · <b>PEIC × Banco Central</b> – as duas fontes contam a mesma história? ·
            <b>Explorador</b> – monte seus próprios gráficos · <b>Correlações</b> – quanto duas séries andam juntas · <b>Sazonalidade</b> – há meses “típicos”? · <b>Estatísticas e dados</b> – tabelas e downloads.</li>
        <li>Passe o mouse sobre um ponto para ver o valor exato. Os rótulos podem ser simplificados ou desligados no topo da página.</li>
        <li>Cores de variação: <span class="up"><b>vermelho</b></span> = subiu, <span class="down"><b>verde</b></span> = caiu. É só a direção, não um julgamento de “bom” ou “ruim”.</li>
      </ol>
    </div>
    <h2 class="sec">De onde vêm os dados</h2>
    <div class="duas">
      <div class="card">
        <h3>PEIC – fonte principal <span class="fonte f-PEIC">PEIC</span></h3>
        <p>Pesquisa mensal feita pela CNC (Confederação Nacional do Comércio) com consumidores. Ela <b>pergunta às famílias</b> se elas têm dívidas, se estão atrasadas e quanto da renda está comprometida.</p>
        <p>É um retrato do que as famílias <b>declaram</b>. Os números são percentuais de famílias (ex.: “82% das famílias estão endividadas”).</p>
      </div>
      <div class="card">
        <h3>Banco Central – contexto <span class="fonte f-BCB">BCB</span></h3>
        <p>Dados oficiais do sistema financeiro (SGS). Eles <b>medem valores</b>: quanto as famílias devem, quanto da renda vai para parcelas, quanto o crédito custa e quanto está inadimplente.</p>
        <p>Servem para checar se o que as famílias dizem no PEIC aparece também nos números dos bancos, e para entender possíveis causas (juros, crédito novo, desemprego).</p>
      </div>
    </div>
    <div class="aviso"><b>Por que PEIC e BCB não precisam “bater”?</b> Os métodos são diferentes (pesquisa com famílias × registros dos bancos), os públicos não são idênticos e as definições mudam um pouco.
      Compare principalmente o <b>sentido</b> dos movimentos (subiu / caiu) e não o tamanho exato dos números.</div>

    <h2 class="sec">O que significa cada indicador</h2>
    <div id="guiaSeries"></div>

    <h2 class="sec">Termos usados no painel</h2>
    <div class="card"><dl>
      <dt>p.p. (ponto percentual)</dt><dd>A diferença entre dois percentuais. Se passou de 78,5% para 82,0%, subiu 3,5 p.p. (e não “3,5%”).</dd>
      <dt>Variação mensal / em 12 meses</dt><dd>Quanto o indicador mudou em relação ao mês anterior / ao mesmo mês do ano passado. A variação em 12 meses só existe para séries com mais de um ano de histórico (o PEIC aqui tem poucos meses).</dd>
      <dt>Correlação (r)</dt><dd>Um número de −1 a +1 que mede se duas séries se movem juntas. Perto de +1: sobem e caem juntas. Perto de −1: uma sobe quando a outra cai. Perto de 0: sem relação clara.</dd>
      <dt>Defasagem</dt><dd>Atraso entre causa e efeito. Se os juros sobem hoje, o efeito sobre as famílias pode aparecer só meses depois; a defasagem testa esse “atraso”.</dd>
      <dt>Ajuste sazonal</dt><dd>Remove oscilações que se repetem todo ano (ex.: 13º, Natal), para comparar meses diferentes de forma justa.</dd>
      <dt>Média móvel trimestral</dt><dd>Média dos últimos 3 meses; deixa a curva mais suave e um pouco “atrasada”.</dd>
    </dl></div>

    <h2 class="sec">Cuidados ao interpretar</h2>
    <div class="card"><ul>
      <li><b>Poucos meses:</b> o PEIC tem poucos pontos; um valor alto de correlação pode ser coincidência.</li>
      <li><b>Correlação não é causa:</b> duas séries andarem juntas não prova que uma provoca a outra.</li>
      <li><b>Endividada ≠ inadimplente:</b> a maioria das famílias endividadas paga em dia; o aperto aparece nos indicadores de <i>atraso</i>.</li>
      <li><b>Datas de divulgação:</b> as séries do Banco Central saem com defasagem; o último mês pode estar vazio em algumas.</li>
    </ul></div>
  </section>

  <section class="tab" id="tab-causas">
    <div class="aviso">Cada gráfico coloca um indicador do <b>PEIC</b> ao lado de um do <b>Banco Central</b>. Quando há dois eixos (esquerda e direita), as unidades são diferentes:
    compare o <b>formato</b> das curvas (sobem e caem juntas?) e não a altura das linhas. Associação visual não prova causa — a aba “Correlações e defasagens” quantifica.</div>
    <div class="grid" id="gridCausas"></div>
  </section>

  <section class="tab" id="tab-explorar">
    <div class="card ctrl">
      <div id="expChecks" class="checks"></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <label>Transformação
          <select id="expModo">
            <option value="lvl">Nível (valor original)</option>
            <option value="chg1">Variação mensal</option>
            <option value="chg12">Variação em 12 meses (não há para o PEIC)</option>
            <option value="z">Padronizado (z-score do nível)</option>
            <option value="b100">Índice base 100 (início do período)</option>
          </select></label>
        <label>Layout
          <select id="expLay"><option value="paineis">Um painel por série</option><option value="sobrepor">Sobrepor no mesmo gráfico</option></select></label>
        <div style="display:flex;gap:6px"><button id="expTodas">Todas</button><button id="expNenhuma">Nenhuma</button></div>
      </div>
    </div>
    <div id="expAviso"></div>
    <div class="grid" id="gridExp"></div>
  </section>

  <section class="tab" id="tab-corr">
    <div class="card ctrl">
      <div id="corrChecks" class="checks"></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <label>Base do cálculo
          <select id="corrBase">
            <option value="chg1">Variação mensal (recomendado com o PEIC)</option>
            <option value="lvl">Nível (cuidado: tendência)</option>
            <option value="chg12">Variação em 12 meses (só BCB)</option>
          </select></label>
        <div style="display:flex;gap:6px"><button id="corrTodas">Todas</button><button id="corrNenhuma">Nenhuma</button></div>
      </div>
    </div>
    <div class="aviso"><b>Como ler:</b> correlação mede se duas séries se movem juntas (−1 a +1), não se uma causa a outra. Com poucos meses de PEIC, trate os resultados como <b>pistas</b>.
    Em <b>nível</b>, séries com tendência parecem relacionadas por acaso; por isso a variação mensal é a base recomendada. A variação em 12 meses não existe para o PEIC (histórico curto).</div>
    <div class="card"><h3>Destaques: PEIC × Banco Central no período filtrado</h3>
      <p class="desc">Os pares (um do PEIC, um do BCB) com maior correlação entre as séries selecionadas abaixo.</p>
      <div id="corrTop"></div></div>
    <div style="height:16px"></div>
    <div class="card"><h3>Matriz de correlação (Pearson) no período filtrado</h3>
      <p class="desc">Cada célula é a correlação entre duas séries (−1 = movimentos opostos, +1 = movimentos iguais). Usa apenas os meses em que as duas séries têm dado.</p>
      <div id="corrHeat"></div></div>
    <h2 class="sec">Defasagens: quem antecede quem?</h2>
    <div class="card ctrl">
      <label>Fator (X)<select id="lagX"></select></label>
      <label>Alvo (Y)<select id="lagY"></select></label>
      <label>Defasagem máxima (meses)<input type="number" id="lagMax" min="1" max="24" value="6"></label>
      <label>Defasagem do gráfico de dispersão (k)<input type="number" id="lagK" min="-24" max="24" value="0"></label>
      <button id="lagAuto">Usar melhor defasagem</button>
    </div>
    <div class="grid">
      <div class="card"><h3>Correlação por defasagem</h3>
        <p class="desc" id="lagDesc">k &gt; 0: X de k meses atrás é comparado com Y de hoje (X antecede Y). k &lt; 0: Y antecede X.</p>
        <div id="lagBar"></div><div class="stats" id="lagStats"></div></div>
      <div class="card"><h3>Dispersão e reta de regressão (OLS)</h3>
        <p class="desc" id="lagScDesc"></p>
        <div id="lagScatter"></div><div class="stats" id="lagScStats"></div></div>
    </div>
  </section>

  <section class="tab" id="tab-saz">
    <div class="aviso">A sazonalidade exige anos completos: use os botões <b>5 anos</b> ou <b>Tudo</b> no topo. Só séries do Banco Central aparecem aqui (o PEIC tem menos de 2 anos de dados).</div>
    <div class="card ctrl">
      <label>Série<select id="sazSerie"></select></label>
      <label>Exibir<select id="sazModo"><option value="valor">Valor do mês</option><option value="desvio">Desvio em relação à média do ano (anos completos)</option></select></label>
    </div>
    <div class="grid">
      <div class="card"><h3>Mapa mês × ano</h3><p class="desc" id="sazDesc1"></p><div id="sazHeat"></div></div>
      <div class="card"><h3>Perfil sazonal médio</h3><p class="desc">Desvio médio de cada mês em relação à média do próprio ano, usando só anos completos dentro do período filtrado.</p><div id="sazBar"></div><div class="stats" id="sazStats"></div></div>
    </div>
  </section>

  <section class="tab" id="tab-dados">
    <h2 class="sec" style="margin-top:0">Estatísticas descritivas do período filtrado</h2>
    <div style="margin-bottom:8px"><button id="csvStats">Baixar CSV (estatísticas)</button></div>
    <div class="scroll"><table class="t" id="tabStats"></table></div>
    <h2 class="sec">Dados mensais</h2>
    <div style="display:flex;gap:12px;margin-bottom:8px;align-items:flex-end">
      <label style="font-size:11.5px;color:#666;display:flex;flex-direction:column;gap:3px">Mostrar
        <select id="dadosModo"><option value="lvl">Nível</option><option value="chg1">Variação mensal</option><option value="chg12">Variação 12 meses</option></select></label>
      <button id="csvDados">Baixar CSV (dados)</button>
    </div>
    <div class="scroll"><table class="t" id="tabDados"></table></div>
    <h2 class="sec">Catálogo de séries (para citar no TCC)</h2>
    <div class="scroll"><table class="t" id="tabCat"></table></div>
  </section>
</main>

<script>
(function(){
'use strict';
// Se algo quebrar no JavaScript, mostra a mensagem na própria página (em vez de tela em branco).
window.addEventListener('error', function(ev){
  var d=document.createElement('div'); d.className='erro';
  d.textContent='Erro no dashboard: '+ev.message+' (linha '+ev.lineno+')';
  document.body.insertBefore(d, document.body.firstChild);
});
const DATA = __DATA__;
const CAT = {}; DATA.catalogo.forEach(c => { CAT[c.id] = c; });
const N = DATA.datas.length;
const PAL = ['#1F4E79','#E07A5F','#4F8A6B','#8E7DBE','#B08968','#3D5A80','#C0504D','#5C6B73','#D4A017','#2A9D8F'];
const RED = '#C0504D', GREEN = '#4F8A6B', BLUE = '#1F4E79', ORANGE = '#E07A5F';
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const CFG = {responsive:true, displaylogo:false, modeBarButtonsToRemove:['lasso2d','select2d'],
             toImageButtonOptions:{format:'png', scale:3, filename:'grafico_endividamento'}};
const TIPOS = ['p_cartao','p_cheque_esp','p_cheque_pre','p_consig','p_pessoal','p_carne','p_carro','p_casa','p_outras'];

// ---------- estado ----------
function lastNonNull(a){ for(let i=a.length-1;i>=0;i--){ if(a[i]!=null) return i; } return a.length-1; }
const IDX_PEIC_INI = DATA.meta.ini_peic, IDX_PEIC_FIM = DATA.meta.fim_peic;
const FIM_BCB = DATA.series['29037'] ? lastNonNull(DATA.series['29037'].lvl) : N-1;
const existe = ids => ids.filter(id => DATA.series[id]);
const S = {
  ini: IDX_PEIC_INI, fim: IDX_PEIC_FIM, sa:false, rot:'auto', tab:'geral',
  expSel:new Set(existe(['p_endiv','p_atraso','p_sem_cond'])), expModo:'lvl', expLay:'paineis',
  corrSel:new Set(existe(['p_endiv','p_atraso','p_sem_cond','p_renda','29037','29265','21084','4189','25435','20633'])), corrBase:'chg1',
  lagX: DATA.series['4189'] ? '4189' : null, lagY: DATA.series['p_endiv'] ? 'p_endiv' : null, lagMax:6, lagK:null,
  sazSerie: DATA.series['29265'] ? '29265' : null, sazModo:'valor', dadosModo:'lvl', statSort:{col:null,asc:true}
};
const MIN_PARES = 8;

// ---------- helpers ----------
const $ = (s, r) => (r||document).querySelector(s);
const nfc = {}; const nf = d => nfc[d] || (nfc[d] = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}));
function fmt(v,d=2,sign=false){ if(v==null||Number.isNaN(v)) return '–'; let s=nf(d).format(v); if(sign&&v>0) s='+'+s; return s; }
function mes(i){ const d=DATA.datas[i]; return d.slice(5,7)+'/'+d.slice(2,4); }
function mesLongo(i){ const d=DATA.datas[i]; return d.slice(5,7)+'/'+d.slice(0,4); }
function resolve(id){ const c=CAT[id]; if(S.sa && c && c.sa_id && DATA.series[c.sa_id]) return c.sa_id; return id; }
function has(id){ return !!DATA.series[resolve(id)]; }
function nomeDe(id){ const r=resolve(id); return CAT[r] ? CAT[r].curto : id; }
function nomeF(c){ return c.curto+' ('+c.fonte+')'; }
function arr(id, modo){ const s = DATA.series[resolve(id)]; return s ? s[modo] : null; }
function win(id, modo){ const a=arr(id,modo); return a ? a.slice(S.ini,S.fim+1) : null; }
function X(){ return DATA.datas.slice(S.ini,S.fim+1); }
function valid(v){ const o=[]; v.forEach((x,i)=>{ if(x!=null&&!Number.isNaN(x)) o.push(i); }); return o; }
function quantile(s,q){ const p=(s.length-1)*q, lo=Math.floor(p), hi=Math.ceil(p); return s[lo]+(s[hi]-s[lo])*(p-lo); }
function stats(v){
  const ix=valid(v); if(!ix.length) return null; const a=ix.map(i=>v[i]), n=a.length, mean=a.reduce((p,q)=>p+q,0)/n;
  const sd=n>1?Math.sqrt(a.reduce((p,q)=>p+(q-mean)**2,0)/(n-1)):0; const s=[...a].sort((p,q)=>p-q);
  let imin=ix[0], imax=ix[0]; ix.forEach(i=>{ if(v[i]<v[imin]) imin=i; if(v[i]>v[imax]) imax=i; });
  const il=ix[ix.length-1], last=v[il], first=v[ix[0]];
  return {n,mean,median:quantile(s,.5),sd,min:v[imin],imin,max:v[imax],imax,p25:quantile(s,.25),p75:quantile(s,.75),last,ilast:il,first,ifirst:ix[0],pct:a.filter(x=>x<=last).length/n*100};
}
function sufVar(c){ return c.tipo==='val' ? '%' : ' '+c.uvar; }
function unitLabel(c,modo){ if(modo==='lvl') return c.unidade; if(modo==='chg12'||modo==='chg1') return c.tipo==='val'?'% (variação)':c.uvar+' (variação)'; if(modo==='z') return 'desvios-padrão (z)'; return 'índice (base 100)'; }
function casasDe(c,modo){ if(modo==='lvl') return c.casas; if(modo==='b100') return 1; if(modo==='z') return 2; return c.tipo==='val'?1:c.casas; }
function fmtU(v,c,modo){
  if(v==null) return '–';
  if(modo==='lvl') return c.pre+fmt(v,c.casas)+c.suf;
  if(modo==='chg12'||modo==='chg1') return fmt(v,casasDe(c,modo),true)+sufVar(c);
  return fmt(v,modo==='b100'?1:2);
}
// rótulo curto nos gráficos: só o número (e % quando a unidade é percentual)
function fmtRot(v,c,modo){
  const d=casasDe(c,modo);
  if(modo==='lvl') return fmt(v,d)+(c.suf.trim()==='%'?'%':'');
  if(modo==='chg12'||modo==='chg1') return fmt(v,d,true);
  return fmt(v,d);
}
function deltaTxt(y,c){ const ix=valid(y); if(ix.length<2) return null; const a=y[ix[0]], b=y[ix[ix.length-1]];
  const d = c.tipo==='val' ? (b/a-1)*100 : b-a; return fmt(d, c.tipo==='val'?1:c.casas, true)+sufVar(c); }
function getVals(id,modo){
  if(modo==='z'||modo==='b100'){
    const a=win(id,'lvl'); if(!a) return null; const st=stats(a); if(!st) return a;
    if(modo==='z') return a.map(v=>v==null?null:(st.sd?(v-st.mean)/st.sd:0));
    const ix=valid(a); const b=a[ix[0]]; return a.map(v=>v==null?null:v/b*100);
  }
  return win(id,modo);
}
// Rótulos simples: automático = todos os pontos se o período tiver até 14 meses; senão início, fim e um a cada 12 meses
function idxRotulos(v, modo){
  const set=new Set(); if(modo==='nenhum') return set; const ix=valid(v); if(!ix.length) return set;
  if(modo==='todos' || (modo==='auto' && ix.length<=14)){ ix.forEach(i=>set.add(i)); return set; }
  set.add(ix[0]); set.add(ix[ix.length-1]);
  if(modo==='extremos'){ let imin=ix[0], imax=ix[0]; ix.forEach(i=>{ if(v[i]<v[imin]) imin=i; if(v[i]>v[imax]) imax=i; }); set.add(imin); set.add(imax); }
  else { for(let k=ix.length-1;k>=0;k-=12) set.add(ix[k]); }
  return set;
}
function xaxis(){
  const n=S.fim-S.ini+1; const dt = n<=16?'M1':(n<=30?'M2':(n<=72?'M3':(n<=130?'M6':'M12')));
  return {tickformat:'%m/%y', dtick:dt, tickangle:-45, showgrid:false, zeroline:false, showline:true, linecolor:'#999'};
}
function baseLayout(extra){
  return Object.assign({font:{family:'Segoe UI, Arial, sans-serif', size:12, color:'#333'}, separators:',.',
    margin:{l:62,r:62,t:34,b:58}, paper_bgcolor:'#fff', plot_bgcolor:'#fff', hovermode:'x unified',
    legend:{orientation:'h', y:1.14, x:0}, xaxis:xaxis(), height:400}, extra||{});
}
function lastIdx(a){ for(let i=S.fim;i>=S.ini;i--){ if(a[i]!=null) return i; } return -1; }
function firstIdx(a){ for(let i=S.ini;i<=S.fim;i++){ if(a[i]!=null) return i; } return -1; }
function pearson(xs,ys){
  const n=xs.length; if(n<5) return {r:null,n};
  const mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n; let sxy=0,sxx=0,syy=0;
  for(let i=0;i<n;i++){ const dx=xs[i]-mx, dy=ys[i]-my; sxy+=dx*dy; sxx+=dx*dx; syy+=dy*dy; }
  if(sxx===0||syy===0) return {r:null,n};
  return {r:sxy/Math.sqrt(sxx*syy), n, sxy, sxx, mx, my};
}
function pares(xa, ya, k){ // x(t-k) vs y(t) para t na janela
  const xs=[], ys=[], idx=[];
  for(let i=S.ini;i<=S.fim;i++){ const j=i-k; if(j<0||j>=N) continue; const x=xa[j], y=ya[i]; if(x!=null&&y!=null){ xs.push(x); ys.push(y); idx.push(i); } }
  return {xs,ys,idx};
}
function forca(r){
  const a=Math.abs(r);
  if(a<0.2) return 'praticamente sem relação';
  return (a>=0.7?'forte':(a>=0.4?'moderada':'fraca'))+(r>0?' – tendem a subir e cair juntas':' – tendem a andar em sentidos opostos');
}
function baixarCSV(nome, linhas){
  const csv='\ufeff'+linhas.map(l=>l.map(c=>{ let s=c==null?'':(typeof c==='number'?String(c).replace('.',','):String(c)); return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }).join(';')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download=nome; document.body.appendChild(a); a.click(); a.remove();
}
function fillSelect(el, ids, sel){ el.innerHTML=ids.map(id=>`<option value="${id}" ${id===sel?'selected':''}>${CAT[id].curto} (${CAT[id].fonte})</option>`).join(''); }
const idsVisiveis = () => DATA.catalogo.filter(c=>!c.oculta && DATA.series[c.id]).map(c=>c.id);
const tagFonte = c => `<span class="fonte f-${c.fonte}">${c.fonte}</span>`;

// ---------- painel genérico ----------
function novoCard(parent, titulo, desc, extraHead){
  const d=document.createElement('div'); d.className='card';
  d.innerHTML=`<h3>${titulo}</h3><p class="desc">${desc||''}</p>${extraHead||''}<div class="plot"></div><div class="stats"></div>`;
  parent.appendChild(d); return d;
}
function renderPanel(card, spec){
  const plot=card.querySelector('.plot'), statsEl=card.querySelector('.stats');
  const sers=spec.series.filter(s=>has(s.id));
  const x=X(), traces=[], ax={1:{vals:[],unit:null,bars:false,stackTot:null,neg:false},2:{vals:[],unit:null,bars:false,stackTot:null,neg:false}};
  const nLinhas=sers.filter(s=>(s.tipo||'line')==='line').length; let usaY2=false; const linhasStats=[];
  sers.forEach((s,k)=>{
    const rid=resolve(s.id), c=CAT[rid], modo=s.modo||'lvl', y=getVals(s.id,modo);
    if(!y || !valid(y).length) return;
    const eixo=s.eixo||1, tipo=s.tipo||'line', d=casasDe(c,modo), cor=s.cor||PAL[k%PAL.length];
    const A=ax[eixo]; if(eixo===2) usaY2=true; if(!A.unit) A.unit=unitLabel(c,modo);
    const rot=idxRotulos(y,S.rot);
    const nome=nomeF(c)+(modo==='chg12'?' – var. 12m':(modo==='chg1'?' – var. mensal':(modo==='z'?' (z)':(modo==='b100'?' (base 100)':''))));
    const st=stats(y); const yaxis=eixo===2?'y2':'y';
    const hov=`${nome}<br>%{x|%m/%Y}: %{y:.${d}f}<extra></extra>`;
    const txt=y.map((v,i)=>(rot.has(i)&&v!=null)?fmtRot(v,c,modo):'');
    if(tipo==='line'){
      const pos=y.map(()=> s.pos ? s.pos : (nLinhas>1 && k%2 ? 'bottom center' : 'top center'));
      traces.push({type:'scatter', mode:'lines+markers+text', x, y, name:nome, yaxis, connectgaps:false,
        line:{color:cor,width:2.4}, text:txt, textposition:pos, textfont:{size:11,color:cor},
        marker:{color:cor, size:6}, hovertemplate:hov});
      A.vals.push(...y.filter(v=>v!=null));
    } else {
      const dir=(tipo==='bar-dir');
      traces.push({type:'bar', x, y, name:nome, yaxis, text:txt, cliponaxis:false,
        textposition: spec.empilhar?'inside':'outside', insidetextanchor:'middle', constraintext:'none',
        textangle: x.length>14?-90:0, textfont:{size:10}, insidetextfont:{size:10,color:'#fff'},
        marker:{color: dir ? y.map(v=>v==null?'#bbb':(v>0?RED:GREEN)) : cor}, hovertemplate:hov});
      A.bars=true; A.vals.push(...y.filter(v=>v!=null)); if(y.some(v=>v!=null&&v<0)) A.neg=true;
      if(spec.empilhar){ A.stackTot=(A.stackTot||y.map(()=>0)).map((t,i)=>t+(y[i]||0)); }
    }
    if(st){
      const dl = modo==='lvl' ? deltaTxt(y,c) : null;
      linhasStats.push(`<b>${nome}</b>: último ${fmtU(st.last,c,modo)} (${mes(S.ini+st.ilast)})`+(dl?` · desde ${mes(S.ini+st.ifirst)}: ${dl}`:'')+` · mín ${fmtU(st.min,c,modo)} · máx ${fmtU(st.max,c,modo)}`);
    }
  });
  if(!traces.length){
    plot.innerHTML='<div class="vazio">Sem dados para este gráfico no período escolhido (ex.: a série do Banco Central ainda não foi divulgada, não retornou da API, ou a transformação não existe para ela).</div>';
    statsEl.innerHTML=''; return;
  }
  const lay=baseLayout({height:spec.altura||400});
  [1,2].forEach(e=>{
    const A=ax[e]; if(!A.vals.length && e!==1) return; const key=(e===1)?'yaxis':'yaxis2';
    const cfg={title:{text:A.unit||'',font:{size:11}}, gridcolor:'#E5E5E5', zeroline:A.bars||A.neg, zerolinecolor:'#444', showgrid:(e===1), automargin:true};
    if(e===2){ cfg.overlaying='y'; cfg.side='right'; }
    let vals=A.vals.slice(); if(A.stackTot) vals=vals.concat(A.stackTot);
    if(vals.length){
      let mn=Math.min(...vals), mx=Math.max(...vals);
      if(A.bars && mn>=0){ cfg.range=[0, mx*1.16||1]; }
      else { const amp=(mx-mn)||Math.abs(mx)*0.05||1, pad=amp*(A.bars?0.30:0.20); cfg.range=[mn-pad, mx+pad]; }
    }
    lay[key]=cfg;
  });
  if(spec.empilhar) lay.barmode='stack';
  Plotly.newPlot(plot, traces, lay, CFG);
  const faltam=spec.series.filter(s=>!has(s.id)).map(s=>CAT[s.id]?CAT[s.id].curto:s.id);
  statsEl.innerHTML=linhasStats.join('<br>')+(faltam.length?`<div class="nota">Série(s) indisponível(is) nesta execução: ${faltam.join(', ')}.</div>`:'')
    +(usaY2?'<div class="nota">Duas escalas: o eixo esquerdo e o direito têm unidades diferentes.</div>':'');
}
function renderGrid(gridId, specs){
  const g=document.getElementById(gridId); g.innerHTML='';
  specs.forEach(sp=>{
    const card=novoCard(g, sp.titulo, sp.desc, sp.head); if(sp.full) card.style.gridColumn='1/-1';
    if(sp.custom) sp.custom(card); else renderPanel(card, sp);
    if(sp.after) sp.after(card);
  });
}

// ---------- gráficos de barras do PEIC (tipo de dívida) ----------
function valoresTipos(){
  return TIPOS.filter(id=>has(id)).map(id=>{
    const a=arr(id,'lvl'), i0=firstIdx(a), i1=lastIdx(a);
    return {id, nome:CAT[id].curto, ini:i0<0?null:a[i0], fim:i1<0?null:a[i1], i0, i1};
  }).filter(o=>o.fim!=null);
}
function cardTipoUltimo(card){
  const plot=card.querySelector('.plot'), st=card.querySelector('.stats');
  const rows=valoresTipos().sort((a,b)=>b.fim-a.fim);
  if(!rows.length){ plot.innerHTML='<div class="vazio">Sem dados do PEIC no período.</div>'; return; }
  const mx=Math.max(...rows.map(r=>r.fim));
  Plotly.newPlot(plot,[{type:'bar', orientation:'h', y:rows.map(r=>r.nome), x:rows.map(r=>r.fim), marker:{color:BLUE},
    text:rows.map(r=>fmt(r.fim,1)+'%'), textposition:'outside', cliponaxis:false, textfont:{size:11},
    hovertemplate:'%{y}: %{x:.1f}%<extra></extra>'}],
    baseLayout({height:380, hovermode:'closest', showlegend:false, margin:{l:150,r:40,t:10,b:40},
      xaxis:{range:[0,mx*1.15], title:{text:'% das famílias endividadas'}, gridcolor:'#E5E5E5', showline:false},
      yaxis:{autorange:'reversed', automargin:true}}), CFG);
  st.innerHTML=`Dados de <b>${mes(Math.max(...rows.map(r=>r.i1)))}</b>. A soma passa de 100% porque a mesma família pode ter mais de um tipo de dívida.`;
}
function cardTipoVar(card){
  const plot=card.querySelector('.plot'), st=card.querySelector('.stats');
  const rows=valoresTipos().filter(r=>r.ini!=null && r.i1>r.i0).map(r=>({...r, d:r.fim-r.ini})).sort((a,b)=>b.d-a.d);
  if(!rows.length){ plot.innerHTML='<div class="vazio">Escolha um período com pelo menos 2 meses de PEIC.</div>'; st.innerHTML=''; return; }
  const m=Math.max(...rows.map(r=>Math.abs(r.d)),0.1);
  Plotly.newPlot(plot,[{type:'bar', orientation:'h', y:rows.map(r=>r.nome), x:rows.map(r=>r.d),
    marker:{color:rows.map(r=>r.d>0?RED:(r.d<0?GREEN:'#bbb'))}, text:rows.map(r=>fmt(r.d,1,true)+' p.p.'),
    textposition:'outside', cliponaxis:false, textfont:{size:11}, hovertemplate:'%{y}: %{x:+.1f} p.p.<extra></extra>'}],
    baseLayout({height:380, hovermode:'closest', showlegend:false, margin:{l:150,r:50,t:10,b:40},
      xaxis:{range:[-m*1.35,m*1.35], title:{text:'mudança em pontos percentuais (p.p.)'}, gridcolor:'#E5E5E5', zeroline:true, zerolinecolor:'#444'},
      yaxis:{autorange:'reversed', automargin:true}}), CFG);
  const ini=Math.min(...rows.map(r=>r.i0)), fim=Math.max(...rows.map(r=>r.i1));
  st.innerHTML=`Diferença entre <b>${mes(ini)}</b> e <b>${mes(fim)}</b>. Vermelho = aumentou · verde = diminuiu.`;
}

// ---------- ABA: visão geral ----------
const KPI_PEIC=['p_endiv','p_atraso','p_sem_cond','p_renda'], KPI_BCB=['29037','29265','21084','4189'];
function kpiHtml(ids){
  return ids.filter(has).map(id=>{
    const r=resolve(id), c=CAT[r], s=DATA.series[r], il=lastIdx(s.lvl); if(il<0) return '';
    const i0=firstIdx(s.lvl), st=stats(win(id,'lvl'));
    const d1=s.chg1[il]; const dper=(i0>=0&&i0<il)? (c.tipo==='val'?(s.lvl[il]/s.lvl[i0]-1)*100:s.lvl[il]-s.lvl[i0]) : null;
    const cls=v=>v==null?'neutro':(v>0?'up':(v<0?'down':'neutro')), ar=v=>v==null?'':(v>0?'▲':(v<0?'▼':'■'));
    const lin=(v,txt)=> v==null ? '' : `<div class="delta ${cls(v)}">${ar(v)} ${fmt(v,casasDe(c,'chg1'),true)}${sufVar(c)} ${txt}</div>`;
    return `<div class="kpi"><div class="nome">${c.curto}</div><div class="valor">${fmtU(s.lvl[il],c,'lvl')}</div><div class="data">${mesLongo(il)}</div>
      ${lin(d1,'no mês')}${lin(dper,'desde '+mes(i0))}
      <div class="rng">No período: mín ${fmtU(st.min,c,'lvl')} · máx ${fmtU(st.max,c,'lvl')}</div></div>`;
  }).join('');
}
function renderKPIs(){ $('#kpisPeic').innerHTML=kpiHtml(KPI_PEIC); $('#kpisBcb').innerHTML=kpiHtml(KPI_BCB); }
function renderLeitura(){
  const el=$('#leitura'); const itens=[];
  ['p_endiv','p_atraso','p_sem_cond','p_renda','p_dias_atraso'].filter(has).forEach(id=>{
    const c=CAT[id], s=DATA.series[id], il=lastIdx(s.lvl); if(il<0) return; const y=win(id,'lvl'), st=stats(y);
    let pos=''; if(st.n>2){ if(st.ilast===st.imax) pos=' É o <b>maior valor</b> do período.'; else if(st.ilast===st.imin) pos=' É o <b>menor valor</b> do período.'; }
    const dl=deltaTxt(y,c);
    itens.push(`<li><b>${c.curto}</b>: ${fmtU(s.lvl[il],c,'lvl')} em ${mesLongo(il)}.${pos}${dl&&st.ifirst<st.ilast?` Desde ${mes(S.ini+st.ifirst)}: <b>${dl}</b> (de ${fmtU(st.first,c,'lvl')}).`:''}</li>`);
  });
  el.innerHTML=`<h3>Leitura rápida do período (${mes(S.ini)} a ${mes(S.fim)})</h3><ul>${itens.join('')}</ul>
    <div class="nota" style="color:#999;font-size:11px;margin-top:6px">Texto gerado automaticamente a partir dos dados. Para entender cada indicador, veja a aba “Entenda os dados”.</div>`;
}
function specsGeral(){ return [
  {titulo:'Quantas famílias estão endividadas, em atraso ou sem condição de pagar?', full:true, altura:430,
   desc:'Cada linha é um percentual do total de famílias. Endividada = tem alguma dívida; em atraso = tem conta atrasada; sem condição = diz que não vai conseguir quitar o atraso.',
   series:[{id:'p_endiv'},{id:'p_atraso'},{id:'p_sem_cond'}]},
  {titulo:'Quanto da renda vai para pagar dívidas?', desc:'De cada R$ 100 de renda, quanto as famílias dizem comprometer com dívidas.', series:[{id:'p_renda'}]},
  {titulo:'Há quanto tempo as dívidas pesam?', desc:'Dias de atraso das contas atrasadas (eixo esquerdo) e meses de comprometimento com a dívida (eixo direito).',
   series:[{id:'p_dias_atraso'},{id:'p_meses_comp',eixo:2}]},
  {titulo:'Que tipo de dívida as famílias têm?', desc:'Entre as famílias endividadas, quantas têm cada tipo de dívida (último mês do período).', custom:cardTipoUltimo},
  {titulo:'Quais tipos de dívida mais mudaram?', desc:'Quanto cada tipo ganhou ou perdeu espaço entre o primeiro e o último mês do período.', custom:cardTipoVar},
];}

// ---------- ABA: entenda os dados ----------
function renderGuia(){
  const g={}; DATA.catalogo.filter(c=>!c.oculta && DATA.series[c.id]).forEach(c=>{ (g[c.grupo]=g[c.grupo]||[]).push(c); });
  $('#guiaSeries').innerHTML=Object.entries(g).map(([nome,cs])=>`<details ${nome.startsWith('PEIC')?'open':''}><summary>${nome}</summary><div class="gcards">`+
    cs.map(c=>{ const s=DATA.series[c.id], il=lastNonNull(s.lvl);
      return `<div class="gcard"><div class="gt">${c.curto}<span class="chip">${c.unidade}</span></div><p>${c.simples||c.descricao}</p>`+
        (c.leia?`<p class="leia"><b>Como ler:</b> ${c.leia}</p>`:'')+
        `<p class="ult">Último dado: <b>${fmtU(s.lvl[il],c,'lvl')}</b> (${mesLongo(il)})</p></div>`; }).join('')+`</div></details>`).join('');
}

// ---------- ABA: PEIC × Banco Central ----------
function specsCausas(){ return [
  {titulo:'Famílias endividadas (PEIC) × endividamento medido pelo BCB',
   desc:'Esquerda: % das famílias que têm dívida (PEIC). Direita: dívida das famílias em % da renda de 12 meses (BCB). Se sobem juntas, mais famílias endividadas veio com dívida maior em relação à renda.',
   series:[{id:'p_endiv'},{id:'29037',eixo:2}]},
  {titulo:'Renda comprometida: PEIC × BCB',
   desc:'As duas linhas medem “quanto da renda vai para dívidas”, cada uma com seu método (mesma escala). O nível pode diferir; compare a direção.',
   series:[{id:'p_renda'},{id:'29265'}]},
  {titulo:'Famílias com dívida em atraso (PEIC) × inadimplência (BCB)',
   desc:'Esquerda: % das famílias com atraso (PEIC). Direita: % da carteira de crédito com atraso acima de 90 dias (BCB). Mostram o mesmo problema por dois ângulos.',
   series:[{id:'p_atraso'},{id:'21084',eixo:2}]},
  {titulo:'Sem condição de pagar (PEIC) × comprometimento da renda (BCB)',
   desc:'Esquerda: famílias que dizem não conseguir quitar o atraso. Direita: renda comprometida com parcelas (BCB). Pergunta: o peso das parcelas antecede o “não vou conseguir pagar”?',
   series:[{id:'p_sem_cond'},{id:'29265',eixo:2}]},
  {titulo:'Famílias endividadas (PEIC) × Selic',
   desc:'Esquerda: % de famílias endividadas. Direita: Selic efetiva. Pergunta: juros altos reduzem ou aumentam o número de endividados (e depois de quanto tempo)?',
   series:[{id:'p_endiv'},{id:'4189',eixo:2}]},
  {titulo:'Crédito pessoal e consignado (PEIC) × juros médios do crédito (BCB)',
   desc:'Esquerda: % dos endividados com crédito pessoal e consignado. Direita: juros médios do crédito PF (% ao mês).',
   series:[{id:'p_pessoal'},{id:'p_consig'},{id:'25435',eixo:2}]},
  {titulo:'Famílias endividadas (PEIC) × crédito novo concedido (BCB)',
   desc:'Esquerda: % de famílias endividadas. Direita: crédito novo concedido às famílias nos últimos 12 meses. Pergunta: mais crédito novo vem antes de mais endividados?',
   series:[{id:'p_endiv'},{id:'d_conc_12m',eixo:2}]},
  {titulo:'Famílias endividadas (PEIC) × desemprego',
   desc:'Esquerda: % de famílias endividadas. Direita: taxa de desocupação (IBGE, via BCB). Sem trabalho, a renda cai e pagar dívidas fica mais difícil. (Código opcional: confira se a série carregou.)',
   series:[{id:'p_endiv'},{id:'24369',eixo:2}]},
  {titulo:'Contexto: Selic, inflação e juro real (BCB)',
   desc:'Selic efetiva, inflação dos últimos 12 meses e o juro real (Selic descontada a inflação). Juro real alto encarece a dívida.',
   series:[{id:'4189'},{id:'d_ipca12'},{id:'d_juro_real'}]},
];}

// ---------- ABA: explorador ----------
function buildChecks(el, set, onChange){
  const g={}; DATA.catalogo.filter(c=>!c.oculta&&DATA.series[c.id]).forEach(c=>{ (g[c.grupo]=g[c.grupo]||[]).push(c); });
  el.innerHTML=Object.entries(g).map(([nome,cs])=>`<fieldset><legend>${nome}</legend>${cs.map(c=>`<label><input type="checkbox" value="${c.id}" ${set.has(c.id)?'checked':''}> ${c.curto}</label>`).join('')}</fieldset>`).join('');
  el.querySelectorAll('input').forEach(i=>i.addEventListener('change',()=>{ if(i.checked){ set.add(i.value); } else { set.delete(i.value); } onChange(); }));
}
function renderExplorar(){
  const ids=[...S.expSel].filter(has), modo=S.expModo; $('#expAviso').innerHTML='';
  if(!ids.length){ $('#gridExp').innerHTML='<div class="card vazio">Selecione ao menos uma série.</div>'; return; }
  const chg=(modo==='chg12'||modo==='chg1');
  let specs;
  const painel = ()=>ids.map(id=>({titulo:CAT[resolve(id)].nome+' '+tagFonte(CAT[resolve(id)]), desc:CAT[resolve(id)].simples||CAT[resolve(id)].descricao, series:[{id, modo, tipo:chg?'bar-dir':'line'}], altura:340}));
  if(S.expLay==='paineis') specs=painel();
  else {
    const unidades=[...new Set(ids.map(id=>unitLabel(CAT[resolve(id)],modo)))];
    if((modo==='z'||modo==='b100') || unidades.length<=2){
      specs=[{titulo:'Comparação das séries selecionadas', desc:(modo==='z'||modo==='b100')?'Séries na mesma escala (padronizadas): compare formato e momento das viradas.':'Até duas unidades diferentes: a segunda unidade usa o eixo da direita.', full:true, altura:480,
        series:ids.map((id,k)=>({id, modo, eixo:(modo==='z'||modo==='b100'||unidades.indexOf(unitLabel(CAT[resolve(id)],modo))===0)?1:2}))}];
    } else { $('#expAviso').innerHTML='<div class="aviso">A seleção tem mais de duas unidades diferentes; exibindo um painel por série. Use “Padronizado (z-score)” para sobrepor.</div>'; specs=painel(); }
  }
  renderGrid('gridExp', specs);
}

// ---------- ABA: correlações ----------
function destaquesCruzados(ids, modo){
  const rows=[];
  ids.forEach((a,i)=>ids.forEach((b,j)=>{
    if(j<=i) return; const ca=CAT[resolve(a)], cb=CAT[resolve(b)]; if(ca.fonte===cb.fonte) return;
    const A=win(a,modo), B=win(b,modo), xs=[], ys=[];
    A.forEach((v,k)=>{ if(v!=null&&B[k]!=null){ xs.push(v); ys.push(B[k]); } });
    const p=pearson(xs,ys); if(p.r!=null && p.n>=MIN_PARES) rows.push({ca,cb,r:p.r,n:p.n});
  }));
  rows.sort((p,q)=>Math.abs(q.r)-Math.abs(p.r)); return rows.slice(0,8);
}
function renderCorr(){
  const ids=[...S.corrSel].filter(has), modo=S.corrBase;
  // destaques PEIC × BCB
  const top=destaquesCruzados(ids,modo);
  $('#corrTop').innerHTML = top.length ? '<div class="scroll"><table class="t"><thead><tr><th>Indicador PEIC</th><th style="text-align:left">Indicador Banco Central</th><th>r</th><th>Meses</th><th style="text-align:left">Leitura simples</th></tr></thead><tbody>'+
    top.map(o=>{ const p=o.ca.fonte==='PEIC'?o.ca:o.cb, b=o.ca.fonte==='PEIC'?o.cb:o.ca;
      return `<tr><td>${p.curto}</td><td style="text-align:left">${b.curto}</td><td>${fmt(o.r,2)}</td><td>${o.n}</td><td style="text-align:left">${forca(o.r)}</td></tr>`; }).join('')+'</tbody></table></div>'
    : '<div class="vazio">Sem pares PEIC × BCB com pelo menos '+MIN_PARES+' meses em comum. Selecione séries das duas fontes e/ou amplie o período.</div>';
  if(ids.length<2){ $('#corrHeat').innerHTML='<div class="vazio">Selecione ao menos duas séries.</div>'; }
  else {
    const A=ids.map(id=>win(id,modo)); const names=ids.map(id=>nomeF(CAT[resolve(id)]));
    const z=[], t=[], cd=[];
    ids.forEach((a,i)=>{ const row=[], tr=[], cr=[]; ids.forEach((b,j)=>{
      const xs=[], ys=[]; for(let k=0;k<A[i].length;k++){ if(A[i][k]!=null&&A[j][k]!=null){ xs.push(A[i][k]); ys.push(A[j][k]); } }
      const p=pearson(xs,ys); row.push(p.r); tr.push(p.r==null?'':fmt(p.r,2)); cr.push(p.n); }); z.push(row); t.push(tr); cd.push(cr); });
    Plotly.newPlot('corrHeat',[{type:'heatmap', z, x:names, y:names, text:t, customdata:cd, texttemplate:'%{text}', zmin:-1, zmax:1, colorscale:'RdBu',
      hovertemplate:'%{y}<br>× %{x}<br>r = %{text} (n = %{customdata})<extra></extra>', colorbar:{title:{text:'r'}}, xgap:1, ygap:1}],
      {font:{family:'Segoe UI, Arial', size:11}, margin:{l:250,r:30,t:10,b:195}, height:Math.max(420,170+ids.length*34), separators:',.',
       xaxis:{tickangle:-40, side:'bottom'}, yaxis:{autorange:'reversed'}}, CFG);
  }
  // defasagens
  const vis=idsVisiveis(); fillSelect($('#lagX'),vis,S.lagX); fillSelect($('#lagY'),vis,S.lagY);
  if(!S.lagX||!S.lagY||!has(S.lagX)||!has(S.lagY)){ $('#lagBar').innerHTML='<div class="vazio">Séries indisponíveis.</div>'; return; }
  const xa=arr(S.lagX,modo), ya=arr(S.lagY,modo), M=S.lagMax, rs=[];
  for(let k=-M;k<=M;k++){ const p=pares(xa,ya,k); const q=pearson(p.xs,p.ys); rs.push({k, r:q.r, n:q.n}); }
  const ok=rs.filter(o=>o.r!=null&&o.n>=MIN_PARES); let best=null; ok.forEach(o=>{ if(!best||Math.abs(o.r)>Math.abs(best.r)) best=o; });
  if(S.lagK===null && best) S.lagK=best.k; $('#lagK').value=(S.lagK==null)?0:S.lagK; $('#lagMax').value=M;
  const cores=rs.map(o=>(best&&o.k===best.k)?'#F2A900':(o.r!=null&&o.r<0?RED:BLUE));
  Plotly.newPlot('lagBar',[{type:'bar', x:rs.map(o=>o.k), y:rs.map(o=>o.r), marker:{color:cores}, text:rs.map(o=>o.r==null?'':fmt(o.r,2)), textposition:'outside', cliponaxis:false,
    textfont:{size:10}, customdata:rs.map(o=>o.n), hovertemplate:'k = %{x} meses<br>r = %{y:.3f} (n = %{customdata})<extra></extra>'}],
    baseLayout({height:380, hovermode:'closest', margin:{l:55,r:20,t:20,b:60}, xaxis:{title:{text:'Defasagem k (meses) — k > 0: X antecede Y'}, dtick:1, zeroline:true, zerolinecolor:'#444'}, yaxis:{range:[-1.15,1.15], title:{text:'correlação (r)'}, gridcolor:'#E5E5E5', zeroline:true, zerolinecolor:'#444'}}), CFG);
  $('#lagStats').innerHTML = best ? `Maior |r| em <b>k = ${best.k}</b> meses: r = <b>${fmt(best.r,3)}</b> (n = ${best.n}) — relação ${forca(best.r)}. `+
    (best.k>0?`<b>${nomeDe(S.lagX)}</b> de ${best.k} meses atrás se associa mais a <b>${nomeDe(S.lagY)}</b> de hoje.`:(best.k<0?`<b>${nomeDe(S.lagY)}</b> antecede <b>${nomeDe(S.lagX)}</b> em ${-best.k} meses (sentido inverso ao esperado para “X causa Y”).`:'A associação é mais forte sem defasagem.'))
    + ` <span style="color:#999">Com poucos meses, mesmo r alto pode ser coincidência.</span>` : `Dados insuficientes (mín. ${MIN_PARES} pares).`;
  // dispersão
  const k=(S.lagK==null)?0:S.lagK, p=pares(xa,ya,k), q=pearson(p.xs,p.ys);
  const cX=CAT[resolve(S.lagX)], cY=CAT[resolve(S.lagY)];
  $('#lagScDesc').textContent=`Cada ponto é um mês: eixo X = ${nomeDe(S.lagX)} defasado em k = ${k} meses; eixo Y = ${nomeDe(S.lagY)}. Base: ${modo==='chg12'?'variação em 12 meses':(modo==='lvl'?'nível':'variação mensal')}.`;
  if(q.r==null){ $('#lagScatter').innerHTML='<div class="vazio">Dados insuficientes.</div>'; $('#lagScStats').innerHTML=''; return; }
  const slope=q.sxy/q.sxx, inter=q.my-slope*q.mx, xmin=Math.min(...p.xs), xmax=Math.max(...p.xs);
  const txt=p.idx.map((i,j)=> S.rot==='nenhum' ? '' : ((S.rot==='todos'||p.idx.length<=14||j===0||j===p.idx.length-1) ? mes(i) : ''));
  Plotly.newPlot('lagScatter',[
    {type:'scatter', mode:'markers+text', x:p.xs, y:p.ys, text:txt, textposition:'top center', textfont:{size:9,color:'#555'},
     marker:{color:p.idx.map((i,j)=>j/(p.idx.length-1||1)), colorscale:[[0,'#B8C7D9'],[1,BLUE]], size:8, line:{width:.5,color:'#fff'}}, name:'meses',
     hovertemplate:p.idx.map(i=>mes(i)+'<br>X = %{x:.2f}<br>Y = %{y:.2f}<extra></extra>')},
    {type:'scatter', mode:'lines', x:[xmin,xmax], y:[inter+slope*xmin, inter+slope*xmax], line:{color:ORANGE,width:2.5,dash:'dash'}, name:'regressão OLS', hoverinfo:'skip'}],
    baseLayout({height:380, hovermode:'closest', margin:{l:60,r:20,t:20,b:60}, showlegend:false,
      xaxis:{title:{text:`${nomeDe(S.lagX)} (t−${k}) — ${unitLabel(cX,modo)}`}, gridcolor:'#E5E5E5', zeroline:false, showline:true},
      yaxis:{title:{text:`${nomeDe(S.lagY)} — ${unitLabel(cY,modo)}`}, gridcolor:'#E5E5E5', zeroline:false}}), CFG);
  $('#lagScStats').innerHTML=`r = <b>${fmt(q.r,3)}</b> · R² = <b>${fmt(q.r*q.r,3)}</b> · inclinação = ${fmt(slope,3)} · intercepto = ${fmt(inter,3)} · n = ${q.n}. Cor dos pontos: do mais antigo (claro) ao mais recente (escuro). Regressão simples, sem controle de outras variáveis.`;
}

// ---------- ABA: sazonalidade ----------
function renderSaz(){
  if(!S.sazSerie||!has(S.sazSerie)){ $('#sazHeat').innerHTML='<div class="vazio">Série indisponível.</div>'; return; }
  const sel=S.sazSerie, c=CAT[resolve(sel)], a=arr(sel,'lvl'); const anos=[...new Set(DATA.datas.slice(S.ini,S.fim+1).map(d=>+d.slice(0,4)))];
  const M={}; for(let i=S.ini;i<=S.fim;i++){ const y=+DATA.datas[i].slice(0,4), m=+DATA.datas[i].slice(5,7)-1; if(!M[y]) M[y]=Array(12).fill(null); M[y][m]=a[i]; }
  const completos=anos.filter(y=>M[y].every(v=>v!=null)); const mediaAno={}; completos.forEach(y=>{ mediaAno[y]=M[y].reduce((p,q)=>p+q,0)/12; });
  const desvio=(S.sazModo==='desvio');
  const z=anos.map(y=>M[y].map(v=>{
    if(!desvio) return v;
    if(v==null || !completos.includes(y)) return null;
    return v-mediaAno[y];
  }));
  const t=z.map(r=>r.map(v=>v==null?'':fmt(v,desvio?2:c.casas,desvio)));
  $('#sazDesc1').textContent=desvio?'Valor do mês menos a média do ano; só anos completos (12 meses) no período filtrado. Vermelho = acima da média do ano · azul = abaixo da média do ano.':'Valor da série em cada mês/ano do período filtrado. Cores mais escuras = valores mais altos.';
  if(desvio && !completos.length){ $('#sazHeat').innerHTML='<div class="vazio">Nenhum ano completo no período filtrado. Amplie o período (botão “5 anos” ou “Tudo”).</div>'; $('#sazBar').innerHTML=''; $('#sazStats').innerHTML=''; return; }
  Plotly.newPlot('sazHeat',[{type:'heatmap', z, x:MESES, y:anos.map(String), text:t, texttemplate:'%{text}', colorscale:desvio?'RdBu':'Blues', zmid:desvio?0:undefined, xgap:1, ygap:1,
    hovertemplate:'%{y} · %{x}: %{text}<extra></extra>', colorbar:{title:{text:desvio?'desvio':c.unidade}}}],
    {font:{family:'Segoe UI, Arial',size:11}, margin:{l:50,r:20,t:46,b:20}, height:Math.max(320,110+anos.length*46), yaxis:{autorange:'reversed',type:'category'}, xaxis:{side:'top'}, separators:',.'}, CFG);
  if(!completos.length){ $('#sazBar').innerHTML='<div class="vazio">O perfil sazonal exige ao menos um ano completo no período filtrado.</div>'; $('#sazStats').innerHTML=''; return; }
  const med=MESES.map((_,m)=>completos.reduce((p,y)=>p+(M[y][m]-mediaAno[y]),0)/completos.length);
  Plotly.newPlot('sazBar',[{type:'bar', x:MESES, y:med, marker:{color:med.map(v=>v>0?RED:BLUE)}, text:med.map(v=>fmt(v,2,true)), textposition:'outside', cliponaxis:false, textfont:{size:10}, hovertemplate:'%{x}: %{y:.2f}<extra></extra>'}],
    baseLayout({height:340, hovermode:'closest', margin:{l:55,r:20,t:20,b:40}, xaxis:{showgrid:false}, yaxis:{title:{text:'desvio médio vs. média do ano'}, gridcolor:'#E5E5E5', zeroline:true, zerolinecolor:'#444', range:[Math.min(...med)*1.4-0.1, Math.max(...med)*1.4+0.1]}}), CFG);
  const iM=med.indexOf(Math.max(...med)), im=med.indexOf(Math.min(...med));
  $('#sazStats').innerHTML=`Anos completos usados: ${completos.join(', ')}. Mês típico mais alto: <b>${MESES[iM]}</b> (${fmt(med[iM],2,true)}); mais baixo: <b>${MESES[im]}</b> (${fmt(med[im],2,true)}). Amplitude sazonal: ${fmt(med[iM]-med[im],2)}.`;
}

// ---------- ABA: dados ----------
function statRows(){
  return idsVisiveis().map(id=>{ const r=resolve(id), c=CAT[r], st=stats(win(id,'lvl')); if(!st) return null; const il=S.ini+st.ilast;
    return {id:r, fonte:c.fonte, serie:c.curto, unid:c.unidade, n:st.n, media:st.mean, mediana:st.median, dp:st.sd, min:st.min, mesMin:mes(S.ini+st.imin), max:st.max, mesMax:mes(S.ini+st.imax),
      p25:st.p25, p75:st.p75, ultimo:st.last, mesUlt:mes(il), pct:st.pct, v1:DATA.series[r].chg1[il], v12:DATA.series[r].chg12[il], uvar:c.uvar, casas:c.casas}; }).filter(Boolean);
}
const COLS=[['fonte','Fonte'],['serie','Série'],['unid','Unidade'],['n','N'],['media','Média'],['mediana','Mediana'],['dp','Desv.-padrão'],['min','Mín'],['mesMin','Mês mín'],['max','Máx'],['mesMax','Mês máx'],
  ['p25','P25'],['p75','P75'],['ultimo','Último'],['mesUlt','Mês último'],['pct','Percentil do último'],['v1','Var. mensal'],['v12','Var. 12m'],['uvar','Unid. var.']];
function renderDados(){
  let rows=statRows(); const so=S.statSort; if(so.col){ rows.sort((a,b)=>{ const x=a[so.col], y=b[so.col]; if(typeof x==='number') return (so.asc?1:-1)*((x??-1e99)-(y??-1e99)); return (so.asc?1:-1)*String(x).localeCompare(String(y)); }); }
  const f=(r,k)=>{ const v=r[k]; if(v==null) return '–'; if(typeof v!=='number') return v; if(k==='n') return v; if(k==='pct') return fmt(v,0); if(k==='v1'||k==='v12') return fmt(v,2,true); return fmt(v,r.casas); };
  $('#tabStats').innerHTML='<thead><tr>'+COLS.map(([k,n])=>`<th data-k="${k}">${n}${so.col===k?(so.asc?' ▲':' ▼'):''}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+COLS.map(([k])=>`<td>${f(r,k)}</td>`).join('')+'</tr>').join('')+'</tbody>';
  $('#tabStats').querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{ const k=th.dataset.k; S.statSort={col:k, asc:S.statSort.col===k?!S.statSort.asc:true}; renderDados(); }));
  $('#csvStats').onclick=()=>baixarCSV('estatisticas_endividamento.csv',[COLS.map(c=>c[1])].concat(rows.map(r=>COLS.map(([k])=>r[k]==null?'':(typeof r[k]==='number'?+r[k].toFixed(4):r[k])))));
  // dados mensais
  const ids=idsVisiveis().filter(has), modo=S.dadosModo; const head=['Mês'].concat(ids.map(id=>nomeF(CAT[resolve(id)]))); const body=[];
  for(let i=S.fim;i>=S.ini;i--){ body.push([mesLongo(i)].concat(ids.map(id=>{ const v=arr(id,modo)[i]; return v==null?null:v; }))); }
  $('#tabDados').innerHTML='<thead><tr>'+head.map(h=>`<th>${h}</th>`).join('')+'</tr></thead><tbody>'+body.map(r=>'<tr>'+r.map((v,j)=>`<td>${j===0?v:(v==null?'–':fmt(v,CAT[resolve(ids[j-1])].casas,modo!=='lvl'))}</td>`).join('')+'</tr>').join('')+'</tbody>';
  $('#csvDados').onclick=()=>baixarCSV('dados_endividamento_'+modo+'.csv',[head].concat(body));
  // catálogo
  $('#tabCat').innerHTML='<thead><tr><th>Código</th><th>Fonte</th><th>Série</th><th>Unidade</th><th>Grupo</th><th>Descrição</th><th>Última obs.</th><th>Status</th></tr></thead><tbody>'+
    DATA.catalogo.map(c=>`<tr><td>${c.derivada?'derivada':(c.fonte==='PEIC'?'PEIC':c.id)}${(!c.verificada)?'<span class="badge">conferir código</span>':''}</td><td>${c.fonte}</td><td style="text-align:left">${c.nome}</td><td>${c.unidade}</td><td>${c.grupo}</td><td style="text-align:left;white-space:normal;min-width:340px">${c.descricao}</td><td>${c.ultima?c.ultima.slice(5)+'/'+c.ultima.slice(0,4):'–'}</td><td>${c.ok?'carregada':c.status}</td></tr>`).join('')+'</tbody>';
}

// ---------- controle ----------
function render(){
  $('#fInfo').textContent=`${S.fim-S.ini+1} meses · ${mesLongo(S.ini)} a ${mesLongo(S.fim)}${S.sa?' · comprometimento BCB com ajuste sazonal':''}`;
  const t=S.tab;
  if(t==='geral'){ renderKPIs(); renderLeitura(); renderGrid('gridGeral', specsGeral()); }
  else if(t==='guia') renderGuia();
  else if(t==='causas') renderGrid('gridCausas', specsCausas());
  else if(t==='explorar') renderExplorar();
  else if(t==='corr') renderCorr();
  else if(t==='saz') renderSaz();
  else if(t==='dados') renderDados();
}
function init(){
  const ultPeic = mesLongo(IDX_PEIC_FIM), ultBcb = DATA.series['29037'] ? mesLongo(FIM_BCB) : '—';
  $('#subtitulo').textContent=`Fonte principal: PEIC/CNC (${mesLongo(IDX_PEIC_INI)} a ${ultPeic}) · Contexto: Banco Central – SGS (endividamento até ${ultBcb}) · gerado em ${DATA.meta.gerado}`;
  const opts=DATA.datas.map((d,i)=>`<option value="${i}">${mesLongo(i)}</option>`).join('');
  $('#fIni').innerHTML=opts; $('#fFim').innerHTML=opts; $('#fIni').value=S.ini; $('#fFim').value=S.fim;
  $('#fIni').onchange=e=>{ S.ini=+e.target.value; if(S.ini>S.fim){ S.fim=S.ini; $('#fFim').value=S.fim; } render(); };
  $('#fFim').onchange=e=>{ S.fim=+e.target.value; if(S.fim<S.ini){ S.ini=S.fim; $('#fIni').value=S.ini; } render(); };
  $('#qbtns').querySelectorAll('button').forEach(b=>{ b.onclick=()=>{ const q=b.dataset.q;
    if(q==='peic'){ S.ini=IDX_PEIC_INI; S.fim=IDX_PEIC_FIM; }
    else { S.fim=N-1; S.ini=(q==='tudo')?0:((q==='padrao')?Math.max(0,N-1-DATA.meta.anos_analise*12+1):Math.max(0,N-(+q))); }
    $('#fIni').value=S.ini; $('#fFim').value=S.fim; render(); }; });
  $('#fSa').onchange=e=>{ S.sa=(e.target.value==='1'); render(); };
  $('#fRot').onchange=e=>{ S.rot=e.target.value; render(); };
  $('#tabs').querySelectorAll('button').forEach(b=>{ b.onclick=()=>{ S.tab=b.dataset.tab;
    $('#tabs').querySelectorAll('button').forEach(x=>x.classList.toggle('ativo',x===b));
    document.querySelectorAll('section.tab').forEach(s=>s.classList.toggle('ativo',s.id==='tab-'+S.tab)); render(); }; });
  // explorador
  buildChecks($('#expChecks'), S.expSel, render);
  $('#expModo').onchange=e=>{ S.expModo=e.target.value; render(); }; $('#expLay').onchange=e=>{ S.expLay=e.target.value; render(); };
  $('#expTodas').onclick=()=>{ idsVisiveis().forEach(id=>S.expSel.add(id)); buildChecks($('#expChecks'),S.expSel,render); render(); };
  $('#expNenhuma').onclick=()=>{ S.expSel.clear(); buildChecks($('#expChecks'),S.expSel,render); render(); };
  // correlações
  buildChecks($('#corrChecks'), S.corrSel, render);
  $('#corrBase').onchange=e=>{ S.corrBase=e.target.value; S.lagK=null; render(); };
  $('#corrTodas').onclick=()=>{ idsVisiveis().forEach(id=>S.corrSel.add(id)); buildChecks($('#corrChecks'),S.corrSel,render); render(); };
  $('#corrNenhuma').onclick=()=>{ S.corrSel.clear(); buildChecks($('#corrChecks'),S.corrSel,render); render(); };
  $('#lagX').onchange=e=>{ S.lagX=e.target.value; S.lagK=null; render(); }; $('#lagY').onchange=e=>{ S.lagY=e.target.value; S.lagK=null; render(); };
  $('#lagMax').onchange=e=>{ S.lagMax=Math.max(1,Math.min(24,+e.target.value||6)); S.lagK=null; render(); };
  $('#lagK').onchange=e=>{ S.lagK=+e.target.value||0; render(); }; $('#lagAuto').onclick=()=>{ S.lagK=null; render(); };
  // sazonalidade e dados
  fillSelect($('#sazSerie'), idsVisiveis().filter(id=>CAT[id].fonte==='BCB'), S.sazSerie); $('#sazSerie').onchange=e=>{ S.sazSerie=e.target.value; render(); };
  $('#sazModo').onchange=e=>{ S.sazModo=e.target.value; render(); }; $('#dadosModo').onchange=e=>{ S.dadosModo=e.target.value; render(); };
  window.addEventListener('resize', ()=>{ document.querySelectorAll('.js-plotly-plot').forEach(p=>{ try{ Plotly.Plots.resize(p); }catch(e){} }); });
  render();
}
init();
})();
</script>
</body>
</html>
"""


# ============================================================
# PRINCIPAL
# ============================================================
def main() -> None:
    hoje = date.today()
    ini_janela, fim_janela = PEIC_MESES[0], PEIC_FIM          # janela de análise = período coberto pelo PEIC
    data_ini = hoje - relativedelta(years=ANOS_ANALISE + ANOS_BUFFER)
    data_ini = min(data_ini, ini_janela - relativedelta(years=1))  # garante 12 meses de histórico antes do PEIC

    secao("1) EXTRAÇÃO: PEIC (embutido no script) + BANCO CENTRAL (SGS)")
    print(f"PEIC: {mm_aaaa(ini_janela)} a {mm_aaaa(fim_janela)} ({len(PEIC_MESES)} meses, {len(PEIC_DADOS)} indicadores)")
    print(f"BCB : dataInicial = {data_ini:%d/%m/%Y} | dataFinal = {hoje:%d/%m/%Y} "
          f"(janela de análise = período do PEIC; o histórico extra serve para variações de 12 meses e defasagens)")
    series, log_df = extrair_todas(data_ini, hoje)
    if len(series) == len(PEIC_DADOS):
        print("\nATENÇÃO: nenhuma série do BCB foi extraída (rede/proxy?). O dashboard terá só os dados do PEIC.")

    secao("2) LOG DA EXTRAÇÃO")
    print(log_df)
    nao_conf = [c["id"] for c in CATALOGO if not c["verificada"] and c["id"] in series]
    if nao_conf:
        print(f"\nATENÇÃO: séries carregadas cujo código não foi conferido no catálogo do BCB: {nao_conf}. "
              "Confira nome, unidade e ordem de grandeza na tabela de qualidade abaixo.")

    base = montar_base(series)
    var12, var1 = variacoes(base, 12), variacoes(base, 1)

    def jan(df: pl.DataFrame) -> pl.DataFrame:
        return df.filter((pl.col("data") >= ini_janela) & (pl.col("data") <= fim_janela))

    janela, janela12, janela1 = jan(base), jan(var12), jan(var1)
    ids_ok = [c for c in base.columns if c != "data" and janela[c].null_count() < janela.height]

    secao(f"3) QUALIDADE DOS DADOS (janela {mm_aaaa(ini_janela)} a {mm_aaaa(fim_janela)})")
    qual = []
    for c in ids_ok:
        sub = janela.select("data", c)
        v = sub[c].drop_nulls()
        qual.append({"id": c, "fonte": CAT[c]["fonte"], "serie": CAT[c]["curto"], "unidade": CAT[c]["unidade"],
                     "meses_com_dado": v.len(), "meses_sem_dado": sub.height - v.len(),
                     "primeira": mm_aaaa(sub.drop_nulls()["data"].min()), "ultima": mm_aaaa(sub.drop_nulls()["data"].max()),
                     "minimo": v.min(), "mediana": v.median(), "maximo": v.max()})
    qual_df = pl.DataFrame(qual).with_columns(pl.col(pl.Float64).round(3))
    print(qual_df)
    dup = base.group_by("data").len().filter(pl.col("len") > 1)
    print("\nDatas duplicadas na base mensal:", "nenhuma" if dup.is_empty() else dup)

    grupos: dict[str, list[str]] = {}
    for c in ids_ok:
        grupos.setdefault(CAT[c]["grupo"], []).append(c)
    ordem = [g for g in GRUPOS_ORDEM if g in grupos]

    def imprimir_por_grupo(titulo: str, frame: pl.DataFrame, so_bcb: bool = False) -> None:
        secao(titulo)
        for g in ordem:
            if so_bcb and g.startswith("PEIC"):
                continue
            cols = grupos[g]
            print(f"\n--- {g} ---")
            print(frame.select("data", *cols).rename({c: f"{c} {CAT[c]['curto']}" for c in cols}))

    imprimir_por_grupo("4) NÍVEIS MENSAIS (janela de análise) – por grupo", janela)
    imprimir_por_grupo("5) VARIAÇÃO MENSAL (p.p. / dias / meses para séries em unidade simples, % para séries em R$)", janela1)
    imprimir_por_grupo("6) VARIAÇÃO EM 12 MESES – só BCB (o PEIC tem poucos meses para esta medida)", janela12, so_bcb=True)

    secao("7) ESTATÍSTICAS DESCRITIVAS (janela de análise)")
    est = estatisticas_df(janela, var12, var1)
    print(est)

    visiveis = [c for c in ids_ok if not CAT[c]["oculta"]]
    secao("8) CORRELAÇÃO (Pearson) – VARIAÇÃO MENSAL, janela de análise  [colunas = id da série]")
    print(matriz_corr(janela1, visiveis))
    secao("9) CORRELAÇÃO (Pearson) – NÍVEIS, janela de análise  (cuidado: tendências geram correlação espúria)")
    print(matriz_corr(janela, visiveis))
    secao("10) PARES PEIC × BCB MAIS CORRELACIONADOS – variação mensal (top 30 por |r|)")
    cruz = pares_mais_correlacionados(janela1, visiveis, so_cruzados=True)
    print(cruz if not cruz.is_empty() else "Sem pares PEIC × BCB com dados suficientes.")

    alvos = [a for a in ("p_endiv", "p_atraso", "p_sem_cond", "p_renda") if a in ids_ok]
    secao("11) CORRELAÇÃO DEFASADA PEIC × BCB – variação mensal: BCB(t−k) × PEIC(t). k>0 = o BCB antecede o PEIC em k meses")
    drivers = [c for c in visiveis if CAT[c]["fonte"] == "BCB"]
    tabela = tabela_defasagens(var1, ini_janela, fim_janela, alvos, drivers)
    print(tabela if not tabela.is_empty() else "Dados insuficientes para defasagens.")
    print("\nObservação: o PEIC tem poucos meses; trate |r| altos como indício a investigar, não como prova.")

    secao("12) EXPORTAÇÃO")
    PASTA_SAIDA.mkdir(exist_ok=True)
    base.write_parquet(PASTA_SAIDA / "base_niveis.parquet")
    base.write_csv(PASTA_SAIDA / "base_niveis.csv")
    var12.write_csv(PASTA_SAIDA / "base_variacao_12m.csv")
    var1.write_csv(PASTA_SAIDA / "base_variacao_mensal.csv")
    est.write_csv(PASTA_SAIDA / "estatisticas.csv")
    log_df.write_csv(PASTA_SAIDA / "log_extracao.csv")
    payload = montar_payload(base, var12, var1, log_df)
    caminho_html = PASTA_SAIDA / ARQUIVO_HTML
    gerar_html(payload, caminho_html)
    print(f"Arquivos gravados em: {PASTA_SAIDA.resolve()}")
    print(f"Dashboard: {caminho_html.resolve()}  ({caminho_html.stat().st_size / 1e6:.1f} MB)")
    secao("FIM – todos os números foram impressos acima; abra o dashboard HTML para explorar")
    if ABRIR_NAVEGADOR:
        webbrowser.open(caminho_html.resolve().as_uri())


if __name__ == "__main__":
    main()
