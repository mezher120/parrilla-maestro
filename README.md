# 🔥 Parrilla Maestro

App del asador argentino — React + Firebase + Vite

---

## 🚀 Deploy en Vercel (paso a paso)

### 1. Instalar dependencias
```bash
cd parrilla-maestro
npm install
```

### 2. Probar en local
```bash
npm run dev
```
Abrí http://localhost:5173 en el browser.

### 3. Subir a GitHub
```bash
git init
git add .
git commit -m "Parrilla Maestro v1"
```
Luego en github.com → New repository → "parrilla-maestro" → Push:
```bash
git remote add origin https://github.com/TU_USUARIO/parrilla-maestro.git
git push -u origin main
```

### 4. Deploy en Vercel
1. Entrá a vercel.com → "Add New Project"
2. Importá el repo "parrilla-maestro" de GitHub
3. Framework: **Vite** (se detecta automático)
4. Click "Deploy"
5. En 2 minutos tenés tu URL pública 🎉

### 5. Agregar dominio a Firebase Auth
En Firebase Console → Authentication → Settings → Authorized domains:
- Agregá tu dominio de Vercel: `parrilla-maestro.vercel.app`

---

## 📱 Instalar como PWA en el celular

Una vez deployado en Vercel:

**Android (Chrome):**
1. Abrí la URL en Chrome
2. Tocá el menú ⋮ → "Agregar a pantalla de inicio"
3. Confirmá → La app aparece como ícono en el home

**iOS (Safari):**
1. Abrí la URL en Safari
2. Tocá el botón compartir □↑ → "Agregar a pantalla de inicio"

---

## 🔥 Firebase ya configurado
- Authentication: Email/Password ✅
- Firestore: Base de datos ✅  
- Storage: Fotos de asados ✅

## 📁 Estructura
```
src/
  App.jsx      — Toda la app
  firebase.js  — Config Firebase
  main.jsx     — Entry point
public/
  manifest.json — PWA config
index.html
```
