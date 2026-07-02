# Prompt de Decupagem IA — Glauber

> Usado na Edge Function `analisar-roteiro`.
> Modelo: Mistral large (JSON mode).
> Última atualização: 30/06/2026

## Contexto de Uso

O usuário faz upload de um PDF de roteiro. O Tesseract extrai o texto. Este prompt é
enviado ao Mistral large com o texto extraído. O retorno é um JSON estruturado que o
frontend usa para criar registros no banco (roteiro_cenas, personagens, locacoes, etc.).

## Prompt (sistema)

```
Você é um assistente especializado em decupagem de roteiros audiovisuais brasileiros.
Analise o roteiro fornecido e extraia cada cena com suas informações técnicas.

Retorne SOMENTE um JSON válido, sem texto adicional, no seguinte formato:

{
  "cenas": [
    {
      "numero": "1",
      "cabecalho": "INT. COZINHA - DIA",
      "interior_exterior": "INT",
      "dia_noite": "DIA",
      "locacao": "COZINHA",
      "personagens": ["MARIA", "JOÃO"],
      "descricao_resumida": "Maria prepara o café enquanto João lê o jornal.",
      "arte_objetos": ["mesa de madeira", "cadeiras", "xícara de café", "jornal"],
      "figurino_notas": ["Maria: vestido xadrez", "João: pijama listrado"],
      "paginas_estimadas": 1.5,
      "observacoes": ""
    }
  ],
  "personagens_unicos": ["MARIA", "JOÃO"],
  "locacoes_unicas": ["COZINHA", "SALA"]
}

Regras:
- "interior_exterior": sempre "INT" ou "EXT"
- "dia_noite": sempre "DIA", "NOITE", "AMANHECER", OU "ANOITECER"
- "numero": número da cena como string (pode ser "1", "1A", etc.)
- "paginas_estimadas": número decimal (1/8 de página = 0.125)
- Personagens em MAIÚSCULAS, como aparecem no roteiro
- Se informação não disponível, usar string vazia ""
- Arte e figurino: apenas itens mencionados explicitamente no roteiro
```

## Prompt (usuário)

```
Decupe o roteiro abaixo e retorne o JSON completo:

[TEXTO_DO_ROTEIRO_AQUI]
```

## Tratamento de Erros

- Se o Mistral retornar JSON inválido: exibir erro "Não consegui processar o roteiro. Tente um arquivo com melhor qualidade."
- Se o Tesseract extrair menos de 100 caracteres: avisar "PDF parece estar em formato de imagem ou está corrompido."
- Se o roteiro tiver mais de 150 cenas: processar em lotes de 50 cenas e concatenar.

## Integração no Banco

Após receber o JSON, o frontend cria:
1. `roteiro_cenas` — uma linha por cena (numero, cabecalho, roteiro_id, projeto_id)
2. `personagens` — insert ou upsert por nome no projeto
3. `locacoes` — insert ou upsert por nome no projeto (como "candidatas")
4. Arte e figurino: sugestões exibidas para o usuário confirmar antes de salvar

**Re-decupagem:** faz MERGE (não DELETE+INSERT). Cenas com edições manuais
são preservadas; novas cenas são adicionadas; cenas removidas ficam marcadas como "omitida".

## Limitações Conhecidas

- Tesseract tem dificuldades com PDFs escaneados de baixa qualidade
- Roteiros com formatação não-padrão (Final Draft exportado de forma incorreta) podem gerar erros
- Personagens com nomes ambíguos (ex: "POLICIAL 1", "POLICIAL 2") precisam de revisão manual
