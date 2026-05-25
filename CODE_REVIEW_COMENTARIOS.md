# Code Review - ArquiteturaCompleta

Comentários para colar no PR. Cada um indica arquivo e linha.

---

## Segurança

### 1. JwtUtil.java, linha 33

A SECRET_KEY tá sendo gerada toda vez que a aplicação sobe (`generateSecretKey()` no static final). Isso significa que se reiniciar o servidor, todos os tokens que já foram emitidos viram lixo e o pessoal precisa logar de novo. O ideal seria carregar a chave de uma propriedade no application.properties, tipo:

```properties
app.jwt.secret=${APP_JWT_SECRET}
```

E injetar com `@Value`. Em prod a chave vem de uma variável de ambiente.

---

### 2. JwtUtil.java, linha 65

Esse `System.out.println("Secret Key: " + secretString)` é meio perigoso. Em produção isso vai parar no log e quem tiver acesso ao log consegue forjar token. Pode tirar tranquilo.

---

### 3. JwtUtil.java, linha 88

Mesma coisa do anterior, o `println` do token gerado também não devia tá aí. Cada login imprime o JWT inteiro no console.

---

### 4. application.properties, linhas 1-13

As senhas dos usuários e a do banco tão fixas no arquivo. Sei que é projeto de aula, mas pra mostrar a prática certa daria pra fazer:

```properties
spring.datasource.password=${DB_PASSWORD}
```

E colocar um `application-dev.properties` no .gitignore com os valores locais.

---

### 5. application.properties, linha 17

`ddl-auto=update` pode dar dor de cabeça em produção. Se alguém remover uma @Column sem querer, o Hibernate altera o schema sozinho. Pra dev tá ok, mas a recomendação é usar `validate` em prod e gerenciar mudanças de schema com Flyway ou Liquibase.

---

### 6. SecurityConfig.java, linha 69

Acho que tem um bug aqui: `/user/**` tá como `permitAll()`, mas o método `getUser` do controller depende do `Authentication` injetado. Se chegar uma request sem token, o `authentication` vem null e quebra. Acho que o certo seria `.authenticated()`.

---

### 7. AuthController.java, linhas 52-58

Esse endpoint `/username/{token}` recebe o JWT pela URL. Token em URL vaza fácil — vai pro log do nginx, pro histórico do navegador, pro Referer se a página tiver link externo. Como o username já tá disponível pelo `Authentication` do Spring depois que o filtro processa o header, daria pra remover esse endpoint.

---

## Arquitetura e padrões

### 8. AuthFacade.java, linhas 15-38

Reparei que a Facade só faz delegação 1:1 pro AuthService. O padrão Facade existe pra simplificar a interface de vários subsistemas, mas aqui ele só adiciona uma camada de indireção. Ou você usa pra orquestrar mais coisa (tipo AuthService + AuditService + cache), ou daria pra remover e injetar o AuthService direto no controller. Como tá hoje, fica meio "código a mais sem motivo".

---

### 9. AuthService.java, linhas 22-36

O service chama `JwtUtil.generateToken(...)` direto, que é método estático. Isso dificulta teste unitário (pra mockar método estático precisa de PowerMock ou Mockito-inline). Se o JwtUtil fosse @Component e injetado pelo construtor, ficaria bem mais fácil de testar.

---

### 10. JwtUtil.java (classe inteira)

Junto com o comentário acima — classe utilitária só com static é um padrão antigo de Java. Hoje em dia o pessoal prefere tornar @Component injetável, fica mais flexível e testável. Ainda dá pra ler a chave do application.properties pelo construtor.

---

### 11. SecurityConfig.java, linhas 102-114

Esse bloco comentado do `InMemoryUserDetailsManager` poderia sair. Se um dia precisar voltar, o git guarda.

---

### 12. SecurityConfig.java, linhas 90-100

Achei que a lógica de mapear UserEntity pra UserDetails dentro da SecurityConfig deixa a classe com muita responsabilidade. Acho que extrair pra um `UserDetailsServiceImpl` próprio (implementando `UserDetailsService`) deixaria a SecurityConfig mais focada só em configurar regras de segurança. Bônus: dá pra usar `UsernameNotFoundException` no lugar de `RuntimeException` genérica, que é o que o Spring espera.

---

### 13. SecurityConfig.java, linhas 155-168

O `CommandLineRunner initUsers` faz seed de dados, que não tem muito a ver com configuração de segurança. Daria pra mover pra uma classe `DataInitializer` separada. Em projeto maior, esse seed vira migration do Flyway.

---

## Qualidade de código

### 14. AuthController.java, linhas 29-31

Esses comentários com código antigo (`// String token = JwtUtil.generateToken(...)`) atrapalham um pouco a leitura. A intenção foi explicar a evolução, mas isso fica melhor no histórico de commit ou em um README didático.

---

### 15. AuthController.java, linhas 24-58

Os métodos retornam direto a String/DTO. Funciona, mas se um dia precisar customizar o status HTTP (201 no login? headers?), vai precisar refatorar. Acho legal já retornar `ResponseEntity<...>` desde o início.

---

### 16. LoginRequestDTO.java

O DTO não tem validação. Se o cliente mandar um JSON vazio `{}`, o request passa e quebra mais pra frente com mensagem feia. Adicionando `@NotBlank` nos campos e `@Valid` no parâmetro do controller, o Spring já valida e retorna 400 com a mensagem certa. Precisa adicionar `spring-boot-starter-validation` no pom.

---

### 17. JwtUtil.java, linha 44

10 dias de validade pro token é bem tempo. Se o token vazar, o atacante tem 10 dias de acesso sem revogação. O padrão moderno é token de vida curta (1h) + refresh token. Mas no mínimo daria pra externalizar pra propriedade pra ajustar fácil sem recompilar.

---

### 18. JwtAuthenticationFilter.java, linhas 57-60

O `System.out.println` aqui ignora a config de log do projeto. Sem timestamp, sem nível, sem ir pro lugar certo em prod. Trocando por SLF4J fica:

```java
private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
// ...
log.warn("Falha ao validar JWT: {}", ex.getMessage());
```

---

### 19. JwtUtil_Old.java

Esse arquivo tá marcado como @Deprecated e usa API antiga do JJWT. Acho que dá pra apagar — o git mantém o histórico se precisar consultar.

---

## Frontend

### 20. App.tsx, linha 10

`const API_URL = 'http://localhost:8080'` fixo no código não vai funcionar quando subir pra outro ambiente. O Vite tem suporte a variável de ambiente:

```typescript
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
```

E aí cria um `.env.example` com o valor padrão.

---

### 21. App.tsx, linha 13

O token só vive no useState, então se o usuário der F5 ele perde o login. Salvando no sessionStorage resolve:

```typescript
const [token, setToken] = useState(() => sessionStorage.getItem('token'));
// no login bem-sucedido:
sessionStorage.setItem('token', data.token);
// no logout:
sessionStorage.removeItem('token');
```

---

### 22. App.tsx, linha 54

`catch (err: any)` desliga a checagem do TypeScript dentro do catch. Desde o TS 4.4 o padrão é usar `unknown`:

```typescript
catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Erro ao conectar';
  setError(message);
}
```

---

### 23. App.tsx, linhas 70-113

As funções `testUserRoute` e `testAdminRoute` são praticamente iguais — só muda a URL e o setState. Daria pra extrair uma função genérica:

```typescript
async function callRoute(path: string) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Erro ${response.status}: ${text}`);
  return text;
}
```

---

### 24. App.tsx (arquivo todo)

O App.tsx tá com mais de 200 linhas misturando login, dashboard, chamadas HTTP e estado de auth. Conforme o projeto cresce, isso fica difícil de manter. Uma estrutura que ajuda:

```
src/
├── api/client.ts        // login, callProtectedRoute
├── hooks/useAuth.ts     // gerencia token + login/logout
├── components/
│   ├── LoginForm.tsx
│   └── Dashboard.tsx
└── App.tsx              // só decide qual tela mostrar
```

---

## Pontos positivos

Pra deixar registrado também as coisas legais do projeto:

- A separação em camadas (Controller → Facade → Service → DAO → Repository) ficou bem clara.
- O DAO desacoplando o Spring Data JPA do resto é uma prática boa, ajuda muito se um dia trocar de ORM.
- Tratamento de exceção centralizado com `@RestControllerAdvice` evita try/catch espalhado.
- BCrypt nas senhas em vez de salvar em texto puro.
- DTOs separando contrato da API da entidade JPA.
- `OncePerRequestFilter` foi usado certinho no JwtAuthenticationFilter.
- Frontend já com TypeScript desde o começo.
