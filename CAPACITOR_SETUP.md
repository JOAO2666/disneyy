# 🎬 Guia de Conversão para APK Android com Capacitor

## 📋 Visão Geral

Este guia detalha como converter o projeto Disney+ Clone React para um APK Android nativo usando Capacitor. O Capacitor permite reutilizar ~99% do código web existente enquanto gera um APK compilado nativamente.

## ✅ Pré-requisitos

- **Node.js** >= 16.x (já instalado)
- **npm** >= 8.x (já instalado)
- **Git** instalado
- **Java Development Kit (JDK) 11+** instalado
- **Android Studio** instalado com:
  - Android SDK Platform (API 31+)
  - Android SDK Build Tools
  - Android Emulator

---

## 🚀 PASSO 1: Setup Inicial do Capacitor

### 1.1 Instalar Capacitor globalmente e no projeto

```bash
# Instalar Capacitor CLI globalmente (opcional mas recomendado)
npm install -g @capacitor/cli

# Instalar dependências no projeto
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 1.2 Inicializar Capacitor

```bash
npx cap init

# Será solicitado:
# App name: DisneyPlus
# App ID: com.joao.disneyplus (IMPORTANTE: nunca mude depois)
# Directory with web assets: dist (onde o Vite constrói)
```

### 1.3 Adicionar plataforma Android

```bash
npx cap add android
```

Isso criará a pasta `android/` com todo o projeto Android Studio.

---

## 📦 PASSO 2: Configurar Dependências

### 2.1 Instalar plugins Capacitor necessários

```bash
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/network
npm install @capacitor/device
```

### 2.2 Verificar package.json

Adicione estes scripts ao seu `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "cap-sync": "cap sync",
  "cap-build": "npm run build && cap sync && cap copy android",
  "cap-open": "cap open android",
  "cap-run": "cap run android",
  "android-studio": "npx cap open android"
}
```

---

## 🔧 PASSO 3: Instalar Android Studio e SDK

### 3.1 Download e instalação

1. Visite: https://developer.android.com/studio
2. Baixe a versão para seu SO (Windows/Mac/Linux)
3. Instale seguindo as instruções

### 3.2 Configurar Android SDK

1. Abra Android Studio
2. Vá em: **Tools > SDK Manager**
3. Instale:
   - **API Level 31+** (recomendado: API 33-34)
   - **Android SDK Build Tools** (latest)
   - **Android Emulator**

### 3.3 Configurar variáveis de ambiente

**Windows (PowerShell):**
```powershell
[Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\SeuUsuario\AppData\Local\Android\Sdk', 'User')
[Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Android\Android Studio\jbr', 'User')
```

**Mac/Linux:**
```bash
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.zshrc
echo 'export PATH=$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH' >> ~/.zshrc
source ~/.zshrc
```

---

## 📱 PASSO 4: Criar/Configurar Emulador

### 4.1 Criar dispositivo virtual

1. Abra Android Studio
2. **Device Manager** (lado direito ou Tools > Device Manager)
3. Clique em **Create Device**
4. Escolha um modelo (recomendado: Pixel 5 ou Pixel 6)
5. Selecione API Level 31+ (recomendado: 33 ou 34)
6. Nomeie como "Pixel_API_33" ou similar
7. Clique **Finish**

### 4.2 Iniciar emulador

No Device Manager, clique no ícone de "play" ao lado do device criado.

---

## 🏗️ PASSO 5: Build e Sincronização

### 5.1 Fazer build da versão web

```bash
npm run build
```

Isso gera a pasta `dist/` com os arquivos otimizados.

### 5.2 Sincronizar com Capacitor

```bash
npx cap sync android
```

Isso:
- Copia os arquivos do `dist/` para o projeto Android
- Instala/atualiza plugins Capacitor
- Sincroniza dependências

### 5.3 Abrir no Android Studio

```bash
npx cap open android
```

Isso abre o projeto completo no Android Studio.

---

## ▶️ PASSO 6: Testar no Emulador

### Opção A: Via Capacitor CLI (Mais fácil)

```bash
# Com emulador já rodando
npm run cap-run
# ou
npx cap run android
```

### Opção B: Via Android Studio

1. No Android Studio, com emulador aberto
2. Clique em **Run** (ícone de play verde)
3. Selecione o emulador aberto
4. Espere compilar e instalar

### ✅ Verificar se funcionou

- App abre no emulador
- Interface do Disney+ Clone aparece
- Navegação funciona
- Videos carregam (se houver conexão)

---

## 🔑 PASSO 7: Gerar Chave de Assinatura (Signing Key)

Necessário para publicar na Play Store ou distribuir APK.

### 7.1 Gerar keystore

**Windows (PowerShell):**
```powershell
keytool -genkey -v -keystore android.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias disneyplus
```

**Mac/Linux:**
```bash
keytool -genkey -v -keystore android.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias disneyplus
```

Será pedido:
- Senha do keystore: `[crie uma senha]`
- Nome: `João Emanuel`
- Organização: `DisneyPlus`
- Localidade: `Juazeiro`
- Estado: `Bahia`
- Código do país: `BR`

O arquivo `android.keystore` será criado na raiz do projeto.

### 7.2 Configurar no Capacitor

Atualize `capacitor.config.json`:

```json
"android": {
  "buildOptions": {
    "keystorePath": "./android.keystore",
    "keystorePassword": "sua_senha_aqui",
    "keystoreAlias": "disneyplus",
    "keystoreAliasPassword": "sua_senha_aqui",
    "releaseType": "APK"
  }
}
```

⚠️ **SEGURANÇA**: Nunca commite `android.keystore` ou `capacitor.config.json` com senhas no GitHub!

```bash
# Adicionar ao .gitignore
echo "android.keystore" >> .gitignore
```

---

## 📦 PASSO 8: Gerar APK de Produção

### 8.1 Build release no Android Studio

1. Abra Android Studio
2. **Build > Generate Signed Bundle / APK**
3. Escolha **APK**
4. Selecione o keystore criado
5. Digite as senhas
6. Selecione:
   - Build Type: **release**
   - Flavor: deixe padrão
7. Clique **Create**
8. Espere gerar (pode levar 2-5 minutos)

### 8.2 Localizar APK

O APK gerado estará em:
```
android/app/release/app-release.apk
```

Este é o arquivo pronto para:
- Instalar em dispositivos físicos
- Publicar na Play Store
- Distribuir via APKPure ou similar

---

## 📲 PASSO 9: Instalar APK em Dispositivo Físico

### 9.1 Via USB (Windows/Mac/Linux)

```bash
# Conectar dispositivo Android via USB
# Habilitar "Depuração USB" em Configurações > Opções do Desenvolvedor

# Verificar dispositivos conectados
adb devices

# Instalar APK
adb install -r android/app/release/app-release.apk
```

### 9.2 Via AirDrop ou transferência direta

1. Copiar `app-release.apk` para dispositivo Android
2. Abrir em explorador de arquivos
3. Clicar para instalar
4. Confirmar instalação

---

## 🐛 Troubleshooting

### Problema: Emulador não inicia

```bash
# Limpar e resetar emulador
emulator -avd nome_do_device -wipe-data -no-window
```

### Problema: APK não instala

```bash
# Desinstalar versão anterior
adb uninstall com.joao.disneyplus

# Reinstalar
adb install -r app-release.apk
```

### Problema: Port already in use

```bash
# Matar processo na porta 5037
lsof -ti:5037 | xargs kill -9

# Ou no Windows PowerShell
Get-Process adb -ErrorAction SilentlyContinue | Stop-Process
```

### Problema: Arquivo gradle.properties não encontrado

No Android Studio:
1. File > Project Structure
2. Configure SDK locations
3. Aponte para Android SDK corretamente

---

## 🎯 Resumo de Comandos Úteis

```bash
# Development
npm run dev                 # Rodar web em localhost:5173
npm run build              # Build web para dist/

# Capacitor
npm run cap-sync          # Sincronizar com Android
npm run cap-build         # Build + Sync
npm run cap-open          # Abrir Android Studio
npm run cap-run           # Rodar em emulador
npm run android-studio    # Abrir Android Studio

# ADB (Android Debug Bridge)
adb devices               # Listar dispositivos
adb shell                # Conectar shell ao device
adb logcat               # Ver logs do device
adb install app.apk      # Instalar APK
adb uninstall com.joao.disneyplus  # Desinstalar
```

---

## 📊 Estrutura do Projeto Capacitor

Após `cap add android`, sua estrutura ficará:

```
disneyy/
├── android/                    # Projeto Android nativo
│   ├── app/
│   ├── gradle/
│   ├── build.gradle
│   ├── settings.gradle
│   └── local.properties
├── dist/                       # Build web (criado por npm run build)
├── src/                        # Seu código React
├── capacitor.config.json       # Configuração Capacitor
├── package.json
└── ...
```

---

## 🚀 Fluxo de Desenvolvimento Recomendado

### Para testar mudanças:

```bash
# 1. Desenvolver e testar web
npm run dev
# Acesse http://localhost:5173

# 2. Quando pronto para testar no Android:
npm run build              # Build web
npm run cap-sync          # Sincronizar
npm run cap-run           # Rodar em emulador

# 3. Ver logs do Android:
adb logcat | grep "DisneyPlus"

# 4. Fazer mais mudanças e repetir
```

---

## 📱 Publicar na Play Store (Próximas etapas)

1. Criar conta Google Play Developer ($25 uma vez)
2. Gerar assinado APK (veja Passo 8)
3. Fazer upload no Google Play Console
4. Preencher informações do app
5. Configurar preço (gratuito recomendado para clone)
6. Aguardar revisão (24-48h)

---

## ✨ Recursos Adicionais

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Ionic Capacitor**: https://ionicframework.com/
- **Android Studio Guide**: https://developer.android.com/studio/intro
- **Google Play Console**: https://play.google.com/console

---

## 💡 Dicas e Boas Práticas

1. ✅ Sempre fazer `npm run build` antes de sincronizar
2. ✅ Testar mudanças no emulador antes do dispositivo físico
3. ✅ Manter backup do `android.keystore` em local seguro
4. ✅ Nunca commitar senhas ou chaves no Git
5. ✅ Documentar versão de SDK e JDK usadas no README
6. ✅ Testar em múltiplas versões de Android (se possível)

---

**Qualquer dúvida? Verifique os logs com `adb logcat` ou acesse os recursos acima.**

Bom desenvolvimento! 🚀
