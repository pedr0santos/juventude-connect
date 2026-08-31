# Validação do fluxo de presença

## Desktop — `/presenca` em 1280×900

A tela exibe o título “Presença”, o campo de data e três controles claramente identificados: “Sedentos +20 · Sexta-feira”, “Culto Sedentos · Sábado” e “Cultos de Domingo · Domingo”. O culto ativo usa fundo marrom e texto branco; os demais usam fundo branco, borda cinza e texto escuro. A lista mostra o culto selecionado, a data formatada, a quantidade de jovens ativos e um controle individual “Faltou” por jovem.

## Mobile — `/presenca` em 390×844

O botão superior “Registrar presença” permanece visível, com ícone, fundo marrom e texto branco. Os três cultos quebram em linhas sem sobreposição, mantendo texto e dia legíveis. O seletor de data ocupa uma linha própria, e o cabeçalho da sessão informa o culto e a quantidade de jovens ativos. A lista continua em cartões verticais com o controle de falta alinhado à direita.

## Regras funcionais verificadas

| Ação | Resultado esperado |
|---|---|
| Clicar em “Sedentos +20” | Seleciona o evento de sexta-feira e move a data para a próxima sexta a partir da data atual |
| Clicar em “Culto Sedentos” | Seleciona o evento de sábado e move a data para o próximo sábado |
| Clicar em “Cultos de Domingo” | Seleciona o evento de domingo e move a data para o próximo domingo |
| Alterar a data manualmente | Mantém o culto selecionado e consulta presença por data + nome do culto |
| Marcar “Faltou” | Registra a falta vinculada à sessão específica e dispara o fluxo de acompanhamento previsto |
| Desmarcar “Faltou” | Corrige a presença na mesma sessão sem misturar registros de outros cultos |
