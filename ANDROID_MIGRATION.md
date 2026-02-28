# 📱 Guia de Migração para Android - Disney+ Clone

## 📄 Sumário Rápido

Este documento descreve como implementar a conversão do projeto web React para APK Android.

---

## 🚀 Fase 1: Preparação (30 minutos)

### 1.1 Instalar Node dependencies do Capacitor

```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/app @capacitor/device @capacitor/keyboard
npm install @capacitor/splash-screen @capacitor/status-bar
```

### 1.2 Fazer build web inicial

```bash
npm run build
```

Verifique que `dist/` foi criada corretamente.

### 1.3 Inicializar Capacitor

```bash
npx cap init
```

Quando solicitado:
- **App name**: DisneyPlus
- **App ID**: com.joao.disneyplus (IMPORTANTE!)
- **Web directory**: dist

### 1.4 Adicionar plataforma Android

```bash
npx cap add android
```

Isso criará a pasta `android/` com ~150MB.

---

## 📦 Fase 2: Instalar Android Studio (45 minutos)

### 2.1 Download e instalação

1. Acesse: https://developer.android.com/studio
2. Baixe para seu SO (Windows/Mac/Linux)
3. Instale seguindo as instruções

### 2.2 Configurar Android SDK

Ao abrir Android Studio pela primeira vez:
1. Vá em **Tools > SDK Manager**
2. Instale:
   - Android SDK Platform API 31 a 34 (escolha pelo menos uma)
   - Android SDK Build Tools (latest)
   - Android Emulator
   - Android SDK Platform-Tools

### 2.3 Configurar variáveis de ambiente

**Windows (PowerShell como Admin):**
```powershell
[Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\SeuUsuario\AppData\Local\Android\Sdk', 'User')
[Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Android\Android Studio\jbr', 'User')
```

Reabra o PowerShell para aplicar.

**Mac/Linux:**
```bash
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.zshrc
echo 'export PATH=$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH' >> ~/.zshrc
source ~/.zshrc
```

### 2.4 Verificar instalação

```bash
adb --version          # Deve mostrar versão
android --version      # Deve mostrar versão
java -version          # Deve mostrar versão 11+
```

---

## 📱 Fase 3: Criar Emulador (15 minutos)

### 3.1 Criar dispositivo virtual

Android Studio > **Device Manager** (ou Tools > Device Manager):

1. Clique em **Create Device**
2. Escolha um modelo (recomendado: Pixel 6 Pro)
3. Selecione Release (recomendado: API 33 ou 34)
4. Dê um nome: `Pixel6_API34`
5. Configure RAM/armazenamento conforme seu PC
6. Clique **Finish**

### 3.2 Iniciar emulador

No Device Manager, clique no botão de "play" verde do dispositivo criado.

**Nota**: Primeira inicialização leva 1-3 minutos. Tenha paciência.

---

## 🏗️ Fase 4: Build e Deploy (20 minutos)

### 4.1 Sincronizar com Android

Com o emulador já rodando:

```bash
npm run android-build
# ou manualmente:
npm run build && cap sync android
```

### 4.2 Abrir no Android Studio

```bash
npm run cap-open
# ou
npx cap open android
```

Isso abre o projeto completo no Android Studio.

### 4.3 Compilar e executar

No Android Studio:
1. Vá em **Build > Make Project** (Ctrl+F9)
2. Aguarde compilar (1-3 minutos)
3. Clique em **Run** (play verde) ou pressione Shift+F10
4. Selecione o emulador aberto
5. Clique **OK**

### 4.4 Verificar se funcionou

Espere o app abrir no emulador:
- ✅ Interface do Disney+ carrega
- ✅ Botones são clicaveis
- ✅ Navegação funciona
- ✅ Videos carregam (se houver conexão de internet)

---

## 🔑 Fase 5: Gerar Chave de Assinatura (5 minutos)

Necessário para publicar na Play Store.

### 5.1 Gerar keystore

```bash
# Windows PowerShell
keytool -genkey -v -keystore android.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias disneyplus

# Mac/Linux
keytool -genkey -v -keystore android.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias disneyplus
```

Preencha com seus dados:
```
Senha do keystore: [crie uma]     (ex: Abc@1234)
Nome completo: João Emanuel
Unidade organizacional: Desenvolvimento
Organização: Personal
Localidade: Juazeiro
Estado: BA
Código do país: BR
```

O arquivo `android.keystore` foi criado na raiz.

### 5.2 Adicionar ao .gitignore

```bash
echo "android.keystore" >> .gitignore
```

⚠️ **IMPORTANTE**: Nunca commit `android.keystore` no Git!

---

## 📦 Fase 6: Gerar APK de Produção (10 minutos)

### 6.1 Build signed APK

No Android Studio:
1. **Build > Generate Signed Bundle / APK**
2. Escolha **APK** (não Bundle)
3. Clique **Next**
4. **New**: Clique para criar novo keystore
   - Path: selecione o `android.keystore` criado
   - Password: digite a senha criada
   - Alias: `disneyplus`
   - Alias Password: mesma senha
5. Clique **Next**
6. **Build Type**: `Release`
7. **Flavors**: deixe padrão
8. Clique **Create**

### 6.2 Localizar APK

O APK está em:
```
android/app/release/app-release.apk
```

Tamanho tipico: 15-30 MB

---

## 📲 Fase 7: Testar em Dispositivo Físico (10 minutos)

### 7.1 Preparar dispositivo

1. Conecte via USB
2. Habilite **Depuração USB**:
   - Configurações > Sobre o dispositivo
   - Toque 7x em "Número da compilação"
   - Volte a Configurações > Opções do Desenvolvedor
   - Ative "Depuração USB"

### 7.2 Instalar APK

```bash
# Verificar dispositivos conectados
adb devices

# Instalar APK
adb install -r android/app/release/app-release.apk

# Desinstalar (se necessário)
adb uninstall com.joao.disneyplus
```

### 7.3 Verificar instalação

```bash
# Ver logs
adb logcat | grep "DisneyPlus"

# Abrir app
adb shell am start -n com.joao.disneyplus/.MainActivity
```

---

## 💯 Troubleshooting

### ❌ Emulador não inicia

```bash
# Ver logs de erro
$ANDROID_HOME/emulator/emulator @nome_do_device -verbose

# Resetar emulador
emulator -avd Pixel6_API34 -wipe-data

# Deletar e recriar
# No Device Manager: clique 3 pontos > Delete
```

### ❌ Erro de SDK não encontrado

```bash
# Verificar localização do SDK
echo $ANDROID_HOME

# Se vazio, configurar novamente:
# Windows: [Environment]::SetEnvironmentVariable(...)
# Mac/Linux: echo 'export ANDROID_HOME=...' >> ~/.zshrc
```

### ❌ Porta 5037 já em uso

```bash
# Mac/Linux
lsof -ti:5037 | xargs kill -9

# Windows PowerShell
Get-Process adb -ErrorAction SilentlyContinue | Stop-Process -Force
```

### ❌ Compilacão falhando

```bash
# Limpar cache
cd android
./gradlew clean
cd ..

# Sincronizar novamente
cap sync android
```

### ❌ App crasha ao abrir

```bash
# Ver logs de erro
adb logcat | grep -E 'Exception|Error|CRASH'

# Desinstalar e reinstalar
adb uninstall com.joao.disneyplus
adb install -r android/app/release/app-release.apk
```

---

## 🎯 Comandos úteis

```bash
# Desenvolvimento
npm run dev                  # Rodar web localmente
npm run build               # Build web

# Capacitor
npm run cap-sync           # Sincronizar
npm run cap-build          # Build + Sync
npm run cap-open           # Abrir Android Studio
npm run cap-run            # Rodar em emulador

# ADB
adb devices                # Listar dispositivos
adb logcat                 # Ver logs
adb shell                  # Terminal do device
adb install app.apk        # Instalar APK
adb uninstall com.joao.disneyplus  # Desinstalar

# Gradle (dentro de android/)
./gradlew clean            # Limpar build
./gradlew build            # Build Android
./gradlew assembleRelease  # Build Release APK
```

---

## 🔍 Verificar Compatível

Antes de publicar, teste:

- [ ] App abre e não crasha
- [ ] Navegacão entre páginas funciona
- [ ] Videos carregam com HLS.js
- [ ] WebTorrent funciona para torrents
- [ ] Firebase authentication funciona
- [ ] Redux store persiste corretamente
- [ ] Interface responde ao toque
- [ ] Modo escuro funciona
- [ ] Permissões são solicitadas corretamente

---

## 🏠 Estrutura Final

```
disneyy/
├── android/                   # Projeto Android Studio
│   ├── app/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── java/...
│   │   │   │   ├── res/         (assets, compatível com Capacitor)
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   ├── gradle/
│   ├── build.gradle
│   └── settings.gradle
├── dist/                      # Build web (criado por npm run build)
├── src/                       # Código React original
├── public/                    # Assets públicos
├── capacitor.config.json      # Config Capacitor
├── android.config.json        # Config Android
├── package.json              # Scripts e dependências
├── vite.config.js            # Build web
├── android.keystore           # Chave privada (NUNCA commit!)
├── .gitignore                 # Inclui android/*, android.keystore
└── CAPACITOR_SETUP.md         # Este documento
```

---

## 🐛 Dicas Finais

1. **Sempre fazer `npm run build` antes de sincronizar**
2. **Manter backup do `android.keystore` em local seguro**
3. **Não commitar senhas ou chaves no Git**
4. **Testar em múltiplos dispositivos/versões de Android**
5. **Manter Capacitor atualizado**: `npm update @capacitor/cli @capacitor/core`
6. **Documentar versões usadas no README**

---

**Pronto! Seu app Android está criado! 🏦🐟**

Próximos passos:
- Publicar na Google Play Store
- Distribuir APK em plataformas de compartilhamento
- Atualizar versão web enquanto compartilha código com Android
