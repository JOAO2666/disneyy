<a name="readme-top"></a>

<div align="center">
    <img src="https://i0.wp.com/www.appletips.nl/wp-content/uploads/2019/09/disney-logo.png?fit=1550%2C1550&ssl=1" alt="Logo" width='200' style="border-radius:50px">
  <h2 align="center">Clone do Disney Plus</h1>
    <br />
    <a href="https://disney-plus-joao2666.netlify.app">Ver Demo</a>
    ·
    <a href="https://github.com/JOAO2666/Disney">Explorar Documentação</a>
</div>

<details open="open">
  <summary>Índice</summary>
  <ol>
    <li>
      <a href="#sobre-o-projeto">Sobre o Projeto</a>
      <ul>
        <li><a href="#uso">Uso</a></li>
      </ul>
    </li>
      <li><a href="#credenciais-de-exemplo">Credenciais de Exemplo</a></li>
    <li>
      <a href="#como-começar">Como Começar</a>
      <ul>
        <li><a href="#pré-requisitos">Pré-requisitos</a></li>
        <li><a href="#instalação">Instalação</a></li>
      </ul>
    </li>
    <li><a href="#contato">Contato</a></li>
  </ol>
</details>

<!-- SOBRE O PROJETO -->

## Sobre o Projeto

Este projeto é uma tentativa de clonar o aplicativo Disney+. Até o momento, foi construído com React, Redux Toolkit, React Router, Tanstack Query, Vite, styled components, Material UI, Framer Motion, Firebase, a API do TMDB e outras bibliotecas de terceiros como React Spinners. Além disso, é totalmente responsivo e segue o conceito mobile-first.

<!-- CAPTURAS DE TELA DESKTOP -->
<img src="./src/assets/screenshots/desktop/homepage.png"/>

<img src="./src/assets/screenshots/desktop/details.png"/>

<img src="./src/assets/screenshots/desktop/searchquery.png"/>

<img src="./src/assets/screenshots/desktop/movies.png"/>

<!-- CAPTURAS DE TELA MOBILE -->

<img src="./src/assets/screenshots/mobile/homepage.png" width="45%"/> <img src="./src/assets/screenshots/mobile/details.png" width="45%"/>

<img src="./src/assets/screenshots/mobile/search.png" width="45%"/> <img src="./src/assets/screenshots/mobile/errorpage.png" width="45%"/>



https://github.com/mkwiecien00/disney-plus-clone/assets/99047592/8781318b-0afc-45b1-a19a-4b7b33fdcc4a


https://github.com/mkwiecien00/disney-plus-clone/assets/99047592/3c2c1136-b330-4fda-86fc-1dc3003b2613




<p align="right">(<a href="#readme-top">voltar ao topo</a>)</p>

### Uso

Este aplicativo foi criado para desenvolver minhas habilidades em programação com React e na utilização de um ambiente relacionado ao React.

Para usuários conectados, os links funcionais no aplicativo são: página inicial do Disney+, página de Detalhes de Filme/Série, página de Busca, página Minha Lista e as páginas de Filmes/Séries.
Para aqueles que não estão conectados, só é possível visualizar a Página Inicial, mas sem a possibilidade de ir mais adiante.
Para esses usuários, no canto superior direito da Página Inicial, há um botão 'COMEÇAR', que leva o usuário a uma Página de Login/Cadastro.
Uma vez conectado à plataforma, o usuário tem acesso total a ela.

No momento, o aplicativo oferece ao usuário, entre outras coisas:

- a possibilidade de exibir dados em tempo real graças à API do TMDB,
- a exibição de detalhes para cada recurso, incluindo o vídeo do trailer,
- a busca e exibição de recursos que contêm uma frase digitada pelo usuário,
- a possibilidade de armazenar recursos escolhidos individualmente por cada usuário para serem visualizados,
- e a capacidade de buscar recursos de gêneros específicos, por exemplo, buscar apenas documentários.

Ao visitar outras páginas, com a navegação, uma página de erro é exibida graças ao React Router, pois as URLs das páginas não são reconhecíveis.
Este aplicativo possui rotas protegidas que só podem ser acessadas por usuários conectados. Sempre que uma pessoa não conectada quiser acessar uma página protegida, um painel de login é exibido.

Os usuários são desconectados após 5 minutos de inatividade.




<p align="right">(<a href="#readme-top">voltar ao topo</a>)</p>

<!-- CREDENCIAIS DE EXEMPLO -->

## Credenciais de Exemplo

**Dados de login de exemplo, por favor insira-os no painel de login para usar este aplicativo:**

- login: test@test.com
- senha: test123

<p align="right">(<a href="#readme-top">voltar ao topo</a>)</p>

<!-- COMO COMEÇAR -->

## Como Começar

### Pré-requisitos

- Node.js instalado na sua máquina.
- Para fazer este projeto funcionar ao hospedá-lo no GitHub Pages, eu codifiquei diretamente minha própria chave de API do TMDB e a configuração do Firebase.

No entanto, observe que a boa prática é armazenar as credenciais como variáveis de ambiente e usar o gitignore no arquivo .env para ocultá-las no repositório público. Também é importante modificar o código do seu site para acessar as chaves de API a partir das variáveis de ambiente em vez de codificá-las diretamente.

Se você quiser usar sua própria chave de API do TMDB, pode obtê-la criando uma conta no site [TMDB](https://www.themoviedb.org/). Por favor, siga a [documentação](https://developers.themoviedb.org/3/getting-started/introduction) para criar a chave de API.
Você também pode querer usar sua própria configuração do Firebase, e para isso precisará de uma conta no [Firebase](https://firebase.google.com). Depois, você deve criar um projeto na sua conta Firebase dedicado a este projeto Disney+.

### Instalação

1. Clone o repositório:

   ```
   git clone https://github.com/JOAO2666/Disney.git
   ```

2. Navegue até o diretório do projeto:

   ```
   cd Disney
   ```

3. Instale as dependências:

   ```
   npm install
   ```

4. Inicie o servidor de desenvolvimento:

   ```
   npm run dev
   ```

5. Abra seu navegador e acesse http://localhost:5173 para visualizar o aplicativo.

<p align="right">(<a href="#readme-top">voltar ao topo</a>)</p>

<!-- CONTATO -->

## Contato

GitHub - [JOAO2666](https://github.com/JOAO2666)

<p align="right">(<a href="#readme-top">voltar ao topo</a>)</p>
