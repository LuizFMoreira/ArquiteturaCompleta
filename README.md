# 🏗️ Arquitetura Completa - Spring Boot + React

Bem-vindo ao projeto **Arquitetura Completa**! O objetivo deste repositório é expor na prática como se deve estruturar uma aplicação escalável, separando totalmente as responsabilidades entre Frontend e Backend, além de demonstrar o uso e a validação do **Token JWT** em um ecossistema **Spring Security**.

Para materializar essa estrutura, o escopo está dividido em dois blocos principais:
- ☕ **O Backend (API):** Desenvolvido em Spring Boot com a estrutura e design patterns de Controller -> Facade -> Service -> DAO -> Repository.
- ⚛️ **O Frontend (UI):** Desenvolvido inteiramente em React (Vite + TS) para consumir a API graficamente em "Tempo Real" e comprovar a usabilidade técnica do JWT.

---

## 🏛 Principais Conceitos Arquiteturais Aplicados

Neste sistema, não misturamos regras! Esta é a cadeia estrutural que a requisição percorre e seu significado:

1. **Controller:** Ponto de entrada da request HTTP. Captura payloads (ex: corpo do método LOGIN), envia o trabalho para o nível arquitetural de baixo, converte os retornos da API em DTOs e devolve ao Frontend/Cliente.
2. **Facade:** (Design Pattern "Fachada") Intercepta as intenções complexas do Controller e orquestra diferentes *Services* em um fluxo fechado, abstraindo a alta complexidade para o Controller permanecer enxuto.
3. **Service:** Local da verdadeira Regra de Negócio. É aqui que senhas são encriptadas, validações de regra de uso ocorrem, entre outros.
4. **DAO (Data Access Object):** A nossa ponte de acesso de fato abstrata entre nossa lógica de código e nossa representação do Banco. Se a ferramenta do Banco Mudar no futuro (Ex: sair o Spring Data e usar JDBCTemplate puro ou Hibernate puro), só mexemos aqui. Ele gerencia o `UserRepository`.
5. **Security (JWT):** Adicionamos a classe `JwtAuthenticationFilter` que intercepta requisições, detecta o Cabeçalho **Authorization: Bearer <token>** e converte aquela hash complexa em um Usuário válido do contexto Spring (Liberando acesso dinâmico).

---

## 🏃 Como Rodar a Aplicação na Prática

### 1️⃣ Iniciando a Base de Dados
O sistema utiliza **PostgreSQL** por padrão. Certifique-se de ter um em sua máquina escutando na porta **`5432`**, com o Database `authenticator` criado. As credenciais padrões definidas em código são usuário `postgres` e senha `1234`. *(Altere o `application.properties` se necessário).*

### 2️⃣ Iniciando o Backend
Abra o diretório `/Exemplo_Arquitetura_Completa` diretamente com sua IDE (VS Code, IntelliJ ou Eclipse) e rode a classe Master `JwtRestApiApplication`. Ou rode usando o terminal:
```bash
cd Exemplo_Arquitetura_Completa
./mvnw spring-boot:run
```
> O Maven cuidará do start que acontecerá na porta `8080`. Com o ddl-auto as tabelas serão automaticamente criadas no Database!

### 3️⃣ Iniciando o Frontend Interativo
Abra um terminal paralelo, e rode os seguintes comandos para o React em Vite:
```bash
cd Exemplo_Arquitetura_Completa_Front
npm install
npm run dev
```
> Acesse o endereço resultante (geralmente `http://localhost:5173/`) do seu navegador favorito!

---

## 🔐 Credentials Default - Usuários para Teste

Ao ligar o backend pela 1ª vez, o sistema irá inserir os "Test Users" descritos abaixo! 
Utilize-os para se logar através da **Web UI interativa Front End** e experimentar a extração JWT!

| Tipo de Usuário     | Username         | Password    | Acesso                                                                                |
| ------------------- | ---------------- | ----------- | ------------------------------------------------------------------------------------- |
| **Normal** (USER)   | `joao`           | `4321`      | 🟢 Rota **/user** (Toda autorização Básica permitida)<br>🔴 Rota **/admin** (Falhará)|
| **Master** (ADMIN) | `admin`          | `1234`      | 🟢 Rota **/user** <br>🟢 Rota **/admin** (Acesso total via AuthToken)                |

*(Explore a UI, tente clicar no botão de Admin com a conta do 'João' e perceba o retorno dinâmico contendo erro de falta de autorização vindo do backend em tempo real!)*

---

### 🔥 Feito com
- Configuração Global de **CORS** explícita (*CorsConfig*)
- **BCrypt** de Cifragem para Database
- Vite para Bundler Fast
- Vanilla CSS UI com animações *Glassmorphism*.