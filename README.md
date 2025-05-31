# Quiz Interativo CAESB - Patrimônio de Brasília

## 1. Visão Geral do Projeto

Este projeto consiste em um sistema de Quiz interativo desenvolvido para a **CAESB (Companhia de Saneamento Ambiental do Distrito Federal)**, com o tema central "Água da CAESB, Patrimônio de Brasília". A aplicação é projetada para funcionar completamente **offline**, sendo executada diretamente no navegador do usuário. Utiliza tecnologias web padrão (HTML, CSS e JavaScript puro) e armazena todos os dados de perguntas, participantes, configurações e personalizações no `localStorage` do navegador.

O sistema é dividido em duas interfaces principais:
* Uma interface para os **participantes** jogarem o quiz (`index.html` [cite: uploaded:QUIZ/index.html]).
* Um **painel administrativo** (`admin.html` [cite: uploaded:QUIZ/admin.html]) para gerenciamento completo do conteúdo, configurações, visualização de relatórios e personalização do quiz.

O objetivo é fornecer uma ferramenta robusta e flexível para engajamento e educação, ideal para eventos, feiras ou campanhas informativas, sem a necessidade de conexão com a internet ou infraestrutura de backend.

## 2. Funcionalidades Detalhadas

### 2.1. Interface do Participante (`index.html`)

* **Tela Inicial:**
    * **Identificação do Jogador:** Campos para Nome e Telefone antes de iniciar o quiz.
    * **Teclado Virtual:** Um teclado virtual customizável (`js/virtualKeyboard.js` [cite: uploaded:QUIZ/js/virtualKeyboard.js]) é disponibilizado para facilitar a entrada de dados, especialmente em dispositivos touchscreen. Sua altura e ativação são configuráveis pelo administrador.
    * **Status do Evento:** Exibe mensagens dinâmicas se o quiz estiver configurado para um evento específico (ex: "Quiz em breve", "Quiz encerrado") [cite: uploaded:QUIZ/js/main.js].
    * Botões para "Iniciar Quiz" e "Ver Ranking".

* **Tela do Quiz:**
    * **Apresentação das Perguntas:** Exibe uma pergunta de múltipla escolha por vez.
    * **Contador de Perguntas:** Mostra a pergunta atual e o total (ex: "3/10").
    * **Cronômetro Geral:** Tempo total decorrido desde o início do quiz.
    * **Barra de Progresso:** Indica o avanço do jogador no total de perguntas.
    * **Etiqueta de Dificuldade:** Cada pergunta exibe seu nível de dificuldade (Fácil, Moderado, Difícil) [cite: uploaded:QUIZ/js/main.js].
    * **Barra de Tempo por Pergunta:** Uma barra visual indica o tempo restante para responder a pergunta atual, com cores que mudam conforme o tempo se esgota [cite: uploaded:QUIZ/style.css].
    * **Feedback Imediato:** Ao selecionar uma opção, o sistema indica visualmente se a resposta está correta ou incorreta. Se configurado, mostra a resposta correta em caso de erro [cite: uploaded:QUIZ/js/main.js, uploaded:QUIZ/js/constants.js].
    * **Alerta Visual de Tempo:** Efeitos visuais opcionais (borda pulsante, flash na tela) para alertar sobre o tempo acabando [cite: uploaded:QUIZ/style.css, uploaded:QUIZ/js/constants.js].
    * **Botão de Desistência:** Permite ao jogador abandonar o quiz a qualquer momento (sujeito a bloqueio configurável).

* **Tela de Resultado:**
    * **Desempenho Individual:** Exibe o nome do jogador, pontuação final (acertos/total), tempo total gasto.
    * **Ranking Individual:** Mostra a colocação do jogador no ranking geral no momento da finalização.
    * **Mensagem de Premiação:** Informa se o jogador atingiu a pontuação mínima para ganhar um brinde (texto customizável) [cite: uploaded:QUIZ/js/constants.js].
    * **Modal de Top 3:** Uma mensagem especial de congratulações é exibida se o jogador ficar entre os três primeiros colocados [cite: uploaded:QUIZ/index.html].
    * **Revisão de Respostas:** Opção para visualizar um modal com as perguntas que o jogador errou e as respostas corretas correspondentes ("Onde Eu Errei?") [cite: uploaded:QUIZ/index.html].
    * Opções para "Ver Ranking" geral ou "Jogar Novamente".

* **Tela de Ranking Geral:**
    * Lista os melhores participantes, ordenados por pontuação e, como critério de desempate, menor tempo.
    * O número de participantes exibidos é configurável pelo administrador.

* **Tela de Descanso (Idle Screen):**
    * Ativada automaticamente após um período de inatividade configurável [cite: uploaded:QUIZ/js/main.js].
    * Exibe o logo, slogan e uma mensagem chamativa ("TOQUE PARA COMEÇAR") para incentivar novos jogadores.
    * Pode exibir mensagens customizadas relacionadas ao status de um evento.

* **Modais Interativos:**
    * **"Já Ganhou Brinde?"**: Se a opção de bloqueio de prêmio estiver ativa, este modal impede que jogadores que já ganharam um brinde (identificados pelo telefone) joguem novamente para ganhar [cite: uploaded:QUIZ/index.html].
    * **Alertas e Confirmações:** Modais genéricos para alertas e confirmações de ações (ex: ao desistir do quiz).

* **Acessibilidade:**
    * Controles flutuantes para aumentar ou diminuir o tamanho da fonte da interface (`A+` / `A-`) [cite: uploaded:QUIZ/index.html].

### 2.2. Painel Administrativo (`admin.html`)

* **Acesso Seguro:**
    * Protegido por senha (padrão: `CAESB2025!`, configurada em `admin.js` [cite: uploaded:QUIZ/admin.js]).
    * **Modo Desenvolvedor:** Uma opção nas configurações gerais permite ativar/desativar um modo que pula a tela de login para facilitar o desenvolvimento e testes rápidos. O estado é salvo no `localStorage` (`quizAdminDevMode`) [cite: uploaded:QUIZ/admin.js].

* **Dashboard Principal:**
    * Interface central com cartões de acesso rápido para todas as seções de gerenciamento.

* **Gerenciamento de Evento:**
    * Configurar um **Evento Atual** com nome, data/hora de início e data/hora de fim.
    * Opção para habilitar/desabilitar mensagens e bloqueios de participação fora do período do evento configurado.
    * Permite limpar a configuração do evento, fazendo o quiz operar sem restrições de data.

* **Gerenciamento de Questões:**
    * **CRUD Completo:** Adicionar novas perguntas, visualizar lista, editar perguntas existentes e excluir perguntas.
    * **Campos da Pergunta:** Texto da pergunta, até 4 opções de resposta, seleção da opção correta, e definição do nível de dificuldade (Fácil, Moderado, Difícil).
    * **Habilitar/Desabilitar Questões:** Cada questão pode ser individualmente habilitada ou desabilitada para aparecer no quiz.
    * **Busca:** Filtrar a lista de questões por texto.
    * **Importação/Exportação:**
        * Exportar todas as questões para arquivos JSON ou CSV.
        * Importar questões de um arquivo JSON. Permite substituir todas as questões existentes ou adicionar/atualizar questões (baseado no ID). Fornece um exemplo visual do formato JSON esperado [cite: uploaded:QUIZ/admin.html].

* **Configurações Gerais do Quiz:**
    * **Regras do Jogo:**
        * `Número de perguntas por partida`: Quantas perguntas serão sorteadas para cada jogador.
        * `Tempo por pergunta (segundos)`: Limite de tempo para responder cada questão.
        * `Pontuação mínima para ganhar um brinde`.
        * `Mostrar a alternativa correta após o erro`: Feedback para o jogador.
    * **Comportamento da Interface:**
        * `Tempo para Modo Descanso (segundos)`: Inatividade antes da tela de descanso ser ativada.
        * `Tempo do Aviso de Esmaecimento (segundos)`: Antecedência com que a tela começa a esmaecer antes do modo descanso.
        * `Habilitar Borda Pulsante de Alerta de Tempo`.
        * `Habilitar Flash de Alerta de Tempo`.
    * **Distribuição de Dificuldade:** Definir percentuais alvo para questões fáceis, moderadas e difíceis que o sistema tentará seguir ao sortear as perguntas.
    * **Ranking:** `Número de participantes a exibir no ranking`.
    * **Controle de Participação:**
        * `Bloqueio para ganhadores de brinde`: Impedir que quem já ganhou jogue para ganhar novamente.
        * `Tempo de bloqueio após desistência (minutos)`: Período que um jogador que desistiu fica impedido de jogar.
        * Botões para limpar a lista de ganhadores de brinde e a lista de bloqueio por desistência.
    * **Visual:**
        * `Nome do arquivo do logotipo`: (ex: `novo_logo.png`). O arquivo deve ser colocado na pasta `assets/`.
        * `Nome do arquivo da imagem de fundo`: (ex: `fundo_quiz.jpg`). O arquivo deve estar em `assets/`.
        * `Habilitar imagem de fundo personalizada`.
    * **Teclado Virtual:**
        * `Altura do Teclado Virtual (vh)`: Em relação à altura da tela.
        * `Habilitar Teclado Virtual`.
    * **Reset para Padrão:** Botões individuais para resetar cada configuração para seu valor padrão (`DEFAULT_SETTINGS` em `js/constants.js` [cite: uploaded:QUIZ/js/constants.js]).

* **Personalização Visual do Quiz:**
    * **Textos:** Permite editar a maioria dos textos exibidos nas telas do quiz (títulos, slogans, botões, mensagens de modais, placeholders de input).
    * **Cores:** Permite alterar as cores principais da interface (fundo principal, cores de botões primários/secundários, cor principal de texto, cor de destaque, cores de fundo e texto das opções de resposta, cores para opções corretas/incorretas).
    * **Tamanhos de Fonte:** Ajustar os tamanhos de fonte para elementos chave como slogans, chamada da tela de descanso, botões principais e texto da pergunta.
    * Botão para restaurar todas as personalizações para os valores padrão (`DEFAULT_CUSTOMIZATIONS` em `js/constants.js` [cite: uploaded:QUIZ/js/constants.js]).

* **Relatórios de Participantes:**
    * **Listagem Paginada:** Exibe todos os participantes com colunas para nome, telefone, acertos, tempo, se ganhou brinde (🏆) e data/hora da participação.
    * **Busca e Filtros:** Buscar por nome ou telefone; filtrar por período (Todos, Hoje, Últimos X dias); filtrar para mostrar apenas ganhadores de brinde.
    * **Ordenação:** Clicar nos cabeçalhos das colunas para ordenar os dados.
    * **Exportação:** Exportar a lista de participantes (considerando os filtros aplicados) para arquivos CSV ou JSON.
    * **Detalhes do Participante:** Clicar em uma linha abre um modal com informações detalhadas da participação, incluindo todas as respostas dadas pelo jogador.
    * **Ações Individuais:** No modal de detalhes, é possível:
        * Remover o participante da lista de "ganhadores de brinde" (despremiar).
        * Remover o participante da lista de "bloqueio por desistência".
        * Excluir o registro completo do participante.
    * **Ação em Massa:** Botão para excluir TODOS os registros de participantes.

* **Estatísticas de Desempenho:**
    * **Gerais:** Pontuação média de todos os participantes e total de participações registradas.
    * **Por Questão:** Tabela paginada mostrando, para cada questão: texto, vezes que foi respondida, total de acertos, total de erros, e percentual de acerto.
    * **Ações por Questão:** Botão para habilitar/desabilitar a questão diretamente da lista de estatísticas.
    * **Ordenação:** Clicar nos cabeçalhos das colunas para ordenar os dados.

* **Dashboard Analítico:**
    * **Filtro de Período:** Analisar dados de "Hoje", "Últimos 3 Dias" ou "Todo o Período".
    * **KPIs (Indicadores Chave de Performance):**
        * Total de Participações.
        * Média de Acertos.
        * Tempo Médio de Jogo.
        * Taxa de Sucesso (percentual de jogadores que atingiram a pontuação para brinde).
    * **Gráficos:**
        * Participações por Hora (gráfico de barras).
        * Distribuição de Pontuações (gráfico de barras mostrando quantos jogadores fizeram X pontos).
    * **Listas:**
        * Top 5 Questões Mais Difíceis (com base no menor percentual de acerto).
        * Top 5 Questões Mais Fáceis (com base no maior percentual de acerto).

* **Backup e Restauração:**
    * **Exportar Backup Completo:** Gera um arquivo JSON (`backup_quiz_caesb_DATA.json`) contendo todos os dados do quiz: questões, participantes, configurações gerais, dados do evento, nome do logo customizado, listas de bloqueio/prêmio, e personalizações visuais.
    * **Importar Backup:** Permite selecionar um arquivo JSON de backup. Ao importar, **TODOS os dados atuais do quiz são substituídos** pelos dados do arquivo.

* **Testador de Cenários:**
    * Botões para abrir `index.html` em uma nova aba, simulando diferentes telas (Inicial, Quiz, Resultado, Ranking, Descanso).
    * Botões para simular cenários de evento (Antes do Início, Após o Fim, Durante, Mensagens Desativadas).
    * Botões para testar a exibição de modais específicos (Já Ganhou, Top 3, Respostas Incorretas).
    * Botões para simular diferentes tipos de tela de resultado (Top 1 Ganhador, Ganhador Não Top 3, Perdedor).

* **Acessibilidade no Admin:** Controles para aumentar/diminuir fonte e botão para retornar ao quiz (`index.html`).

## 3. Tecnologias Utilizadas

* **HTML5:** Estrutura das páginas.
* **CSS3:** Estilização visual e responsividade básica [cite: uploaded:QUIZ/style.css].
* **JavaScript (ES6 Vanilla):** Toda a lógica de funcionamento do quiz e do painel administrativo, utilizando módulos para organização (`js/main.js` [cite: uploaded:QUIZ/js/main.js], `js/admin.js` [cite: uploaded:QUIZ/admin.js], `js/utils.js` [cite: uploaded:QUIZ/js/utils.js], etc.).
* **Armazenamento de Dados:** Exclusivamente o `localStorage` do navegador. Nenhum banco de dados externo ou backend é utilizado.

## 4. Estrutura do Projeto

QUIZ/├── assets/                 # Local para imagens (logo.png padrão, fundos e logos personalizados)├── backup/                 # Contém exemplos de arquivos de backup gerados pelo sistema│   ├── backup_quiz_caesb_24-05-2025.json [cite: uploaded:QUIZ/backup/backup_quiz_caesb_24-05-2025.json]│   └── backup_quiz_caesb_25-05-2025.json [cite: uploaded:QUIZ/backup/backup_quiz_caesb_25-05-2025.json]├── js/                     # Arquivos JavaScript modulares│   ├── admin.js            # Lógica principal do painel administrativo│   ├── constants.js        # Constantes globais, configurações e customizações padrão│   ├── main.js             # Lógica principal da interface do participante do quiz│   ├── ui.js               # Funções de manipulação da interface do usuário do quiz│   ├── utils.js            # Funções utilitárias (localStorage, modais de alerta/confirmação, etc.)│   └── virtualKeyboard.js  # Implementação do teclado virtual├── perguntas/              # Arquivos JSON com exemplos de bancos de questões│   ├── 50perguntas.json [cite: uploaded:QUIZ/perguntas/50perguntas.json]│   └── Defaults2025-05-25.json [cite: uploaded:QUIZ/perguntas/Defaults2025-05-25.json]├── admin.html              # Página HTML do painel administrativo├── index.html              # Página HTML principal do quiz para participantes└── style.css               # Folha de estilos CSS principal para ambas as interfaces*Nota: Os arquivos `idleHandler.js` e `eventLogic.js` são mencionados em `ui.js` [cite: uploaded:QUIZ/js/ui.js] como importações futuras, mas não foram fornecidos nos arquivos do projeto atual.*

## 5. Como Executar o Projeto (Modo Offline)

Este projeto foi desenhado para ser extremamente simples de executar, sem necessidade de instalação de software adicional, servidores web ou processos de compilação.

1.  **Obtenha os Arquivos:** Certifique-se de ter a pasta `QUIZ/` completa com todos os seus subdiretórios e arquivos.
2.  **Para Jogar o Quiz:**
    * Navegue até a pasta `QUIZ/`.
    * Abra o arquivo `index.html` diretamente em um navegador web moderno (Google Chrome, Mozilla Firefox, Microsoft Edge são recomendados).
3.  **Para Acessar o Painel Administrativo:**
    * Navegue até a pasta `QUIZ/`.
    * Abra o arquivo `admin.html` em um navegador web.
    * Você será solicitado a inserir a senha administrativa.

**Importante:** Como o projeto utiliza `localStorage`, todos os dados (perguntas, participantes, configurações) são armazenados **especificamente no navegador e na máquina onde o quiz está sendo executado**. Se você mover os arquivos para outro computador ou usar um navegador diferente, os dados não serão compartilhados automaticamente. Utilize a funcionalidade de Backup/Restauração para transferir dados.

## 6. Acesso e Uso do Painel Administrativo

* **Login:** Abra `admin.html`. A senha padrão é `CAESB2025!` (definida em `admin.js` [cite: uploaded:QUIZ/admin.js]).
* **Modo Desenvolvedor:** Pode ser ativado em "Configurações Gerais" para pular o login em acessos futuros no mesmo navegador.
* **Navegação:** O dashboard inicial oferece acesso a todas as seções. Botões de "Voltar" permitem retornar ao dashboard.
* **Salvamento:** A maioria das seções possui botões "Salvar". Alterações não salvas podem ser perdidas ao navegar para outras seções ou sair (o sistema tentará avisar sobre alterações não salvas).

## 7. Gerenciamento de Dados

* **Armazenamento:** Todos os dados são salvos no `localStorage` do navegador.
* **Questões:**
    * Gerenciadas via painel administrativo (CRUD).
    * Podem ser importadas de arquivos JSON (formato especificado no painel) ou CSV.
    * Podem ser exportadas para JSON ou CSV.
* **Participantes:**
    * Registros salvos automaticamente após cada partida.
    * Visualizáveis e exportáveis (JSON/CSV) no painel.
* **Configurações e Personalizações:**
    * Salvas no `localStorage` através das respectivas seções no painel administrativo.
* **Backup e Restauração:**
    * **ESSENCIAL:** Faça backups regulares usando a funcionalidade "Exportar Backup Completo" no painel. Isso gera um arquivo JSON com *todos* os dados do quiz. Guarde este arquivo em local seguro.
    * Para restaurar ou transferir o quiz para outra máquina/navegador, use a função "Importar Backup" e selecione o arquivo JSON gerado anteriormente. **Isso sobrescreverá todos os dados existentes no navegador de destino.**

## 8. Personalização Detalhada

O painel administrativo (`admin.html`) oferece amplas opções de personalização:

* **Textos da Interface:** Na seção "Personalização do Quiz", é possível modificar a maioria dos textos exibidos aos participantes, como títulos de tela, slogans, textos de botões, mensagens de modais e placeholders de campos de formulário.
* **Esquema de Cores:** Na mesma seção, é possível definir as cores principais da interface, incluindo fundos, botões (primários e secundários), textos principais, cores de destaque, e cores para as opções de resposta (padrão, correta, incorreta).
* **Tamanhos de Fonte:** Ajuste os tamanhos de fonte para elementos chave como o slogan inicial, a chamada para ação na tela de descanso, botões principais e o texto das perguntas.
* **Logotipo:** Substitua o logotipo padrão da CAESB por um personalizado. O arquivo de imagem deve ser colocado na pasta `assets/` e o nome do arquivo (ex: `meu_logo.png`) deve ser informado nas "Configurações Gerais".
* **Imagem de Fundo:** Defina uma imagem de fundo para o quiz. O arquivo também deve estar na pasta `assets/` e o nome configurado nas "Configurações Gerais". Se habilitada, esta imagem substituirá a cor de fundo principal.

## 9. Considerações Importantes

* **Funcionamento Offline:** Este é um sistema 100% client-side. Não há comunicação com servidores externos.
* **Persistência de Dados:** Os dados dependem do `localStorage` do navegador. Limpar o cache do navegador ou usar o modo de navegação anônima pode resultar na perda de dados.
* **Backup Regular:** Dada a natureza local do armazenamento, a realização de backups frequentes através da funcionalidade administrativa é **altamente recomendada** para evitar perdas de dados.
* **Limites do `localStorage`:** O `localStorage` possui um limite de armazenamento (geralmente 5-10MB por domínio). Para eventos com um volume extremamente alto de participantes e histórico de respostas detalhado, este limite pode, teoricamente, ser atingido, embora seja improvável para a maioria dos casos de uso previstos.
* **Segurança da Administração:** A senha do administrador está no código JavaScript. Para ambientes onde a segurança do painel é crítica e o acesso físico à máquina não pode ser restrito, esta abordagem tem limitações.

## 10. Possíveis Melhorias Futuras (Para Versões Online)

Se o projeto evoluir para uma versão online, as seguintes melhorias poderiam ser consideradas:
* **Backend e Banco de Dados:** Para armazenamento centralizado e seguro de dados, ranking global, e gerenciamento multiusuário.
* **Autenticação Robusta:** Sistema de login seguro para administradores.
* **APIs:** Para integração com outros sistemas, se necessário.
* **Recursos em Tempo Real:** Como placares atualizados ao vivo.

---

Este README.md visa fornecer uma documentação completa do estado atual do projeto Quiz CAESB.
