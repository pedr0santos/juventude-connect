# Project TODO

- [x] Dashboard administrativo em português com métricas de jovens, aniversários e acompanhamento
- [x] Autenticação protegida e controle de acesso por perfil
- [ ] Cadastro completo de jovens com dados pessoais, contato, endereço, foto e observações
- [x] Cadastro nominal de discipuladores com WhatsApp, status e lista de discípulos
- [ ] Vínculo obrigatório entre jovem e discipulador, preservando histórico de alterações
- [x] Listagem, busca, filtros por discipulador e faixa etária e ordenação de jovens
- [x] Calendário mensal de aniversários com destaques de hoje e da semana
- [x] Importação em massa via CSV ou Excel com validação e relatório de erros
- [ ] Edição e exclusão de cadastros com confirmação
- [x] Tela de presença otimizada para celular, com seleção de culto/data e marcação explícita de faltas
- [x] Registro idempotente de faltas por discípulo, data e culto
- [x] Correção de falta para presente/remoção sem apagar histórico de notificação
- [x] Mensagem personalizada de falta com variáveis dinâmicas
- [x] Envio manual de mensagens de aniversário via WhatsApp, sem automação de aniversário
- [x] Automação de notificação de falta após registro explícito, preparada para integração oficial do WhatsApp
- [x] Prevenção de notificações duplicadas para a mesma falta
- [x] Histórico de envios com status, ID da API e erro
- [x] Página de configurações com discipulado, mensagens e token/número do WhatsApp centralizados
- [x] Área de histórico individual do jovem e do discipulador
- [x] Dashboard com seção “Acompanhamento necessário”
- [x] Status de acompanhamento: pendente, contatado, conversou, justificativa recebida e resolvido
- [x] Indicadores de reincidência e filtros de faltas
- [x] Privacidade: discipulador vê apenas seus discípulos; administrador vê todos
- [x] Arquitetura extensível para novas automações baseadas em eventos e regras
- [x] Modelo de dados, índices e relacionamentos para jovens, discipuladores, presença, faltas, acompanhamento, mensagens e configurações
- [x] Testes Vitest para regras de negócio e prevenção de duplicidade
- [x] Validação visual responsiva em desktop e celular
- [x] Documentação técnica da arquitetura e das configurações externas necessárias
- [x] Criar checkpoint final após validar todo o projeto

## Histórico de requisitos

- [x] Requisitos iniciais de cadastro, aniversários, calendário, importação e WhatsApp preparado registrados
- [x] Restrição atualizada: não usar grupo/célula; adotar discipulado nominal
- [x] Restrição atualizada: mensagens de aniversário acionadas manualmente pelo administrador
- [x] Novos requisitos de presença, faltas, notificações ao discipulador e acompanhamento registrados
- [x] Regra de envio de falta somente após marcação explícita do administrador registrada
- [x] Regra de acesso por discipulador e preservação de histórico registrada
- [x] Visão do produto consolidada como ferramenta de cuidado: identificar → avisar → acompanhar → registrar

## Decisões de arquitetura

- [x] Usar banco próprio como fonte principal de dados
- [x] Manter WhatsApp atrás de uma camada de provedor, com credenciais somente no servidor
- [x] Modelar automações como eventos/regras independentes e idempotentes
- [x] Executar a automação de falta somente após ação explícita na tela de presença
- [x] Não depender de navegador aberto, WhatsApp Web ou simulação de cliques
- [x] Aplicar LGPD, mínimo privilégio, validação e logs de auditoria

## Pendências identificadas na validação

- [ ] Implementar formulário completo de criação/edição de discipuladores e exibir a lista nominal de discípulos em cada detalhe
- [x] Adicionar filtros reais por discipulador e faixa etária, além de ordenação configurável, no backend e na UI de jovens
- [x] Melhorar o calendário para destacar aniversariantes de hoje e dos próximos 7 dias de forma explícita e dinâmica
- [x] Permitir desfazer/remover falta sem perder histórico e exibir esse histórico de notificação de forma verificável
- [x] Implementar envio manual real de mensagem de aniversário via camada de provedor WhatsApp preparada, não apenas preparação de log
- [x] Criar UI para atualizar status de acompanhamento e restringir acesso por discipulador/admin corretamente
- [ ] Corrigir RBAC/privacidade em todas as queries e mutations usando discipulatorId do usuário autenticado e adicionar auditoria/LGPD mínima

## Importação solicitada pelo usuário

- [x] Validar e mapear Cadastrojovens.xlsx
- [x] Identificar registros sem WhatsApp, datas inválidas ou sem discipulador
- [ ] Confirmar com o administrador os dados obrigatórios ausentes antes de gravar
- [x] Importar registros aprovados no banco sem duplicidade
- [x] Entregar relatório de importação com aceitos, rejeitados e motivos

## Nova importação e renomeação solicitadas

- [x] Auditar Cadastrojovens(1).xlsx e Discipuladores.xlsx
- [x] Cruzar respostas de acompanhamento com nomes de discipuladores normalizados
- [x] Permitir WhatsApp vazio na importação e edição posterior pelo painel administrativo
- [x] Importar ou atualizar discipuladores e jovens sem duplicidade
- [x] Atualizar o nome do produto para Controle Jovens Sedentos em interface e configuração
- [x] Validar contagens, vínculos e registros sem WhatsApp após a importação

## Correções solicitadas: login e painel

- [x] Diagnosticar e corrigir o erro 404 ao abrir o painel administrativo
- [x] Criar acesso individual para cada discipulador
- [x] Associar conta autenticada ao discipulador correto
- [x] Restringir jovens, faltas e acompanhamentos ao discipulador logado
- [x] Manter acesso administrativo completo para administradores
- [x] Validar fluxo de login, logout, rota do painel e testes de autorização

## Correções solicitadas: contraste, WhatsApp e apelidos

- [x] Auditar botões com baixo contraste e corrigir textos invisíveis
- [x] Exibir no painel o estado real da integração WhatsApp e instruções de configuração/envio
- [x] Permitir cadastrar e editar apelidos/variações de resposta de cada discipulador
- [x] Reprocessar ou corrigir vínculos usando apelidos como Gabriel, Sidy e Sid
- [x] Exibir contagem de discípulos vinculados de forma consistente e permitir ajuste no painel
- [x] Validar visualmente os principais botões e testar a resolução de apelidos

## Fechamento da auditoria

- [x] Executar auditoria verificável de contraste nos fluxos principais
- [x] Exibir status real de configuração do WhatsApp no servidor e na UI
- [x] Adicionar reatribuição manual de jovem para discipulador no painel
- [x] Criar teste automatizado para a lógica de apelidos e relink seguro
- [x] Registrar validação visual verificável dos botões e estados principais

## Evidências finais

- [x] Registrar relatório textual de contraste por tela e estado
- [x] Extrair a lógica de seleção do relink para função pura e testá-la
- [x] Revalidar a suíte e salvar checkpoint final das correções atuais

## Presença em três cultos

- [x] Substituir o botão “Registrar presença” por uma ação visual mais clara e útil
- [x] Criar seleção explícita entre Sedentos +20, Culto Sedentos e Cultos de Domingo
- [x] Aplicar os dias padrão sexta-feira, sábado e domingo sem impedir ajustes administrativos
- [x] Garantir que a presença e as faltas sejam registradas separadamente por culto e data
- [x] Validar o fluxo desktop e mobile dos três cultos

## Correção do login publicado

- [x] Verificar o comportamento de `/api/oauth/login` no domínio publicado
- [x] Corrigir a rota OAuth ou sua geração de URL para o domínio oficial
- [x] Validar callback, cookies e redirecionamento do login
- [x] Salvar checkpoint da correção do login

## Interação do controle de falta

- [x] Substituir o switch simples por um controle com estado visual de check
- [x] Adicionar feedback de clique, cor, animação sutil e texto acessível
- [x] Garantir que o estado marcado e desmarcado permaneça legível em mobile
- [x] Validar o controle na tela de presença e salvar checkpoint

## Correção de próximos aniversários

- [x] Calcular o próximo aniversário anual de cada jovem a partir da data atual
- [x] Ordenar os próximos aniversários por distância cronológica, incluindo virada do ano
- [x] Remover aniversários já passados da lista de próximos
- [x] Ajustar o calendário e validar a lista com dados importados
- [x] Salvar checkpoint da correção

## Fechamento da correção de aniversários

- [x] Tornar o mês e a grade do calendário de aniversários dinâmicos
- [x] Registrar exemplos reais da lista importada em uma validação automatizada/textual
- [x] Salvar novo checkpoint após publicar a correção

## Correção de data exata do aniversário

- [x] Formatar datas de aniversário por partes do calendário, sem usar parsing UTC deslocável
- [x] Garantir que a lista de próximos aniversários mostre o dia cadastrado exatamente
- [x] Adicionar teste para evitar regressão de um dia anterior
- [x] Validar visualmente e salvar checkpoint

## Destaque de aniversariantes de hoje

- [x] Identificar aniversariantes do dia atual sem deslocamento de fuso
- [x] Adicionar ícone de bolo e selo “Hoje” na lista de próximos aniversários
- [x] Aplicar cor e fundo de destaque com contraste acessível
- [x] Validar o destaque em desktop e mobile e salvar checkpoint

## Fluxo de faltas e notificações solicitado no documento

- [x] Criar registro explícito de falta vinculado a jovem, culto, discipulador e notificação
- [x] Gerar notificação imediatamente ao salvar uma falta, sem enviar antes do registro
- [x] Criar aba “Faltas” com discípulo, discipulador, culto, data, status e notificação
- [x] Criar aba “Notificações” com destinatário, WhatsApp, mensagem, status, envio e resultado
- [x] Usar estados Pendente, Enviando, Enviada, Erro e Cancelada
- [x] Mostrar claramente o discipulador e a mensagem que será enviada
- [x] Exibir erro “discipulador não encontrado” sem esconder a falta
- [x] Mostrar resumo após salvar presença com faltas e notificações geradas
- [x] Criar resumo/histórico por culto com presentes, faltantes e notificações
- [x] Adicionar card de notificações de faltas ao dashboard
- [x] Garantir idempotência e rastreabilidade Falta → Jovem → Discipulador → WhatsApp → Notificação → Resultado
- [x] Validar o fluxo completo e publicar checkpoint

## Validação final do fluxo de faltas e notificações

- [x] Corrigir rotas diretas /faltas e /notificacoes para evitar 404 no recarregamento
- [x] Exibir card de notificações de faltas no dashboard com contadores reais
- [x] Exibir resumo pós-presença com discipulador, destinatário e status da notificação
- [x] Validar visualmente as telas de presença, faltas e notificações após a correção
- [x] Salvar checkpoint final publicado após a validação

## Histórico de requisitos concluídos

- [x] Criar registro explícito de falta vinculado a jovem, culto, discipulador e notificação
- [x] Gerar notificação imediatamente ao salvar uma falta, sem enviar antes do registro
- [x] Criar aba “Faltas” com discípulo, discipulador, culto, data, status e notificação
- [x] Criar aba “Notificações” com destinatário, WhatsApp, mensagem, status, envio e resultado
- [x] Usar estados Pendente, Enviando, Enviada, Erro e Cancelada
- [x] Mostrar claramente o discipulador e a mensagem que será enviada
- [x] Exibir erro “discipulador não encontrado” sem esconder a falta
- [x] Mostrar resumo após salvar presença com faltas e notificações geradas
- [x] Criar resumo/histórico por culto com presentes, faltantes e notificações
- [x] Adicionar card de notificações de faltas ao dashboard
- [x] Garantir idempotência e rastreabilidade Falta → Jovem → Discipulador → WhatsApp → Notificação → Resultado
- [x] Validar o fluxo completo e publicar checkpoint

## Ajustes técnicos da validação

- [x] Registrar rotas diretas de Faltas e Notificações no roteador do frontend
- [x] Conectar o resumo de presença e contadores reais ao shell principal
- [x] Criar consulta dinâmica de resumo por culto com presentes, faltantes e notificações
- [x] Substituir números hardcoded do último encontro por contagens do backend
- [x] Reexecutar TypeScript e suíte Vitest após os ajustes

## Filtros de histórico de faltas

- [x] Adicionar busca por jovem, discipulador e culto na aba Faltas
- [x] Adicionar filtro por status da notificação e contagem filtrada
- [x] Corrigir o fechamento JSX do wrapper de tabela após o filtro

## Correção reportada pelo usuário: contraste dos botões de salvar

- [x] Corrigir o texto invisível nos botões de salvar de Mensagem de aniversário e Notificação de falta
- [x] Validar contraste dos botões em desktop e mobile
- [x] Salvar checkpoint publicado da correção
- [x] Validar visualmente em viewport mobile os botões “Salvar mensagem” da tela /configuracoes

## Auditoria e automações reais de WhatsApp solicitadas no texto anexado

- [x] Auditar banco, backend, modelos de jovens/discipluladores/WhatsApp, integração e scheduler atuais
- [x] Documentar o resultado da auditoria e as credenciais/configurações externas necessárias
- [ ] Confirmar com o administrador as credenciais reais da API oficial antes de ativar envio em produção
- [ ] Garantir envio real de falta via API oficial após registro explícito, com logs e idempotência
- [ ] Implementar rotina diária automática de aniversários com horário configurável e fuso America/Sao_Paulo
- [ ] Adicionar teste manual de WhatsApp com resultado real, erro da API e registro de log
- [ ] Criar testes automatizados das automações e validar a execução agendada
- [ ] Publicar checkpoint das automações reais após validação

## Revisão de experiência mobile solicitada pelo usuário

- [x] Auditar visualmente dashboard, presença, jovens, discipuladores, faltas, notificações e configurações em viewport mobile
- [x] Corrigir navegação mobile e evitar overflow horizontal no shell principal
- [x] Corrigir tabelas, filtros, cards, formulários e botões para telas pequenas
- [x] Validar novamente todas as telas principais em mobile e desktop
- [x] Executar TypeScript e testes Vitest após os ajustes responsivos
- [x] Salvar checkpoint publicado da revisão mobile

## Ajustes adicionais encontrados na revisão mobile

- [x] Ajustar a tela Faltas para cards legíveis em mobile, sem depender de tabela rígida de 760px
- [x] Ajustar a tela Notificações para leitura confortável em mobile
- [x] Revalidar Faltas, Notificações e Discipuladores em mobile após os ajustes
- [x] Revalidar Discipuladores, Faltas e Notificações em desktop após os ajustes

## Correção da landing page no iPhone

- [x] Eliminar overflow horizontal do título e dos textos da landing page
- [x] Ajustar escala, largura e quebra do hero para viewport mobile estreita
- [x] Reposicionar o selo superior e o card de apresentação para não ficarem cortados
- [x] Validar a landing page em viewport iPhone e desktop
- [x] Salvar checkpoint publicado da correção da landing page

## Módulo de Relatórios e Indicadores solicitado no documento

- [x] Criar área Relatórios em português com filtros quinzenal, mensal e personalizado
- [x] Implementar filtros por data inicial/final, culto, discipulador e jovem
- [x] Calcular resumo real de frequência, presença, faltas, ativos, novos e acompanhamento
- [x] Comparar automaticamente com período anterior equivalente e indicar crescimento, queda ou estabilidade
- [x] Exibir gráfico de presentes por culto e gráfico de presença versus faltas
- [x] Exibir evolução mensal apenas quando houver dados suficientes
- [x] Criar ranking de frequência com ordenação configurável
- [x] Criar alertas de baixa frequência e faltas consecutivas com limites configuráveis
- [x] Criar visão por discipulador com discípulos, frequência, faltas e acompanhamento
- [x] Criar relatório individual do jovem com histórico e tendência
- [x] Criar seção de movimentação: novos, recorrentes, consecutivos e ausentes prolongados
- [x] Criar indicador de faltas acompanhadas e alertas inteligentes
- [x] Exportar relatório em CSV e preparar PDF/Excel com dados reais
- [x] Adicionar testes automatizados para os cálculos e estados sem dados suficientes
- [x] Validar responsividade, privacidade por discipulador e exportações
- [x] Salvar checkpoint publicado do módulo de Relatórios

## Complementos obrigatórios do módulo de Relatórios

- [x] Adicionar seletor explícito Quinzenal, Mensal e Personalizado com preenchimento automático das datas
- [x] Expandir a visão por discipulador com lista nominal dos discípulos, presença, faltas, última presença e acompanhamento

## Refinamento obrigatório dos relatórios

- [x] Aplicar regra real de suficiência para mostrar evolução mensal somente com pelo menos dois meses válidos
- [x] Expandir relatório individual com histórico por culto/data, acompanhamento, total de cultos, faltas consecutivas e tendência

## Alertas configuráveis e exportações adicionais

- [x] Permitir configurar limite de frequência baixa e faltas consecutivas no relatório
- [x] Exportar também uma versão compatível com Excel e uma versão imprimível para PDF

## Robustez final de alertas e PDF

- [x] Validar client-side os limites de alerta com fallback 60%/2 e clamp seguro
- [x] Criar uma área de impressão dedicada para exportação PDF sem imprimir a navegação inteira
- [x] Validar manualmente CSV, Excel e PDF com dados reais e tratar falhas de exportação

## Histórico individual do discipulador

- [x] Criar uma visão individual do discipulador com histórico próprio, frequência média, faltas, acompanhamentos e tendência
- [x] Validar visualmente e com testes a navegação para o histórico individual do discipulador
