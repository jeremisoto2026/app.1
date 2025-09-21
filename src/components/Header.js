<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JUXCAPITAL - Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #0a0e17 0%, #131a25 100%);
            color: #f0f0f0;
            min-height: 100vh;
            line-height: 1.6;
        }
        
        .container {
            display: flex;
            min-height: 100vh;
        }
        
        /* Sidebar */
        .sidebar {
            width: 250px;
            background-color: #161b22;
            padding: 20px;
            border-right: 1px solid #1e2b3a;
        }
        
        .logo {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #1e2b3a;
        }
        
        .logo h1 {
            font-size: 1.5rem;
            color: #00d100;
            font-weight: 700;
            margin-left: 10px;
        }
        
        .logo span {
            color: #f0f0f0;
            font-weight: 300;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
        }
        
        .user-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00d100, #00a100);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-size: 1.2rem;
            font-weight: bold;
        }
        
        .user-details {
            flex: 1;
        }
        
        .user-details h2 {
            font-size: 1rem;
            margin-bottom: 5px;
        }
        
        .user-details p {
            color: #8b949e;
            font-size: 0.8rem;
        }
        
        .nav-menu {
            list-style: none;
            margin-bottom: 40px;
        }
        
        .nav-menu li {
            margin-bottom: 15px;
        }
        
        .nav-menu a {
            display: flex;
            align-items: center;
            color: #c9d1d9;
            text-decoration: none;
            padding: 10px;
            border-radius: 5px;
            transition: background-color 0.3s;
        }
        
        .nav-menu a:hover, .nav-menu a.active {
            background-color: #1e2b3a;
            color: #00d100;
        }
        
        .nav-menu i {
            margin-right: 10px;
            width: 20px;
            text-align: center;
        }
        
        .app-link {
            background-color: #1e2b3a;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin-top: auto;
        }
        
        .app-link p {
            color: #8b949e;
            font-size: 0.9rem;
            margin-bottom: 10px;
        }
        
        .app-link a {
            color: #00d100;
            text-decoration: none;
            font-weight: 500;
        }
        
        /* Main Content */
        .main-content {
            flex: 1;
            padding: 30px;
            overflow-y: auto;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #1e2b3a;
        }
        
        .welcome h1 {
            font-size: 1.8rem;
            margin-bottom: 5px;
            color: #00d100;
        }
        
        .welcome p {
            color: #8b949e;
        }
        
        .auth-buttons {
            display: flex;
            gap: 15px;
        }
        
        .btn-login {
            background-color: #00d100;
            color: #000;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: 600;
            text-decoration: none;
            transition: background-color 0.3s;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .btn-login:hover {
            background-color: #00b300;
        }
        
        .btn-logout {
            background-color: transparent;
            color: #c9d1d9;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: 500;
            text-decoration: none;
            transition: background-color 0.3s;
            border: 1px solid #30363d;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .btn-logout:hover {
            background-color: #1e2b3a;
        }
        
        /* Dashboard Cards */
        .dashboard-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background-color: #161b22;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #1e2b3a;
        }
        
        .card-header h3 {
            font-size: 1.1rem;
            color: #c9d1d9;
        }
        
        .card-value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .positive {
            color: #00d100;
        }
        
        .negative {
            color: #ff4d4d;
        }
        
        .card-desc {
            color: #8b949e;
            font-size: 0.9rem;
        }
        
        /* Dashboard Sections */
        .dashboard-sections {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .section-btn {
            background-color: #161b22;
            border: 1px solid #1e2b3a;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .section-btn:hover {
            border-color: #00d100;
            transform: translateY(-3px);
        }
        
        .section-btn i {
            display: block;
            font-size: 1.5rem;
            margin-bottom: 10px;
            color: #00d100;
        }
        
        .section-btn span {
            color: #c9d1d9;
            font-weight: 500;
        }
        
        /* Responsive */
        @media (max-width: 900px) {
            .container {
                flex-direction: column;
            }
            
            .sidebar {
                width: 100%;
                border-right: none;
                border-bottom: 1px solid #1e2b3a;
            }
            
            .dashboard-cards {
                grid-template-columns: 1fr;
            }
        }
        
        @media (max-width: 600px) {
            .header {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }
            
            .auth-buttons {
                width: 100%;
                justify-content: space-between;
            }
            
            .btn-login, .btn-logout {
                flex: 1;
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <div class="logo">
                <div class="logo-icon">J</div>
                <h1>JUX<span>CAPITAL</span></h1>
            </div>
            
            <div class="user-info">
                <div class="user-avatar">JS</div>
                <div class="user-details">
                    <h2>Jeremi Soto</h2>
                    <p>Usuario Premium</p>
                </div>
            </div>
            
            <ul class="nav-menu">
                <li><a href="#" class="active"><i class="fas fa-chart-line"></i> Dashboard</a></li>
                <li><a href="#"><i class="fas fa-exchange-alt"></i> P2P</a></li>
                <li><a href="#"><i class="fas fa-balance-scale"></i> Arbitraje</a></li>
                <li><a href="#"><i class="fas fa-list"></i> Operaciones</a></li>
                <li><a href="#"><i class="fas fa-history"></i> Historial</a></li>
            </ul>
            
            <div class="app-link">
                <p>Accede a nuestra app móvil</p>
                <a href="https://app-1-nu-five.vercel.app" target="_blank">app-1-nu-five.vercel.app</a>
            </div>
        </div>
        
        <div class="main-content">
            <div class="header">
                <div class="welcome">
                    <h1>Bienvenido, Jeremi Soto</h1>
                    <p>Tu dashboard premium de JUXCAPITAL ✅</p>
                </div>
                
                <div class="auth-buttons">
                    <button class="btn-login"><i class="fas fa-sign-in-alt"></i> Iniciar Sesión</button>
                    <button class="btn-logout"><i class="fas fa-user"></i> Cerrar Sesión</button>
                </div>
            </div>
            
            <div class="dashboard-cards">
                <div class="card">
                    <div class="card-header">
                        <h3>Total Operaciones</h3>
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <div class="card-value">3</div>
                    <p class="card-desc">Operaciones realizadas</p>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3>Ganancia USDT</h3>
                        <i class="fas fa-wallet"></i>
                    </div>
                    <div class="card-value negative">$-188.95</div>
                    <p class="card-desc">Balance total en USDT</p>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3>Tasa de Éxito</h3>
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="card-value">76%</div>
                    <p class="card-desc">Operaciones exitosas</p>
                </div>
            </div>
            
            <div class="dashboard-sections">
                <div class="section-btn">
                    <i class="fas fa-chart-pie"></i>
                    <span>Dashboard</span>
                </div>
                <div class="section-btn">
                    <i class="fas fa-exchange-alt"></i>
                    <span>P2P</span>
                </div>
                <div class="section-btn">
                    <i class="fas fa-balance-scale"></i>
                    <span>Arbitraje</span>
                </div>
                <div class="section-btn">
                    <i class="fas fa-list"></i>
                    <span>Operaciones</span>
                </div>
                <div class="section-btn">
                    <i class="fas fa-history"></i>
                    <span>Historial</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Simular funcionalidad de los botones de autenticación
        document.querySelector('.btn-login').addEventListener('click', function() {
            alert('Funcionalidad de inicio de sesión');
        });
        
        document.querySelector('.btn-logout').addEventListener('click', function() {
            alert('Funcionalidad de cierre de sesión');
        });
        
        // Simular funcionalidad de los botones de sección
        document.querySelectorAll('.section-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const sectionName = this.querySelector('span').textContent;
                alert(`Navegando a: ${sectionName}`);
            });
        });
    </script>
</body>
</html>