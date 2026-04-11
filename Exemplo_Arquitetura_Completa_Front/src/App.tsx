import { useState, FormEvent } from 'react';

// Tipos para as respostas da API
interface LoginResponse {
  token: string;
  roles: string[];
}

// Configuração base da API
const API_URL = 'http://localhost:8080';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estado para os testes de rotas
  const [userResponse, setUserResponse] = useState<{text: string, isError: boolean} | null>(null);
  const [adminResponse, setAdminResponse] = useState<{text: string, isError: boolean} | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('Credenciais inválidas');
      }

      const data: LoginResponse = await response.json();
      setToken(data.token);
      setRoles(data.roles);
      
      // Reseta os estados de resposta ao logar de novo
      setUserResponse(null);
      setAdminResponse(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setRoles([]);
    setUsername('');
    setPassword('');
    setUserResponse(null);
    setAdminResponse(null);
  };

  const testUserRoute = async () => {
    try {
      setUserResponse({ text: 'Carregando...', isError: false });
      const response = await fetch(`${API_URL}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const text = await response.text();
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${text || 'Não autorizado'}`);
      }
      
      setUserResponse({ text, isError: false });
    } catch (err: any) {
      setUserResponse({ text: err.message, isError: true });
    }
  };

  const testAdminRoute = async () => {
    try {
      setAdminResponse({ text: 'Carregando...', isError: false });
      const response = await fetch(`${API_URL}/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const text = await response.text();
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${text || 'Acesso negado'}`);
      }
      
      setAdminResponse({ text, isError: false });
    } catch (err: any) {
      // 403 Forbidden é o mais comum aqui para usuário comum
      const msg = err.message.includes('403') ? 'Erro 403: Requer role ADMIN' : err.message;
      setAdminResponse({ text: msg, isError: true });
    }
  };

  // Renderização condicional: se não há token, mostra tela de login
  if (!token) {
    return (
      <div className="auth-container">
        <h1 className="header-title">Arquitetura Completa</h1>
        <p className="header-subtitle">Autentique-se para testar a API (JWT + DAO)</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input 
              id="username"
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ex: alice"
              autoComplete="username"
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
            />
          </div>
          
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    );
  }

  // Tela de Dashboard (após login)
  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        
        <div className="user-info">
          <div className="avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <h2>Bem-vindo, {username}!</h2>
            <div>
              {roles.map(role => (
                <span key={role} className="role-badge">{role.replace('ROLE_', '')}</span>
              ))}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
              Sair
            </button>
          </div>
        </div>

        <div className="actions-grid">
          <div className="action-card">
            <h3>🛡️ Rota de Usuário</h3>
            <p>Testa o endpoint <strong>/user</strong>, aberto para qualquer usuário autenticado com um JWT válido.</p>
            <button className="btn" onClick={testUserRoute}>
              Testar /user
            </button>
            {userResponse && (
              <div className={`response-box ${userResponse.isError ? 'error' : ''}`}>
                {userResponse.text}
              </div>
            )}
          </div>

          <div className="action-card">
            <h3>👑 Rota de Admin</h3>
            <p>Testa o endpoint <strong>/admin</strong>, restrito apenas a usuários que possuem a permissão de ADMIN.</p>
            <button className="btn" onClick={testAdminRoute} style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>
              Testar /admin
            </button>
            {adminResponse && (
              <div className={`response-box ${adminResponse.isError ? 'error' : ''}`}>
                {adminResponse.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
