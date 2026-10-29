# Referências do TCC (só consulta)

Cópias dos documentos que deram origem ao SAFE, para que todos no repositório (pessoas e IAs) tenham o mesmo material.

| Arquivo | O que é | Use para |
|---|---|---|
| `artigo_completo.tex` | Artigo do TCC (template iSys/SBC) | Entender o modelo do IRE (Seções 5 e 6), a avaliação (Seção 7) e a discussão |
| `especificacao_software_original.pdf` | Documento de especificação de software (nome antigo "SARE") | Casos de uso UC01–UC10 com fluxos, RF/RNF, histórias de usuário, diagramas |
| `Relatorio_Inconsistencias_TCC.docx` | 29 inconsistências encontradas entre artigo e especificação, com correção sugerida | Corrigir o artigo e a especificação (fora do código) |

**Regras:**
- **Não implemente a partir daqui.** Em qualquer divergência, valem `SEGURANCA_LGPD.md` › `PRD.md` › `specs/`, que já resolvem as inconsistências destes documentos (PRD §12).
- São **cópias de 29/10/2026**. A versão de trabalho do artigo continua sendo editada fora do repositório. Se uma versão nova for relevante para o código, substitua o arquivo aqui num PR `docs/…`.
- O artigo e a especificação contêm nomes, e-mails institucionais e matrículas da equipe. O repositório é privado; não torne público sem remover esses dados.
