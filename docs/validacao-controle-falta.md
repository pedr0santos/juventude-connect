# Validação do controle de falta

## Estado desmarcado

Na tela `/presenca`, cada jovem exibe o botão “Marcar falta”. O controle usa fundo branco, borda cinza, círculo interno claro e texto escuro. O tamanho mínimo é de 44 pixels de altura, o que preserva uma área de toque adequada em telas móveis. Ao passar o mouse, a borda e o texto assumem o tom de destaque marrom; ao focar pelo teclado, aparece um anel visível.

## Estado marcado

Depois do clique, o mesmo controle muda para “Falta registrada”, com fundo rosado claro, borda terracota, círculo preenchido e ícone de check branco. O texto permanece explícito, sem depender apenas da cor, e o atributo `aria-pressed` informa o estado para tecnologias assistivas. O clique seguinte usa o mesmo controle para desmarcar a falta.

## Interação

O botão aplica uma redução sutil de escala durante o clique, transições curtas de cor e transformação no check e foco visível. A presença continua vinculada à combinação de jovem, data e culto selecionado. A validação TypeScript e os 12 testes Vitest passaram após a alteração.

## Responsividade

Em desktop, o controle fica alinhado à direita de cada cartão de presença, com texto completo e check visível. Em mobile, mantém a mesma altura mínima, área de toque, rótulo textual e quebra natural do cartão; não depende de um switch estreito ou de um indicador sem texto.
