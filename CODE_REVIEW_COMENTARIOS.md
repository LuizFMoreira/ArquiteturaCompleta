# 📋 Code Review — ArquiteturaCompleta

> **Como usar este arquivo:** Abra o PR no GitHub, vá na aba **Files changed**, clique na linha indicada de cada arquivo e cole o comentário correspondente. Comentários gerais podem ser colados na aba **Conversation** do PR.

---

## 🔐 SEGURANÇA

### 💬 Comentário 1 — `Exemplo_Arquitetura_Completa/src/main/java/com/example/JWT_RestAPI/security/JwtUtil.java` (linha 33)

🔍 **Sugestão de melhoria (segurança crítica):** A `SECRET_KEY` é regenerada a cada execução da aplicação (`generateSecretKey()` é chamado no `static final`). Isso significa que **todos os tokens emitidos antes de um restart se tornam inválidos** — usuários são deslogados a cada deploy/reinicialização.

**Sugestão de implementação:**
- Externalizar a chave em `application.properties`:
  ```properties
  app.jwt.secret=${APP_JWT_SECRET:chave-default-apenas-para-dev}
  ```
- Carregar via `@Value("${app.jwt.secret}")` e injetar em um `JwtUtil` que seja `@Component` (não estático). Em produção, o valor deve vir de variável de ambiente ou cofre de segredos (Vault, AWS Secrets Manager, etc.).

---

### 💬 Comentário 2 — `JwtUtil.java` (linha 65)

🔍 **Vazamento de credencial em log:** `System.out.println("Secret Key: " + secretString);` expõe a chave secreta no console — em produção isso vai parar em arquivos de log, ferramentas de observabilidade (Datadog/ELK), e qualquer pessoa com acesso ao log pode forjar tokens válidos.

**Sugestão:**
- **Remover esse log imediatamente.**
- Se precisar de logging para debug local, use SLF4J com nível `DEBUG` (que pode ser desativado em produção): `log.debug("Chave JWT carregada com sucesso");` (nunca logar o conteúdo da chave).

---

### 💬 Comentário 3 — `JwtUtil.java` (linha 88)

🔍 **Outro vazamento sensível:** `System.out.println("Token: " + token);` imprime o token JWT recém-gerado a cada login. Qualquer pessoa com acesso aos logs do servidor consegue se autenticar como o usuário. **Remover.**

---

### 💬 Comentário 4 — `Exemplo_Arquitetura_Completa/src/main/resources/application.properties` (linhas 1-13)

🔍 **Credenciais hardcoded em repositório versionado:** Tanto as senhas de usuários (`joao/4321`, `admin/1234`) quanto a senha do banco (`postgres/1234`) estão em texto puro no repo. Mesmo sendo projeto de aula, é importante demonstrar a prática correta.

**Sugestão de implementação:**
```properties
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/authenticator}
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASSWORD}
```
- Criar `application-dev.properties` (não versionado, listado no `.gitignore`) com os defaults locais.
- Em produção, usar variáveis de ambiente ou `application.yml` por perfil (`@Profile`).

---

### 💬 Comentário 5 — `application.properties` (linha 17)

🔍 **`ddl-auto=update` em produção é arriscado:** Essa configuração permite que o Hibernate altere automaticamente o schema do banco com base nas entidades JPA. Se alguém remover uma `@Column` por engano, pode causar perda de dados ou comportamento inesperado.

**Sugestão:**
- Em dev: `ddl-auto=update` ou `create-drop` está OK.
- Em produção: use `validate` (apenas valida que o schema bate com as entidades) e gerencie alterações via **Flyway** ou **Liquibase** — assim você tem versionamento, rollback e auditoria de mudanças no banco.

---

### 💬 Comentário 6 — `Exemplo_Arquitetura_Completa/src/main/java/com/example/JWT_RestAPI/config/SecurityConfig.java` (linha 69)

🔍 **Bug de autorização:** A linha `.requestMatchers(HttpMethod.GET, "/user/**").permitAll()` libera o endpoint `/user` para **qualquer requisição sem autenticação**. Mas o método `getUser(Authentication authentication)` no `AuthController` depende do `Authentication` injetado pelo filtro — se não houver token, `authentication` será `null` e a chamada quebrará com `NullPointerException`.

**Sugestão:**
```java
.requestMatchers(HttpMethod.GET, "/user/**").authenticated()
```
Assim só usuários autenticados (com JWT válido) conseguem acessar.

---

### 💬 Comentário 7 — `Exemplo_Arquitetura_Completa/src/main/java/com/example/JWT_RestAPI/controller/AuthController.java` (linhas 52-58)

🔍 **Endpoint inseguro:** `@GetMapping("/username/{token}")` recebe o JWT na **URL**. Tokens em URL aparecem em:
- Logs de servidor (nginx, Apache)
- Histórico do navegador
- Headers `Referer` enviados a sites externos
- Sistemas de cache de proxy

**Sugestão:** Remover esse endpoint completamente. O username já está disponível no `Authentication` do contexto do Spring Security após o `JwtAuthenticationFilter` processar o header `Authorization`. Se realmente precisar dele exposto, retorne via `/me` lendo do `SecurityContextHolder` (sem expor o token).

---

## 🏛️ ARQUITETURA E PADRÕES DE PROJETO

### 💬 Comentário 8 — `Exemplo_Arquitetura_Completa/src/main/java/com/example/JWT_RestAPI/facade/AuthFacade.java` (linhas 15-38)

🔍 **Facade sem valor agregado (padrão mal aplicado):** A classe `AuthFacade` apenas delega 1:1 para `AuthService`. O **padrão Facade** existe para *simplificar uma interface complexa de múltiplos subsistemas* — quando há apenas uma chamada de delegação, ele vira **indireção desnecessária** (anti-pattern conhecido como "Lasagna Architecture").

**Benefícios da mudança:**
- Menos código para manter.
- Stack traces mais curtas e legíveis.
- Menos confusão sobre "onde a lógica realmente mora".

**Sugestão de implementação (uma das duas):**
1. **Remover** a `AuthFacade` e injetar `AuthService` diretamente no `AuthController`.
2. **Manter** a Facade *somente se* houver intenção concreta de orquestrar múltiplos serviços (ex.: `AuthService + AuditService + NotificationService`). Documentar essa intenção no JavaDoc.

---

### 💬 Comentário 9 — `Exemplo_Arquitetura_Completa/src/main/java/com/example/JWT_RestAPI/service/AuthService.java` (linhas 22-36)

🔍 **Acoplamento estático ao `JwtUtil`:** `AuthService` chama `JwtUtil.generateToken(...)` diretamente (método estático). Isso impede:
- Testes unitários com mock do `JwtUtil`.
- Substituição da implementação (ex.: trocar JJWT por Nimbus-JOSE no futuro).
- Injeção de configurações dinâmicas (ex.: TTL diferente por perfil).

**Sugestão de implementação:**
- Tornar `JwtUtil` um `@Component` com construtor recebendo `@Value("${app.jwt.secret}")` e `@Value("${app.jwt.expiration-ms}")`.
- Injetar via construtor no `AuthService`:
  ```java
  private final JwtUtil jwtUtil;
  public AuthService(JwtUtil jwtUtil) { this.jwtUtil = jwtUtil; }
  ```

---

### 💬 Comentário 10 — `JwtUtil.java` (linha 28 — classe inteira)

🔍 **Classe utilitária com métodos estáticos dificulta testabilidade:** `JwtUtil` é uma classe utilitária estática (`static SecretKey`, `static String generateToken`). Em Java, métodos estáticos são notoriamente difíceis de mockar (precisa de PowerMock ou Mockito-inline, com overhead grande nos testes).

**Sugestão:** Converter em `@Component` injetável (vide comentário 9). Bonus: a chave secreta deixa de ser regenerada em cada classloader e passa a ser carregada de propriedades.

---

### 💬 Comentário 11 — `SecurityConfig.java` (linhas 102-114)

🔍 **Código comentado deve ser removido:** O bloco `/*@Bean ... InMemoryUserDetailsManager ... */` é lixo visual e pode confundir leitores futuros. Se for histórico relevante, o git já registra.

**Sugestão:** Apagar essas linhas. O git log preserva qualquer versão antiga necessária via `git blame` ou `git log -p`.

---

### 💬 Comentário 12 — `SecurityConfig.java` (linhas 90-100)

🔍 **Princípio da Responsabilidade Única (SRP) violado:** O método `userDetailsService(UserDao)` retorna uma lambda que mapeia `UserEntity → UserDetails`. Isso é lógica de **conversão de modelo**, que não pertence a uma classe de configuração de segurança.

**Benefícios da mudança:**
- `SecurityConfig` fica focada apenas em registrar beans/regras de segurança.
- A lógica de carregamento de usuário fica testável de forma isolada.
- Permite tratar `UsernameNotFoundException` (que é o que o Spring espera) em vez de `RuntimeException` genérica.

**Sugestão de implementação:**
```java
@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    private final UserDao userDao;
    public UserDetailsServiceImpl(UserDao userDao) { this.userDao = userDao; }
    @Override
    public UserDetails loadUserByUsername(String username) {
        return userDao.findByUsername(username)
            .map(u -> User.builder()
                .username(u.getUsername())
                .password(u.getPassword())
                .roles(u.getRole().name())
                .build())
            .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado: " + username));
    }
}
```

---

### 💬 Comentário 13 — `SecurityConfig.java` (linhas 155-168)

🔍 **Mistura de configuração + seed de dados:** O bean `initUsers` faz **inicialização de dados** (popular tabela `users`), o que não tem relação com a configuração de segurança. Isso fere o SRP e torna a classe `SecurityConfig` mais difícil de evoluir.

**Sugestão:** Criar uma classe `DataInitializer`:
```java
@Configuration
public class DataInitializer {
    @Bean
    public CommandLineRunner initUsers(UserDao userDao, PasswordEncoder encoder, SecurityProperties props) {
        return args -> props.getUsers().forEach(u -> {
            if (userDao.findByUsername(u.getUsername()).isEmpty()) {
                userDao.save(new UserEntity(u.getUsername(), encoder.encode(u.getPassword()), u.getRole()));
            }
        });
    }
}
```
Em projetos maiores, esse seed deveria virar uma migration Flyway/Liquibase.

---

## 🧹 QUALIDADE DE CÓDIGO

### 💬 Comentário 14 — `AuthController.java` (linhas 29-31)

🔍 **Comentários de código antigo:** As linhas `// String token = JwtUtil.generateToken(...)` e `// Ao invés de chamarmos JwtUtil diretamente...` parecem documentar a evolução do código, mas isso é responsabilidade do **git log/commit history**. Comentários de "código que já foi assim" poluem o arquivo e desviam a atenção do que está em vigor.

**Sugestão:** Remover. Se quiser preservar a história didática, isso fica melhor em um README ou comentário no commit.

---

### 💬 Comentário 15 — `AuthController.java` (linhas 24-58)

🔍 **Retorno direto de `String`/`LoginResponseDTO` sem `ResponseEntity`:** O controller retorna o objeto diretamente — isso funciona, mas perde a capacidade de:
- Retornar status HTTP customizados (`201 Created` no login? `204 No Content`?).
- Adicionar headers (ex.: `Cache-Control`, `Location`).
- Tratar respostas de erro com status correto sem depender só do `@ExceptionHandler`.

**Sugestão:**
```java
@PostMapping("/login")
public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
    // ...
    return ResponseEntity.ok(new LoginResponseDTO(token, roles));
}
```

---

### 💬 Comentário 16 — `Exemplo_Arquitetura_Completa/src/main/java/com/example/JWT_RestAPI/dto/LoginRequestDTO.java`

🔍 **DTO sem validação:** As propriedades `username` e `password` não têm anotações de validação. O endpoint aceita corpo JSON `{}` (sem campos) e quebra mais para frente — o usuário recebe um erro críptico em vez de "campo obrigatório".

**Sugestão de implementação:**
```java
import jakarta.validation.constraints.NotBlank;

public class LoginRequestDTO {
    @NotBlank(message = "Username é obrigatório")
    private String username;
    @NotBlank(message = "Password é obrigatório")
    private String password;
    // ...
}
```
E no controller: `public ResponseEntity<...> login(@Valid @RequestBody LoginRequestDTO ...)`. Adicionar dependência `spring-boot-starter-validation` no `pom.xml`. Tratar `MethodArgumentNotValidException` no `GlobalExceptionHandler` retornando 400.

---

### 💬 Comentário 17 — `JwtUtil.java` (linha 44)

🔍 **Expiração de 10 dias sem refresh token:** `EXPIRATION_TIME = 864_000_000ms` (10 dias) é uma janela muito grande. Se o token vazar (XSS, log mal protegido), o atacante tem 10 dias de acesso sem possibilidade de revogação.

**Sugestão:**
- Access token com vida curta (15min a 1h) + **refresh token** com vida mais longa armazenado em `HttpOnly cookie` ou tabela com revogação.
- Externalizar a expiração: `app.jwt.expiration-ms=3600000` (1h) e injetar via `@Value`.
- Documentar a escolha do TTL com base no perfil de segurança da aplicação.

---

### 💬 Comentário 18 — `Exemplo_Arquitetura_Completa/src/main/java/com/example/JWT_RestAPI/security/JwtAuthenticationFilter.java` (linhas 57-60)

🔍 **Logging amador no filtro:** `System.out.println("Erro ao processar JWT: " + e.getMessage())` ignora todo o stack de logging configurado (logback) — esse output não tem timestamp, nível, thread, contexto, e não vai para o destino certo em produção (arquivo, ELK, etc.).

**Sugestão:**
```java
private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
// ...
} catch (Exception ex) {
    log.warn("Falha ao validar JWT: {}", ex.getMessage());
}
```
Bonus: capturar tipos específicos (`ExpiredJwtException`, `MalformedJwtException`) já está sendo tratado pelo `GlobalExceptionHandler` — confirmar que o fluxo do filtro não engole o erro silenciosamente.

---

### 💬 Comentário 19 — `Exemplo_Arquitetura_Completa/src/main/java/com/example/JWT_RestAPI/security/JwtUtil_Old.java`

🔍 **Dead code:** `JwtUtil_Old.java` está marcada como `@Deprecated` e usa API antiga do JJWT. Manter código morto no repositório:
- Confunde quem entra no projeto.
- Aumenta a chance de alguém importar a classe errada por engano.
- Polui métricas de cobertura, complexidade ciclomática, etc.

**Sugestão:** Apagar o arquivo. O git preserva o histórico se um dia for preciso consultar.

---

## ⚛️ FRONTEND

### 💬 Comentário 20 — `Exemplo_Arquitetura_Completa_Front/src/App.tsx` (linha 10)

🔍 **URL da API hardcoded:** `const API_URL = 'http://localhost:8080';` impede o build do frontend de funcionar em qualquer ambiente que não seja localhost.

**Sugestão (padrão Vite):**
```typescript
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
```
E adicionar um `.env.example` com `VITE_API_URL=http://localhost:8080`. Em produção/staging, o build pega da variável de ambiente.

---

### 💬 Comentário 21 — `App.tsx` (linha 13)

🔍 **Token armazenado apenas em `useState`:** O token vive só na memória do componente — qualquer refresh da página (F5, navegação) **desloga o usuário**. Péssima UX.

**Sugestão:**
- Salvar em `sessionStorage` (some quando a aba fecha — bom balance entre UX e segurança):
  ```typescript
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));
  // No setToken bem-sucedido:
  sessionStorage.setItem('token', data.token);
  // No logout:
  sessionStorage.removeItem('token');
  ```
- Para mais segurança contra XSS, considere `HttpOnly cookie` no backend (mas exige mudança no fluxo de auth).

---

### 💬 Comentário 22 — `App.tsx` (linha 54)

🔍 **`catch (err: any)` perde os benefícios do TypeScript:** Usar `any` em catch desativa toda a checagem de tipo dentro do bloco. Em TS 4.4+, o padrão é `unknown`.

**Sugestão:**
```typescript
catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao conectar com o servidor';
    setError(message);
}
```

---

### 💬 Comentário 23 — `App.tsx` (linhas 70-113)

🔍 **Duplicação de código (viola DRY):** As funções `testUserRoute` e `testAdminRoute` são praticamente idênticas — só mudam a URL e o `setState`. Toda manutenção precisa ser feita em dois lugares.

**Sugestão de implementação:** Extrair uma função/cliente HTTP único:
```typescript
async function callProtectedRoute(path: string, token: string): Promise<string> {
    const response = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Erro ${response.status}: ${text}`);
    return text;
}
```
Depois, cada handler vira de 1-2 linhas. Em projetos maiores, vale usar Axios ou TanStack Query.

---

### 💬 Comentário 24 — `App.tsx` (arquivo inteiro, ~215 linhas)

🔍 **Componente monolítico:** `App.tsx` mistura responsabilidades:
- Estado de autenticação (login, logout, token, roles).
- Formulário de login (JSX + handlers).
- Dashboard com cards.
- Lógica de chamadas HTTP.

**Sugestão de implementação:** Quebrar em arquivos por responsabilidade:
```
src/
├── api/
│   └── client.ts           // login(), callProtectedRoute()
├── hooks/
│   └── useAuth.ts          // gerencia token + login/logout
├── components/
│   ├── LoginForm.tsx
│   ├── Dashboard.tsx
│   └── RouteTestCard.tsx
└── App.tsx                 // só faz roteamento entre LoginForm e Dashboard (~20 linhas)
```
Benefícios: cada arquivo testável isoladamente, reuso, leitura mais fácil, escalabilidade para próximas features.

---

## 📊 RESUMO

| Categoria | Comentários |
|---|---|
| Segurança | 7 |
| Arquitetura / Padrões | 6 |
| Qualidade de código | 6 |
| Frontend | 5 |
| **Total** | **24** |

---

## ✅ PONTOS POSITIVOS (mencionar no corpo do PR)

- ✅ Separação clara em camadas (Controller → Facade → Service → DAO → Repository).
- ✅ Uso do padrão **DAO** desacoplando o `Spring Data JPA` do resto da aplicação — excelente prática.
- ✅ Tratamento centralizado de exceções com `@RestControllerAdvice`.
- ✅ Senhas armazenadas com BCrypt (não em texto puro).
- ✅ DTOs separando contrato da API da entidade JPA.
- ✅ `JwtAuthenticationFilter` herda corretamente de `OncePerRequestFilter`.
- ✅ Frontend com TypeScript estrito + tipagem das respostas da API.
