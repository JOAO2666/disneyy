# 🚀 Quick Start - Disney+ Clone Android APK

## TL;DR - 5 Comandos

Se já tem Android Studio instalado:

```bash
# 1. Instalar dependências
npm install

# 2. Fazer build web
npm run build

# 3. Sincronizar com Capacitor
npm run cap-sync

# 4. Abrir Android Studio
npm run cap-open

# 5. Compilar e executar
# No Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

---

## 📋 Pré-Requisitos

- [ ] Node.js 16+ instalado
- [ ] npm 8+ instalado
- [ ] Android Studio instalado (https://developer.android.com/studio)
- [ ] Android SDK Platform API 31+ instalado
- [ ] Android Build Tools instalado
- [ ] JDK 11+ instalado (vem com Android Studio)

**Não tem nada disso?** Siga [CAPACITOR_SETUP.md](CAPACITOR_SETUP.md) - explica tudo.

---

## 🚀 Primeiro Deploy (30 minutos)

### Passo 1: Clonar e instalar

```bash
git clone https://github.com/JOAO2666/disneyy.git
cd disneyy

# Trocar para branch do Capacitor
git checkout capacitor-android-setup

# Instalar dependências
npm install
```

### Passo 2: Build web

```bash
npm run build
```

Verifique que `dist/` foi criada.

### Passo 3: Inicializar Capacitor (só 1ª vez)

```bash
npx cap init
# Será pedido:
# App name: DisneyPlus
# App ID: com.joao.disneyplus
# Directory: dist
```

### Passo 4: Adicionar Android (só 1ª vez)

```bash
npx cap add android
```

### Passo 5: Sincronizar

```bash
npm run cap-sync
```

### Passo 6: Abrir em Android Studio

```bash
npm run cap-open
```

### Passo 7: Criar emulador (se não tiver)

Android Studio:
1. **Device Manager** (lado direito)
2. **Create Device**
3. Pixel 6 > API 33 > Finish
4. Clique Play para iniciar

### Passo 8: Compilar

Android Studio:
1. **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Aguarde compilar (1-3 min)
3. Ver **Run** (play verde)
4. Selecione emulador > OK

✅ **App deve abrir no emulador!**

---

## 📱 Gerar APK Final

### Gerar keystore (1ª vez apenas)

```bash
keytool -genkey -v -keystore android.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias disneyplus
```

Preencha com seus dados.

### Build signed APK

Android Studio:
1. **Build > Generate Signed Bundle / APK**
2. **APK** > Next
3. **New** (selecione android.keystore criado) > Next
4. **Release** > Create

APK está em: `android/app/release/app-release.apk`

---

## 📲 Instalar em Dispositivo Físico

```bash
# Conectar via USB
adb devices

# Instalar
adb install -r android/app/release/app-release.apk
```

---

## 🎯 Comandos Rápidos

```bash
npm run dev                    # Web local (http://localhost:5173)
npm run build                  # Build web
npm run cap-sync              # Sincronizar com Android
npm run cap-build             # Build + Sync
npm run cap-open              # Abrir Android Studio  
npm run cap-run               # Rodar em emulador
npm run android-studio        # Alias cap-open
npm run android-emulator      # Alias cap-run
```

---

## 📄 Leitura Recomendada

1. **CAPACITOR_SETUP.md** - Setup completo (lõng)
2. **ANDROID_MIGRATION.md** - Implementação passo a passo (médio)
3. **Este arquivo** - Quick start (curto)

---

## ❓ FAQs

**P: Preciso clonar novamente?**
Não. Se já tem o repo local, faça:
```bash
git fetch origin
git checkout capacitor-android-setup
npm install
```

**P: Posso usar meu teló?**
Sim. Conecte via USB, ative Debug USB, execute:
```bash
adb install -r app-release.apk
```

**P: Qual é o tamanho do APK?**
Tipicamente 15-30MB dependendo do dispositivo.

**P: Preciso publicar na Play Store?**
Não obrigatório. Pode distribuir APK direto.

**P: Código Android customizado?**
Não precisa. Capacitor reutiliza ~99% do código React.

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|----------|
| Emulador não inicia | Limpar: `emulator -avd nome_device -wipe-data` |
| Porta 5037 em uso | Windows: `Get-Process adb -ErrorAction SilentlyContinue \| Stop-Process` |
| APK não instala | `adb uninstall com.joao.disneyplus` depois reinstalar |
| Compilacão falha | `cd android && ./gradlew clean && cd ..` |
| SDK não encontrado | `echo $ANDROID_HOME` deve apontar para SDK |

---

**Pronto! Seu APK Android está criado! 🉋**

Próximas etapas:
- Publicar na Play Store (opcional)
- Distribuir APK em grupo de testes
- Atualizar versão web
