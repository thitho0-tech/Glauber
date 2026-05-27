-- ============================================================
-- CINEFLOW — Seed dos editais SIC Recife 2024 (FIC + MIC)
-- Trilha 1 / T6 parte 1 do Roadmap V2
-- Apenas dados — validações específicas vêm na migration 0006
-- ============================================================
-- Fonte: SIC 2024 - MANUAL DE PRESTACAO DE CONTAS.pdf
-- SIC = Sistema de Incentivo à Cultura da Prefeitura do Recife
-- FIC = Fundo de Incentivo à Cultura | MIC = Mecenato de Incentivo à Cultura

-- ---------- Editais ----------

insert into public.editais (id, nome, orgao, vigencia, prazo_prestacao_meses, observacoes) values
('33333333-3333-3333-3333-333333333333',
 'SIC Recife 2024 — FIC',
 'Prefeitura do Recife / Secretaria de Cultura',
 '2024-2025',
 24,
 'Fundo de Incentivo à Cultura. Prestação 1ª parcela: 90 dias após recebimento (com 80% utilizado). Prestação final: 30 dias antes do término da vigência. Aplicação financeira obrigatória a partir do 31º dia. Pagamentos só via transferência nominal ou PIX (cartão de crédito é vedado). Texto obrigatório nas NFs: "com recursos do SIC Recife 2024 - FIC, firmado por meio de Termo de Compromisso Cultural nº xxxx/ano, com a SECRETARIA DE CULTURA DO RECIFE". Contato: sic.recife2024@gmail.com / (81) 3355-8029.'),

('44444444-4444-4444-4444-444444444444',
 'SIC Recife 2024 — MIC',
 'Prefeitura do Recife / Secretaria de Cultura',
 '2024-2025',
 24,
 'Mecenato de Incentivo à Cultura. Prestação total: 30 dias antes do término da vigência (não há prestação parcial como no FIC). Demais regras idênticas ao FIC, exceto pelo prazo. Texto obrigatório nas NFs: "com recursos do SIC Recife 2024 - MIC, firmado por meio de Termo de Compromisso Cultural nº xxxx/ano, com a SECRETARIA DE CULTURA DO RECIFE".');

-- ---------- Rubricas SIC — FIC ----------
-- Convenção de codigo: prefixo SIC_ para não conflitar com Funcultura
-- perc_max: percentual máximo do orçamento global (0.30 = 30%)
-- null = sem limite específico definido pelo edital

insert into public.rubricas_edital (edital_id, codigo, nome, perc_max, observacoes) values

-- Rubricas com TETO explícito do manual
('33333333-3333-3333-3333-333333333333', 'SIC_MIDIA',     'Mídias sociais e divulgação digital',         0.30,
 'Vedado pagamento de profissionais de mídias sociais acima de 30% do valor do projeto (item 2.2 do manual).'),
('33333333-3333-3333-3333-333333333333', 'SIC_ADM',       'Elaboração e administração do projeto',       0.15,
 'Vedadas despesas com elaboração e administração acima de 15% do valor global (item 2.5 do manual).'),

-- Rubricas operacionais (sem teto fixo, sujeitas à regra de 30% por fornecedor único)
('33333333-3333-3333-3333-333333333333', 'SIC_CACHE_ART', 'Cachê artístico',                              null,
 'NF/RPA + declaração de ciência do cachê assinada. Empresário exclusivo aceito (contrato 6+ meses anterior à contratação, em cartório ou com cert. digital).'),
('33333333-3333-3333-3333-333333333333', 'SIC_EQUIPE',    'Equipe técnica',                               null,
 'Cachês de equipe técnica (DP, DA, AD, op. câmera, foquista, gaffer, etc.) via NF, RPA ou contrato com PJ.'),
('33333333-3333-3333-3333-333333333333', 'SIC_EQUIP',     'Locação/cessão de equipamentos',              null,
 'Discriminar valor de cessão/locação na NF. Aquisição permanente vedada (exceto se prevista no projeto e aprovada).'),
('33333333-3333-3333-3333-333333333333', 'SIC_ARTE',      'Direção de arte / cenografia / figurino',     null,
 'Inclui compras, locações e produção de figurino, objetos de cena e cenário.'),
('33333333-3333-3333-3333-333333333333', 'SIC_LOCACAO',   'Locação de cenários e espaços',                null,
 'Contratos com proprietário ou imobiliária. Anexar comprovante.'),
('33333333-3333-3333-3333-333333333333', 'SIC_ALIM',      'Alimentação',                                  null,
 'Detalhar quantidades, valores unitários, planilha de beneficiários com nomes e participação no evento.'),
('33333333-3333-3333-3333-333333333333', 'SIC_HOSPED',    'Hospedagem',                                   null,
 'NF obrigatória + listagem de hóspedes com check-in/check-out, nome completo, participação no evento.'),
('33333333-3333-3333-3333-333333333333', 'SIC_TRANSP',    'Transporte terrestre',                         null,
 'Recibo de aplicativo/serviço com motorista, carro, percurso, valor. Pacote voucher exige planilha extra de uso.'),
('33333333-3333-3333-3333-333333333333', 'SIC_PASSAGEM',  'Passagem aérea',                               null,
 'Bilhete + relatório de embarque. Lista de passageiros separada se não coincidir com hóspedes.'),
('33333333-3333-3333-3333-333333333333', 'SIC_TELEFONE',  'Conta de telefone',                            null,
 'Só comprovável para números vinculados e previamente indicados. Pré-pago: comprovar recarga. Pós-pago: conta nominal.'),
('33333333-3333-3333-3333-333333333333', 'SIC_DIREITOS',  'Direitos autorais',                            null,
 'Recibo + contrato. Sem ISS/INSS (pode incidir IR conforme valor).'),
('33333333-3333-3333-3333-333333333333', 'SIC_INTERN',    'Despesas internacionais',                      null,
 'Invoice + contrato de câmbio (BACEN) + comprovante de tributos. Remessa em nome do proponente do serviço, sem intermediários.'),
('33333333-3333-3333-3333-333333333333', 'SIC_POS',       'Pós-produção',                                 null,
 'Edição, color, mixagem, finalização, masterização.'),
('33333333-3333-3333-3333-333333333333', 'SIC_PEQ_VALOR', 'Despesas de pequeno valor (sacado)',           null,
 'Total até R$ 1.000 por evento, cada item ≤ R$ 200, 15 dias para pagar após o saque. Demonstrativo extra obrigatório.');

-- ---------- Rubricas SIC — MIC ----------
-- Mesma estrutura do FIC. As regras de aplicação são quase idênticas.

insert into public.rubricas_edital (edital_id, codigo, nome, perc_max, observacoes) values
('44444444-4444-4444-4444-444444444444', 'SIC_MIDIA',     'Mídias sociais e divulgação digital',         0.30, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_ADM',       'Elaboração e administração do projeto',       0.15, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_CACHE_ART', 'Cachê artístico',                              null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_EQUIPE',    'Equipe técnica',                               null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_EQUIP',     'Locação/cessão de equipamentos',              null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_ARTE',      'Direção de arte / cenografia / figurino',     null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_LOCACAO',   'Locação de cenários e espaços',                null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_ALIM',      'Alimentação',                                  null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_HOSPED',    'Hospedagem',                                   null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_TRANSP',    'Transporte terrestre',                         null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_PASSAGEM',  'Passagem aérea',                               null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_TELEFONE',  'Conta de telefone',                            null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_DIREITOS',  'Direitos autorais',                            null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_INTERN',    'Despesas internacionais',                      null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_POS',       'Pós-produção',                                 null, 'Idem FIC.'),
('44444444-4444-4444-4444-444444444444', 'SIC_PEQ_VALOR', 'Despesas de pequeno valor (sacado)',           null, 'Idem FIC.');

-- ============================================================
-- FIM. Para aplicar:
--   1. Abrir Supabase Dashboard → SQL Editor
--   2. Colar todo o conteúdo deste arquivo
--   3. Run
--   4. Verificar: select count(*) from public.editais;  -- deve retornar 4
--   5. Verificar: select count(*) from public.rubricas_edital where edital_id in ('33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444');  -- deve retornar 32
-- ============================================================
