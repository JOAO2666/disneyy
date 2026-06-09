# 📍 Instruções de Integração dos Polyfills

## O que foram criados?

1. **capacitor.config.json** - Configuração principal do Capacitor
2. **android.config.json** - Configurações específicas do Android
3. **src/capacitor-polyfills.js** - Polyfills para compatibilidade do Android
4. **package.json** - Scripts de build atualizados
5. **CAPACITOR_SETUP.md** - Guia completo de setup
6. **.gitignore** - Padrões do Android adicionados

---

## 💡 Como Integrar os Polyfills

### Opção 1: Import em main.jsx (RECOMENDADO)

Abra `src/main.jsx` e adicione:

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import setupCapacitorPolyfills from './capacitor-polyfills.js'  // ADD THIS
import './index.css'

// Setup Capacitor polyfills before rendering
setupCapacitorPolyfills()  // ADD THIS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### Opção 2: Import em App.jsx

Abra `src/App.jsx` e adicione no topo:

```javascript
import { useEffect } from 'react'
import setupCapacitorPolyfills from './capacitor-polyfills.js'  // ADD THIS

function App() {
  useEffect(() => {
    setupCapacitorPolyfills()  // ADD THIS
  }, [])

  // Rest of your code...
}

export default App
```

---

## 📱 Usando os Polyfills

### Detectar Platform

```javascript
import { isAndroid, isCapacitor, isWeb } from './capacitor-polyfills.js'

function MyComponent() {
  return (
    <div>
      {isAndroid() && <p>Running on Android</p>}
      {isCapacitor() && <p>Running as Capacitor App</p>}
      {isWeb() && <p>Running on Web</p>}
    </div>
  )
}
```

### CSS para cada Platform

Crie em `src/index.css` ou `src/App.css`:

```css
/* Platform-specific styles */
.android-platform {
  /* Android-specific styles */
}

.ios-platform {
  /* iOS-specific styles */
}

.web-platform {
  /* Web-specific styles */
}

/* Responsive height using --vh variable */
body {
  height: 100vh;
  height: calc(var(--vh, 1vh) * 100);
}

/* Safe area insets */
.header {
  padding-top: env(safe-area-inset-top);
}

.footer {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Offline state */
body.offline {
  opacity: 0.6;
  pointer-events: none;
}

body.offline::after {
  content: 'Offline';
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: red;
  color: white;
  padding: 20px;
  border-radius: 8px;
  z-index: 9999;
}
```

---

## 📲 Testar os Polyfills

### Em Development (Web)

```bash
npm run dev
# Abra Developer Tools (F12)
# Veja os logs: "Setting up Capacitor polyfills..."
# Platform deve ser: "web"
```

### No Emulador Android

```bash
# 1. Build
npm run build

# 2. Sincronizar
npm run cap-sync

# 3. Rodar
npm run cap-run

# 4. Ver logs
adb logcat | grep "Capacitor"
# Deve mostrar:
# "Setting up Capacitor polyfills..."
# "Platform: Android"
```

---

## 📄 Próximos Passos

### Após integrar os polyfills:

1. **Testar em Web**
   ```bash
   npm run dev
   ```
   - Abra DevTools (F12)
   - Verifique console: "Setting up Capacitor polyfills..."
   - Platform deve ser "Web"

2. **Testar em Android**
   ```bash
   npm run build
   npm run cap-sync
   npm run cap-run
   ```
   - App deve abrir no emulador
   - Ver logs: `adb logcat | grep Capacitor`
   - Platform deve ser "Android"

3. **Verificar Compatibilidades**
   - [ ] Navigation funciona
   - [ ] Videos carregam
   - [ ] Firebase auth funciona
   - [ ] Redux store persiste
   - [ ] Cliques no botão voltar funcionam
   - [ ] Layout responde ao toque
   - [ ] Sem erros no console

---

## 🚠 Dicas para Compatibilidade Android

### 1. Viewport Meta Tag

Certifique-se em `index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover">
```

### 2. Safe Area Insets

Para notch/barra de status:

```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

### 3. Touch Events

Adicione em CSS:

```css
* {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

button, input, a {
  -webkit-user-select: text;
  user-select: text;
}
```

### 4. Performance

Para melhor performance em Android:

```javascript
// Use lazy loading
import { lazy, Suspense } from 'react'

const LazyComponent = lazy(() => import('./Component.jsx'))

export function MyComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  )
}
```

---

## 🏠 Estrutura Final Esperada

```
src/
├── App.jsx                    # ou adicione polyfills aqui
├── main.jsx                   # ou aqui (recomendado)
├── capacitor-polyfills.js     # Novo arquivo
├── index.css
├── components/
├── pages/
├─┠ ...
```

---

## ❓ FAQs

**P: Preciso alterar meu código existente?**
Não muito. Só adicione o import do polyfill em um lugar (main.jsx ou App.jsx).

**P: Quebra a versão web?**
Não. Os polyfills são compatibilidade para mais, não quebram nada.

**P: Quais APIs do Android são suportadas?**
Todas que o Capacitor suporta: camera, location, device info, etc.

**P: Como usar cmara/GPS/etc?**
Use `window.Capacitor.Plugins.Camera` (exemplo no arquivo de polyfills).

---

## 🔍 Como Verificar se Funciona

### Browser DevTools

```javascript
// Console no browser
console.log(window.Capacitor)  // undefined em web, objeto em Capacitor
console.log(isAndroid())       // false em web, true no Android
```

### Android Device

```bash
# Ver logs do app
adb logcat | grep "Capacitor"

# Ver logs de erro
adb logcat | grep "ERROR"

# Ver status da rede
adb logcat | grep "Network"
```

---

**Pronto! Agora seu app é compatível com Android! 🙋**

Próximos passos:
1. Fazer build web: `npm run build`
2. Sincronizar: `npm run cap-sync`
3. Testar: `npm run cap-run`
4. Gerar APK: Siga [ANDROID_MIGRATION.md](ANDROID_MIGRATION.md)
