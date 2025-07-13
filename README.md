# realtime-chatapp

## Tabela de Conteúdo
- [Overview](#overview)
  - [Ferramentas](#ferramentas-utilizadas)
- [Documentação](#documentação)
  - [Instalação](#instalação)
    - [Docker](#docker)
    - [Node.js](#nodejs)
  - [Uso](uso)

## Overview

Uma aplicação web de conversação em tempo real, semelhante ao WhatsApp, Telegram ou Discord, com um design próprio e diversas features. Além da conversa por texto, permite o envio de anexos como imagens, arquivos, contatos, pre-visualização de arquivos pdf, mas também aúdios e o uso de emojis. O projeto também tem recursos de autenticação com o Google, adição e gerenciamente de diversos contatos e alteração da imagem de perfil e adaptabilidade (responsibidade) em diferentes dispositivos, tanto em aparelhos mobile quanto desktop. Toda a resposta e o estado da aplicação tem feedback em tempo real, como um chat deve ser.

<blockquote>
<p dir="auto">Este projeto está em desenvolvimento e ainda não foi concluído.
Atualmente, apenas o frontend, alguns dados simulados e pequenas features no backend com o Firebase.
Estou sempre trabalhando e features novas nesse projeto em meu tempo livre</p>
</blockquote>

Um resumo do projeto:
<ul>
  <li>Atualização e feedback em tempo real</li>
  <li>Troca de mensagens por texto</li>
  <li>Permite o envio de audio</li>
  <li>Permite o uso de emojis</li>
  <li>Permite o envio de anexos como: arquivos, imagens, contato</li>
  <li>Pre-visualização de arquivo pdf com o PDF.js</li>
  <li>Autenticação com o Google</li>
  <li>Permite o envio de anexos como: arquivos, imagens, contato</li>
  <li>Design responsivo, adaptável em celular e desktop</li>
  <li>Utilização de docker para a portabilidade em diferentes ambientes</li>
</ul>

### Ferramentas utilizadas
<ul>
  <li>Javascript</li>
  <li>Node.js</li>
  <li>Firebase</li>
  <li>PDF.js</li>
  <li>Docker</li>
  <li>HTML</li>
  <li>Pre-processador SASS (Syntactically Awesome Style Sheets)</li>
  <li>Axios</li>
  <li>Vite</li>
  <li>Dotenv (.env)</li>
  <li>NPM (Gerenciador de dependências)</li>
</ul>

## Documentação

### Instalação

Após clonar o repositório, execute os passos abaixo para completar a instalação do projeto:

Entre dentro do diretório do projeto, abra o terminal e execute os comandos, conforme uma das maneiras listadas abaixo (Docker ou Node.js), para baixar as dependências necessárias e executar o projeto corretamente.

Feito isso, escolha um dos passos de instalação abaixo para continuar a configuração do projeto.

#### Docker

```
sudo docker build -t chat .
```
  Após o docker terminar de construir a imagem, execute o comando:
  
```
sudo docker run -dp 5173:5173 chat
```

#### Node.js

Instale as dependencias necessárias com o comando abaixo:

```javascript
npm install
```

Execute o comando a seguir para iniciar a API

```javascript
npm run dev
```
### Uso

Se configurado corretamente, conforme uma das maneiras mostradas acima e tudo ocorrer conforme o planejado, então o projeto estará pronto para execução.
Acesse um dos seguintes endereços em seu navegador para visualizar o projeto:

Página Inicial (login) - <a>http://localhost:5173</a> </br>
Página principal (chat) - <a>http://localhost:5173/app</a>