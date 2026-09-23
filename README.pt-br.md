<p align="left">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg">
  <img alt="Node" src="https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white">
  <img alt="Firebase" src="https://img.shields.io/badge/backend-Firebase-FFCA28?logo=firebase&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/build-Vite-646CFF?logo=vite&logoColor=white">
</p>

# realtime-chatapp

- [Inglês](README.md) | [Português](README.pt-br.md)

Aplicação web de chat em tempo real, com fluxo de conversas 1 a 1 no estilo WhatsApp/Telegram. O frontend é construído em JavaScript puro (ES Modules, sem framework de UI) com Vite, e todo o backend é fornecido pelo Firebase — autenticação, persistência e sincronização em tempo real via Firestore, com controle de acesso feito inteiramente por Regras de Segurança do Firestore.

> **Tela de Login:** https://myrealtimechat.vercel.app </br>
> **Modo Preview (sem necessidade de login):** https://myrealtimechat.vercel.app/app?mode=preview

## Sumário

- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Segurança](#segurança)
- [Ambiente de demonstração pública e reset automático](#ambiente-de-demonstração-pública-e-reset-automático)
- [Stack tecnológica](#stack-tecnológica)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Instalação e execução](#instalação-e-execução)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Licença](#licença)

## Funcionalidades

### Conversas e mensagens
- Conversas 1 para 1 entre contatos, criadas automaticamente ao adicionar um novo contato.
- Envio e recebimento de mensagens de texto em tempo real, via listeners (`onSnapshot`) do Firestore.
- Criptografia para o conteúdo das mensagens de texto (ver [Segurança](#segurança)).
- Compartilhamento de contatos como anexo dentro da conversa (nome, e-mail e foto do contato compartilhado).
- Limite mínimo de intervalo entre envios (1,5s), aplicado pelas próprias regras do Firestore.
- Pré-visualização de arquivos PDF com PDF.js (renderização da primeira página em `<canvas>`).
- Gravação e reprodução de áudio no navegador (`MediaRecorder` e Web Audio API).
- Captura de fotos pela câmera do dispositivo (`getUserMedia`) e preview de imagens e documentos antes do envio.

> **Sobre o envio de mídia:** a interface tem suporte completo para capturar e pré-visualizar imagens, documentos e áudios. No entanto, a persistência desses tipos de mensagem (`picture`, `file`, `audio`) é bloqueada por padrão de forma deliberada em múltiplas camadas da aplicação — ver [Restrições de envio de mídia](#segurança). No estado atual, apenas mensagens do tipo `text` e `contact-attachment` podem ser efetivamente gravadas no Firestore.

### Contatos
- Adição de contato por e-mail, com criação bilateral (aparece na lista de ambos os usuários).
- Lista de contatos atualizada em tempo real.
- Remoção de contato (soft delete, refletida para as duas partes).
- Cache local de perfis de contato para reduzir leituras redundantes ao Firestore.

### Autenticação e sessão
- Login via Google (Firebase Authentication).
- Aceite obrigatório dos Termos de Uso antes da autenticação, com controle de versão (`termsAcceptedVersion`) — uma nova aceitação é exigida sempre que a versão vigente dos termos muda.
- Verificação de integridade da aplicação com Firebase App Check (reCAPTCHA Enterprise).
- Validação periódica (a cada 30 minutos) da validade do token de acesso, com encerramento automático da sessão local caso o token deixe de ser válido.

### Perfil, preferências e interface
- Seletor de emojis, com lista carregada de uma API externa e mantida em cache local.
- Layout responsivo, adaptado para dispositivos móveis e desktop.

### Exclusão de conta
- Exclusão em duas etapas: a conta é primeiro marcada como excluída (tombstone, preservando apenas dados mínimos) e só pode ser removida definitivamente pelo próprio titular após essa marcação.
- Processo resiliente a interrupções — se a exclusão for interrompida no meio do fluxo, a aplicação identifica e retoma a exclusão pendente na sessão seguinte.
- Quando as duas partes de uma conversa estão marcadas como excluídas, a conversa e suas mensagens tornam-se elegíveis para remoção definitiva.

### Notificações
- Notificações nativas do navegador (Web Notifications API) para novas mensagens, exibidas quando a aba está fora de foco, com prévia do conteúdo — incluindo descriptografia local apenas para exibição da notificação, quando a mensagem é cifrada.

### Modo de demonstração (preview mode)
- Acessível sem autenticação em `/app?mode=preview`, ou pelo botão correspondente na tela de login.
- Mostra uma interface com conteúdo estático de exemplo, sem conexão com contas ou dados reais do Firestore.
- Envio de mídia, edição de perfil e autenticação com o Firebase ficam desabilitados nesse modo.

## Arquitetura

### Padrão geral

O projeto segue uma organização própria inspirada em MVC, sem frameworks de UI (React, Vue etc.):

- **`model/`** — Entidades de domínio e captura de mídia. `AbstractModel` implementa um padrão semelhante a Active Record sobre o Firestore (CRUD genérico + `onSnapshot` para tempo real), do qual `Chat`, `Message` e `User` herdam. `Camera`, `AudioRecorder`, `AudioPlayer`, `RenderImage` e `DocumentHandler` encapsulam a captura e o preview de mídia no navegador.
- **`view/`** — `AbstractView` e as views concretas (`IndexView`, `AppView`) manipulam o DOM diretamente e mantêm o estado de interface.
- **`controller/`** — `IndexController` (tela de login) e `AppController` (aplicação principal) orquestram eventos de UI e chamadas ao Firebase e à camada de serviços.
- **`service/`** — Integrações e regras transversais: `CryptoService` (criptografia), `CloudinaryService` (upload de mídia), `MediaPolicy` (política de bloqueio de mídia), `NotificationService` (notificações) e `CryptoWorker` (Web Worker para PBKDF2).
- **`firebase/`** — `Firestore` (wrapper genérico sobre o SDK: `findById`, `findDocs`, `save`, `savePartial`, `delete`, `deleteCollection`, `batchWrite`, `onSnapshot`), `Authenticator` (login/logout/reautenticação com Google) e `firebaseConfig` (inicialização do app, Firestore e App Check).
- **`destroyer/`** — Subsistema de reset automático (detalhado [adiante](#ambiente-de-demonstração-pública-e-reset-automático)).
- **`interface/`** + `MediaFactory`/`MediaContext` — Strategy Pattern para o tratamento de mídia (`IMediaStrategy` como contrato; `RenderImage` e `DocumentHandler` como estratégias concretas).
- **`exception/`** — Exceções de domínio (`AuthenticationException`, `InvalidArgumentException`, `InvalidStateException`, `NotFoundException`, `NotImplementedException`, `PrimaryKeyException`, `ProtectedAttributeException`).
- **`utils/`** — `LocalStorage` (acesso tipado ao `localStorage`) e `ProfileCache` (cache de perfis de contato).

A aplicação é uma SPA com dois pontos de entrada HTML, compilados separadamente pelo Vite: `index.html` (login/apresentação) e `app.html` (aplicação principal). Não há servidor de WebSocket nem Cloud Functions — toda a sincronização em tempo real é feita por listeners `onSnapshot` do Firestore.

### Modelo de dados no Firestore

- **`user/{email}`** — Documento de usuário (`name`, `email`, `picture`/`profilePicture`, `about`, `publicKey`, `encryptedPrivateKey`, `termsAcceptedVersion`/`termsAcceptedAt`, `isDeleted`/`deletedAt`, `lastMessageAt`, `countedInMetadata`). O e-mail é o ID do documento.
  - **`user/{email}/contacts/{contactEmail}`** — Subcoleção de contatos (`name`, `picture`, `profilePicture`, `chatId`, `isDeleted`).
- **`chats/{chatId}`** — Conversa entre exatamente dois participantes (`participantEmails`, `users` — mapa com os e-mails codificados em base64 como chave —, `lastMessage`).
  - **`chats/{chatId}/messages/{messageId}`** — Mensagens da conversa (`from`, `type`, `content`/`encryptedContent`, `timeStamp`, campos de anexo de contato quando aplicável).
- **`reset_actor/{email}`** — Coordenação do lock distribuído do sistema de reset.
- **`_system/metadata`, `_system/schedule`, `_system/reset_lock`, `_system/crypto`** — Documentos internos: contagem de usuários/resets, agendamento do próximo reset, lock de execução e salt dinâmico de criptografia.

## Segurança

A aplicação combina múltiplas camadas de proteção independentes entre si. Nenhuma delas é apresentada aqui como garantia absoluta — são camadas de defesa que se somam.

### Regras de segurança do Firestore

As regras (`firestore.rules`) validam no servidor tanto o acesso quanto o formato dos dados gravados. Pontos relevantes:

- **Participação na conversa** — leitura e escrita de mensagens exigem que o usuário autenticado seja um dos dois participantes da conversa.
- **Validação de payload de mensagem** — o campo `type` só aceita `text` ou `contact-attachment`; texto tem limite de 600 caracteres; campos de criptografia (`encryptedContent`, `iv`, `encryptedKey`, `senderKey`) têm tamanho máximo definido; o remetente declarado precisa corresponder ao usuário autenticado.
- **Limite de frequência no servidor** — intervalo mínimo de 1,5s entre mensagens de um mesmo usuário, verificado a partir de `lastMessageAt` no documento do usuário.
- **Aceite de termos como pré-condição** — criar conversas ou enviar mensagens exige `termsAcceptedVersion` preenchido no documento do usuário.
- **Contas excluídas** — usuários com `isDeleted: true` não conseguem criar conversas nem enviar mensagens; a exclusão definitiva de um documento de usuário só é permitida se ele já estiver marcado como excluído.
- **Contadores atômicos via regras** — o documento `_system/metadata` (contagem de usuários ativos e de resets) só aceita transições específicas e incrementais, validadas inteiramente nas regras do Firestore, sem Cloud Functions.

### Restrições de envio de mídia

A instância desse projeto bloqueia o envio de mídias e arquivos em geral por padrão, sendo necessário alterar deliberadamente as regras Firebase para habilitar essa feature sem qualquer trava. O envio de imagens, arquivos e áudios é controlado por três camadas independentes, reduzindo a superfície de risco associada a conteúdo enviado por usuários:

1. **Variável de ambiente (`VITE_BLOCK_MEDIA`)** — lida por `MediaPolicy`, que expõe `isUploadAllowed()`/`assertUploadAllowed()`. Quando ativa, a interface oculta os controles relacionados (câmera, envio de imagem, documento e áudio) e `CloudinaryService` recusa qualquer upload antes mesmo de montar a requisição.
2. **Serviço de mídia (Cloudinary)** — o upload, quando permitido pela camada acima, depende de `VITE_CLOUDINARY_CLOUD_NAME`/`VITE_CLOUDINARY_UPLOAD_PRESET` estarem configurados. O próprio subsistema de reset trata o Cloudinary como não utilizável por padrão em ambiente de produção: o `CloudinaryDestroyer` não executa nenhuma limpeza, registrando o motivo `media_blocked_in_production`.
3. **Regras do Firestore** — independentemente do que o cliente envie, a validação de payload só aceita `type: 'text'` ou `type: 'contact-attachment'`. Uma mensagem `picture`, `file` ou `audio` é rejeitada pelo banco de dados mesmo que a camada de cliente seja contornada.

Essas três camadas não dependem uma da outra: nenhuma isoladamente é o único ponto de controle.

### Criptografia

Mensagens de texto são cifradas de ponta a ponta com a Web Crypto API:

- Cada usuário tem um par de chaves ECDH (curva P-256); a chave privada é gerada no navegador e mantida como `CryptoKey` não extraível no IndexedDB.
- Um backup cifrado da chave privada é salvo no Firestore (`encryptedPrivateKey`), protegido por uma chave derivada via PBKDF2 (executado em Web Worker) a partir do UID do Firebase, um salt fixo da aplicação (`VITE_CRYPTO_SALT`) e um salt dinâmico armazenado em `_system/crypto` — rotacionado a cada reset da instância quando o subsistema de reset está ativado para fins de demonstração da aplicação. Isso permite recuperar a chave ao acessar de um novo dispositivo sem expor a chave privada em texto puro.
- Cada mensagem usa um par de chaves ECDH efêmero (descartado após o uso) para derivar, via ECDH + HKDF (SHA-256), uma chave de empacotamento (AES-KW) que envolve uma chave de sessão AES-256-GCM exclusiva daquela mensagem. A chave de sessão é empacotada duas vezes — uma para o destinatário e outra para o próprio remetente — permitindo que ambos os lados decifrem o histórico posteriormente.

### Cabeçalhos e política de conteúdo

Em produção (Vercel), a aplicação define cabeçalhos HTTP de segurança para todas as respostas: `Content-Security-Policy` restritiva (lista explícita de origens permitidas para scripts, estilos, imagens, conexões e frames), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` e uma `Permissions-Policy` que restringe câmera e microfone à própria origem e bloqueia geolocalização.

## Ambiente de demonstração pública e reset automático

A instância pública opera como ambiente de demonstração: qualquer pessoa pode criar conta e testar a aplicação, mas o banco de dados da aplicação é periodicamente resetado. Um subsistema dedicado (`destroyer/`) monitora e executa o reset de maneira periódica:

- **Gatilhos configuráveis** — um reset pode ser disparado por tempo (`VITE_RESET_INTERVAL_HOURS`/`VITE_RESET_INTERVAL_MINUTES`) e/ou ao atingir um número máximo de usuários (`VITE_MAX_USERS`). Cada gatilho fica desabilitado se sua variável não for definida ou for zero.
- **Lock distribuído** — como não há servidor dedicado, qualquer cliente conectado pode disparar o reset. Um lock com expiração (`_system/reset_lock`, com tolerância de 5 minutos para locks travados) e um registro por usuário (`reset_actor/{email}`) garantem que apenas um cliente execute o processo por vez.
- **Execução** — o `DestroyerOrchestrator` aciona a limpeza do Firestore (mensagens, conversas, contatos e usuários, em lotes via `writeBatch`) e reporta o status de cada etapa. A limpeza de mídia no Cloudinary é tratada como não aplicável (não há mídia para limpar); a exclusão de contas no Firebase Authentication também não é executada nesse ciclo, por depender de uma ação do próprio titular a partir do cliente — não há Cloud Functions ou backend privilegiado no projeto para removê-las de forma centralizada.
- **Sincronização entre sessões** — tanto a tela de login quanto a aplicação principal escutam a contagem de resets em tempo real; ao detectar um novo ciclo, a sessão local (token, cache de perfil, UID) é limpa automaticamente.
- **Modo preview** — quem preferir não criar conta pode explorar a interface, com dados estáticos de exemplo, acessando `/app?mode=preview` sem se autenticar.

## Stack tecnológica

| Camada | Tecnologias |
|---|---|
| Ambiente de execução | Node.js 22 |
| Build/Bundler | Vite |
| Linguagem | JavaScript (ES Modules, sem framework de UI) |
| Estilos | SASS |
| Backend/Persistência | Firebase (Authentication, Firestore) |
| Integridade de acesso | Firebase App Check (reCAPTCHA Enterprise) |
| Criptografia | Web Crypto API (ECDH P-256, AES-GCM, AES-KW, HKDF) + Web Worker para PBKDF2 |
| Upload de mídia | Cloudinary (sujeito às restrições descritas em [Segurança](#segurança)) |
| Preview de PDF | PDF.js (`pdfjs-dist`) |
| Markdown | `marked` (renderização dos Termos de Uso) |
| Requisições HTTP | Axios |
| Containerização | Docker |
| Hospedagem de referência | Vercel |

## Variáveis de ambiente

Configuradas via um arquivo `.env` na raiz do projeto (modelo em `.env.example`). Nenhum valor real é exposto nesta documentação — apenas a finalidade de cada variável.

| Variável | Finalidade | Obrigatória |
|---|---|---|
| `VITE_API_KEY` | Web API Key do projeto Firebase. | Sim |
| `VITE_AUTH_DOMAIN` | Domínio de autenticação do Firebase. | Sim |
| `VITE_PROJECT_ID` | ID do projeto Firebase. | Sim |
| `VITE_STORAGE_BUCKET` | Bucket do Firebase associado ao projeto. | Sim |
| `VITE_MESSAGING_SENDER_ID` | Sender ID do Firebase. | Sim |
| `VITE_APP_ID` | ID do app Firebase. | Sim |
| `VITE_RECAPTCHA_SITE_KEY` | Chave de site do reCAPTCHA Enterprise, usada pelo Firebase App Check. | Sim |
| `VITE_APPCHECK_DEBUG_TOKEN` | Token de depuração do App Check, considerado apenas em `localhost`/`127.0.0.1`. | Somente em desenvolvimento local |
| `VITE_STORAGE_KEY` | Nome da chave usada para persistir o token de acesso no `localStorage`. | Sim |
| `VITE_TOKEN_VALIDATOR` | Endpoint usado para validar periodicamente (a cada 30 min) se o token de acesso do Google ainda é válido. | Sim |
| `VITE_ICON_KEY` | Endpoint (com chave) do serviço externo usado para carregar a lista de emojis. | Recomendada — sem ela, o seletor de emojis fica vazio |
| `VITE_BLOCK_MEDIA` | Quando `true`, desabilita o envio de imagens, arquivos e áudios na interface e bloqueia as chamadas de upload no cliente. | Opcional (ausente/`false` = mídia não bloqueada nessa camada) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloud name da conta Cloudinary usada para upload de mídia. | Necessária apenas se o envio de mídia estiver habilitado |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Upload preset sem assinatura, usado pelo Cloudinary. | Necessária apenas se o envio de mídia estiver habilitado |
| `VITE_CRYPTO_SALT` | Salt fixo da aplicação, combinado a um salt dinâmico na derivação da chave que protege o backup da chave privada de criptografia. | Sim, para o funcionamento correto da criptografia |
| `VITE_MAX_USERS` | Número máximo de usuários simultâneos antes de disparar um reset automático. | Opcional (ausente/`0` desabilita esse gatilho) |
| `VITE_RESET_INTERVAL_HOURS` / `VITE_RESET_INTERVAL_MINUTES` | Intervalo entre resets automáticos agendados por tempo. | Opcional (ausente/`0` desabilita esse gatilho) |
| `VITE_GITHUB_URL` / `VITE_LINKEDIN_URL` / `VITE_PORTFOLIO_URL` | Links sociais exibidos na tela de login. | Opcional |

## Instalação e execução

### Pré-requisitos
- Um projeto Firebase com Authentication (provedor Google habilitado) e Firestore, com as regras de `firestore.rules` publicadas.
- Node.js 22+ (execução local sem Docker) ou Docker.
- Uma conta Cloudinary — opcional, necessária apenas se o envio de mídia estiver habilitado.

### Configuração
1. Clone o repositório.
2. Copie `.env.example` para `.env` e preencha as variáveis com os valores do seu próprio projeto (ver [Variáveis de ambiente](#variáveis-de-ambiente)).
3. Opcionalmente, copie `.firebaserc.example` para `.firebaserc` caso pretenda publicar as regras do Firestore pela Firebase CLI.

### Docker
```
sudo docker build -t chat .
```
Após a imagem ser construída:
```
sudo docker run -dp 5173:5173 chat
```

### Node.js
```
npm install
```
```
npm run dev
```
Para expor o servidor de desenvolvimento na rede local (mesmo comportamento usado no container Docker):
```
npm run host
```

### Uso
Com o projeto em execução:

- Tela de login: `http://localhost:5173`
- Aplicação principal (requer autenticação): `http://localhost:5173/app`
- Modo de demonstração, sem autenticação: `http://localhost:5173/app?mode=preview`

### Build de produção
```
npm run build
```
Gera os artefatos estáticos em `dist/`. O deploy de referência da instância pública é feito na Vercel — ver `vercel.json` para os cabeçalhos de segurança aplicados.

## Estrutura do projeto

```
.
├── app.html                  # Entrada HTML da aplicação principal (pós-login)
├── index.html                 # Entrada HTML da tela de login
├── firestore.rules            # Regras de segurança do Firestore
├── firebase.json               # Aponta o Firebase CLI para firestore.rules
├── vite.config.js               # Build multi-entrada (index.html + app.html)
├── vercel.json                   # Cabeçalhos de segurança e CSP para produção
├── Dockerfile
├── .env.example                   # Modelo das variáveis de ambiente
├── .firebaserc.example              # Modelo de configuração do Firebase CLI
├── public/
└── src/
    ├── controller/             # IndexController, AppController
    ├── view/                   # AbstractView, IndexView, AppView
    ├── model/                  # AbstractModel, Chat, Message, User, Camera, AudioRecorder...
    ├── service/                # CryptoService, CloudinaryService, MediaPolicy, NotificationService...
    ├── firebase/                # Firestore, Authenticator, firebaseConfig
    ├── destroyer/                # Orquestrador e subsistema de reset do ambiente de demonstração
    ├── interface/                 # Contratos (ex.: IMediaStrategy)
    ├── exception/                  # Exceções de domínio
    ├── terms/                       # Termos de Uso (PT/EN, Markdown)
    ├── utils/                        # LocalStorage, ProfileCache
    ├── sass/                          # Estilos
    └── assets/                        # Ícones e imagens estáticas
```

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [`LICENSE`](LICENSE) para o texto completo.
