import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, arrayUnion, arrayRemove, updateDoc, increment, where, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

// ── DATA (editá en src/data.js) ───────────────────────────────────
import {
  td, getCoccionLabel,
  CORTES_VACUNO, CORTES_CERDO, ACHURAS, PREMIUM_CORTES,
  CORTE_IMAGES, METODOS_FUEGO, SIMULACION_CORTES,
  COCCION_MULT, COCCION_LABELS, COCCION_COLORS,
  ALTURA_SCHEDULE, CARBON_NOTIFS, AVATAR_OPTIONS,
} from './data.js';

// ── UTILS ─────────────────────────────────────────────────────────
function getAlturaAt(mins, tipo) {
  if (tipo === "fixed") return 15;
  let cm = 25;
  for (const h of ALTURA_SCHEDULE) { if (mins >= h.min) cm = h.cm; else break; }
  return cm;
}
function buildEvents(selected, coccion, tipoParrilla, tiempoMult=1, aprendizaje={}, idioma='es') {
  const getCutMult = (c) => (aprendizaje[c.nombre]?.[tipoParrilla] || 1) * tiempoMult * COCCION_MULT[coccion];
  const events = [];
  selected.forEach(c => c.eventos.forEach(ev => {
    const m = Math.round(ev.min * getCutMult(c));
    events.push({ key:`${c.id}-${m}`, min:m, emoji:c.emoji, label:c.nombre, msg:td(ev,'msg',idioma), color:c.color });
  }));
  if (tipoParrilla === "adjustable") {
    ALTURA_SCHEDULE.slice(1).forEach(h => {
      const msg = idioma === 'en'
        ? `Adjust the grill to ${h.cm} cm from the fire.`
        : `Ajustá la grilla a ${h.cm} cm del fuego.`;
      events.push({ key:`alt-${h.min}`, min:h.min, emoji:"📏", label: idioma==='en'?"Grill":"Grilla", msg, color:"#4fc3f7" });
    });
  }
  const maxTime = selected.length > 0 ? Math.max(...selected.map(c => Math.round(c.tiempo * getCutMult(c)))) : 0;
  CARBON_NOTIFS[tipoParrilla].forEach(cn => {
    if (cn.min < maxTime) events.push({ key:`carbon-${cn.min}`, min:cn.min, emoji:"🪨", label: idioma==='en'?"Charcoal":"Carbón", msg:td(cn,'msg',idioma), color:"#78909c" });
  });
  return events.sort((a, b) => a.min - b.min);
}
const rankLabel = r => r==="perfecto" ? "Perfecto 🔥" : r==="poco_crudo" ? "Poco crudo 🩸" : r==="pasado" ? "Un poco pasado 😅" : "—";
const rankColor = r => r==="perfecto" ? "#4caf50" : r==="poco_crudo" ? "#e53935" : r==="pasado" ? "#ff8c42" : "#555";
const rankEmoji = r => r==="perfecto" ? "🏆" : r==="poco_crudo" ? "🩸" : "😅";
const dateStr = ts => new Date(ts).toLocaleDateString("es-AR", { day:"2-digit", month:"short", year:"numeric" });
const xpForLevel = lvl => lvl * 200;
const totalXP = asados => asados.reduce((a, x) => a + (x.rating==="perfecto" ? 50 : 30) + x.cortes.length * 10, 0);
function levelFromXP(xp) { let l = 1; while (xp >= xpForLevel(l)) { xp -= xpForLevel(l); l++; } return l; }
function xpInLevel(xp) { let l = 1; while (xp >= xpForLevel(l)) { xp -= xpForLevel(l); l++; } return xp; }
const TITLES_ES = ["Encendedor","Fogonero","Parrillero","Maestro","Gran Maestro","Leyenda de la Parrilla"];
const TITLES_EN = ["Fire Starter","Stoker","Grillman","Grill Master","Grand Master","BBQ Legend"];
const TITLE = (lvl, idioma='es') => (idioma==='en' ? TITLES_EN : TITLES_ES)[Math.min(lvl-1,5)];
function favCorte(asados) {
  const f = {};
  asados.forEach(a => a.cortes.forEach(c => { f[c] = (f[c] || 0) + 1; }));
  const t = Object.entries(f).sort((a,b) => b[1]-a[1])[0];
  return t ? t[0] : null;
}
const avgRating = asados => asados.length ? Math.round(asados.filter(a => a.rating==="perfecto").length / asados.length * 100) : 0;

// ── I18N ──────────────────────────────────────────────────────────
const T = {
  es: {
    // Nav
    inicio:"Inicio", preparaciones:"Preparaciones", fuego:"El Fuego",
    calculadora:"Calculadora", simulacion:"Simulación", perfil:"Mi Perfil",
    historial:"Mis Asados", ajustes:"Ajustes",
    // Home
    hola:"Hola", asados_count:"asado", asados_counts:"asados",
    ultimo:"Último", nivel:"Nivel",
    // Preparaciones
    prep_sub:"CORTES & RECETAS", vacuno:"Vacuno", cerdo:"Cerdo",
    achuras:"Achuras", vip:"⭐ VIP",
    prep_detail_preparacion:"🧂 Preparación", prep_detail_tiempo:"⏱ Tiempo",
    prep_detail_temp:"🌡 Temperatura", prep_detail_servir:"🍽 Cómo Servir",
    premium_title:"Parrillero Premium", premium_desc:"Accedé a cortes especiales: lechón, pollo, cordero, T-Bone y más.",
    premium_btn:"Desbloquear — $2.99/mes",
    // Fuego
    fuego_sub:"MÉTODOS DE ENCENDIDO", regla_oro:"💡 REGLA DE ORO",
    regla_oro_txt:"La brasa está lista cuando el carbón está completamente blanco-grisáceo y ya no hay llamas. Nunca cocines sobre llama directa.",
    // Calculadora
    calc_sub:"CARNE & CARBÓN", cuantos:"¿Cuántos son?",
    persona:"persona", personas:"personas", grxpersona:"500 g de carne por persona",
    mas_achuras:"+ Achuras", achuras_desc:"1 chorizo + 100g otras por persona",
    kg_totales:"kg totales", kg_carbon:"kg de carbón", proporcion:"proporción 2:1",
    chorizos_unid:"Chorizos", otras_achuras:"Otras achuras",
    desglose_carnes:"🥩 Desglose de carnes", desglose_achuras:"🫀 Desglose de achuras",
    total_lbl:"Total:", consejo_carbon:"💡 CONSEJO DE CARBÓN",
    consejo_txt1:"Comprá siempre un 10–15% extra por las dudas. Para",
    consejo_txt2:"persona, llevá", consejo_txt3:"si querés tener margen.",
    // Simulacion
    sim_sub:"ASADO INTERACTIVO", como_arrancar:"¿Cómo querés arrancar?",
    principiante:"Principiante", prin_sub:"Guía paso a paso completa",
    prin_desc:"Te guío desde la selección de cortes hasta la cocción. Configuración completa.",
    pro:"Modo Pro", pro_sub:"Rápido y directo al grano",
    pro_desc:"Ya sabés lo que hacés. Seleccionás y arrancamos.",
    sel_cortes:"Seleccioná los cortes", paso:"Paso", de:"de",
    config_coccion:"Configurá la cocción", punto_coccion:"🥩 Punto de cocción",
    tipo_parrilla:"📏 Tipo de parrilla", graduable:"Graduable", fija:"Fija",
    ajusto_altura:"Ajusto la altura", una_altura:"Una sola altura",
    fuego_listo:"¿Está el fuego listo?", carbon_gris:"El carbón debe estar completamente blanco-grisáceo",
    carbon_txt:"Sin llamas visibles. Si ves llama directa, esperá unos minutos más.",
    recordar:"📋 Recordá antes de empezar",
    tip_sal:"✅ Sal gruesa sobre los cortes",
    tip_temp:"✅ Carne a temperatura ambiente (30 min fuera del frío)",
    tip_limpia:"✅ Parrilla limpia y seca",
    tip_alta:"✅ Grilla en posición ALTA (25 cm del fuego)",
    tip_fija:"✅ Parrilla fija posicionada (15 cm del fuego)",
    fuego_si:"🔥 ¡Sí, fuego listo!", colocar:"Colocá la carne en la parrilla",
    orden:"📌 Orden de colocación", iniciar:"✅ ¡Todo en la parrilla! Iniciar conteo",
    iniciar_pro:"⚡ Iniciar", corte:"corte", cortes:"cortes",
    completado:"Completado", min_sim:"min sim. (×10)", grilla:"GRILLA", coccion_lbl:"COCCIÓN",
    alertas:"Historial de alertas", alertas_empty:"Las alertas aparecerán aquí mientras asás…",
    listo_btn:"🏆 ¡Listo! Calificar el asado",
    voz_on:"🔊 Voz activada — te aviso en voz alta", voz_off:"🔇 Voz desactivada",
    voz_onbtn:"ON", voz_offbtn:"OFF",
    // Rating
    como_salio:"¿Cómo salió?", calificar:"CALIFICÁ TU ASADO",
    cortes_hoy:"Cortes asados hoy", como_coccion:"¿Cómo quedó la cocción?",
    poco_crudo:"Un poco crudo", poco_crudo_sub:"Próxima vez más tiempo o más fuego",
    perfecto:"¡Perfecto!", perfecto_sub:"Eso es ser un maestro de la parrilla",
    pasado:"Un poco pasado", pasado_sub:"Bajar temperatura o menos tiempo",
    notas_lbl:"📝 Notas (opcional)", notas_ph:"Ej: La entraña quedó perfecta. La próxima bajar la grilla antes...",
    foto_lbl:"📸 Foto del asado (opcional)", foto_btn:"Tocá para agregar foto",
    guardar_asado:"💾 Guardar asado", guardado_asado:"✅ ¡Guardado!", saltear:"Saltear, no guardar",
    // Perfil
    perfil_sub:"PARRILLERO", editar:"✏️ Editar", cancelar:"Cancelar",
    guardar_cambios:"Guardar cambios", desde:"Miembro desde",
    stats_asados:"Asados", stats_perfectos:"Perfectos", stats_precision:"Precisión", stats_favorito:"Favorito",
    app_aprendio:"🧠 La app aprendió de tus asados",
    tip_pasado:"Tendencia a pasarse. Intentá bajar la temperatura o reducir el tiempo un 10%.",
    tip_crudo:"La carne suele quedar cruda. Aumentá el tiempo un 15% o subí el fuego.",
    tip_maestro:"¡Excelente consistencia! Sos un maestro de la parrilla.",
    distribucion:"📊 Distribución de resultados",
    ver_historial:"📋 Ver historial completo", borrar_cuenta:"🗑 Borrar cuenta y datos",
    // Historial
    hist_sub:"HISTORIAL COMPLETO", hist_empty:"Todavía no tenés asados guardados.",
    hist_empty2:"¡Hacé tu primer asado y calificalo!",
    detalle_asado:"Detalle del asado", modo:"MODO", punto_lbl:"PUNTO",
    cortes_asados:"🥩 Cortes asados", notas_det:"📝 Notas", config_det:"⚙️ Configuración",
    parrilla_lbl:"Parrilla:", duracion_lbl:"Duración:",
    // Ajustes
    ajustes_sub:"CONFIGURACIÓN", idioma:"Idioma", tiempos:"Tiempos de cocción",
    tiemposDesc:"Ajustá los tiempos a tu gusto. Útil si tu parrilla corre más rápido o lento.",
    voz_sim:"Voz en simulación", voz_sim_desc:"Lee las notificaciones en voz alta mientras cocinás.",
    tipo_voz:"Tipo de voz", tipo_voz_desc:"Elegí el tipo de voz para las notificaciones.",
    probar_voz:"🔊 Probar voz", voz_info_title:"ℹ️ Sobre la función de voz",
    voz_info:"La voz usa la síntesis de texto del navegador. Funciona mejor en Chrome y Safari.",
    guardar:"Guardar cambios", guardado:"✅ ¡Guardado!",
    reset:"Restablecer por defecto", estandar:"Estándar",
    mas_rapido:"más rápido", mas_lento:"más lento",
    // Onboard
    bienvenido:"Bienvenido al asado", bienvenido_desc:"Tu asistente personal para ser el mejor parrillero del barrio.",
    feat1_t:"Historial de asados", feat1_s:"Guardá cada asado con foto y rating",
    feat2_t:"Subí de nivel", feat2_s:"De Encendedor a Leyenda de la Parrilla",
    feat3_t:"La app aprende", feat3_s:"Cada rating mejora tus sugerencias",
    feat4_t:"Modo Principiante & Pro", feat4_s:"Adaptado a tu experiencia",
    crear_perfil:"Crear mi perfil 🥩", como_llaman:"¿Cómo te llaman?",
    nombre_ph:"Ej: El Colo, Hernán, La Bochi...", nombre_sub:"Tu nombre de parrillero",
    siguiente:"Siguiente →", elegir_avatar:"Elegí tu avatar",
    empezar:"¡Empezar a asar! 🔥",
    // Ranking
    ranking:"El Ranking", ranking_sub:"ASADOS DE LA SEMANA",
    ranking_empty:"Todavía no hay posts esta semana. ¡Sé el primero!",
    ranking_tab_semana:"Esta semana", ranking_tab_ciudad:"Mi ciudad", ranking_tab_todos:"Todos",
    ranking_compartir:"Compartir mi asado 🔥",
    ranking_comentar:"Comentar", ranking_comentarios:"Comentarios", ranking_comentario_ph:"Tu comentario...",
    ranking_enviar:"Enviar",
    ranking_ciudad_ph:"Ej: Buenos Aires, Rosario...",
    ranking_ciudad_lbl:"¿De qué ciudad sos?",
    ranking_unirte:"¡Unite al ranking!",
    ranking_unirte_desc:"Compartí tu asado y votá los de la comunidad.",
    ranking_prompt_title:"¿Compartís tu asado?",
    ranking_prompt_desc:"Subí tu asado al ranking y la comunidad vota con 🔥.",
    ranking_si:"🔥 Sí, compartir",
    ranking_no:"Ahora no",
  },
  en: {
    // Nav
    inicio:"Home", preparaciones:"Cuts & Recipes", fuego:"Fire",
    calculadora:"Calculator", simulacion:"Simulation", perfil:"My Profile",
    historial:"My BBQs", ajustes:"Settings",
    // Home
    hola:"Hey", asados_count:"BBQ", asados_counts:"BBQs",
    ultimo:"Last", nivel:"Level",
    // Preparaciones
    prep_sub:"CUTS & RECIPES", vacuno:"Beef", cerdo:"Pork",
    achuras:"Offal", vip:"⭐ VIP",
    prep_detail_preparacion:"🧂 Preparation", prep_detail_tiempo:"⏱ Time",
    prep_detail_temp:"🌡 Temperature", prep_detail_servir:"🍽 How to Serve",
    premium_title:"Premium Grillmaster", premium_desc:"Access special cuts: suckling pig, chicken, lamb, T-Bone and more.",
    premium_btn:"Unlock — $2.99/mo",
    // Fuego
    fuego_sub:"FIRE METHODS", regla_oro:"💡 GOLDEN RULE",
    regla_oro_txt:"Coals are ready when completely white-grey with no visible flames. Never cook over direct flame.",
    // Calculadora
    calc_sub:"MEAT & CHARCOAL", cuantos:"How many people?",
    persona:"person", personas:"people", grxpersona:"500 g of meat per person",
    mas_achuras:"+ Offal", achuras_desc:"1 chorizo + 100g other per person",
    kg_totales:"kg total", kg_carbon:"kg charcoal", proporcion:"2:1 ratio",
    chorizos_unid:"Chorizos", otras_achuras:"Other offal",
    desglose_carnes:"🥩 Meat breakdown", desglose_achuras:"🫀 Offal breakdown",
    total_lbl:"Total:", consejo_carbon:"💡 CHARCOAL TIP",
    consejo_txt1:"Always buy 10–15% extra just in case. For",
    consejo_txt2:"people, get", consejo_txt3:"to have some margin.",
    // Simulacion
    sim_sub:"BBQ SIMULATION", como_arrancar:"How do you want to start?",
    principiante:"Beginner", prin_sub:"Full step-by-step guide",
    prin_desc:"I guide you from cut selection to cooking. Full configuration.",
    pro:"Pro Mode", pro_sub:"Fast and straight to the point",
    pro_desc:"You know what you're doing. Select and go.",
    sel_cortes:"Select your cuts", paso:"Step", de:"of",
    config_coccion:"Configure cooking", punto_coccion:"🥩 Doneness",
    tipo_parrilla:"📏 Grill type", graduable:"Adjustable", fija:"Fixed",
    ajusto_altura:"I adjust the height", una_altura:"One fixed height",
    fuego_listo:"Is the fire ready?", carbon_gris:"Coals must be completely white-grey",
    carbon_txt:"No visible flames. If you see direct flame, wait a few more minutes.",
    recordar:"📋 Remember before starting",
    tip_sal:"✅ Coarse salt on the cuts",
    tip_temp:"✅ Meat at room temperature (30 min out of the fridge)",
    tip_limpia:"✅ Clean and dry grill",
    tip_alta:"✅ Grill at HIGH position (25 cm from fire)",
    tip_fija:"✅ Fixed grill positioned (15 cm from fire)",
    fuego_si:"🔥 Yes, fire is ready!", colocar:"Place the meat on the grill",
    orden:"📌 Placement order", iniciar:"✅ Everything on the grill! Start timer",
    iniciar_pro:"⚡ Start", corte:"cut", cortes:"cuts",
    completado:"Done", min_sim:"sim min (×10)", grilla:"GRILL", coccion_lbl:"DONENESS",
    alertas:"Alert log", alertas_empty:"Alerts will appear here while you cook…",
    listo_btn:"🏆 Done! Rate this BBQ",
    voz_on:"🔊 Voice on — I'll alert you out loud", voz_off:"🔇 Voice off",
    voz_onbtn:"ON", voz_offbtn:"OFF",
    // Rating
    como_salio:"How did it go?", calificar:"RATE YOUR BBQ",
    cortes_hoy:"Cuts grilled today", como_coccion:"How was the cooking?",
    poco_crudo:"A bit undercooked", poco_crudo_sub:"Next time more time or higher heat",
    perfecto:"Perfect!", perfecto_sub:"That is a true grill master",
    pasado:"A bit overcooked", pasado_sub:"Lower temp or less time",
    notas_lbl:"📝 Notes (optional)", notas_ph:"E.g.: The skirt steak was perfect. Next time lower the grill sooner...",
    foto_lbl:"📸 BBQ photo (optional)", foto_btn:"Tap to add photo",
    guardar_asado:"💾 Save BBQ", guardado_asado:"✅ Saved!", saltear:"Skip, don't save",
    // Perfil
    perfil_sub:"GRILLMASTER", editar:"✏️ Edit", cancelar:"Cancel",
    guardar_cambios:"Save changes", desde:"Member since",
    stats_asados:"BBQs", stats_perfectos:"Perfect", stats_precision:"Accuracy", stats_favorito:"Favorite",
    app_aprendio:"🧠 The app learned from your BBQs",
    tip_pasado:"Tendency to overcook. Try lowering temp or reducing time by 10%.",
    tip_crudo:"Meat tends to be undercooked. Increase time 15% or raise heat.",
    tip_maestro:"Great consistency! You are a true grill master.",
    distribucion:"📊 Results distribution",
    ver_historial:"📋 View full history", borrar_cuenta:"🗑 Delete account & data",
    // Historial
    hist_sub:"FULL HISTORY", hist_empty:"No BBQs saved yet.",
    hist_empty2:"Do your first BBQ and rate it!",
    detalle_asado:"BBQ Detail", modo:"MODE", punto_lbl:"DONENESS",
    cortes_asados:"🥩 Cuts grilled", notas_det:"📝 Notes", config_det:"⚙️ Configuration",
    parrilla_lbl:"Grill:", duracion_lbl:"Duration:",
    // Ajustes
    ajustes_sub:"SETTINGS", idioma:"Language", tiempos:"Cooking times",
    tiemposDesc:"Adjust times to your taste. Useful if your grill runs hotter or cooler.",
    voz_sim:"Voice in simulation", voz_sim_desc:"Reads notifications aloud while you cook.",
    tipo_voz:"Voice type", tipo_voz_desc:"Choose the voice type for notifications.",
    probar_voz:"🔊 Test voice", voz_info_title:"ℹ️ About voice feature",
    voz_info:"Voice uses the browser's speech synthesis. Works best in Chrome and Safari.",
    guardar:"Save changes", guardado:"✅ Saved!",
    reset:"Reset to defaults", estandar:"Standard",
    mas_rapido:"faster", mas_lento:"slower",
    // Onboard
    bienvenido:"Welcome to the BBQ", bienvenido_desc:"Your personal assistant to become the best grillmaster in the neighborhood.",
    feat1_t:"BBQ history", feat1_s:"Save every BBQ with photo and rating",
    feat2_t:"Level up", feat2_s:"From Starter to BBQ Legend",
    feat3_t:"The app learns", feat3_s:"Each rating improves your next suggestions",
    feat4_t:"Beginner & Pro mode", feat4_s:"Adapted to your experience",
    crear_perfil:"Create my profile 🥩", como_llaman:"What do they call you?",
    nombre_ph:"E.g.: Big Mike, The Colo, Grill King...", nombre_sub:"Your grill name",
    siguiente:"Next →", elegir_avatar:"Choose your avatar",
    empezar:"Start grilling! 🔥",
    // Ranking
    ranking:"The Ranking", ranking_sub:"BBQs OF THE WEEK",
    ranking_empty:"No posts this week yet. Be the first!",
    ranking_tab_semana:"This week", ranking_tab_ciudad:"My city", ranking_tab_todos:"All",
    ranking_compartir:"Share my BBQ 🔥",
    ranking_comentar:"Comment", ranking_comentarios:"Comments", ranking_comentario_ph:"Your comment...",
    ranking_enviar:"Send",
    ranking_ciudad_ph:"E.g.: Buenos Aires, Rosario...",
    ranking_ciudad_lbl:"What city are you from?",
    ranking_unirte:"Join the ranking!",
    ranking_unirte_desc:"Share your BBQ and vote for the community's.",
    ranking_prompt_title:"Share your BBQ?",
    ranking_prompt_desc:"Post your BBQ and the community votes with 🔥.",
    ranking_si:"🔥 Yes, share",
    ranking_no:"Not now",
  },
};
const t = (idioma, key) => (T[idioma] || T.es)[key] || key;



// ── CSS ───────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700&display=swap');
* { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
@keyframes ember { 0%{transform:translateY(0) scale(1);opacity:.9} 100%{transform:translateY(-220px) scale(0);opacity:0} }
@keyframes flicker { 0%,100%{transform:scaleY(1) scaleX(1)} 25%{transform:scaleY(1.1) scaleX(.95)} 50%{transform:scaleY(.95) scaleX(1.05)} }
@keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
@keyframes glow { 0%,100%{text-shadow:0 0 30px #ff6a00,0 0 60px #ff4500} 50%{text-shadow:0 0 50px #ff8c00,0 0 90px #ff6a00} }
@keyframes sizzle { 0%,100%{filter:brightness(1) drop-shadow(0 0 3px #ff6a00)} 50%{filter:brightness(1.4) drop-shadow(0 0 10px #ff4500)} }
@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes notifIn { from{opacity:0;transform:translateX(30px) scale(.95)} to{opacity:1;transform:translateX(0) scale(1)} }
@keyframes steamRise { 0%{transform:translateY(0) scale(1);opacity:.7} 100%{transform:translateY(-28px) scale(2.5);opacity:0} }
@keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes fireFlicker { 0%,100%{transform:scaleY(1)} 33%{transform:scaleY(1.12) scaleX(.94)} 66%{transform:scaleY(.93) scaleX(1.05)} }
@keyframes pulseBtn { 0%,100%{box-shadow:0 6px 20px rgba(193,68,14,.4)} 50%{box-shadow:0 6px 32px rgba(193,68,14,.7)} }
@keyframes popIn { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
@keyframes confetti { 0%{transform:translateY(0) rotate(0) scale(1);opacity:1} 100%{transform:translateY(-140px) rotate(720deg) scale(0);opacity:0} }
@keyframes llamaVote { 0%{transform:scale(1)} 50%{transform:scale(1.6) rotate(-10deg)} 100%{transform:scale(1)} }
@keyframes slideUpModal { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
input[type=range] { width:100%; accent-color:#ff8c42; }
::-webkit-scrollbar { width:3px } ::-webkit-scrollbar-track { background:#0d0a07 } ::-webkit-scrollbar-thumb { background:#3a2010; border-radius:2px }
`;

// ── LOCALSTORAGE ──────────────────────────────────────────────────
// ── FIREBASE HELPERS ─────────────────────────────────────────────
const DEFAULT_CONFIG = { idioma:'es', tiempoMult:100, vozSimulacion:false, notifSonido:true, voiceIndex:0, chistes:true, premium:false, completo:false };
const PREMIUM_CUTS_IDS = ['lechon','pollo','cordero','tbone','picanha','morron','tomate','choclo'];

async function fbGetProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch(e) { console.error("getProfile:", e); return null; }
}

async function fbSaveProfile(uid, data) {
  try {
    await setDoc(doc(db, "users", uid), data, { merge: true });
  } catch(e) { console.error("saveProfile:", e); }
}

async function fbGetAsados(uid) {
  try {
    const q = query(collection(db, "users", uid, "asados"), orderBy("ts", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error("getAsados:", e); return []; }
}

async function fbSaveAsado(uid, asado) {
  try {
    const { id, ...data } = asado;
    const docRef = await addDoc(collection(db, "users", uid, "asados"), data);
    return docRef.id;
  } catch(e) { console.error("saveAsado:", e); return null; }
}

async function fbUploadFoto(uid, asadoId, base64DataUrl) {
  if (!base64DataUrl) return null;
  try {
    const storageRef = ref(storage, `users/${uid}/asados/${asadoId}.jpg`);
    await uploadString(storageRef, base64DataUrl, 'data_url');
    return await getDownloadURL(storageRef);
  } catch(e) { console.error("uploadFoto:", e); return null; }
}

function getWeekId() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function timeAgo(ts, idioma = 'es') {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return idioma === 'en' ? 'just now' : 'ahora';
  if (diff < 3600) { const m = Math.floor(diff / 60); return idioma === 'en' ? `${m}m ago` : `hace ${m}m`; }
  if (diff < 86400) { const h = Math.floor(diff / 3600); return idioma === 'en' ? `${h}h ago` : `hace ${h}h`; }
  const d = Math.floor(diff / 86400); return idioma === 'en' ? `${d}d ago` : `hace ${d}d`;
}

async function fbCreatePost(uid, userData, asadoData, fotoUrl) {
  try {
    const post = {
      userId: uid,
      userNombre: userData.nombre || 'Parrillero',
      userEmoji: userData.avatar || '🧑‍🍳',
      userCiudad: userData.ciudad || '',
      userNivel: userData.nivel || 1,
      foto: fotoUrl || null,
      cortes: asadoData.cortes || [],
      coccion: asadoData.coccion || 'punto',
      rating: asadoData.rating || 'perfecto',
      nota: asadoData.nota || '',
      timestamp: Date.now(),
      llamas: [],
      llamasCount: 0,
      comentariosCount: 0,
      semana: getWeekId(),
    };
    const docRef = await addDoc(collection(db, "posts"), post);
    return docRef.id;
  } catch(e) { console.error("createPost:", e); return null; }
}

async function fbGetPosts(tab, ciudad, weekId) {
  try {
    let q;
    if (tab === 'semana') {
      q = query(collection(db, "posts"), where("semana", "==", weekId), limit(50));
    } else if (tab === 'ciudad' && ciudad) {
      q = query(collection(db, "posts"), where("userCiudad", "==", ciudad), limit(50));
    } else {
      q = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(50));
    }
    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return posts.sort((a, b) => (b.llamasCount || 0) - (a.llamasCount || 0));
  } catch(e) { console.error("getPosts:", e); return []; }
}

async function fbToggleLlama(postId, uid, hasVoted) {
  try {
    await updateDoc(doc(db, "posts", postId), {
      llamas: hasVoted ? arrayRemove(uid) : arrayUnion(uid),
      llamasCount: increment(hasVoted ? -1 : 1),
    });
  } catch(e) { console.error("toggleLlama:", e); }
}

async function fbGetComments(postId) {
  try {
    const q = query(collection(db, "posts", postId, "comments"), orderBy("timestamp", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error("getComments:", e); return []; }
}

async function fbAddComment(postId, uid, userData, text) {
  try {
    await addDoc(collection(db, "posts", postId, "comments"), {
      userId: uid,
      userNombre: userData?.nombre || 'Parrillero',
      userEmoji: userData?.avatar || '🧑‍🍳',
      texto: text,
      timestamp: Date.now(),
    });
    await updateDoc(doc(db, "posts", postId), { comentariosCount: increment(1) });
  } catch(e) { console.error("addComment:", e); }
}

function calcMultPersonal(asados, corteName, tipoParrilla) {
  const relevant = asados.filter(a => a.cortes?.includes(corteName) && a.tipoParrilla === tipoParrilla && a.rating);
  if (relevant.length < 2) return null;
  const pasados = relevant.filter(a => a.rating === "pasado").length;
  const crudos = relevant.filter(a => a.rating === "poco_crudo").length;
  const total = relevant.length;
  if (pasados / total > 0.5) return 0.9;
  if (crudos / total > 0.5) return 1.15;
  return 1.0;
}

function actualizarAprendizajeLocal(store, asadoGuardado) {
  const todosAsados = [...store.asados, asadoGuardado];
  const cortes = [...new Set(todosAsados.flatMap(a => a.cortes))];
  const aprendizaje = {};
  cortes.forEach(c => {
    ["adjustable","fixed"].forEach(p => {
      const m = calcMultPersonal(todosAsados, c, p);
      if (m !== null) {
        if (!aprendizaje[c]) aprendizaje[c] = {};
        aprendizaje[c][p] = m;
      }
    });
  });
  return aprendizaje;
}
const actualizarAprendizaje = actualizarAprendizajeLocal;

// ── APP ───────────────────────────────────────────────────────────
export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [store, setStore] = useState({ user:null, asados:[], config:DEFAULT_CONFIG, aprendizaje:{} });
  const [screen, setScreen] = useState("splash");
  const [fade, setFade] = useState(true);
  const [pendingAsado, setPendingAsado] = useState(null);
  const [fbLoading, setFbLoading] = useState(true);
  const screenRef = useRef("splash");

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        const [profile, asados] = await Promise.all([
          fbGetProfile(user.uid),
          fbGetAsados(user.uid),
        ]);
        const aprendizaje = profile?.aprendizaje || {};
        setStore({
          user: profile
            ? { ...profile, uid: user.uid, email: user.email }
            : { uid: user.uid, email: user.email, nombre: user.displayName || user.email.split("@")[0], avatar:"🧑‍🍳", joinedAt: Date.now() },
          asados,
          config: profile?.config || DEFAULT_CONFIG,
          aprendizaje,
        });
        if (screenRef.current === "login") {
          go(profile ? "home" : "onboard");
        }
      } else {
        setAuthUser(null);
        setStore({ user:null, asados:[], config:DEFAULT_CONFIG, aprendizaje:{} });
        if (!["login","splash"].includes(screenRef.current)) {
          go("login");
        }
      }
      setFbLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => { screenRef.current = screen; }, [screen]);

  const persist = useCallback(async (updater) => {
    setStore(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (authUser) {
        fbSaveProfile(authUser.uid, {
          nombre: next.user?.nombre,
          avatar: next.user?.avatar,
          joinedAt: next.user?.joinedAt || Date.now(),
          ciudad: next.user?.ciudad || '',
          config: next.config || DEFAULT_CONFIG,
          aprendizaje: next.aprendizaje || {},
        });
      }
      return next;
    });
  }, [authUser]);

  const saveAsado = useCallback(async (asado) => {
    if (!authUser) return {};
    let asadoToSave = { ...asado };
    let uploadedFotoUrl = (asado.foto && !asado.foto.startsWith("data:")) ? asado.foto : null;
    if (asado.foto && asado.foto.startsWith("data:")) {
      const tempId = `asado_${Date.now()}`;
      const fotoUrl = await fbUploadFoto(authUser.uid, tempId, asado.foto);
      asadoToSave = { ...asado, foto: fotoUrl || null };
      uploadedFotoUrl = fotoUrl || null;
    }
    const newId = await fbSaveAsado(authUser.uid, asadoToSave);
    setStore(prev => {
      const aprendizaje = actualizarAprendizajeLocal(prev, asadoToSave);
      const newStore = { ...prev, asados:[...prev.asados, { ...asadoToSave, id: newId || asado.id }], aprendizaje };
      if (authUser) fbSaveProfile(authUser.uid, { aprendizaje });
      return newStore;
    });
    return { fotoUrl: uploadedFotoUrl };
  }, [authUser]);

  const go = (s) => {
    setFade(false);
    setTimeout(() => { setScreen(s); setFade(true); }, 200);
  };

  useEffect(() => {
    if (screen !== "splash") return;
    const t = setTimeout(() => {
      if (fbLoading) return; // wait for auth
      go(authUser ? "home" : "login");
    }, 3000);
    return () => clearTimeout(t);
  }, [screen, fbLoading, authUser]);

  useEffect(() => {
    if (!fbLoading && screen === "splash") {
      // If Firebase resolved while splash was showing, advance
      setTimeout(() => go(authUser ? "home" : "login"), 500);
    }
  }, [fbLoading]);

  const renderScreen = () => {
    if (screen === "splash") return <Splash />;
    if (fbLoading) return <LoadingScreen />;
    const idioma = store.config?.idioma || 'es';
    if (screen === "login")   return <LoginScreen go={go} idioma={idioma} />;
    if (screen === "onboard") return <Onboard store={store} persist={persist} go={go} idioma={idioma} />;
    if (screen === "home")    return <Home store={store} go={go} idioma={idioma} />;
    if (screen === "preparaciones") return <Preparaciones go={go} idioma={idioma} isPremium={store.config?.premium||store.config?.completo||false} />;
    if (screen === "fuego")   return <Fuego go={go} idioma={idioma} />;
    if (screen === "simulacion") return <Simulacion store={store} persist={persist} go={go} setPendingAsado={setPendingAsado} tiempoMult={(store.config?.tiempoMult||100)/100} idioma={idioma} aprendizaje={store.aprendizaje||{}} chistesOn={store.config?.chistes !== false} />;
    if (screen === "rating")  return <RatingScreen store={store} persist={persist} go={go} pendingAsado={pendingAsado} setPendingAsado={setPendingAsado} saveAsado={saveAsado} idioma={idioma} aprendizaje={store.aprendizaje||{}} isCompleto={store.config?.completo||false} authUser={authUser} />;
    if (screen === "ranking") return <Ranking store={store} persist={persist} go={go} idioma={idioma} authUser={authUser} />;
    if (screen === "perfil")  return <Perfil store={store} persist={persist} go={go} idioma={idioma} aprendizaje={store.aprendizaje||{}} authUser={authUser} />;
    if (screen === "historial") return <Historial store={store} go={go} idioma={idioma} />;
    if (screen === "calculadora") return <Calculadora go={go} store={store} idioma={idioma} />;
    if (screen === "ajustes") return <Ajustes store={store} persist={persist} go={go} />;
    if (screen === "premium") return <PremiumScreen store={store} persist={persist} go={go} idioma={idioma} />;
    return <Home store={store} go={go} idioma={idioma} />;
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ width:"100vw", height:"100dvh", background:"#0d0a07", overflow:"hidden", display:"flex", flexDirection:"column", fontFamily:"'Inter',sans-serif", maxWidth:430, margin:"0 auto", position:"relative" }}>
        <div style={{ flex:1, opacity:fade?1:0, transition:"opacity .2s", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {renderScreen()}
        </div>
      </div>
    </>
  );
}

// ── LOADING SCREEN ────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ flex:1, background:"#0d0a07", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
      <div style={{ fontSize:60, animation:"fireFlicker 1s ease infinite", filter:"drop-shadow(0 0 20px #ff4500)" }}>🔥</div>
      <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:22, fontWeight:900 }}>PARRILLA MAESTRO</div>
      <div style={{ display:"flex", gap:8 }}>
        {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#ff8c42", animation:`bounce ${0.6+i*0.15}s ease-in-out infinite alternate`, opacity:0.6 }} />)}
      </div>
    </div>
  );
}

// ── LOGIN SCREEN ──────────────────────────────────────────────────
function LoginScreen({ go, idioma="es" }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) { setError("Completá email y contraseña."); return; }
    if (mode === "register" && !nombre.trim()) { setError("Poné tu nombre de parrillero."); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    setLoading(true); setError("");
    try {
      if (mode === "register") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: nombre.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // onAuthStateChanged handles navigation
    } catch(e) {
      const msgs = {
        "auth/email-already-in-use": "Ese email ya tiene una cuenta. Iniciá sesión.",
        "auth/invalid-email": "Email inválido.",
        "auth/wrong-password": "Contraseña incorrecta.",
        "auth/user-not-found": "No existe una cuenta con ese email.",
        "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos.",
        "auth/invalid-credential": "Email o contraseña incorrectos.",
        "auth/network-request-failed": "Sin conexión a internet.",
      };
      setError(msgs[e.code] || `Error: ${e.code || e.message}`);
      setLoading(false);
    }
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"radial-gradient(ellipse at 50% 0%,#2d1200 0%,#0d0a07 65%)" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"60px 26px 32px" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:56, animation:"fireFlicker 1s ease infinite", filter:"drop-shadow(0 0 18px #ff4500)", marginBottom:10 }}>🔥</div>
          <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:28, fontWeight:900, animation:"glow 2s ease-in-out infinite" }}>PARRILLA MAESTRO</div>
          <div style={{ color:"#8b7355", fontSize:12, letterSpacing:4, textTransform:"uppercase", marginTop:4 }}>El arte del fuego</div>
        </div>
        <div style={{ display:"flex", background:"#1a1005", borderRadius:14, padding:4, marginBottom:24, border:"1px solid #2a1a0a" }}>
          {[["login","🔑 Ingresar"],["register","✨ Registrarme"]].map(([m,l]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex:1, padding:"10px 0", background:mode===m?"linear-gradient(135deg,#c1440e,#8B2500)":"none", border:"none", borderRadius:11, color:mode===m?"white":"#555", fontSize:13, fontWeight:mode===m?700:400, cursor:"pointer", transition:"all .25s" }}>{l}</button>
          ))}
        </div>
        {mode === "register" && (
          <div style={{ marginBottom:12 }}>
            <div style={{ color:"#8b7355", fontSize:11, marginBottom:5 }}>🧑‍🍳 Tu nombre de parrillero</div>
            <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: El Colo, Hernán..." maxLength={20} style={{ width:"100%", padding:"12px 14px", background:"#1a1005", border:"1px solid #3a2a1a", borderRadius:12, color:"#f0e6d3", fontSize:14, outline:"none", fontFamily:"Inter,sans-serif" }} />
          </div>
        )}
        <div style={{ marginBottom:12 }}>
          <div style={{ color:"#8b7355", fontSize:11, marginBottom:5 }}>📧 Email</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" style={{ width:"100%", padding:"12px 14px", background:"#1a1005", border:"1px solid #3a2a1a", borderRadius:12, color:"#f0e6d3", fontSize:14, outline:"none", fontFamily:"Inter,sans-serif" }} />
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ color:"#8b7355", fontSize:11, marginBottom:5 }}>🔒 Contraseña {mode==="register"?"(mínimo 6 caracteres)":""}</div>
          <div style={{ position:"relative" }}>
            <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAuth()} placeholder="••••••••" style={{ width:"100%", padding:"12px 44px 12px 14px", background:"#1a1005", border:"1px solid #3a2a1a", borderRadius:12, color:"#f0e6d3", fontSize:14, outline:"none", fontFamily:"Inter,sans-serif" }} />
            <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#555" }}>{showPass?"🙈":"👁"}</button>
          </div>
        </div>
        {error && <div style={{ background:"#3d0000", border:"1px solid #e5393544", borderRadius:10, padding:"10px 14px", marginBottom:14, color:"#ef9a9a", fontSize:13 }}>⚠️ {error}</div>}
        <button onClick={handleAuth} disabled={loading} style={{ width:"100%", padding:15, background:loading?"#1a1005":"linear-gradient(135deg,#c1440e,#6d1500)", border:"none", borderRadius:14, color:loading?"#555":"white", fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", marginBottom:12, animation:loading?"none":"pulseBtn 3s ease-in-out infinite" }}>
          {loading ? "⏳ Cargando..." : mode==="login" ? "🔥 Ingresar" : "✨ Crear cuenta"}
        </button>
        <div style={{ background:"linear-gradient(135deg,#1a1a2a,#0d0d1a)", borderRadius:12, padding:"12px 14px", border:"1px solid #33344a" }}>
          <div style={{ color:"#7986cb", fontSize:11, fontWeight:700, marginBottom:4 }}>🔐 Tus datos están seguros</div>
          <div style={{ color:"#555", fontSize:11, lineHeight:1.6 }}>Tu cuenta se guarda en Firebase. Tu historial se sincroniza entre dispositivos.</div>
        </div>
      </div>
    </div>
  );
}


// ── SPLASH ────────────────────────────────────────────────────────
function Splash() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setP(1), 300);
    const t2 = setTimeout(() => setP(2), 1000);
    const t3 = setTimeout(() => setP(3), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return (
    <div style={{ flex:1, background:"radial-gradient(ellipse at 50% 85%,#3d1200 0%,#1a0800 40%,#0d0500 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      {[...Array(16)].map((_, i) => (
        <div key={i} style={{ position:"absolute", width:3+(i%3)*2, height:3+(i%3)*2, borderRadius:"50%", background:`hsl(${20+(i*7)%30},100%,${50+(i*3)%30}%)`, left:`${10+(i*17)%80}%`, bottom:`${10+(i*13)%40}%`, animation:`ember ${2+(i%3)}s ${(i*.4)%2}s infinite ease-out`, opacity:p>=1?1:0, transition:"opacity 1s" }} />
      ))}
      <div style={{ fontSize:90, lineHeight:1, animation:"flicker .8s ease-in-out infinite", opacity:p>=1?1:0, transition:"opacity .8s", filter:"drop-shadow(0 0 30px #ff6a00)", marginBottom:14 }}>🔥</div>
      <div style={{ opacity:p>=2?1:0, transition:"opacity .8s", textAlign:"center" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:50, fontWeight:900, color:"#ff8c42", animation:"glow 2s ease-in-out infinite", lineHeight:1 }}>PARRILLA</div>
        <div style={{ fontSize:14, letterSpacing:9, color:"#d4a373", textTransform:"uppercase", marginTop:4 }}>MAESTRO</div>
      </div>
      <div style={{ marginTop:44, opacity:p>=3?1:0, transition:"opacity .8s", fontSize:12, color:"#8b6914", letterSpacing:3, textTransform:"uppercase" }}>El arte del fuego</div>
    </div>
  );
}

// ── ONBOARDING ────────────────────────────────────────────────────
function Onboard({ store, persist, go, idioma="es" }) {
  const [nombre, setNombre] = useState("");
  const [avatar, setAvatar] = useState("🧑‍🍳");
  const [step, setStep] = useState(0);

  const finish = () => {
    if (!nombre.trim()) return;
    persist(prev => ({ ...prev, user:{ ...prev.user, nombre:nombre.trim(), avatar, joinedAt: prev.user?.joinedAt || Date.now() } }));
    go("home");
  };

  const features = [["🏆",t(idioma,"feat1_t"),t(idioma,"feat1_s")],["📈",t(idioma,"feat2_t"),t(idioma,"feat2_s")],["🧠",t(idioma,"feat3_t"),t(idioma,"feat3_s")],["🎮",t(idioma,"feat4_t"),t(idioma,"feat4_s")]];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"radial-gradient(ellipse at 50% 0%,#2d1200 0%,#0d0a07 60%)" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"56px 24px 32px" }}>

        {step === 0 && (
          <div style={{ animation:"fadeUp .5s ease", textAlign:"center" }}>
            <div style={{ fontSize:70, marginBottom:20, animation:"fireFlicker 1s ease infinite", filter:"drop-shadow(0 0 20px #ff4500)" }}>🔥</div>
            <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:26, fontWeight:900, marginBottom:10 }}>{t(idioma,"bienvenido")}</div>
            <div style={{ color:"#8b7355", fontSize:13, lineHeight:1.8, marginBottom:28 }}>{t(idioma,"bienvenido_desc")}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
              {features.map(([em, t, s]) => (
                <div key={t} style={{ display:"flex", alignItems:"center", gap:14, background:"#1a1005", borderRadius:14, padding:"12px 16px", border:"1px solid #2a1a0a", textAlign:"left" }}>
                  <span style={{ fontSize:24 }}>{em}</span>
                  <div>
                    <div style={{ color:"#f0e6d3", fontSize:13, fontWeight:700 }}>{t}</div>
                    <div style={{ color:"#6b5a3e", fontSize:11, marginTop:2 }}>{s}</div>
                  </div>
                </div>
              ))}
            </div>
            <SimBtn label={t(idioma,"crear_perfil")} onClick={() => setStep(1)} />
          </div>
        )}

        {step === 1 && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ fontSize:50 }}>👤</div>
              <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:22, fontWeight:900, marginTop:10 }}>{t(idioma,"como_llaman")}</div>
              <div style={{ color:"#6b5a3e", fontSize:13, marginTop:6 }}>{t(idioma,"nombre_sub")}</div>
            </div>
            <TxtInput value={nombre} onChange={e => setNombre(e.target.value)} placeholder={t(idioma,"nombre_ph")} maxLength={20} />
            <SimBtn label={t(idioma,"siguiente")} onClick={() => nombre.trim() && setStep(2)} />
          </div>
        )}

        {step === 2 && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:52 }}>{avatar}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:22, fontWeight:900, marginTop:10 }}>{t(idioma,"elegir_avatar")}</div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:12, justifyContent:"center", marginBottom:24 }}>
              {AVATAR_OPTIONS.map(a => (
                <button key={a} onClick={() => setAvatar(a)} style={{ width:62, height:62, background:avatar===a?"#ff8c4233":"#1a1005", border:`2px solid ${avatar===a?"#ff8c42":"#2a1a0a"}`, borderRadius:16, fontSize:28, cursor:"pointer", transition:"all .2s" }}>
                  {a}
                </button>
              ))}
            </div>
            <div style={{ background:"linear-gradient(135deg,#1a1005,#2a1200)", borderRadius:18, padding:18, border:"1px solid #ff8c4233", textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:40, marginBottom:6 }}>{avatar}</div>
              <div style={{ color:"#ff8c42", fontSize:18, fontWeight:900, fontFamily:"'Playfair Display',serif" }}>{nombre || "Parrillero"}</div>
              <div style={{ color:"#8b7355", fontSize:12, marginTop:4 }}>Nivel 1 · Encendedor 🔥</div>
            </div>
            <SimBtn label={t(idioma,"empezar")} onClick={finish} />
          </div>
        )}

      </div>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────
function Home({ store, go, idioma='es' }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setTimeout(() => setOn(true), 80); }, []);
  const { user, asados } = store;
  const xp = totalXP(asados);
  const lvl = levelFromXP(xp);
  const xpCur = xpInLevel(xp);
  const xpNeed = xpForLevel(lvl);
  const last = asados.length > 0 ? asados[asados.length - 1] : null;
  const btns = [
    { id:"preparaciones", label:t(idioma,"preparaciones"), emoji:"🥩", sub:t(idioma,"prep_sub"), color:"#c1440e" },
    { id:"fuego", label:t(idioma,"fuego"), emoji:"🔥", sub:t(idioma,"fuego_sub"), color:"#e07b00" },
    { id:"calculadora", label:t(idioma,"calculadora"), emoji:"⚖️", sub:t(idioma,"calc_sub"), color:"#1565c0" },
    { id:"simulacion", label:t(idioma,"simulacion"), emoji:"🎮", sub:t(idioma,"sim_sub"), color:"#8B2500" },
    { id:"ranking", label:t(idioma,"ranking"), emoji:"🏆", sub:t(idioma,"ranking_sub"), color:"#b5a000" },
  ];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ background:"linear-gradient(180deg,#1a0800 0%,#2d1200 50%,#0d0a07 100%)", padding:"44px 20px 12px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={() => go("perfil")} style={{ width:42, height:42, background:"#ff8c4222", border:"2px solid #ff8c4244", borderRadius:12, fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {user?.avatar || "🧑‍🍳"}
            </button>
            <div>
              <div style={{ color:"#f0e6d3", fontSize:14, fontWeight:700 }}>{t(idioma,"hola")}, {user?.nombre || "Parrillero"} 👋</div>
              <div style={{ color:"#8b7355", fontSize:11 }}>Nv.{lvl} · {TITLE(lvl, idioma)}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => go("historial")} style={{ background:"#1a1005", border:"1px solid #2a1a0a", borderRadius:10, padding:"6px 12px", color:"#ff8c42", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              📋 {asados.length}
            </button>
            {!store.config?.premium && !store.config?.completo && (
              <button onClick={() => go("premium")} style={{ background:"linear-gradient(135deg,#2d1f00,#1a1200)", border:"1px solid #ffd70055", borderRadius:10, padding:"6px 10px", color:"#ffd700", fontSize:11, fontWeight:700, cursor:"pointer" }}>⭐ VIP</button>
            )}
            <button onClick={() => go("ajustes")} style={{ background:"#1a1005", border:"1px solid #2a1a0a", borderRadius:10, padding:"6px 10px", color:"#8b7355", fontSize:14, cursor:"pointer" }}>⚙️</button>
          </div>
        </div>
        <div style={{ background:"#1a1005", borderRadius:10, padding:"8px 12px", border:"1px solid #2a1a0a", marginBottom:last ? 12 : 0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ color:"#8b7355", fontSize:10 }}>EXP · Nivel {lvl}</span>
            <span style={{ color:"#ff8c42", fontSize:10, fontWeight:700 }}>{xpCur} / {xpNeed} XP</span>
          </div>
          <div style={{ height:4, background:"#2a1a0a", borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${Math.min(xpCur/xpNeed,1)*100}%`, background:"linear-gradient(90deg,#c1440e,#ff8c42)", borderRadius:2, transition:"width 1s ease" }} />
          </div>
        </div>
        {last && (
          <button onClick={() => go("historial")} style={{ width:"100%", background:`linear-gradient(135deg,${rankColor(last.rating)}11,#1a1200)`, border:`1px solid ${rankColor(last.rating)}33`, borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left" }}>
            <span style={{ fontSize:22 }}>{rankEmoji(last.rating)}</span>
            <div style={{ flex:1 }}>
              <div style={{ color:"#c9b49a", fontSize:12, fontWeight:700 }}>Último · {dateStr(last.ts)}</div>
              <div style={{ color:rankColor(last.rating), fontSize:11, marginTop:1 }}>{rankLabel(last.rating)} · {last.cortes.slice(0,2).join(", ")}</div>
            </div>
            <span style={{ color:"#555", fontSize:16 }}>›</span>
          </button>
        )}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 18px 24px" }}>
        {btns.map((b, i) => (
          <button key={b.id} onClick={() => go(b.id)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"12px 16px", background:`linear-gradient(135deg,${b.color}22,${b.color}0d)`, border:`1px solid ${b.color}44`, borderRadius:14, cursor:"pointer", textAlign:"left", marginBottom:8, opacity:on?1:0, transform:on?"translateY(0)":"translateY(24px)", transition:`all .4s ease ${i*.1+.1}s` }}>
            <div style={{ width:44, height:44, background:`${b.color}33`, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{b.emoji}</div>
            <div>
              <div style={{ color:"#f0e6d3", fontSize:15, fontWeight:700 }}>{b.label}</div>
              <div style={{ color:"#8b7355", fontSize:11, marginTop:1 }}>{b.sub}</div>
            </div>
            <div style={{ marginLeft:"auto", color:b.color, fontSize:20 }}>›</div>
          </button>
        ))}
        {asados.length > 0 && (
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            {[["🏆",`${avgRating(asados)}%`,"precisión"],["🔥",asados.length,"asados"],["🥩",favCorte(asados)||"—","favorito"]].map(([em,v,l]) => (
              <div key={l} style={{ flex:1, background:"#1a1005", borderRadius:12, padding:"10px 8px", border:"1px solid #2a1a0a", textAlign:"center" }}>
                <div style={{ fontSize:18 }}>{em}</div>
                <div style={{ color:"#ff8c42", fontSize:13, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v}</div>
                <div style={{ color:"#555", fontSize:10 }}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CORTE THUMBNAIL (emoji fallback when no photo or image fails) ──
function CorteImg({ thumb, corte }) {
  const [failed, setFailed] = useState(false);
  if (!thumb || failed) {
    return <div style={{ width:"100%", height:"100%", background:`${corte.color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{corte.emoji}</div>;
  }
  return (
    <>
      <img src={thumb} alt={corte.nombre} onError={() => setFailed(true)} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", filter:"saturate(1.3) contrast(1.1) brightness(0.8)" }} />
      <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,${corte.color}44 0%,transparent 60%)` }} />
    </>
  );
}

// ── HEADER ────────────────────────────────────────────────────────
function Hdr({ title, sub, onBack, badge }) {
  return (
    <div style={{ padding:"48px 22px 14px", background:"linear-gradient(180deg,#1a0800,#0d0a07)", borderBottom:"1px solid #2a1a0a", flexShrink:0 }}>
      <button onClick={onBack} style={{ background:"none", border:"none", color:"#ff8c42", fontSize:24, cursor:"pointer", marginBottom:6, padding:0 }}>‹</button>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:24, fontWeight:900 }}>{title}</div>
          <div style={{ color:"#8b6914", fontSize:11, letterSpacing:2 }}>{sub}</div>
        </div>
        {badge}
      </div>
    </div>
  );
}

// ── PREPARACIONES ─────────────────────────────────────────────────
function Preparaciones({ go, idioma='es', isPremium=false }) {
  const [tab, setTab] = useState("vacuno");
  const [sel, setSel] = useState(null);
  const allCortes = { vacuno:CORTES_VACUNO, cerdo:CORTES_CERDO, achuras:ACHURAS };
  if (sel) return <CorteDetail corte={sel} onBack={() => setSel(null)} idioma={idioma} />;
  const cortesList = allCortes[tab] || [];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Hdr title={t(idioma,"preparaciones")} sub={t(idioma,"prep_sub")} onBack={() => go("home")} />
      <div style={{ display:"flex", borderBottom:"1px solid #2a1a0a", flexShrink:0 }}>
        {[{id:"vacuno",l:t(idioma,"vacuno")},{id:"cerdo",l:t(idioma,"cerdo")},{id:"achuras",l:t(idioma,"achuras")},{id:"premium",l:t(idioma,"vip")}].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{ flex:1, padding:"11px 4px", background:"none", border:"none", borderBottom:tab===tb.id?"2px solid #ff8c42":"2px solid transparent", color:tab===tb.id?"#ff8c42":"#555", fontSize:11, fontWeight:tab===tb.id?700:400, cursor:"pointer" }}>{tb.l}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:14 }}>
        {tab === "premium" ? (
          <div>
            {!isPremium && (
              <div style={{ background:"linear-gradient(135deg,#2d1f00,#1a1200)", border:"1px solid #ff8c42", borderRadius:16, padding:18, marginBottom:14, textAlign:"center" }}>
                <div style={{ fontSize:30, marginBottom:6 }}>⭐</div>
                <div style={{ color:"#ff8c42", fontSize:17, fontWeight:700, marginBottom:8 }}>{t(idioma,"premium_title")}</div>
                <div style={{ color:"#8b7355", fontSize:13, lineHeight:1.6, marginBottom:14 }}>{t(idioma,"premium_desc")}</div>
                <button onClick={() => go("premium")} style={{ background:"linear-gradient(135deg,#ffd700,#ff8c42)", border:"none", borderRadius:12, padding:"11px 28px", color:"#1a0a00", fontWeight:900, fontSize:14, cursor:"pointer" }}>{t(idioma,"premium_btn")}</button>
              </div>
            )}
            {PREMIUM_CORTES.map((c, i) => {
              const thumb = CORTE_IMAGES[c.id];
              if (isPremium) return (
                <button key={c.id} onClick={() => setSel(c)} style={{ width:"100%", display:"flex", alignItems:"center", gap:13, padding:"11px 13px", background:"#1a1005", borderRadius:14, marginBottom:9, border:`1px solid ${c.color}44`, cursor:"pointer", textAlign:"left", animation:`slideUp .3s ease ${i*.05}s both` }}>
                  <div style={{ width:56, height:56, borderRadius:12, flexShrink:0, overflow:"hidden", position:"relative", border:`1px solid ${c.color}55` }}>
                    <CorteImg thumb={thumb} corte={c} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:"#f0e6d3", fontSize:14, fontWeight:700 }}>{c.nombre}</div>
                    <div style={{ color:"#8b7355", fontSize:11, marginTop:2 }}>⏱ {c.tiempo}</div>
                    <div style={{ color:"#5a4a32", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{td(c,'descripcion',idioma)}</div>
                  </div>
                  <div style={{ color:c.color, fontSize:18, flexShrink:0 }}>›</div>
                </button>
              );
              return (
                <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 15px", background:"#1a1005", borderRadius:12, marginBottom:8, border:"1px solid #2a1a0a", opacity:.45 }}>
                  <span style={{ fontSize:26 }}>{c.emoji}</span>
                  <span style={{ color:"#8b7355", fontSize:14 }}>{c.nombre}</span>
                  <span style={{ marginLeft:"auto", color:"#ff8c42" }}>🔒</span>
                </div>
              );
            })}
          </div>
        ) : (
          cortesList.map((c, i) => {
            const thumb = CORTE_IMAGES[c.id];
            return (
              <button key={c.id} onClick={() => setSel(c)} style={{ width:"100%", display:"flex", alignItems:"center", gap:13, padding:"11px 13px", background:"#1a1005", borderRadius:14, marginBottom:9, border:`1px solid ${c.color}33`, cursor:"pointer", textAlign:"left", animation:`slideUp .3s ease ${i*.05}s both`, overflow:"hidden" }}>
                <div style={{ width:56, height:56, borderRadius:12, flexShrink:0, overflow:"hidden", position:"relative", border:`1px solid ${c.color}55` }}>
                  <CorteImg thumb={thumb} corte={c} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:"#f0e6d3", fontSize:14, fontWeight:700 }}>{c.nombre}</div>
                  <div style={{ color:"#8b7355", fontSize:11, marginTop:2 }}>⏱ {c.tiempo}</div>
                  <div style={{ color:"#5a4a32", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{td(c,'descripcion',idioma)}</div>
                </div>
                <div style={{ color:c.color, fontSize:18, flexShrink:0 }}>›</div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
function CorteDetail({ corte, onBack, idioma='es' }) {
  const [imgOk, setImgOk] = useState(true);
  const rows = [[t(idioma,"prep_detail_preparacion"), td(corte,'preparacion',idioma)], [t(idioma,"prep_detail_tiempo"), corte.tiempo], [t(idioma,"prep_detail_temp"), td(corte,'temperatura',idioma)], [t(idioma,"prep_detail_servir"), td(corte,'servir',idioma)]];
  const imgUrl = CORTE_IMAGES[corte.id];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Hero — real photo or gradient fallback */}
      <div style={{ height:220, position:"relative", flexShrink:0, overflow:"hidden" }}>
        {imgUrl && imgOk ? (
          <>
            {/* Color-graded photo */}
            <img
              src={imgUrl}
              alt={corte.nombre}
              onError={() => setImgOk(false)}
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", filter:"saturate(1.45) contrast(1.12) brightness(0.78)" }}
            />
            {/* Warm ember tint in top corners */}
            <div style={{ position:"absolute", inset:0, background:`linear-gradient(155deg,${corte.color}40 0%,transparent 50%)`, pointerEvents:"none" }} />
            {/* Vignette — darkens edges */}
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 110% 90% at 50% 25%, transparent 38%, rgba(0,0,0,0.55) 100%)", pointerEvents:"none" }} />
            {/* Bottom gradient — strong so title text is crisp */}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(0,0,0,0.42) 0%,transparent 28%,rgba(13,10,7,0.97) 88%)", pointerEvents:"none" }} />
          </>
        ) : (
          <div style={{ width:"100%", height:"100%", background:`linear-gradient(180deg,${corte.color}55 0%,#0d0a07 100%)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:72, filter:`drop-shadow(0 0 24px ${corte.color})` }}>{corte.emoji}</span>
          </div>
        )}
        {/* Back button */}
        <button onClick={onBack} style={{ position:"absolute", top:48, left:16, background:"rgba(0,0,0,.55)", border:"none", color:"white", fontSize:22, cursor:"pointer", width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>‹</button>
        {/* Title overlaid on image */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"14px 20px" }}>
          <div style={{ fontFamily:"'Playfair Display',serif", color:"#fff", fontSize:22, fontWeight:900, textShadow:"0 2px 8px rgba(0,0,0,.8)" }}>{corte.nombre}</div>
          <div style={{ color:`${corte.color === "#3D0C02" ? "#ff8c42" : corte.color}`, fontSize:11, fontWeight:700, letterSpacing:1, marginTop:2 }}>
            ⏱ {corte.tiempo} · {td(corte,'temperatura',idioma)}
          </div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 36px" }}>
        <p style={{ color:"#c9b49a", fontSize:13, lineHeight:1.7, marginBottom:16 }}>{td(corte,'descripcion',idioma)}</p>
        {rows.map(([l, v]) => (
          <div key={l} style={{ background:"#1a1005", borderRadius:12, padding:"12px 14px", marginBottom:8, border:`1px solid ${corte.color}22` }}>
            <div style={{ color:corte.color === "#3D0C02" ? "#ff8c42" : corte.color, fontSize:10, fontWeight:700, letterSpacing:1, marginBottom:4 }}>{l}</div>
            <div style={{ color:"#c9b49a", fontSize:13, lineHeight:1.6 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FUEGO ─────────────────────────────────────────────────────────
function Fuego({ go, idioma="es" }) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Hdr title={t(idioma,"fuego")} sub={t(idioma,"fuego_sub")} onBack={() => go("home")} />
      <div style={{ flex:1, overflowY:"auto", padding:14 }}>
        <div style={{ background:"linear-gradient(135deg,#2d1200,#1a0a00)", border:"1px solid #ff8c4233", borderRadius:14, padding:"13px 15px", marginBottom:14 }}>
          <div style={{ color:"#ff8c42", fontSize:11, fontWeight:700, marginBottom:4 }}>{t(idioma,"regla_oro")}</div>
          <div style={{ color:"#c9b49a", fontSize:13, lineHeight:1.6 }}>{t(idioma,"regla_oro_txt")}</div>
        </div>
        {METODOS_FUEGO.map(m => (
          <div key={m.id} style={{ background:"#1a1005", borderRadius:14, padding:15, marginBottom:11, border:"1px solid #2a1a0a" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
              <span style={{ fontSize:26 }}>{m.emoji}</span>
              <div>
                <div style={{ color:"#f0e6d3", fontSize:14, fontWeight:700 }}>{td(m,'titulo',idioma)}</div>
                <div style={{ display:"flex", gap:8, marginTop:3 }}>
                  <span style={{ background:"#ff8c4222", color:"#ff8c42", fontSize:10, padding:"2px 8px", borderRadius:6, fontWeight:600 }}>{td(m,'dificultad',idioma)}</span>
                  <span style={{ color:"#6b5a3e", fontSize:11 }}>⏱ {m.tiempo}</span>
                </div>
              </div>
            </div>
            <p style={{ color:"#8b7355", fontSize:12, lineHeight:1.65, margin:0 }}>{td(m,'descripcion',idioma)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CALCULADORA ───────────────────────────────────────────────────
function Calculadora({ go, store, idioma="es" }) {
  const [comensales, setComensales] = useState(4);
  const [achuras, setAchuras] = useState(false);

  // Carnes fijas: 500g por persona dividido en 3 cortes
  // Asado de tira/vacío 50%, Bondiola de cerdo 25%, Entraña/cuadril 25%
  const carneG = comensales * 500;
  // Achuras: chorizos (1 por persona ~100g) + otras achuras (100g por persona)
  const chorizosUnid = achuras ? comensales : 0;
  const chorizosG = chorizosUnid * 100;
  const otrasAchurasG = achuras ? comensales * 100 : 0;
  const achuraG = chorizosG + otrasAchurasG;
  const totalG = carneG + achuraG;
  const totalKg = (totalG / 1000).toFixed(2);
  const carbonKg = (Math.ceil(+totalKg * 2 * 10) / 10).toFixed(1);

  // Cortes de carne (suman 100% de carneG)
  const cortesCarne = [
    { label:"Asado de tira / Vacío", pct:0.50, color:"#8B1A1A", emoji:"🥩", g: Math.round(carneG * 0.50) },
    { label:"Bondiola de cerdo",     pct:0.25, color:"#D4A017", emoji:"🐷", g: Math.round(carneG * 0.25) },
    { label:"Entraña / Cuadril",     pct:0.25, color:"#BB3E03", emoji:"🥩", g: Math.round(carneG * 0.25) },
  ];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Hdr title={t(idioma,"calculadora")} sub={t(idioma,"calc_sub")} onBack={() => go("home")} />
      <div style={{ flex:1, overflowY:"auto", padding:14 }}>

        {/* Comensales slider */}
        <div style={{ background:"#1a1005", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #2a1a0a" }}>
          <div style={{ color:"#ff8c42", fontSize:13, fontWeight:700, marginBottom:16 }}>🧑‍🤝‍🧑 {t(idioma,"cuantos")}</div>
          <input type="range" min={1} max={20} value={comensales} onChange={e => setComensales(+e.target.value)} />
          <div style={{ textAlign:"center", marginTop:6, marginBottom:4 }}>
            <span style={{ color:"#ff8c42", fontSize:40, fontWeight:900, lineHeight:1 }}>{comensales}</span>
            <span style={{ color:"#8b7355", fontSize:14, marginLeft:6 }}>{comensales !== 1 ? t(idioma,"personas") : t(idioma,"persona")}</span>
          </div>
          <div style={{ textAlign:"center", color:"#555", fontSize:11 }}>{t(idioma,"grxpersona")}</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, padding:"10px 0", borderTop:"1px solid #2a1a0a" }}>
            <div>
              <div style={{ color:"#c9b49a", fontSize:13, fontWeight:600 }}>{t(idioma,"mas_achuras")}</div>
              <div style={{ color:"#555", fontSize:11 }}>{t(idioma,"achuras_desc")}</div>
            </div>
            <button onClick={() => setAchuras(!achuras)} style={{ width:44, height:24, background:achuras?"#ff8c42":"#333", borderRadius:12, border:"none", cursor:"pointer", position:"relative", transition:"background .3s" }}>
              <div style={{ width:20, height:20, background:"white", borderRadius:"50%", position:"absolute", top:2, left:achuras?22:2, transition:"left .3s" }} />
            </button>
          </div>
        </div>

        {/* Resultado principal */}
        <div style={{ background:"linear-gradient(135deg,#2d1200,#1a0800)", borderRadius:18, padding:20, marginBottom:14, border:"1px solid #ff8c4244" }}>
          <div style={{ display:"flex", gap:10, marginBottom:achuras?12:0 }}>
            <div style={{ flex:1, background:"#0d0a07", borderRadius:14, padding:"14px 12px", textAlign:"center", border:"1px solid #3a1a0a" }}>
              <div style={{ fontSize:28, marginBottom:4 }}>🥩</div>
              <div style={{ color:"#ff8c42", fontSize:26, fontWeight:900, lineHeight:1 }}>{totalKg}</div>
              <div style={{ color:"#8b7355", fontSize:11, marginTop:3 }}>{t(idioma,"kg_totales")}</div>
              <div style={{ color:"#555", fontSize:10, marginTop:1 }}>{totalG}g</div>
            </div>
            <div style={{ flex:1, background:"#0d0a07", borderRadius:14, padding:"14px 12px", textAlign:"center", border:"1px solid #3a1a0a" }}>
              <div style={{ fontSize:28, marginBottom:4 }}>🔥</div>
              <div style={{ color:"#e07b00", fontSize:26, fontWeight:900, lineHeight:1 }}>{carbonKg}</div>
              <div style={{ color:"#8b7355", fontSize:11, marginTop:3 }}>{t(idioma,"kg_carbon")}</div>
              <div style={{ color:"#555", fontSize:10, marginTop:1 }}>{t(idioma,"proporcion")}</div>
            </div>
          </div>
          {achuras && (
            <div style={{ display:"flex", gap:8, marginTop:0 }}>
              <div style={{ flex:1, background:"#1a1005", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                <div style={{ color:"#94452A", fontSize:11, fontWeight:700 }}>🌭 Chorizos</div>
                <div style={{ color:"#ff8c42", fontSize:16, fontWeight:900 }}>{chorizosUnid} unid.</div>
              </div>
              <div style={{ flex:1, background:"#1a1005", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                <div style={{ color:"#6A040F", fontSize:11, fontWeight:700 }}>🫀 Otras achuras</div>
                <div style={{ color:"#ff8c42", fontSize:16, fontWeight:900 }}>{otrasAchurasG}g</div>
              </div>
            </div>
          )}
        </div>

        {/* Desglose carnes */}
        <div style={{ background:"#1a1005", borderRadius:16, padding:16, marginBottom:14, border:"1px solid #2a1a0a" }}>
          <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700, marginBottom:12 }}>{t(idioma,"desglose_carnes")}</div>
          {cortesCarne.map(s => {
            const kg = (s.g / 1000).toFixed(2);
            const barW = Math.round(s.pct * 100);
            return (
              <div key={s.label} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ color:"#c9b49a", fontSize:13 }}>{s.emoji} {s.label}</span>
                  <span style={{ color:s.color, fontSize:13, fontWeight:700 }}>{kg} kg</span>
                </div>
                <div style={{ height:4, background:"#2a1a0a", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${barW}%`, background:s.color, borderRadius:2 }} />
                </div>
              </div>
            );
          })}
          {achuras && (
            <div style={{ borderTop:"1px solid #2a1a0a", marginTop:4, paddingTop:12 }}>
              <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700, marginBottom:10 }}>{t(idioma,"desglose_achuras")}</div>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ color:"#c9b49a", fontSize:13 }}>🌭 Chorizos</span>
                  <span style={{ color:"#94452A", fontSize:13, fontWeight:700 }}>{chorizosUnid} unid. ({chorizosG}g)</span>
                </div>
                <div style={{ height:4, background:"#2a1a0a", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.round(chorizosG/(achuraG)*100)}%`, background:"#94452A", borderRadius:2 }} />
                </div>
              </div>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ color:"#c9b49a", fontSize:13 }}>🫀 Mollejas / Chinchulines</span>
                  <span style={{ color:"#6A040F", fontSize:13, fontWeight:700 }}>{otrasAchurasG}g</span>
                </div>
                <div style={{ height:4, background:"#2a1a0a", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.round(otrasAchurasG/(achuraG)*100)}%`, background:"#6A040F", borderRadius:2 }} />
                </div>
              </div>
            </div>
          )}
          <div style={{ color:"#555", fontSize:11, marginTop:10, paddingTop:8, borderTop:"1px solid #1a1a0a" }}>
            Total: carne {(carneG/1000).toFixed(2)} kg{achuras ? ` + achuras ${(achuraG/1000).toFixed(2)} kg = ${totalKg} kg` : ""}
          </div>
        </div>

        {/* Tip carbón */}
        <div style={{ background:"linear-gradient(135deg,#1a1200,#2a1800)", borderRadius:14, padding:"13px 15px", border:"1px solid #ff8c4222" }}>
          <div style={{ color:"#ff8c42", fontSize:11, fontWeight:700, marginBottom:6 }}>{t(idioma,"consejo_carbon")}</div>
          <div style={{ color:"#8b7355", fontSize:12, lineHeight:1.65 }}>
            {t(idioma,"consejo_txt1")} {comensales} {comensales !== 1 ? t(idioma,"personas") : t(idioma,"persona")}, {t(idioma,"consejo_txt2")} <span style={{ color:"#ff8c42", fontWeight:700 }}>{Math.ceil(+carbonKg * 1.15 * 10) / 10} kg</span> {t(idioma,"consejo_txt3")}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── SIMULACION ────────────────────────────────────────────────────
// Split into sub-components to avoid "returnReact is not defined" parser error

function SimModeSelect({ setMode, setStep, idioma="es", aprendizaje={}, tipoParrilla="adjustable" }) {
  const cortesConAprendizaje = Object.keys(aprendizaje).filter(c => aprendizaje[c]?.[tipoParrilla]);
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"18px 18px" }}>
      <div style={{ textAlign:"center", marginBottom:18 }}>
        <div style={{ fontSize:50, animation:"fireFlicker 1s ease infinite", filter:"drop-shadow(0 0 18px #ff4500)", marginBottom:10 }}>🔥</div>
        <div style={{ color:"#f0e6d3", fontSize:18, fontWeight:700 }}>{t(idioma,"como_arrancar")}</div>
      </div>
      {cortesConAprendizaje.length > 0 && (
        <div style={{ background:"linear-gradient(135deg,#1a2a1a,#0d1a0d)", border:"1px solid #4caf5044", borderRadius:14, padding:"12px 14px", marginBottom:16 }}>
          <div style={{ color:"#4caf50", fontSize:11, fontWeight:700, marginBottom:8 }}>🧠 {idioma==="en"?"AI adjusted your times":"IA ajustó tus tiempos"}</div>
          {cortesConAprendizaje.map(c => {
            const m = aprendizaje[c][tipoParrilla];
            const pct = Math.round((m - 1) * 100);
            const color = pct > 0 ? "#ff8c42" : pct < 0 ? "#4caf50" : "#555";
            return (
              <div key={c} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <span style={{ color:"#c9b49a", fontSize:12 }}>{c}</span>
                <span style={{ color, fontSize:12, fontWeight:700 }}>
                  {pct === 0 ? "✅ perfecto" : pct > 0 ? `+${pct}% más tiempo` : `${pct}% menos tiempo`}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <button onClick={() => { setMode("beginner"); setStep("select"); }} style={{ width:"100%", textAlign:"left", padding:18, marginBottom:12, background:"linear-gradient(135deg,#1a3a1a,#0d2010)", border:"2px solid #4caf5044", borderRadius:20, cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:13, marginBottom:8 }}>
          <span style={{ fontSize:32 }}>📖</span>
          <div>
            <div style={{ color:"#4caf50", fontSize:16, fontWeight:800 }}>{t(idioma,"principiante")}</div>
            <div style={{ color:"#2e7d32", fontSize:11 }}>{t(idioma,"prin_sub")}</div>
          </div>
        </div>
        <div style={{ color:"#6b5a3e", fontSize:12, lineHeight:1.6 }}>{t(idioma,"prin_desc")}</div>
      </button>
      <button onClick={() => { setMode("pro"); setStep("fireCheckPro"); }} style={{ width:"100%", textAlign:"left", padding:18, background:"linear-gradient(135deg,#3a1200,#1a0700)", border:"2px solid #ff8c4244", borderRadius:20, cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:13, marginBottom:8 }}>
          <span style={{ fontSize:32 }}>⚡</span>
          <div>
            <div style={{ color:"#ff8c42", fontSize:16, fontWeight:800 }}>{t(idioma,"pro")}</div>
            <div style={{ color:"#c1440e", fontSize:11 }}>{t(idioma,"pro_sub")}</div>
          </div>
        </div>
        <div style={{ color:"#6b5a3e", fontSize:12, lineHeight:1.6 }}>{t(idioma,"pro_desc")}</div>
      </button>
    </div>
  );
}

function SimSelectCortes({ selected, toggleSel, coccion, setStep, idioma="es", aprendizaje={}, tipoParrilla="adjustable", isPremium=false, onGoPremium }) {
  const grupos = [
    { label: idioma==="en" ? "🐄 Beef" : "🐄 Vacuno", ids: ["asado-tira","vacio","entraña","lomo","cuadril","matambre","bife-chorizo","ojo-bife","tapa-asado","colita-cuadril"] },
    { label: idioma==="en" ? "🐷 Pork" : "🐷 Cerdo",  ids: ["bondiola","costillas-cerdo","lomo-cerdo","matambre-cerdo","pechito-cerdo"] },
    { label: idioma==="en" ? "🫀 Offal" : "🫀 Achuras", ids: ["chorizos","morcilla","mollejas","chinchulines","riñon","provoleta"] },
    { label: idioma==="en" ? "⭐ VIP Premium" : "⭐ VIP Premium", ids: ["lechon","pollo","cordero","picanha"] },
  ];
  const byId = Object.fromEntries(SIMULACION_CORTES.map(c => [c.id, c]));

  return (
    <div style={{ flex:1, overflowY:"auto", padding:14 }}>
      <StepBar step={1} total={4} label={t(idioma,"sel_cortes")} idioma={idioma} />

      {grupos.map(grupo => (
        <div key={grupo.label} style={{ marginBottom:14 }}>
          <div style={{ color:"#8b6914", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8, paddingLeft:2 }}>{grupo.label}</div>
          {grupo.ids.map(id => {
            const c = byId[id];
            if (!c) return null;
            const isSel = !!selected.find(x => x.id === c.id);
            const personalMult = aprendizaje[c.nombre]?.[tipoParrilla];
            const tiempoAjustado = personalMult ? Math.round(c.tiempo * personalMult) : null;
            if (c.vip && !isPremium) return (
              <button key={c.id} onClick={() => onGoPremium()} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"10px 13px", marginBottom:6, background:"#1a1200", border:"2px solid #ffd70033", borderRadius:12, cursor:"pointer", textAlign:"left", opacity:.7 }}>
                <span style={{ fontSize:22 }}>{c.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ color:"#8b7355", fontSize:13, fontWeight:700 }}>{c.nombre}</div>
                  <div style={{ color:"#555", fontSize:11 }}>{idioma==="en"?"Premium only":"Solo Premium"}</div>
                </div>
                <span style={{ fontSize:18 }}>🔒</span>
              </button>
            );
            return (
              <button key={c.id} onClick={() => toggleSel(c)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"10px 13px", marginBottom:6, background:isSel?`${c.color}22`:"#1a1005", border:`2px solid ${isSel?c.color:"#2a1a0a"}`, borderRadius:12, cursor:"pointer", textAlign:"left", transition:"all .2s" }}>
                <span style={{ fontSize:22, animation:isSel?"bounce 1s ease infinite":"none" }}>{c.emoji}</span>
                {c.vip && <span style={{ fontSize:12 }}>⭐</span>}
                <div style={{ flex:1 }}>
                  <div style={{ color:"#f0e6d3", fontSize:13, fontWeight:700 }}>{c.nombre}</div>
                  <div style={{ color:"#6b5a3e", fontSize:11 }}>
                    ⏱ {c.tiempo} min
                    {tiempoAjustado && tiempoAjustado !== c.tiempo && (
                      <span style={{ color:"#4caf50", marginLeft:6 }}>· IA: {tiempoAjustado} min</span>
                    )}
                  </div>
                </div>
                <ChkBadge active={isSel} color={c.color} />
              </button>
            );
          })}
        </div>
      ))}

      {selected.length > 0 && (
        <SimBtn label={`Siguiente → (${selected.length} corte${selected.length > 1 ? "s" : ""})`} onClick={() => setStep("config")} />
      )}
    </div>
  );
}

function SimConfig({ coccion, setCoccion, tipoParrilla, setTipoParrilla, setStep , idioma="es" }) {
  return (
    <div style={{ flex:1, overflowY:"auto", padding:14 }}>
      <StepBar step={2} total={4} label={t(idioma,"config_coccion")} idioma={idioma} />
      <Card title={t(idioma,"punto_coccion")}>
        <div style={{ display:"flex", gap:8 }}>
          {Object.entries(COCCION_LABELS).map(([k]) => (
            <button key={k} onClick={() => setCoccion(k)} style={{ flex:1, padding:"10px 4px", background:coccion===k?`${COCCION_COLORS[k]}33`:"#0d0a07", border:`2px solid ${coccion===k?COCCION_COLORS[k]:"#2a1a0a"}`, borderRadius:10, cursor:"pointer", color:coccion===k?COCCION_COLORS[k]:"#555", fontSize:10, fontWeight:700, textAlign:"center", transition:"all .2s" }}>
              <div style={{ fontSize:18, marginBottom:3 }}>{k==="crudo"?"🔴":k==="punto"?"🟠":"🟤"}</div>
              {getCoccionLabel(k, idioma)}
            </button>
          ))}
        </div>
        <div style={{ color:"#555", fontSize:11, marginTop:8, textAlign:"center" }}>
          {coccion==="crudo"
            ? (idioma==="en" ? "Times −22% — Pink center" : "Tiempos −22% — Centro rosado")
            : coccion==="punto"
            ? (idioma==="en" ? "Standard times — The classic" : "Tiempos estándar — El clásico")
            : (idioma==="en" ? "Times +25% — Well done" : "Tiempos +25% — Bien cocido")}
        </div>
      </Card>
      <Card title={t(idioma,"tipo_parrilla")}>
        <div style={{ display:"flex", gap:10 }}>
          {[{id:"adjustable",icon:"⬆️⬇️",label:"Graduable",sub:"Ajusto la altura"},{id:"fixed",icon:"🔒",label:"Fija",sub:"Una sola altura"}].map(opt => (
            <button key={opt.id} onClick={() => setTipoParrilla(opt.id)} style={{ flex:1, padding:"13px 7px", background:tipoParrilla===opt.id?"#ff8c4222":"#0d0a07", border:`2px solid ${tipoParrilla===opt.id?"#ff8c42":"#2a1a0a"}`, borderRadius:12, cursor:"pointer", textAlign:"center", transition:"all .2s" }}>
              <div style={{ fontSize:22 }}>{opt.icon}</div>
              <div style={{ color:tipoParrilla===opt.id?"#ff8c42":"#8b7355", fontSize:13, fontWeight:700, marginTop:4 }}>{opt.id==="adjustable"?t(idioma,"graduable"):t(idioma,"fija")}</div>
              <div style={{ color:"#555", fontSize:10 }}>{opt.id==="adjustable"?t(idioma,"ajusto_altura"):t(idioma,"una_altura")}</div>
            </button>
          ))}
        </div>
      </Card>
      <SimBtn label="Siguiente →" onClick={() => setStep("fireCheck")} />
    </div>
  );
}

function SimFireCheck({ tipoParrilla, setStep , idioma="es" }) {
  const tips = [t(idioma,"tip_sal"), t(idioma,"tip_temp"), t(idioma,"tip_limpia"), tipoParrilla==="adjustable" ? t(idioma,"tip_alta") : t(idioma,"tip_fija")];
  return (
    <div style={{ flex:1, overflowY:"auto", padding:14 }}>
      <StepBar step={3} total={4} label={t(idioma,"fuego_listo")} idioma={idioma} />
      <div style={{ textAlign:"center", padding:"14px 0" }}>
        <div style={{ fontSize:54, animation:"fireFlicker 1s ease-in-out infinite", filter:"drop-shadow(0 0 18px #ff4500)" }}>🔥</div>
        <div style={{ color:"#f0e6d3", fontSize:15, fontWeight:700, marginTop:12, marginBottom:8 }}>{t(idioma,"carbon_gris")}</div>
        <div style={{ color:"#8b7355", fontSize:13, lineHeight:1.7, maxWidth:270, margin:"0 auto" }}>{t(idioma,"carbon_txt")}</div>
      </div>
      <Card title={t(idioma,"recordar")}>
        {tips.map((tip, i) => (
          <div key={i} style={{ color:"#8b7355", fontSize:13, padding:"6px 0", borderBottom:i < tips.length-1 ? "1px solid #1a1a0a" : "none" }}>{tip}</div>
        ))}
      </Card>
      <SimBtn label={t(idioma,"fuego_si")} onClick={() => setStep("placeCortes")} />
    </div>
  );
}

function SimPlaceCortes({ selected, coccion, tipoParrilla, startGrilling, idioma="es", aprendizaje={} }) {
  const sorted = [...selected].sort((a, b) => b.tiempo - a.tiempo);
  return (
    <div style={{ flex:1, overflowY:"auto", padding:14 }}>
      <StepBar step={4} total={4} label={t(idioma,"colocar")} idioma={idioma} />
      <div style={{ background:"linear-gradient(180deg,#1a0a00,#2d1200)", borderRadius:18, padding:18, marginBottom:14, border:"1px solid #3d1a00", textAlign:"center" }}>
        <div style={{ color:"#4fc3f7", fontSize:13, fontWeight:700, marginBottom:10 }}>
          📏 {idioma==="en" ? "Initial height:" : "Altura inicial:"} {tipoParrilla==="adjustable" ? (idioma==="en" ? "25 cm from fire" : "25 cm del fuego") : (idioma==="en" ? "15 cm (fixed)" : "15 cm (fija)")}
        </div>
        <AlturaVis cm={tipoParrilla==="adjustable" ? 25 : 15} />
        <div style={{ fontSize:24, marginTop:10 }}>{selected.map(c => c.emoji).join(" ")}</div>
      </div>
      <div style={{ background:"linear-gradient(135deg,#1a0d00,#2a1500)", borderRadius:16, padding:16, marginBottom:14, border:"1px solid #ff8c4244" }}>
        <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700, marginBottom:12 }}>🖐 {idioma==="en" ? "Hand temperature test" : "Test de temperatura con la mano"}</div>
        <div style={{ color:"#c9b49a", fontSize:13, marginBottom:12, lineHeight:1.6 }}>
          {idioma==="en"
            ? "Hold your hand about 15 cm above the grill and count:"
            : "Mantené la mano a unos 15 cm de la parrilla y contá:"}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, background:"#e5393522", borderRadius:10, padding:"10px 12px", border:"1px solid #e5393544" }}>
            <span style={{ fontSize:22 }}>🔥</span>
            <div style={{ flex:1 }}>
              <div style={{ color:"#ef9a9a", fontSize:12, fontWeight:700 }}>{idioma==="en" ? "Burns before 5 sec → Too hot" : "Te quema antes de 5 seg → Demasiado fuego"}</div>
              <div style={{ color:"#8b7355", fontSize:11, marginTop:2 }}>{idioma==="en" ? "Move coals outward or spread them" : "Separar o mover el carbón hacia afuera"}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12, background:"#4caf5022", borderRadius:10, padding:"10px 12px", border:"1px solid #4caf5044" }}>
            <span style={{ fontSize:22 }}>✅</span>
            <div style={{ flex:1 }}>
              <div style={{ color:"#a5d6a7", fontSize:12, fontWeight:700 }}>{idioma==="en" ? "5–7 seconds → Perfect heat" : "5–7 segundos → Temperatura ideal"}</div>
              <div style={{ color:"#8b7355", fontSize:11, marginTop:2 }}>{idioma==="en" ? "The grill is ready, place the meat" : "La parrilla está lista para los cortes"}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12, background:"#1565c022", borderRadius:10, padding:"10px 12px", border:"1px solid #1565c044" }}>
            <span style={{ fontSize:22 }}>❄️</span>
            <div style={{ flex:1 }}>
              <div style={{ color:"#90caf9", fontSize:12, fontWeight:700 }}>{idioma==="en" ? "More than 8 sec → Not enough heat" : "Más de 8 seg → Poco fuego"}</div>
              <div style={{ color:"#8b7355", fontSize:11, marginTop:2 }}>{idioma==="en" ? "Add more charcoal and wait" : "Agregar carbón y esperar"}</div>
            </div>
          </div>
        </div>
      </div>
      <Card title={t(idioma,"orden")}>
        {sorted.map((c, i) => (
          <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", borderBottom:"1px solid #1a1a0a" }}>
            <span style={{ color:"#ff8c42", fontSize:12, fontWeight:700 }}>{i+1}°</span>
            <span style={{ fontSize:18 }}>{c.emoji}</span>
            <span style={{ color:"#c9b49a", fontSize:13 }}>{c.nombre}</span>
            <span style={{ color:"#555", fontSize:11, marginLeft:"auto" }}>{Math.round(c.tiempo * COCCION_MULT[coccion])} min</span>
          </div>
        ))}
      </Card>
      <SimBtn label={t(idioma,"iniciar")} onClick={startGrilling} />
    </div>
  );
}

function SimProFlow({ selected, toggleSel, coccion, setCoccion, tipoParrilla, setTipoParrilla, startGrilling, idioma="es", aprendizaje={} }) {
  return (
    <div style={{ flex:1, overflowY:"auto", padding:14 }}>
      <div style={{ color:"#ff8c42", fontSize:13, fontWeight:700, marginBottom:10 }}>⚡ {idioma==="en" ? "Cuts" : "Cortes"}</div>
      {[
        { label:"🐄", ids:["asado-tira","vacio","entraña","lomo","cuadril","matambre","bife-chorizo","ojo-bife","tapa-asado","colita-cuadril"] },
        { label:"🐷", ids:["bondiola","costillas-cerdo","lomo-cerdo","matambre-cerdo","pechito-cerdo"] },
        { label:"🫀", ids:["chorizos","morcilla","mollejas","chinchulines","riñon","provoleta"] },
      ].map(grupo => {
        const byId = Object.fromEntries(SIMULACION_CORTES.map(c=>[c.id,c]));
        return (
          <div key={grupo.label} style={{ marginBottom:10 }}>
            <div style={{ color:"#555", fontSize:10, marginBottom:5 }}>{grupo.label}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {grupo.ids.map(id => {
                const c = byId[id]; if (!c) return null;
                const isSel = !!selected.find(x=>x.id===c.id);
                return (
                  <button key={c.id} onClick={()=>toggleSel(c)} style={{ padding:"6px 10px", display:"flex", alignItems:"center", gap:4, background:isSel?`${c.color}33`:"#1a1005", border:`2px solid ${isSel?c.color:"#2a1a0a"}`, borderRadius:20, cursor:"pointer", transition:"all .2s" }}>
                    <span style={{ fontSize:14 }}>{c.emoji}</span>
                    <span style={{ color:isSel?"#f0e6d3":"#555", fontSize:10, fontWeight:600 }}>{c.nombre.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ color:"#ff8c42", fontSize:13, fontWeight:700, marginBottom:8 }}>🥩 {t(idioma,"punto_coccion")}</div>
      <div style={{ display:"flex", gap:7, marginBottom:14 }}>
        {Object.entries(COCCION_LABELS).map(([k]) => (
          <button key={k} onClick={() => setCoccion(k)} style={{ flex:1, padding:"8px 4px", background:coccion===k?`${COCCION_COLORS[k]}33`:"#1a1005", border:`2px solid ${coccion===k?COCCION_COLORS[k]:"#2a1a0a"}`, borderRadius:10, cursor:"pointer", color:coccion===k?COCCION_COLORS[k]:"#555", fontSize:10, fontWeight:700 }}>
            {k==="crudo" ? "🔴" : k==="punto" ? "🟠" : "🟤"} {getCoccionLabel(k, idioma)}
          </button>
        ))}
      </div>
      <div style={{ color:"#ff8c42", fontSize:13, fontWeight:700, marginBottom:8 }}>📏 {t(idioma,"tipo_parrilla")}</div>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {[{id:"adjustable",label:`⬆️⬇️ ${t(idioma,"graduable")}`},{id:"fixed",label:`🔒 ${t(idioma,"fija")}`}].map(opt => (
          <button key={opt.id} onClick={() => setTipoParrilla(opt.id)} style={{ flex:1, padding:10, background:tipoParrilla===opt.id?"#ff8c4222":"#1a1005", border:`2px solid ${tipoParrilla===opt.id?"#ff8c42":"#2a1a0a"}`, borderRadius:10, cursor:"pointer", color:tipoParrilla===opt.id?"#ff8c42":"#555", fontSize:11, fontWeight:700 }}>
            {opt.label}
          </button>
        ))}
      </div>
      <div style={{ background:"#1a1005", borderRadius:12, padding:13, border:"1px solid #2a1a0a", marginBottom:14 }}>
        <div style={{ color:"#ff8c42", fontSize:13, fontWeight:700, marginBottom:5 }}>🔥 {idioma==="en" ? "Is the fire ready and meat on the grill?" : "¿El fuego está listo y la carne en la parrilla?"}</div>
        <div style={{ color:"#6b5a3e", fontSize:12 }}>{idioma==="en" ? "White coals, no flames, cuts placed." : "Brasas blancas, sin llama, cortes apoyados."}</div>
      </div>
      <SimBtn label={idioma==="en"
        ? `⚡ Start${selected.length > 0 ? ` (${selected.length} cut${selected.length > 1 ? "s" : ""})` : " (all cuts)"}`
        : `⚡ Iniciar${selected.length > 0 ? ` (${selected.length} corte${selected.length > 1 ? "s" : ""})` : " (todos los cortes)"}`}
        onClick={startGrilling} />
    </div>
  );
}

function SimGrilling({ selected, mins, secs, progress, currentAltura, tipoParrilla, coccion, activeNotif, notifs, step, onDone, onReset, vozActiva, setVozActiva, idioma="es", aprendizaje={}, tiempoMultGlobal=1, isCompleto=false }) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Barra de voz */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 13px 0", flexShrink:0 }}>
        <div style={{ color:"#555", fontSize:11 }}>
          {vozActiva ? t(idioma,"voz_on") : t(idioma,"voz_off")}
        </div>
        <button onClick={() => { setVozActiva(v => !v); if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel(); }} style={{ display:"flex", alignItems:"center", gap:6, background:vozActiva?"#ff8c4222":"#1a1005", border:`1px solid ${vozActiva?"#ff8c42":"#2a1a0a"}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", transition:"all .2s" }}>
          <span style={{ fontSize:16 }}>{vozActiva ? "🔊" : "🔇"}</span>
          <span style={{ color:vozActiva?"#ff8c42":"#555", fontSize:11, fontWeight:700 }}>{vozActiva ? t(idioma,"voz_onbtn") : t(idioma,"voz_offbtn")}</span>
        </button>
      </div>
      {activeNotif && (
        <div style={{ margin:"10px 13px 0", background:activeNotif.type==="chiste"?"linear-gradient(135deg,#2a0a3a,#1a0528)":`linear-gradient(135deg,${activeNotif.color||"#c1440e"}22,#0d0a07)`, border:`1px solid ${activeNotif.color||"#ff8c42"}`, borderRadius:12, padding:"10px 13px", animation:"notifIn .35s cubic-bezier(.34,1.56,.64,1)", display:"flex", gap:9, alignItems:"flex-start", flexShrink:0 }}>
          <span style={{ fontSize:20 }}>{activeNotif.emoji}</span>
          <div style={{ flex:1 }}>
            <div style={{ color:activeNotif.color||"#ff8c42", fontSize:11, fontWeight:700 }}>
              {activeNotif.type==="chiste" ? (idioma==="en"?"😄 Joke while you wait":"😄 Chiste para el tiempo") : `${activeNotif.label} · min ${activeNotif.time}`}
            </div>
            <div style={{ color:activeNotif.type==="chiste"?"#ce93d8":"#f0e6d3", fontSize:13, marginTop:2, lineHeight:1.5, fontStyle:activeNotif.type==="chiste"?"italic":"normal" }}>{activeNotif.msg}</div>
          </div>
        </div>
      )}
      <div style={{ margin:"10px 13px 0", background:"linear-gradient(180deg,#1a0a00,#2a1000)", borderRadius:20, padding:"13px 15px", border:"1px solid #3d1a00", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ color:step==="done"?"#4caf50":"#ff8c42", fontSize:30, fontWeight:900, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>
              {step === "done" ? "✅" : `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`}
            </div>
            <div style={{ color:"#555", fontSize:10 }}>{step==="done" ? t(idioma,"completado") : t(idioma,"min_sim")}</div>
          </div>
          <div style={{ background:"#0d0a07", borderRadius:12, padding:"7px 11px", border:`1px solid ${tipoParrilla==="adjustable"?"#4fc3f7":"#555"}44`, textAlign:"center" }}>
            <div style={{ color:tipoParrilla==="adjustable"?"#4fc3f7":"#78909c", fontSize:9, fontWeight:700 }}>GRILLA {tipoParrilla==="adjustable"?"⬆️⬇️":"🔒"}</div>
            <div style={{ color:tipoParrilla==="adjustable"?"#4fc3f7":"#78909c", fontSize:22, fontWeight:900, lineHeight:1 }}>{currentAltura}</div>
            <div style={{ color:"#555", fontSize:9 }}>cm</div>
          </div>
          <div style={{ background:`${COCCION_COLORS[coccion]}22`, borderRadius:10, padding:"5px 9px", border:`1px solid ${COCCION_COLORS[coccion]}44`, textAlign:"center" }}>
            <div style={{ color:COCCION_COLORS[coccion], fontSize:9, fontWeight:700 }}>{t(idioma,"coccion_lbl")}</div>
            <div style={{ color:COCCION_COLORS[coccion], fontSize:11, fontWeight:700 }}>{getCoccionLabel(coccion,idioma)}</div>
          </div>
        </div>
        <div style={{ height:3, background:"#2a1a0a", borderRadius:2, marginBottom:11 }}>
          <div style={{ height:"100%", width:`${progress*100}%`, background:"linear-gradient(90deg,#c1440e,#ff8c42)", borderRadius:2, transition:"width .5s ease" }} />
        </div>
        <div style={{ background:"#0f0a05", borderRadius:10, padding:9, border:"2px solid #2a2a2a", position:"relative", minHeight:64 }}>
          <div style={{ position:"absolute", inset:0, borderRadius:8, overflow:"hidden", display:"flex", gap:9, padding:"0 7px" }}>
            {[...Array(9)].map((_, i) => <div key={i} style={{ flex:1, background:"rgba(255,255,255,.03)" }} />)}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, justifyContent:"center", position:"relative", zIndex:2, alignItems:"center" }}>
            {selected.map(corte => {
              const adjT = Math.round(corte.tiempo * COCCION_MULT[coccion] * (aprendizaje?.[corte.nombre]?.[tipoParrilla] || 1) * (typeof tiempoMult !== 'undefined' ? tiempoMult : 1));
              const done = mins >= adjT;
              const pct = Math.min(mins / adjT, 1);
              return (
                <div key={corte.id} style={{ background:done?"#4caf5033":`${corte.color}33`, border:`2px solid ${done?"#4caf50":corte.color}`, borderRadius:10, padding:"4px 8px", display:"flex", flexDirection:"column", alignItems:"center", animation:!done?"sizzle 1.8s ease-in-out infinite":"none", transition:"all .5s", position:"relative" }}>
                  {!done && pct > 0.1 && (
                    <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", fontSize:8, animation:"steamRise 2s ease-in-out infinite" }}>💨</div>
                  )}
                  <span style={{ fontSize:20 }}>{done ? "✅" : corte.emoji}</span>
                  <span style={{ color:done?"#4caf50":"#c9b49a", fontSize:8, fontWeight:700 }}>{corte.nombre.split(" ")[0]}</span>
                  <div style={{ width:32, height:2, background:"#2a2a2a", borderRadius:1, marginTop:2 }}>
                    <div style={{ height:"100%", width:`${pct*100}%`, background:done?"#4caf50":corte.color, borderRadius:1, transition:"width 1s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ textAlign:"center", fontSize:14, marginTop:5, opacity:step==="done"?.2:1, animation:"fireFlicker .9s ease infinite" }}>🔥🔥🔥</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"9px 13px" }}>
        <div style={{ color:"#3a2a1a", fontSize:10, letterSpacing:1, marginBottom:5, textTransform:"uppercase" }}>{t(idioma,"alertas")}</div>
        {notifs.length === 0 ? (
          <div style={{ color:"#2a2010", fontSize:13, textAlign:"center", padding:"16px 0" }}>{t(idioma,"alertas_empty")}</div>
        ) : (
          notifs.map((n, i) => (
            <div key={n.id} style={{ display:"flex", gap:8, padding:"8px 10px", background:"#12100a", borderRadius:10, marginBottom:5, border:`1px solid ${n.color||"#2a1a0a"}22`, opacity:Math.max(.35, 1-i*.07) }}>
              <span style={{ fontSize:14 }}>{n.emoji}</span>
              <div>
                <div style={{ color:n.color||"#ff8c42", fontSize:10, fontWeight:700 }}>min {n.time} · {n.label}</div>
                <div style={{ color:"#6b5a3e", fontSize:11, marginTop:1, lineHeight:1.4 }}>{n.msg}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <CameraAnalysis cortes={selected.map(c => c.nombre)} idioma={idioma} isCompleto={isCompleto} />
      {step === "done" && (
        <div style={{ padding:"8px 13px 24px", flexShrink:0 }}>
          <button onClick={onDone} style={{ width:"100%", padding:15, background:"linear-gradient(135deg,#4caf50,#2e7d32)", border:"none", borderRadius:14, color:"white", fontSize:15, fontWeight:700, cursor:"pointer", animation:"pulseBtn 2s ease-in-out infinite" }}>
            {t(idioma,"listo_btn")}
          </button>
        </div>
      )}
    </div>
  );
}

function buildChisteEvents(maxT, idioma) {
  const pool = idioma === "en" ? [
    "Why does the grill never lie? It always comes clean.",
    "You know it's a good BBQ when the neighbor checks three times.",
    "You can read the coals like a book when you're a grill master.",
    "Fire is like respect: earned slowly, lost in seconds.",
    "There's no bad BBQ — only BBQ that teaches you something.",
  ] : [
    "¿Por qué el asado nunca miente? Porque siempre da la cara.",
    "Sabés que va bien cuando el vecino ya se asomó dos veces.",
    "El maestro parrillero lee las brasas como un libro.",
    "El fuego es como el respeto: se gana lento y se pierde en segundos.",
    "No existe asado malo. Existe asado que te enseña algo.",
  ];
  const count = Math.min(4, Math.max(0, Math.floor(maxT / 8)));
  if (count === 0) return [];
  const interval = Math.floor(maxT / (count + 1));
  return pool.slice(0, count).map((msg, i) => ({
    key: `chiste-${i}`, min: (i + 1) * interval,
    emoji: "😄", label: "Chiste", msg, color: "#9c27b0", type: "chiste",
  }));
}

function Simulacion({ store, persist, go, setPendingAsado, tiempoMult=1, idioma='es', aprendizaje={}, chistesOn=true }) {
  const [step, setStep] = useState("modeSelect");
  const [mode, setMode] = useState(null);
  const [selected, setSelected] = useState([]);
  const [coccion, setCoccion] = useState("punto");
  const [tipoParrilla, setTipoParrilla] = useState("adjustable");
  const [timer, setTimer] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [activeNotif, setActiveNotif] = useState(null);
  const [firedKeys, setFiredKeys] = useState(new Set());
  const [eventList, setEventList] = useState([]);
  const [vozActiva, setVozActiva] = useState(store.config?.vozSimulacion || false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const voiceIndex = store.config?.voiceIndex || 0;

  useEffect(() => {
    const load = () => {
      const vs = window.speechSynthesis?.getVoices() || [];
      if (vs.length > 0) setAvailableVoices(vs);
    };
    load();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
  }, []);
  const vozActivaRef = useRef(false);
  const intervalRef = useRef(null);
  const firedKeysRef = useRef(new Set());
  const eventListRef = useRef([]);
  const startTimeRef = useRef(null);
  const lastMinRef = useRef(-1);

  // Sync refs so interval closure always reads latest values without stale closures
  useEffect(() => { vozActivaRef.current = vozActiva; }, [vozActiva]);
  useEffect(() => { eventListRef.current = eventList; }, [eventList]);

  const speak = (text, _lang) => {
    if (!vozActivaRef.current) return;
    try {
      const synth = window.speechSynthesis || window.top?.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const langCode = idioma === "en" ? "en" : "es";
      const langVoices = voices.filter(v => v.lang.startsWith(langCode));
      if (langVoices.length > 0) {
        utt.voice = langVoices[Math.min(voiceIndex, langVoices.length - 1)];
      }
      utt.lang = idioma === "en" ? "en-US" : "es-AR";
      utt.rate = 0.88;
      utt.volume = 1;
      setTimeout(() => synth.speak(utt), 80);
    } catch(e) { console.warn("TTS error:", e); }
  };

  // Effective multiplier = global tiempoMult × personal AI mult per cut
  const efectivoMult = (c) => {
    const personal = aprendizaje[c.nombre]?.[tipoParrilla] || 1;
    return tiempoMult * personal;
  };
  const maxTime = selected.length > 0 ? Math.max(...selected.map(c => Math.round(c.tiempo * COCCION_MULT[coccion] * efectivoMult(c)))) : 0;
  const mins = Math.floor(timer / 60);
  const secs = timer % 60;
  const progress = maxTime > 0 ? Math.min(mins / maxTime, 1) : 0;
  const currentAltura = getAlturaAt(mins, tipoParrilla);

  const toggleSel = (c) => setSelected(prev => prev.find(x => x.id === c.id) ? prev.filter(x => x.id !== c.id) : [...prev, c]);

  const startGrilling = () => {
    const use = selected.length > 0 ? selected : SIMULACION_CORTES;
    if (selected.length === 0) setSelected(SIMULACION_CORTES);
    // Build per-cut effective multipliers for event timing
    const multMap = {};
    use.forEach(c => { multMap[c.id] = (aprendizaje[c.nombre]?.[tipoParrilla] || 1) * tiempoMult; });
    const baseEvents = buildEvents(use, coccion, tipoParrilla, tiempoMult, aprendizaje, idioma);
    const maxT = use.length > 0 ? Math.max(...use.map(c => Math.round(c.tiempo * COCCION_MULT[coccion] * (aprendizaje[c.nombre]?.[tipoParrilla]||1) * tiempoMult))) : 60;
    const allEvents = chistesOn
      ? [...baseEvents, ...buildChisteEvents(maxT, idioma)].sort((a,b)=>a.min-b.min)
      : baseEvents;
    setEventList(allEvents);
    eventListRef.current = allEvents;
    firedKeysRef.current = new Set();
    startTimeRef.current = Date.now();
    lastMinRef.current = -1;
    setTimer(0); setNotifs([]); setFiredKeys(new Set()); setActiveNotif(null);
    setStep("grilling");
  };

  const resetSim = () => {
    clearInterval(intervalRef.current);
    firedKeysRef.current = new Set();
    eventListRef.current = [];
    startTimeRef.current = null;
    lastMinRef.current = -1;
    setStep("modeSelect"); setMode(null); setSelected([]); setCoccion("punto"); setTipoParrilla("adjustable");
    setTimer(0); setNotifs([]); setFiredKeys(new Set()); setActiveNotif(null); setEventList([]);
  };

  const handleDone = () => {
    const use = selected.length > 0 ? selected : SIMULACION_CORTES;
    // Build per-cut multipliers used this session
    const multUsados = {};
    use.forEach(c => {
      const personal = aprendizaje[c.nombre]?.[tipoParrilla];
      multUsados[c.nombre] = personal ? (tiempoMult * personal) : tiempoMult;
    });
    setPendingAsado({
      id: Date.now(), ts: Date.now(),
      cortes: use.map(c => c.nombre),
      cortesData: use.map(c => ({ nombre: c.nombre, emoji: c.emoji, color: c.color, tiempoBase: c.tiempo })),
      coccion, tipoParrilla, mode, duracion: maxTime,
      tiempoMultUsado: tiempoMult,
      multUsados,
      rating: null, nota: "", foto: null
    });
    resetSim();
    go("rating");
  };

  useEffect(() => {
    if (step !== "grilling") return;

    // Anchor timer to wall clock so background throttling doesn't slow it down.
    // Each "tick" unit = 100 ms of real time (simulation runs at ×10 speed).
    const processTick = () => {
      if (!startTimeRef.current) return;
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 100);
      const currentMin = Math.floor(elapsed / 60);

      setTimer(elapsed);

      // Fire ALL notifications for every minute that passed since last check.
      // This catches up correctly after the tab was backgrounded.
      const fromMin = lastMinRef.current + 1;
      if (currentMin >= fromMin) {
        const missed = [];
        for (let m = fromMin; m <= currentMin; m++) {
          eventListRef.current
            .filter(ev => ev.min === m && !firedKeysRef.current.has(ev.key))
            .forEach(ev => {
              firedKeysRef.current.add(ev.key);
              const n = { ...ev, time: m, id: `${ev.key}-m${m}` };
              missed.push(n);
            });
        }
        if (missed.length > 0) {
          setNotifs(ns => [...missed.slice().reverse(), ...ns].slice(0, 15));
          const latest = missed[missed.length - 1];
          setActiveNotif(latest);
          speak(`${latest.label}. ${latest.msg}`, idioma);
          setTimeout(() => setActiveNotif(null), 5000);
        }
        lastMinRef.current = currentMin;
      }

      if (currentMin >= maxTime && maxTime > 0) {
        clearInterval(intervalRef.current);
        setStep("done");
      }
    };

    intervalRef.current = setInterval(processTick, 500);

    // Catch up immediately when the user switches back to the tab/app.
    const onVisible = () => { if (document.visibilityState === "visible") processTick(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [step, maxTime]);

  const badge = mode ? (
    <div style={{ background:mode==="pro"?"#ff8c4222":"#4caf5022", border:`1px solid ${mode==="pro"?"#ff8c42":"#4caf50"}`, borderRadius:20, padding:"3px 12px", color:mode==="pro"?"#ff8c42":"#4caf50", fontSize:11, fontWeight:700 }}>
      {mode === "pro" ? "⚡ PRO" : (idioma==="en" ? "📖 BEGINNER" : "📖 PRINCIPIANTE")}
    </div>
  ) : null;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>
      <Hdr title={t(idioma,"simulacion")} sub={t(idioma,"sim_sub")} onBack={() => {
        if (step === "grilling" || step === "done") {
          setShowExitModal(true);
        } else if (step === "modeSelect") {
          resetSim(); go("home");
        } else {
          resetSim();
        }
      }} badge={badge} />

      {/* Exit confirmation modal */}
      {showExitModal && (
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.85)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:"#1a1005", borderRadius:20, padding:24, border:"1px solid #3a2a1a", width:"100%", maxWidth:320, animation:"popIn .25s ease" }}>
            <div style={{ textAlign:"center", marginBottom:18 }}>
              <div style={{ fontSize:44, marginBottom:10 }}>🔥</div>
              <div style={{ color:"#f0e6d3", fontSize:16, fontWeight:700, marginBottom:8 }}>
                {idioma==="en" ? "Leave the BBQ?" : "¿Salir del asado?"}
              </div>
              <div style={{ color:"#8b7355", fontSize:13, lineHeight:1.6 }}>
                {idioma==="en" ? "The timer is still running. If you leave, the current session will be lost." : "El timer sigue corriendo. Si salís, se pierde la sesión actual."}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={() => { setShowExitModal(false); resetSim(); go("home"); }} style={{ width:"100%", padding:13, background:"linear-gradient(135deg,#c1440e,#8B2500)", border:"none", borderRadius:12, color:"white", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                {idioma==="en" ? "Yes, exit" : "Sí, salir"}
              </button>
              <button onClick={() => setShowExitModal(false)} style={{ width:"100%", padding:13, background:"none", border:"2px solid #4caf50", borderRadius:12, color:"#4caf50", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                {idioma==="en" ? "🔥 Keep cooking!" : "🔥 ¡Seguir asando!"}
              </button>
            </div>
          </div>
        </div>
      )}
      {step === "modeSelect"    && <SimModeSelect idioma={idioma} setMode={setMode} setStep={setStep} aprendizaje={aprendizaje} tipoParrilla={tipoParrilla} />}
      {step === "select"        && <SimSelectCortes idioma={idioma} selected={selected} toggleSel={toggleSel} coccion={coccion} setStep={setStep} aprendizaje={aprendizaje} tipoParrilla={tipoParrilla} isPremium={store.config?.premium||store.config?.completo||false} onGoPremium={() => { resetSim(); go("premium"); }} />}
      {step === "config"        && <SimConfig idioma={idioma} coccion={coccion} setCoccion={setCoccion} tipoParrilla={tipoParrilla} setTipoParrilla={setTipoParrilla} setStep={setStep} />}
      {step === "fireCheck"     && <SimFireCheck idioma={idioma} tipoParrilla={tipoParrilla} setStep={setStep} />}
      {step === "placeCortes"   && <SimPlaceCortes idioma={idioma} selected={selected} coccion={coccion} tipoParrilla={tipoParrilla} startGrilling={startGrilling} aprendizaje={aprendizaje} />}
      {step === "fireCheckPro"  && <SimProFlow idioma={idioma} selected={selected} toggleSel={toggleSel} coccion={coccion} setCoccion={setCoccion} tipoParrilla={tipoParrilla} setTipoParrilla={setTipoParrilla} startGrilling={startGrilling} aprendizaje={aprendizaje} />}
      {(step === "grilling" || step === "done") && <SimGrilling idioma={idioma} selected={selected} mins={mins} secs={secs} progress={progress} currentAltura={currentAltura} tipoParrilla={tipoParrilla} coccion={coccion} activeNotif={activeNotif} notifs={notifs} step={step} onDone={handleDone} onReset={resetSim} vozActiva={vozActiva} setVozActiva={setVozActiva} aprendizaje={aprendizaje} tiempoMultGlobal={tiempoMult} isCompleto={store.config?.completo||false} />}
    </div>
  );
}

// ── RATING SCREEN ─────────────────────────────────────────────────
async function getAIConsejo(asados, nombre, idioma) {
  const total = asados.length;
  if (total < 2) return null;
  const pasados = asados.filter(a => a.rating === "pasado").length;
  const crudos = asados.filter(a => a.rating === "poco_crudo").length;
  if (idioma === "en") {
    if (pasados / total > 0.4) return `${nombre}, your meat tends to be overcooked. Try reducing heat or time by 10% next time.`;
    if (crudos / total > 0.4) return `${nombre}, your meat tends to be undercooked. Increase time 15% or raise the heat.`;
    return `${nombre}, great consistency! Keep doing what you're doing. 🔥`;
  }
  if (pasados / total > 0.4) return `${nombre}, tu carne tiende a pasarse. Intentá bajar el fuego o reducir el tiempo un 10%.`;
  if (crudos / total > 0.4) return `${nombre}, la carne suele quedar cruda. Aumentá el tiempo un 15% o subí el fuego.`;
  return `${nombre}, ¡excelente consistencia! Seguí así. 🔥`;
}

// ── CLAUDE VISION ─────────────────────────────────────────────────
async function analizarFotoAsado(base64DataUrl, cortes, idioma) {
  const key = import.meta.env.VITE_ANTHROPIC_KEY;
  if (!key || key.startsWith("sk-ant-api03-REEMPLAZA")) return null;
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, mediaType, base64Data] = match;
  const validTypes = ["image/jpeg","image/png","image/gif","image/webp"];
  const safeType = validTypes.includes(mediaType) ? mediaType : "image/jpeg";
  const cortesList = cortes?.join(", ") || (idioma === "en" ? "unknown cut" : "corte desconocido");
  const prompt = idioma === "en"
    ? `You are an expert Argentine grill master. Analyze this BBQ photo. Cuts on the grill: ${cortesList}. Tell me: 1) What cooking point do you see? 2) Is it ready or needs more time? 3) One specific tip. Max 3 short sentences.`
    : `Sos un maestro parrillero argentino. Analizá esta foto de la parrilla. Cortes: ${cortesList}. Decime: 1) ¿Qué punto de cocción ves? 2) ¿Está listo o necesita más tiempo? 3) Un consejo práctico. Máximo 3 oraciones cortas.`;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 250,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: safeType, data: base64Data } },
          { type: "text", text: prompt }
        ]}]
      })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.content?.[0]?.text || null;
  } catch { return null; }
}

// ── CAMERA ANALYSIS ───────────────────────────────────────────────
function CameraAnalysis({ cortes, idioma, isCompleto=false }) {
  const [open, setOpen] = useState(false);
  const [foto, setFoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(false);
  const fileRef = useRef();

  const hasKey = import.meta.env.VITE_ANTHROPIC_KEY && !import.meta.env.VITE_ANTHROPIC_KEY.startsWith("sk-ant-api03-REEMPLAZA");

  const handleFoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setFoto(ev.target.result);
      setResultado(null); setError(false); setLoading(true);
      const res = await analizarFotoAsado(ev.target.result, cortes, idioma);
      setLoading(false);
      if (res) setResultado(res); else setError(true);
    };
    reader.readAsDataURL(file);
  };

  const reset = () => { setFoto(null); setResultado(null); setError(false); };
  const close = () => { setOpen(false); reset(); };

  if (!isCompleto) return (
    <div style={{ margin:"8px 13px 0", padding:"11px 14px", background:"linear-gradient(135deg,#12091a,#1a0a2a)", border:"1px solid #9c27b033", borderRadius:12, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
      <span style={{ fontSize:20, opacity:.5 }}>📷</span>
      <div style={{ flex:1 }}>
        <div style={{ color:"#7b3f9e", fontSize:12, fontWeight:700 }}>{idioma==="en" ? "AI Photo Analysis" : "Análisis de foto con IA"} <span style={{ fontSize:10 }}>🔒</span></div>
        <div style={{ color:"#4a2d5a", fontSize:11, marginTop:2 }}>{idioma==="en" ? "Available in Plan Completo" : "Disponible en Plan Completo"}</div>
      </div>
      <span style={{ background:"#9c27b022", border:"1px solid #9c27b044", borderRadius:8, padding:"4px 9px", color:"#9c27b0", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>✨ Completo</span>
    </div>
  );

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ margin:"8px 13px 0", width:"calc(100% - 26px)", padding:"10px 14px", background:"linear-gradient(135deg,#0d1a0d,#1a2a1a)", border:"1px solid #4caf5044", borderRadius:12, color:"#4caf50", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, flexShrink:0 }}>
      <span>📷</span>
      <span>{idioma==="en" ? "Analyze my BBQ with AI" : "Analizá mi asado con IA"}</span>
      <span style={{ background:"#4caf5033", borderRadius:6, padding:"2px 7px", fontSize:10 }}>✨ AI</span>
    </button>
  );

  return (
    <div style={{ margin:"8px 13px 0", background:"linear-gradient(135deg,#0d1a0d,#122012)", border:"1px solid #4caf5055", borderRadius:14, padding:14, flexShrink:0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ color:"#4caf50", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:7 }}>
          <span>📷</span>
          <span>{idioma==="en" ? "AI Photo Analysis" : "Análisis con IA"}</span>
          <span style={{ background:"#4caf5022", borderRadius:6, padding:"1px 7px", fontSize:10 }}>✨ Claude</span>
        </div>
        <button onClick={close} style={{ background:"none", border:"none", color:"#555", fontSize:18, cursor:"pointer", lineHeight:1 }}>✕</button>
      </div>

      {!hasKey && (
        <div style={{ background:"#2a1a0a", borderRadius:10, padding:"10px 12px", color:"#ff8c42", fontSize:12 }}>
          ⚠️ {idioma==="en" ? "Add VITE_ANTHROPIC_KEY to your .env file" : "Configurá VITE_ANTHROPIC_KEY en el archivo .env"}
        </div>
      )}

      {hasKey && !foto && (
        <button onClick={() => fileRef.current.click()} style={{ width:"100%", height:70, background:"#0d0a07", border:"2px dashed #4caf5044", borderRadius:12, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:5 }}>
          <span style={{ fontSize:22 }}>📸</span>
          <span style={{ color:"#4caf50", fontSize:11 }}>{idioma==="en" ? "Take a photo of the grill" : "Sacá una foto de la parrilla"}</span>
        </button>
      )}

      {foto && (
        <div style={{ position:"relative" }}>
          <img src={foto} alt="parrilla" style={{ width:"100%", height:130, objectFit:"cover", borderRadius:10, display:"block" }} />
          <button onClick={reset} style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,.7)", border:"none", borderRadius:"50%", width:24, height:24, color:"white", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display:"none" }} />

      {loading && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
          {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:"#4caf50", animation:`bounce ${0.5+i*0.15}s ease-in-out infinite alternate` }} />)}
          <span style={{ color:"#4caf50", fontSize:11 }}>{idioma==="en" ? "Claude is analyzing…" : "Claude está analizando…"}</span>
        </div>
      )}

      {error && (
        <div style={{ marginTop:10, color:"#ff8c42", fontSize:12, padding:"8px 10px", background:"#2a1a0a", borderRadius:8 }}>
          ⚠️ {idioma==="en" ? "Could not analyze. Check your connection." : "No se pudo analizar. Revisá la conexión."}
        </div>
      )}

      {resultado && (
        <div style={{ marginTop:10, background:"#0d0a07", borderRadius:10, padding:"10px 12px", border:"1px solid #4caf5044", animation:"popIn .3s ease" }}>
          <div style={{ color:"#4caf50", fontSize:10, fontWeight:700, marginBottom:6 }}>🧠 {idioma==="en" ? "Claude says:" : "Claude dice:"}</div>
          <div style={{ color:"#c9b49a", fontSize:13, lineHeight:1.6 }}>{resultado}</div>
          <button onClick={reset} style={{ marginTop:10, background:"none", border:"1px solid #4caf5033", borderRadius:8, padding:"5px 12px", color:"#4caf50", fontSize:11, cursor:"pointer" }}>
            {idioma==="en" ? "Analyze again" : "Analizar de nuevo"}
          </button>
        </div>
      )}
    </div>
  );
}

function RatingScreen({ store, persist, go, pendingAsado, setPendingAsado, saveAsado, idioma="es", aprendizaje={}, isCompleto=false, authUser=null }) {
  const [rating, setRating] = useState(null);
  const [nota, setNota] = useState("");
  const [foto, setFoto] = useState(null);
  const [fotoAnalisis, setFotoAnalisis] = useState(null);
  const [fotoAnalisisLoading, setFotoAnalisisLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiConsejo, setAiConsejo] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [ajustesNuevos, setAjustesNuevos] = useState(null);
  const [showRankingPrompt, setShowRankingPrompt] = useState(false);
  const [rankingStep, setRankingStep] = useState('prompt');
  const [savedFotoUrl, setSavedFotoUrl] = useState(null);
  const [ciudadInput, setCiudadInput] = useState(store.user?.ciudad || '');
  const [sharing, setSharing] = useState(false);
  const fileRef = useRef();

  const cortesData = pendingAsado?.cortesData || [];

  if (!pendingAsado) { go("home"); return null; }

  const ratingOpts = [
    { id:"poco_crudo", emoji:"🩸", label:t(idioma,"poco_crudo"), sub:t(idioma,"poco_crudo_sub"), color:"#e53935" },
    { id:"perfecto", emoji:"🏆", label:t(idioma,"perfecto"), sub:t(idioma,"perfecto_sub"), color:"#4caf50" },
    { id:"pasado", emoji:"😅", label:t(idioma,"pasado"), sub:t(idioma,"pasado_sub"), color:"#ff8c42" },
  ];

  const xpGain = rating ? (rating==="perfecto" ? 50 : 30) + (pendingAsado?.cortes?.length || 0) * 10 : 0;

  // When rating is selected, calculate AI adjustments preview
  const handleSetRating = async (r) => {
    setRating(r);
    const asadoSimulado = { ...pendingAsado, rating: r };
    const nuevoAprendizaje = actualizarAprendizaje(store, asadoSimulado);
    const cambios = {};
    pendingAsado.cortes.forEach(c => {
      const antes = aprendizaje[c]?.[pendingAsado.tipoParrilla] || 1;
      const despues = nuevoAprendizaje[c]?.[pendingAsado.tipoParrilla] || 1;
      if (Math.abs(despues - antes) > 0.01) cambios[c] = { antes, despues };
    });
    setAjustesNuevos(Object.keys(cambios).length > 0 ? cambios : null);
    // Fetch AI tip if we have enough data
    const todosAsados = [...store.asados, asadoSimulado];
    if (todosAsados.length >= 2) {
      setAiLoading(true);
      const consejo = await getAIConsejo(todosAsados, store.user?.nombre || "parrillero", idioma);
      setAiConsejo(consejo);
      setAiLoading(false);
    }
  };

  const handleFoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setFoto(dataUrl);
      setFotoAnalisis(null);
      if (isCompleto) {
        setFotoAnalisisLoading(true);
        const res = await analizarFotoAsado(dataUrl, pendingAsado?.cortes, idioma);
        setFotoAnalisis(res);
        setFotoAnalisisLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const guardar = async () => {
    if (!rating || saved) return;
    const asado = { ...pendingAsado, rating, nota, foto };
    const result = saveAsado ? await saveAsado(asado) : (persist(prev => ({ ...prev, asados:[...prev.asados, asado] })), {});
    if (rating === "perfecto") setShowConfetti(true);
    setSaved(true);
    const fotoUrl = result?.fotoUrl;
    if (fotoUrl) {
      setSavedFotoUrl(fotoUrl);
      setTimeout(() => setShowRankingPrompt(true), rating === "perfecto" ? 1200 : 600);
    } else {
      setTimeout(() => { setPendingAsado(null); go("historial"); }, rating === "perfecto" ? 2400 : 1400);
    }
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#0d0a07", position:"relative" }}>
      {showConfetti && [...Array(24)].map((_, i) => (
        <div key={i} style={{ position:"absolute", width:8, height:8, borderRadius:i%3===0?"50%":2, background:`hsl(${i*15},90%,60%)`, left:`${4+i*3.9}%`, top:`${15+(i%6)*8}%`, animation:`confetti ${1+i*.08}s ${i*.06}s ease forwards`, zIndex:99, pointerEvents:"none" }} />
      ))}
      <div style={{ padding:"48px 22px 14px", background:"linear-gradient(180deg,#1a0800,#0d0a07)", borderBottom:"1px solid #2a1a0a", flexShrink:0 }}>
        <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:24, fontWeight:900 }}>{t(idioma,"como_salio")}</div>
        <div style={{ color:"#8b6914", fontSize:11, letterSpacing:2 }}>{t(idioma,"calificar")}</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 18px 28px" }}>
        {/* Resumen del asado con tiempos usados por corte */}
        <div style={{ background:"#1a1005", borderRadius:14, padding:"12px 16px", marginBottom:16, border:"1px solid #2a1a0a" }}>
          <div style={{ color:"#8b7355", fontSize:11, marginBottom:10 }}>{t(idioma,"cortes_hoy")} · {getCoccionLabel(pendingAsado.coccion,idioma)} · {pendingAsado.tipoParrilla==="adjustable"? (idioma==='en'?"Adjustable grill":"Parrilla graduable") : (idioma==='en'?"Fixed grill":"Parrilla fija")}</div>
          {(pendingAsado.cortesData || pendingAsado.cortes.map(n=>({nombre:n,emoji:"🥩",color:"#8B1A1A",tiempoBase:0}))).map((c, i) => {
            const multUsado = pendingAsado.multUsados?.[c.nombre] || 1;
            const tiempoBase = c.tiempoBase || 0;
            const tiempoReal = tiempoBase ? Math.round(tiempoBase * COCCION_MULT[pendingAsado.coccion] * multUsado) : null;
            const tiempoEstandar = tiempoBase ? Math.round(tiempoBase * COCCION_MULT[pendingAsado.coccion]) : null;
            const ajustado = tiempoReal && tiempoEstandar && Math.abs(tiempoReal - tiempoEstandar) > 0;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:i<pendingAsado.cortes.length-1?"1px solid #2a1a0a":"none" }}>
                <span style={{ fontSize:20 }}>{c.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ color:"#f0e6d3", fontSize:13, fontWeight:600 }}>{c.nombre}</div>
                  {tiempoReal && <div style={{ color:"#555", fontSize:10, marginTop:2 }}>
                    {tiempoReal} min cocinado
                    {ajustado && <span style={{ color:"#ff8c42", marginLeft:6 }}>· IA: {tiempoReal > tiempoEstandar ? "+" : ""}{tiempoReal - tiempoEstandar} min vs estándar</span>}
                  </div>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700, marginBottom:12 }}>{t(idioma,"como_coccion")}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:18 }}>
          {ratingOpts.map(opt => (
            <button key={opt.id} onClick={() => handleSetRating(opt.id)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", background:rating===opt.id?`${opt.color}22`:"#1a1005", border:`2px solid ${rating===opt.id?opt.color:"#2a1a0a"}`, borderRadius:16, cursor:"pointer", textAlign:"left", transition:"all .2s" }}>
              <span style={{ fontSize:34 }}>{opt.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ color:rating===opt.id?opt.color:"#f0e6d3", fontSize:16, fontWeight:700 }}>{opt.label}</div>
                <div style={{ color:"#6b5a3e", fontSize:12, marginTop:2 }}>{opt.sub}</div>
              </div>
              {rating === opt.id && (
                <div style={{ width:22, height:22, borderRadius:"50%", background:opt.color, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:13, fontWeight:700, animation:"popIn .2s ease" }}>✓</div>
              )}
            </button>
          ))}
        </div>
        {/* AI Learning feedback */}
        {rating && (ajustesNuevos || aiLoading) && (
          <div style={{ background:"linear-gradient(135deg,#1a2a1a,#0d1a0d)", border:"1px solid #4caf5044", borderRadius:16, padding:16, marginBottom:16, animation:"popIn .3s ease" }}>
            <div style={{ color:"#4caf50", fontSize:12, fontWeight:700, marginBottom:10 }}>🧠 {idioma==="en"?"AI is learning from this BBQ":"La IA aprendió de este asado"}</div>
            {ajustesNuevos && Object.entries(ajustesNuevos).map(([corte, {antes, despues}]) => {
              const diff = Math.round((despues - antes) * 100);
              const color = diff > 0 ? "#ff8c42" : "#4fc3f7";
              const arrow = diff > 0 ? "↑" : "↓";
              return (
                <div key={corte} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, background:"#0d0a07", borderRadius:8, padding:"7px 10px" }}>
                  <span style={{ color:"#c9b49a", fontSize:13 }}>{corte}</span>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ color, fontSize:13, fontWeight:700 }}>{arrow} {diff > 0 ? "+" : ""}{diff}% {idioma==="en" ? "time" : "tiempo"}</span>
                    <div style={{ color:"#555", fontSize:10 }}>{Math.round(antes*100)}% → {Math.round(despues*100)}%</div>
                  </div>
                </div>
              );
            })}
            {aiLoading && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:ajustesNuevos?10:0 }}>
                <div style={{ display:"flex", gap:4 }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:5, height:5, borderRadius:"50%", background:"#4caf50", animation:`bounce ${0.5+i*0.15}s ease-in-out infinite alternate` }}/>)}
                </div>
                <span style={{ color:"#4caf50", fontSize:11 }}>{idioma==="en"?"Generating AI advice…":"Generando consejo IA…"}</span>
              </div>
            )}
            {aiConsejo && (
              <div style={{ marginTop:10, padding:"10px 12px", background:"#0d0a07", borderRadius:10, border:"1px solid #4caf5033" }}>
                <div style={{ color:"#4caf50", fontSize:10, fontWeight:700, marginBottom:4 }}>💬 {idioma==="en"?"For your next BBQ:":"Para tu próximo asado:"}</div>
                <div style={{ color:"#8b7355", fontSize:12, lineHeight:1.6 }}>{aiConsejo}</div>
              </div>
            )}
          </div>
        )}



        <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700, marginBottom:8 }}>{t(idioma,"notas_lbl")}</div>
        <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder={t(idioma,"notas_ph")} rows={3} style={{ background:"#1a1005", border:"1px solid #3a2a1a", borderRadius:10, color:"#f0e6d3", fontSize:13, padding:"10px 14px", width:"100%", outline:"none", fontFamily:"'Inter',sans-serif", resize:"none", marginBottom:16 }} />
        <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700, marginBottom:10 }}>{t(idioma,"foto_lbl")}</div>
        {foto ? (
          <div style={{ marginBottom:16 }}>
            <div style={{ position:"relative" }}>
              <img src={foto} alt="asado" style={{ width:"100%", height:180, objectFit:"cover", borderRadius:14, border:"1px solid #3a2a1a" }} />
              <button onClick={() => { setFoto(null); setFotoAnalisis(null); }} style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,.75)", border:"none", borderRadius:"50%", width:28, height:28, color:"white", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              {isCompleto && <div style={{ position:"absolute", top:8, left:8, background:"#7c3aed", borderRadius:6, padding:"3px 8px", fontSize:10, fontWeight:700, color:"white" }}>✨ AI</div>}
            </div>
            {isCompleto && fotoAnalisisLoading && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
                {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:"#7c3aed", animation:`bounce ${0.5+i*0.15}s ease-in-out infinite alternate` }} />)}
                <span style={{ color:"#7c3aed", fontSize:11 }}>{idioma==="en" ? "Claude is analyzing the photo…" : "Claude está analizando la foto…"}</span>
              </div>
            )}
            {isCompleto && fotoAnalisis && (
              <div style={{ marginTop:10, background:"linear-gradient(135deg,#1a0d2e,#120820)", border:"1px solid #7c3aed44", borderRadius:12, padding:"12px 14px", animation:"popIn .3s ease" }}>
                <div style={{ color:"#a78bfa", fontSize:10, fontWeight:700, marginBottom:6 }}>🧠 {idioma==="en" ? "Claude says:" : "Claude dice:"}</div>
                <div style={{ color:"#c9b49a", fontSize:13, lineHeight:1.6 }}>{fotoAnalisis}</div>
              </div>
            )}
            {!isCompleto && (
              <div style={{ marginTop:10, background:"linear-gradient(135deg,#1a0d2e,#120820)", border:"1px solid #7c3aed44", borderRadius:12, padding:"12px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:16 }}>🔒</span>
                  <div style={{ color:"#a78bfa", fontSize:11, fontWeight:700 }}>{idioma==="en"?"AI Photo Analysis · Plan Completo":"Análisis IA de Foto · Plan Completo"}</div>
                </div>
                <div style={{ color:"#6b5a8e", fontSize:11, lineHeight:1.5 }}>{idioma==="en"?"Unlock Plan Completo to get Claude's expert eye on your BBQ.":"Desbloqueá el Plan Completo para que Claude analice tu asado con IA."}</div>
                <button onClick={() => go("premium")} style={{ marginTop:8, padding:"6px 14px", background:"linear-gradient(135deg,#7c3aed,#5b21b6)", border:"none", borderRadius:8, color:"white", fontSize:11, fontWeight:700, cursor:"pointer" }}>{idioma==="en"?"Unlock":"Desbloquear"} ✨</button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => fileRef.current.click()} style={{ width:"100%", height:96, background:"#1a1005", border:"2px dashed #3a2a1a", borderRadius:14, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, marginBottom:16 }}>
            <span style={{ fontSize:28 }}>📷</span>
            <span style={{ color:"#555", fontSize:12 }}>{t(idioma,"foto_btn")}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display:"none" }} />
        {rating && (
          <div style={{ background:"linear-gradient(135deg,#1a3a1a,#0d2010)", border:"1px solid #4caf5044", borderRadius:14, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12, animation:"popIn .3s ease" }}>
            <span style={{ fontSize:28 }}>⚡</span>
            <div>
              <div style={{ color:"#4caf50", fontSize:15, fontWeight:700 }}>+{xpGain} XP</div>
              <div style={{ color:"#2e7d32", fontSize:11 }}>por este asado</div>
            </div>
          </div>
        )}
        <button onClick={guardar} disabled={!rating || saved} style={{ width:"100%", padding:15, background:rating?"linear-gradient(135deg,#c1440e,#8B2500)":"#1a1005", border:`1px solid ${rating?"#c1440e":"#2a1a0a"}`, borderRadius:14, color:rating?"white":"#555", fontSize:15, fontWeight:700, cursor:rating?"pointer":"not-allowed", marginBottom:10, transition:"all .3s", animation:rating&&!saved?"pulseBtn 2s ease-in-out infinite":"none" }}>
          {saved ? t(idioma,"guardado_asado") : t(idioma,"guardar_asado")}
        </button>
        <button onClick={() => { setPendingAsado(null); go("home"); }} style={{ width:"100%", padding:12, background:"none", border:"none", color:"#555", fontSize:13, cursor:"pointer" }}>{t(idioma,"saltear")}</button>
      </div>

      {/* Ranking prompt modal */}
      {showRankingPrompt && (
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.88)", display:"flex", flexDirection:"column", justifyContent:"flex-end", zIndex:50 }}>
          <div style={{ background:"#1a0800", borderRadius:"24px 24px 0 0", padding:"24px 22px 36px", animation:"slideUpModal .35s ease" }}>
            {rankingStep === 'prompt' ? (
              <>
                <div style={{ textAlign:"center", marginBottom:20 }}>
                  <div style={{ fontSize:48, marginBottom:8 }}>🔥</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:22, fontWeight:900 }}>{t(idioma,"ranking_prompt_title")}</div>
                  <div style={{ color:"#8b7355", fontSize:13, marginTop:6, lineHeight:1.6 }}>{t(idioma,"ranking_prompt_desc")}</div>
                </div>
                {savedFotoUrl && <img src={savedFotoUrl} alt="asado" style={{ width:"100%", height:160, objectFit:"cover", borderRadius:14, marginBottom:16, border:"1px solid #3a2a1a" }} />}
                <button disabled={sharing} onClick={async () => {
                  if (!store.user?.ciudad) { setRankingStep('ciudad'); return; }
                  setSharing(true);
                  await fbCreatePost(store.user.uid || authUser?.uid, store.user, { ...pendingAsado, rating, nota }, savedFotoUrl);
                  setSharing(false);
                  setPendingAsado(null); go("ranking");
                }} style={{ width:"100%", padding:14, background:"linear-gradient(135deg,#c1440e,#8B2500)", border:"none", borderRadius:14, color:"white", fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:10, animation:"pulseBtn 2s ease-in-out infinite", opacity:sharing?0.7:1 }}>
                  {sharing ? "..." : t(idioma,"ranking_si")}
                </button>
                <button onClick={() => { setShowRankingPrompt(false); setPendingAsado(null); go("historial"); }} style={{ width:"100%", padding:12, background:"none", border:"none", color:"#555", fontSize:13, cursor:"pointer" }}>
                  {t(idioma,"ranking_no")}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:20, fontWeight:900, marginBottom:6 }}>{t(idioma,"ranking_ciudad_lbl")}</div>
                <div style={{ color:"#8b7355", fontSize:13, marginBottom:16, lineHeight:1.5 }}>
                  {idioma==="en" ? "So the community near you can see your BBQ." : "Para que la comunidad cerca tuyo vea tu asado."}
                </div>
                <input value={ciudadInput} onChange={e => setCiudadInput(e.target.value)} placeholder={t(idioma,"ranking_ciudad_ph")} style={{ background:"#2a1a0a", border:"1px solid #3a2a1a", borderRadius:10, color:"#f0e6d3", fontSize:14, padding:"10px 14px", width:"100%", outline:"none", fontFamily:"'Inter',sans-serif", marginBottom:14 }} />
                <button disabled={!ciudadInput.trim() || sharing} onClick={async () => {
                  if (!ciudadInput.trim()) return;
                  setSharing(true);
                  await persist(prev => ({ ...prev, user: { ...prev.user, ciudad: ciudadInput.trim() } }));
                  await fbCreatePost(store.user?.uid || authUser?.uid, { ...store.user, ciudad: ciudadInput.trim() }, { ...pendingAsado, rating, nota }, savedFotoUrl);
                  setSharing(false);
                  setPendingAsado(null); go("ranking");
                }} style={{ width:"100%", padding:14, background:"linear-gradient(135deg,#c1440e,#8B2500)", border:"none", borderRadius:14, color:"white", fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:10, opacity:(!ciudadInput.trim()||sharing)?0.5:1 }}>
                  {sharing ? "..." : t(idioma,"ranking_si")}
                </button>
                <button onClick={() => { setShowRankingPrompt(false); setPendingAsado(null); go("historial"); }} style={{ width:"100%", padding:12, background:"none", border:"none", color:"#555", fontSize:13, cursor:"pointer" }}>
                  {t(idioma,"ranking_no")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── HISTORIAL ─────────────────────────────────────────────────────
function Historial({ store, go, idioma="es" }) {
  const [detail, setDetail] = useState(null);
  const { asados } = store;
  const sorted = [...asados].reverse();

  if (detail) {
    const a = asados.find(x => x.id === detail);
    if (!a) { setDetail(null); return null; }
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"48px 22px 14px", background:"linear-gradient(180deg,#1a0800,#0d0a07)", borderBottom:"1px solid #2a1a0a", flexShrink:0 }}>
          <button onClick={() => setDetail(null)} style={{ background:"none", border:"none", color:"#ff8c42", fontSize:24, cursor:"pointer", marginBottom:6, padding:0 }}>‹</button>
          <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:22, fontWeight:900 }}>{t(idioma,"detalle_asado")}</div>
          <div style={{ color:"#8b6914", fontSize:11 }}>{dateStr(a.ts)}</div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 18px 32px" }}>
          {a.foto && <img src={a.foto} alt="asado" style={{ width:"100%", height:200, objectFit:"cover", borderRadius:16, marginBottom:16, border:"1px solid #2a1a0a" }} />}
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            <div style={{ flex:1, background:`${rankColor(a.rating)}22`, border:`1px solid ${rankColor(a.rating)}44`, borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
              <div style={{ fontSize:28 }}>{rankEmoji(a.rating)}</div>
              <div style={{ color:rankColor(a.rating), fontSize:14, fontWeight:700, marginTop:4 }}>{rankLabel(a.rating)}</div>
            </div>
            <div style={{ flex:1, background:"#1a1005", border:"1px solid #2a1a0a", borderRadius:12, padding:"12px 14px" }}>
              <div style={{ color:"#8b7355", fontSize:10, marginBottom:3 }}>{t(idioma,"modo")}</div>
              <div style={{ color:"#f0e6d3", fontSize:13, fontWeight:600 }}>{a.mode==="pro"?"⚡ Pro":"📖 Principiante"}</div>
              <div style={{ color:"#8b7355", fontSize:10, marginTop:6 }}>{t(idioma,"punto_lbl")}</div>
              <div style={{ color:COCCION_COLORS[a.coccion], fontSize:13, fontWeight:600 }}>{getCoccionLabel(a.coccion,idioma)}</div>
            </div>
          </div>
          <Card title={t(idioma,"cortes_asados")}>
            {a.cortes.map((c, i) => (
              <div key={i} style={{ color:"#c9b49a", fontSize:13, padding:"5px 0", borderBottom:i < a.cortes.length-1 ? "1px solid #1a1a0a" : "none" }}>{c}</div>
            ))}
          </Card>
          {a.nota && <Card title={t(idioma,"notas_det")}><div style={{ color:"#8b7355", fontSize:13, lineHeight:1.6 }}>{a.nota}</div></Card>}
          <Card title={t(idioma,"config_det")}>
            <div style={{ color:"#8b7355", fontSize:13 }}>{t(idioma,"parrilla_lbl")} <span style={{ color:"#c9b49a" }}>{a.tipoParrilla==="adjustable"?"Graduable":"Fija"}</span></div>
            <div style={{ color:"#8b7355", fontSize:13, marginTop:4 }}>{t(idioma,"duracion_lbl")} <span style={{ color:"#c9b49a" }}>{a.duracion} min</span></div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Hdr title={t(idioma,"historial")} sub={t(idioma,"hist_sub")} onBack={() => go("home")} />
      <div style={{ flex:1, overflowY:"auto", padding:14 }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:50, marginBottom:14 }}>🔥</div>
            <div style={{ color:"#555", fontSize:14 }}>{t(idioma,"hist_empty")}</div>
            <div style={{ color:"#3a2a1a", fontSize:12, marginTop:6 }}>{t(idioma,"hist_empty2")}</div>
          </div>
        ) : (
          sorted.map(a => (
            <button key={a.id} onClick={() => setDetail(a.id)} style={{ width:"100%", display:"flex", gap:12, padding:"13px 14px", background:"#1a1005", borderRadius:14, marginBottom:10, border:`1px solid ${rankColor(a.rating)}33`, cursor:"pointer", textAlign:"left" }}>
              {a.foto ? (
                <img src={a.foto} alt="" style={{ width:58, height:58, objectFit:"cover", borderRadius:10, flexShrink:0 }} />
              ) : (
                <div style={{ width:58, height:58, background:`${rankColor(a.rating)}22`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>{rankEmoji(a.rating)}</div>
              )}
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ color:rankColor(a.rating), fontSize:13, fontWeight:700 }}>{rankLabel(a.rating)}</div>
                  <div style={{ color:"#555", fontSize:10 }}>{dateStr(a.ts)}</div>
                </div>
                <div style={{ color:"#8b7355", fontSize:12, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:200 }}>{a.cortes.join(" · ")}</div>
                <div style={{ display:"flex", gap:6, marginTop:4 }}>
                  <span style={{ background:"#1a1a0a", borderRadius:6, padding:"2px 7px", color:"#555", fontSize:10 }}>{getCoccionLabel(a.coccion,idioma)}</span>
                  <span style={{ background:"#1a1a0a", borderRadius:6, padding:"2px 7px", color:"#555", fontSize:10 }}>{a.mode==="pro"?"⚡ Pro":"📖 Beg."}</span>
                  {a.nota && <span style={{ background:"#1a1a0a", borderRadius:6, padding:"2px 7px", color:"#555", fontSize:10 }}>📝</span>}
                  {a.foto && <span style={{ background:"#1a1a0a", borderRadius:6, padding:"2px 7px", color:"#555", fontSize:10 }}>📷</span>}
                </div>
              </div>
              <div style={{ color:"#555", fontSize:16, alignSelf:"center" }}>›</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── PERFIL ────────────────────────────────────────────────────────
function Perfil({ store, persist, go, idioma="es", aprendizaje={}, authUser }) {
  const { user, asados } = store;
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(user?.nombre || "");
  const [avatar, setAvatar] = useState(user?.avatar || "🧑‍🍳");

  const xp = totalXP(asados), lvl = levelFromXP(xp), xpCur = xpInLevel(xp), xpNeed = xpForLevel(lvl);
  const pasados = asados.filter(a => a.rating==="pasado").length;
  const crudos = asados.filter(a => a.rating==="poco_crudo").length;
  const perfectos = asados.filter(a => a.rating==="perfecto").length;
  const fav = favCorte(asados), avg = avgRating(asados);

  let tip = null;
  if (asados.length >= 2) {
    if (pasados > perfectos) tip = { emoji:"🌡", msg:t(idioma,"tip_pasado") };
    else if (crudos > perfectos) tip = { emoji:"⏱", msg:t(idioma,"tip_crudo") };
    else if (perfectos >= 3) tip = { emoji:"🏆", msg:t(idioma,"tip_maestro") };
  }

  const levelsES = ["Encendedor 🔥","Fogonero 🪵","Parrillero 🥩","Maestro ⚡","Gran Maestro 🏆","Leyenda 🌟"];
  const levelsEN = ["Fire Starter 🔥","Stoker 🪵","Grillman 🥩","Grill Master ⚡","Grand Master 🏆","BBQ Legend 🌟"];
  const levels = idioma==="en" ? levelsEN : levelsES;

  const saveEdit = () => {
    persist(prev => ({ ...prev, user:{ ...prev.user, nombre:nombre.trim()||prev.user.nombre, avatar } }));
    setEditando(false);
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Hdr title={t(idioma,"perfil")} sub={t(idioma,"perfil_sub")} onBack={() => go("home")} badge={
        <button onClick={() => setEditando(!editando)} style={{ background:"#ff8c4222", border:"1px solid #ff8c4244", borderRadius:10, padding:"5px 12px", color:"#ff8c42", fontSize:11, fontWeight:700, cursor:"pointer" }}>
          {editando ? t(idioma,"cancelar") : t(idioma,"editar")}
        </button>
      } />
      <div style={{ flex:1, overflowY:"auto", padding:"16px 18px 32px" }}>
        <div style={{ background:"linear-gradient(135deg,#1a1200,#2d1800)", borderRadius:20, padding:20, textAlign:"center", marginBottom:16, border:"1px solid #3a2a1a" }}>
          {editando ? (
            <div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center", marginBottom:14 }}>
                {AVATAR_OPTIONS.map(a => (
                  <button key={a} onClick={() => setAvatar(a)} style={{ width:52, height:52, background:avatar===a?"#ff8c4233":"#1a1005", border:`2px solid ${avatar===a?"#ff8c42":"#2a1a0a"}`, borderRadius:13, fontSize:26, cursor:"pointer" }}>{a}</button>
                ))}
              </div>
              <TxtInput value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre..." maxLength={20} />
              <SimBtn label={t(idioma,"guardar_cambios")} onClick={saveEdit} />
            </div>
          ) : (
            <div>
              <div style={{ fontSize:54, marginBottom:10 }}>{user?.avatar || "🧑‍🍳"}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:24, fontWeight:900 }}>{user?.nombre || "Parrillero"}</div>
              <div style={{ color:"#8b7355", fontSize:13, marginTop:4 }}>{t(idioma,"nivel")} {lvl} · {TITLE(lvl, idioma)}</div>
              <div style={{ color:"#555", fontSize:11, marginTop:2 }}>{t(idioma,"desde")} {dateStr(user?.joinedAt || Date.now())}</div>
            </div>
          )}
        </div>
        {!editando && (
          <div>
            <div style={{ background:"#1a1005", borderRadius:16, padding:16, marginBottom:14, border:"1px solid #2a1a0a" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <div>
                  <div style={{ color:"#ff8c42", fontSize:22, fontWeight:900 }}>{idioma==="en" ? "Lv." : "Nv."}{lvl}</div>
                  <div style={{ color:"#8b7355", fontSize:12 }}>{TITLE(lvl, idioma)}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:"#ff8c42", fontSize:16, fontWeight:700 }}>{xpCur} XP</div>
                  <div style={{ color:"#555", fontSize:11 }}>{idioma==="en" ? `of ${xpNeed} for Lv.${lvl+1}` : `de ${xpNeed} para Nv.${lvl+1}`}</div>
                </div>
              </div>
              <div style={{ height:6, background:"#2a1a0a", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(xpCur/xpNeed,1)*100}%`, background:"linear-gradient(90deg,#c1440e,#ff8c42)", borderRadius:3, transition:"width 1s ease" }} />
              </div>
              <div style={{ display:"flex", gap:4, marginTop:12, overflowX:"auto", paddingBottom:4 }}>
                {levels.map((l, i) => (
                  <div key={i} style={{ flexShrink:0, padding:"4px 10px", background:i<lvl?"#ff8c4222":i===lvl?"#ff8c4433":"#1a1a0a", border:`1px solid ${i<=lvl?"#ff8c4444":"#2a2a2a"}`, borderRadius:20, fontSize:10, color:i<lvl?"#ff8c42":i===lvl?"#ffa060":"#3a3a3a", fontWeight:i===lvl?700:400, whiteSpace:"nowrap" }}>{l}</div>
                ))}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              {[["🔥",asados.length,t(idioma,"stats_asados")],["🏆",perfectos,t(idioma,"stats_perfectos")],["📊",`${avg}%`,t(idioma,"stats_precision")],["🥩",fav||"—",t(idioma,"stats_favorito")]].map(([em,v,l]) => (
                <div key={l} style={{ background:"#1a1005", borderRadius:14, padding:"14px 12px", border:"1px solid #2a1a0a", textAlign:"center" }}>
                  <div style={{ fontSize:22 }}>{em}</div>
                  <div style={{ color:"#ff8c42", fontSize:18, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v}</div>
                  <div style={{ color:"#555", fontSize:11 }}>{l}</div>
                </div>
              ))}
            </div>
            {/* AI Learning table */}
            {Object.keys(aprendizaje).length > 0 && (
              <div style={{ background:"linear-gradient(135deg,#1a2a1a,#0d1a0d)", border:"1px solid #4caf5033", borderRadius:16, padding:16, marginBottom:14 }}>
                <div style={{ color:"#4caf50", fontSize:12, fontWeight:700, marginBottom:12 }}>{t(idioma,"app_aprendio")}</div>
                <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                  <span style={{ flex:1, color:"#555", fontSize:10, textAlign:"center" }}>{idioma==="en"?"ADJUSTABLE":"GRADUABLE"}</span>
                  <span style={{ flex:1, color:"#555", fontSize:10, textAlign:"center" }}>{idioma==="en"?"FIXED":"FIJA"}</span>
                </div>
                {Object.entries(aprendizaje).map(([corte, vals]) => (
                  <div key={corte} style={{ background:"#0d0a07", borderRadius:8, padding:"7px 10px", marginBottom:6, display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ color:"#c9b49a", fontSize:12, flex:2 }}>{corte}</span>
                    {["adjustable","fixed"].map(p => {
                      const m = vals[p];
                      if (!m) return <span key={p} style={{ flex:1, color:"#3a2a1a", fontSize:11, textAlign:"center" }}>—</span>;
                      const pct = Math.round((m-1)*100);
                      const col = pct > 5 ? "#ff8c42" : pct < -5 ? "#4fc3f7" : "#4caf50";
                      return <span key={p} style={{ flex:1, color:col, fontSize:12, fontWeight:700, textAlign:"center" }}>{pct>0?"+":""}{pct}%</span>;
                    })}
                  </div>
                ))}
                <div style={{ color:"#3a2a1a", fontSize:10, marginTop:6 }}>{idioma==="en"?"+ = needs more time · − = needs less":"+ = necesita más tiempo · − = necesita menos"}</div>
              </div>
            )}
            {tip && (
              <div style={{ background:"#1a1005", border:"1px solid #2a1a0a", borderRadius:14, padding:"12px 14px", marginBottom:14, display:"flex", gap:12 }}>
                <span style={{ fontSize:22 }}>{tip.emoji}</span>
                <div style={{ color:"#8b7355", fontSize:13, lineHeight:1.6 }}>{tip.msg}</div>
              </div>
            )}
            {asados.length > 0 && (
              <div style={{ background:"#1a1005", borderRadius:16, padding:16, marginBottom:14, border:"1px solid #2a1a0a" }}>
                <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700, marginBottom:12 }}>{t(idioma,"distribucion")}</div>
                {[["perfecto","🏆","#4caf50",perfectos],["pasado","😅","#ff8c42",pasados],["poco_crudo","🩸","#e53935",crudos]].map(([id,em,clr,count]) => (
                  <div key={id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:16, width:20 }}>{em}</span>
                    <div style={{ flex:1, height:6, background:"#2a1a0a", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:asados.length?`${count/asados.length*100}%`:"0%", background:clr, borderRadius:3, transition:"width 1s ease" }} />
                    </div>
                    <span style={{ color:clr, fontSize:12, fontWeight:700, width:20, textAlign:"right" }}>{count}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => go("historial")} style={{ width:"100%", padding:14, background:"linear-gradient(135deg,#1a1005,#2a1800)", border:"1px solid #3a2a1a", borderRadius:14, color:"#ff8c42", fontSize:14, fontWeight:700, cursor:"pointer", marginBottom:10 }}>
              {t(idioma,"ver_historial")}
            </button>
            <button onClick={() => signOut(auth)} style={{ width:"100%", padding:11, background:"none", border:"1px solid #ff8c4244", borderRadius:14, color:"#ff8c42", fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:10 }}>
              🚪 {idioma==="en" ? "Sign out" : "Cerrar sesión"}
            </button>
            <button onClick={() => { if (window.confirm(idioma==="en" ? "Delete all data and start over?" : "¿Borrar todos los datos y empezar de cero?")) { signOut(auth); } }} style={{ width:"100%", padding:11, background:"none", border:"1px solid #2a1a0a", borderRadius:14, color:"#3a2a1a", fontSize:12, cursor:"pointer" }}>
              {t(idioma,"borrar_cuenta")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── AJUSTES ───────────────────────────────────────────────────────
function Ajustes({ store, persist, go }) {
  const cfg = store.config || { idioma:'es', tiempoMult:100, vozSimulacion:false, notifSonido:true, voiceIndex:0 };
  const [idioma, setIdioma] = useState(cfg.idioma || 'es');
  const [tiempoMult, setTiempoMult] = useState(cfg.tiempoMult || 100);
  const [vozSim, setVozSim] = useState(cfg.vozSimulacion || false);
  const [voiceIndex, setVoiceIndex] = useState(cfg.voiceIndex || 0);
  const [chistes, setChistes] = useState(cfg.chistes !== false);
  const [voices, setVoices] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = () => {
      const vs = window.speechSynthesis?.getVoices() || [];
      setVoices(vs);
    };
    load();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
  }, []);

  const langVoices = voices.filter(v => v.lang.startsWith(idioma === 'en' ? 'en' : 'es'));

  const guardar = () => {
    persist(prev => ({ ...prev, config:{ idioma, tiempoMult, vozSimulacion:vozSim, notifSonido:true, voiceIndex, chistes } }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => { setIdioma('es'); setTiempoMult(100); setVozSim(false); setVoiceIndex(0); setChistes(true); };

  const testVoice = () => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utt = new SpeechSynthesisUtterance(idioma==='en' ? "Voice test. The grill is ready!" : "Probando la voz. ¡La parrilla espera!");
      if (langVoices.length > 0) utt.voice = langVoices[Math.min(voiceIndex, langVoices.length-1)];
      utt.lang = idioma === 'en' ? 'en-US' : 'es-AR';
      utt.rate = 0.88; utt.volume = 1;
      setTimeout(() => synth.speak(utt), 80);
    } catch(e) {}
  };

  const li = t(idioma, 'idioma');
  const multColor = tiempoMult < 100 ? "#e53935" : tiempoMult > 100 ? "#4caf50" : "#ff8c42";
  const multLabel = tiempoMult < 100 ? `−${100-tiempoMult}% ${t(idioma,"mas_rapido")}` : tiempoMult > 100 ? `+${tiempoMult-100}% ${t(idioma,"mas_lento")}` : t(idioma,"estandar");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Hdr title={t(idioma,"ajustes")} sub={t(idioma,"ajustes_sub")} onBack={() => go("home")} />
      <div style={{ flex:1, overflowY:"auto", padding:16 }}>

        {/* Idioma */}
        <div style={{ background:"#1a1005", borderRadius:16, padding:16, marginBottom:12, border:"1px solid #2a1a0a" }}>
          <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700, marginBottom:12 }}>🌐 {t(idioma,"idioma")}</div>
          <div style={{ display:"flex", gap:10 }}>
            {[{id:"es",flag:"🇦🇷",label:"Español"},{id:"en",flag:"🇺🇸",label:"English"}].map(op => (
              <button key={op.id} onClick={() => setIdioma(op.id)} style={{ flex:1, padding:"12px 8px", background:idioma===op.id?"#ff8c4233":"#0d0a07", border:`2px solid ${idioma===op.id?"#ff8c42":"#2a1a0a"}`, borderRadius:12, cursor:"pointer", textAlign:"center", transition:"all .2s" }}>
                <div style={{ fontSize:24 }}>{op.flag}</div>
                <div style={{ color:idioma===op.id?"#ff8c42":"#555", fontSize:12, fontWeight:idioma===op.id?700:400, marginTop:4 }}>{op.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tiempos de cocción */}
        <div style={{ background:"#1a1005", borderRadius:16, padding:16, marginBottom:12, border:"1px solid #2a1a0a" }}>
          <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700, marginBottom:6 }}>⏱ {t(idioma,"tiempos")}</div>
          <div style={{ color:"#6b5a3e", fontSize:11, lineHeight:1.5, marginBottom:14 }}>{t(idioma,"tiemposDesc")}</div>
          <input type="range" min={50} max={150} step={5} value={tiempoMult} onChange={e => setTiempoMult(+e.target.value)} />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
            <span style={{ color:"#555", fontSize:11 }}>50%</span>
            <div style={{ textAlign:"center" }}>
              <span style={{ color:multColor, fontSize:22, fontWeight:900 }}>{tiempoMult}%</span>
              <div style={{ color:multColor, fontSize:11, marginTop:2 }}>{multLabel}</div>
            </div>
            <span style={{ color:"#555", fontSize:11 }}>150%</span>
          </div>
          <div style={{ display:"flex", gap:6, marginTop:12, justifyContent:"center" }}>
            {[70,85,100,115,130].map(v => (
              <button key={v} onClick={() => setTiempoMult(v)} style={{ padding:"4px 10px", background:tiempoMult===v?"#ff8c4233":"#0d0a07", border:`1px solid ${tiempoMult===v?"#ff8c42":"#2a1a0a"}`, borderRadius:20, color:tiempoMult===v?"#ff8c42":"#555", fontSize:11, cursor:"pointer" }}>{v}%</button>
            ))}
          </div>
        </div>

        {/* Voz en simulación */}
        <div style={{ background:"#1a1005", borderRadius:16, padding:16, marginBottom:12, border:"1px solid #2a1a0a" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700 }}>🔊 {t(idioma,"voz_sim")}</div>
            <button onClick={() => setVozSim(!vozSim)} style={{ width:44, height:24, background:vozSim?"#ff8c42":"#333", borderRadius:12, border:"none", cursor:"pointer", position:"relative", transition:"background .3s" }}>
              <div style={{ width:20, height:20, background:"white", borderRadius:"50%", position:"absolute", top:2, left:vozSim?22:2, transition:"left .3s" }} />
            </button>
          </div>
          <div style={{ color:"#6b5a3e", fontSize:11, lineHeight:1.5, marginBottom:12 }}>{t(idioma,"voz_sim_desc")}</div>

          {/* Voice type picker */}
          <div style={{ marginBottom:10 }}>
            <div style={{ color:"#ff8c42", fontSize:11, fontWeight:700, marginBottom:8 }}>🎙 {t(idioma,"tipo_voz")}</div>
            <div style={{ color:"#555", fontSize:10, marginBottom:8 }}>{t(idioma,"tipo_voz_desc")}</div>
            {langVoices.length === 0 ? (
              <div style={{ color:"#3a2a1a", fontSize:11, padding:"8px 12px", background:"#0d0a07", borderRadius:8 }}>
                {idioma==='en' ? "No voices found. Try clicking Test Voice first." : "No se encontraron voces. Tocá Probar voz primero."}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:160, overflowY:"auto" }}>
                {langVoices.map((v, i) => (
                  <button key={i} onClick={() => setVoiceIndex(i)} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:voiceIndex===i?"#ff8c4222":"#0d0a07", border:`1px solid ${voiceIndex===i?"#ff8c42":"#2a1a0a"}`, borderRadius:10, cursor:"pointer", textAlign:"left", transition:"all .2s" }}>
                    <span style={{ fontSize:16 }}>{voiceIndex===i ? "🔊" : "🔇"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ color:voiceIndex===i?"#ff8c42":"#c9b49a", fontSize:12, fontWeight:voiceIndex===i?700:400 }}>{v.name}</div>
                      <div style={{ color:"#555", fontSize:10 }}>{v.lang}</div>
                    </div>
                    {v.localService && <span style={{ color:"#4caf50", fontSize:10 }}>local</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={testVoice} style={{ width:"100%", padding:"8px 0", background:"#ff8c4222", border:"1px solid #ff8c4244", borderRadius:10, color:"#ff8c42", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            {t(idioma,"probar_voz")}
          </button>
        </div>

        {/* Chistes toggle */}
        <div style={{ background:"#1a1005", borderRadius:16, padding:16, marginBottom:12, border:"1px solid #2a1a0a" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
            <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700 }}>😄 {idioma==="en"?"Jokes during cooking":"Chistes durante la cocción"}</div>
            <button onClick={() => setChistes(!chistes)} style={{ width:44, height:24, background:chistes?"#9c27b0":"#333", borderRadius:12, border:"none", cursor:"pointer", position:"relative", transition:"background .3s" }}>
              <div style={{ width:20, height:20, background:"white", borderRadius:"50%", position:"absolute", top:2, left:chistes?22:2, transition:"left .3s" }} />
            </button>
          </div>
          <div style={{ color:"#6b5a3e", fontSize:11, lineHeight:1.5 }}>
            {idioma==="en"
              ? "3 to 5 jokes appear between cuts to pass the time. On the house."
              : "Aparecen 3 a 5 chistes entre corte y corte para matar el tiempo. Cortesía del parrillero."}
          </div>
        </div>

        {/* Info sobre voz */}
        <div style={{ background:"linear-gradient(135deg,#1a1a2a,#0d0d1a)", borderRadius:14, padding:"12px 14px", marginBottom:12, border:"1px solid #333" }}>
          <div style={{ color:"#7986cb", fontSize:11, fontWeight:700, marginBottom:4 }}>{t(idioma,"voz_info_title")}</div>
          <div style={{ color:"#555", fontSize:11, lineHeight:1.6 }}>{t(idioma,"voz_info")}</div>
        </div>

        {/* Botones */}
        <button onClick={guardar} style={{ width:"100%", padding:14, background:"linear-gradient(135deg,#c1440e,#6d1500)", border:"none", borderRadius:14, color:"white", fontSize:14, fontWeight:700, cursor:"pointer", marginBottom:10, animation:"pulseBtn 3s ease-in-out infinite" }}>
          {saved ? t(idioma,"guardado") : t(idioma,"guardar")}
        </button>
        <button onClick={reset} style={{ width:"100%", padding:11, background:"none", border:"1px solid #2a1a0a", borderRadius:14, color:"#555", fontSize:12, cursor:"pointer" }}>
          🔄 {t(idioma,"reset")}
        </button>

      </div>
    </div>
  );
}


// ── PREMIUM SCREEN ────────────────────────────────────────────────
function PremiumScreen({ store, persist, go, idioma="es" }) {
  const isPremium = store.config?.premium;
  const isCompleto = store.config?.completo;
  const en = idioma === "en";

  const activatePremium = () => {
    persist(prev => ({ ...prev, config:{ ...prev.config, premium:true } }));
  };
  const activateCompleto = () => {
    persist(prev => ({ ...prev, config:{ ...prev.config, premium:true, completo:true } }));
  };

  const premiumFeatures = [
    ["🥩", en?"VIP Cuts":"Cortes VIP", en?"Picanha, Lechón, Cordero, T-Bone and more in simulation":"Picanha, Lechón, Cordero, T-Bone y más en la simulación"],
    ["🧠", en?"AI Learning":"IA Aprendizaje", en?"Personalized time adjustments from your BBQ history":"Ajustes de tiempo personalizados según tu historial"],
    ["😄", en?"BBQ Jokes":"Chistes asadores", en?"50+ exclusive jokes during the simulation":"50+ chistes exclusivos durante la simulación"],
    ["☁️", en?"Cloud Sync":"Sync en la nube", en?"Your history on all devices (coming soon)":"Tu historial en todos tus dispositivos (próximamente)"],
  ];
  const completoFeatures = [
    ["✨", en?"Claude AI Photo Analysis":"Análisis de Foto con Claude IA", en?"Get expert AI feedback on your BBQ photos":"Análisis experto de IA sobre las fotos de tu asado"],
    ["🔮", en?"Everything in Premium":"Todo lo de Premium", en?"All Premium features included":"Todas las funciones Premium incluidas"],
  ];

  if (isCompleto) {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#0d0a07" }}>
        <div style={{ padding:"48px 22px 20px", background:"linear-gradient(180deg,#1a0030,#0d0a07)", flexShrink:0 }}>
          <button onClick={() => go("home")} style={{ background:"none", border:"none", color:"#a78bfa", fontSize:24, cursor:"pointer", marginBottom:12, padding:0 }}>‹</button>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:52, marginBottom:8 }}>💎</div>
            <div style={{ fontFamily:"'Playfair Display',serif", color:"#a78bfa", fontSize:26, fontWeight:900 }}>Plan Completo</div>
            <div style={{ color:"#6b5a8e", fontSize:13, marginTop:6 }}>{en?"All features unlocked. The full experience.":"Todo desbloqueado. La experiencia completa."}</div>
          </div>
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
          <div style={{ fontSize:60, marginBottom:16 }}>🏆</div>
          <div style={{ fontFamily:"'Playfair Display',serif", color:"#a78bfa", fontSize:22, fontWeight:900, marginBottom:8, textAlign:"center" }}>
            {en?"You have Plan Completo!":"¡Tenés el Plan Completo!"}
          </div>
          <div style={{ color:"#6b5a8e", fontSize:14, lineHeight:1.7, textAlign:"center" }}>
            {en?"All features including AI photo analysis are unlocked.":"Todas las funciones incluido el análisis de foto con IA están activas."}
          </div>
        </div>
      </div>
    );
  }

  if (isPremium) {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#0d0a07" }}>
        <div style={{ padding:"48px 22px 20px", background:"linear-gradient(180deg,#2d1200,#1a0800,#0d0a07)", flexShrink:0 }}>
          <button onClick={() => go("home")} style={{ background:"none", border:"none", color:"#ff8c42", fontSize:24, cursor:"pointer", marginBottom:12, padding:0 }}>‹</button>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:8 }}>⭐</div>
            <div style={{ fontFamily:"'Playfair Display',serif", color:"#ffd700", fontSize:22, fontWeight:900 }}>{en?"You're Premium!":"¡Sos Premium!"}</div>
            <div style={{ color:"#8b7355", fontSize:13, marginTop:6 }}>{en?"Upgrade to Completo to unlock AI photo analysis.":"Actualizá al Plan Completo para desbloquear el análisis de foto con IA."}</div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 18px 32px" }}>
          {/* Completo upsell */}
          <div style={{ background:"linear-gradient(135deg,#1a0d2e,#0d0720)", border:"2px solid #7c3aed66", borderRadius:20, padding:20, marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <span style={{ fontSize:28 }}>💎</span>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", color:"#a78bfa", fontSize:18, fontWeight:900 }}>Plan Completo</div>
                <div style={{ color:"#6b5a8e", fontSize:11 }}>{en?"The ultimate upgrade":"La mejora definitiva"}</div>
              </div>
            </div>
            {completoFeatures.map(([em, title, desc]) => (
              <div key={title} style={{ display:"flex", gap:12, marginBottom:12 }}>
                <div style={{ width:36, height:36, background:"#7c3aed22", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{em}</div>
                <div>
                  <div style={{ color:"#e9d5ff", fontSize:13, fontWeight:700 }}>{title}</div>
                  <div style={{ color:"#6b5a8e", fontSize:11, marginTop:2, lineHeight:1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
            <div style={{ textAlign:"center", marginTop:8, marginBottom:4 }}>
              <div style={{ color:"#6b5a8e", fontSize:11, textDecoration:"line-through", marginBottom:2 }}>$4.99/{en?"mo":"mes"}</div>
              <div style={{ color:"#a78bfa", fontSize:32, fontWeight:900, lineHeight:1 }}>$2.00</div>
              <div style={{ color:"#6b5a8e", fontSize:11, marginTop:3 }}>{en?"/ month extra · you already pay $2.99":"/ mes adicional · ya pagás $2.99 de Premium"}</div>
            </div>
            <button onClick={activateCompleto} style={{ width:"100%", marginTop:12, padding:14, background:"linear-gradient(135deg,#7c3aed,#5b21b6)", border:"none", borderRadius:14, color:"white", fontSize:15, fontWeight:900, cursor:"pointer", animation:"pulseBtn 2s ease-in-out infinite" }}>
              💎 {en?"Upgrade to Completo":"Actualizar a Completo"}
            </button>
          </div>
          <div style={{ color:"#3a2a1a", fontSize:11, textAlign:"center", lineHeight:1.6 }}>
            {en?"Demo mode: tap to simulate purchase.":"Modo demo: tocá para simular la compra."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#0d0a07" }}>
      <div style={{ padding:"48px 22px 16px", background:"linear-gradient(180deg,#2d1200,#1a0800,#0d0a07)", flexShrink:0 }}>
        <button onClick={() => go("home")} style={{ background:"none", border:"none", color:"#ff8c42", fontSize:24, cursor:"pointer", marginBottom:10, padding:0 }}>‹</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:6 }}>🔓</div>
          <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:22, fontWeight:900 }}>{en?"Choose your plan":"Elegí tu plan"}</div>
          <div style={{ color:"#8b7355", fontSize:12, marginTop:4 }}>{en?"Unlock the full BBQ experience":"Desbloqueá la experiencia asadora completa"}</div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 18px 32px" }}>
        {/* Premium plan */}
        <div style={{ background:"linear-gradient(135deg,#2d1f00,#1a1200)", border:"2px solid #ff8c4244", borderRadius:20, padding:18, marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:26 }}>⭐</span>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", color:"#ffd700", fontSize:17, fontWeight:900 }}>Premium</div>
                <div style={{ color:"#8b7355", fontSize:10 }}>{en?"For the serious pitmaster":"Para el asador en serio"}</div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:"#ffd700", fontSize:22, fontWeight:900, lineHeight:1 }}>$2.99</div>
              <div style={{ color:"#6b5a3e", fontSize:10 }}>{en?"/ mo":"/ mes"}</div>
            </div>
          </div>
          {premiumFeatures.map(([em, title, desc]) => (
            <div key={title} style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ width:32, height:32, background:"#ff8c4222", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{em}</div>
              <div>
                <div style={{ color:"#f0e6d3", fontSize:12, fontWeight:700 }}>{title}</div>
                <div style={{ color:"#6b5a3e", fontSize:10, marginTop:1, lineHeight:1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
          <button onClick={activatePremium} style={{ width:"100%", marginTop:6, padding:13, background:"linear-gradient(135deg,#ffd700,#ff8c42)", border:"none", borderRadius:12, color:"#1a0a00", fontSize:14, fontWeight:900, cursor:"pointer" }}>
            ⭐ {en?"Unlock Premium":"Desbloquear Premium"}
          </button>
        </div>

        {/* Completo plan */}
        <div style={{ background:"linear-gradient(135deg,#1a0d2e,#0d0720)", border:"2px solid #7c3aed88", borderRadius:20, padding:18, marginBottom:14, position:"relative" }}>
          <div style={{ position:"absolute", top:-10, right:16, background:"linear-gradient(135deg,#7c3aed,#5b21b6)", borderRadius:8, padding:"3px 10px", fontSize:10, fontWeight:700, color:"white" }}>
            {en?"BEST VALUE":"MEJOR VALOR"}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:26 }}>💎</span>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", color:"#a78bfa", fontSize:17, fontWeight:900 }}>Completo</div>
                <div style={{ color:"#6b5a8e", fontSize:10 }}>{en?"Everything + AI":"Todo + IA"}</div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:"#a78bfa", fontSize:22, fontWeight:900, lineHeight:1 }}>$4.99</div>
              <div style={{ color:"#6b5a8e", fontSize:10 }}>{en?"/ mo":"/ mes"}</div>
            </div>
          </div>
          {[...premiumFeatures, ...completoFeatures].map(([em, title, desc]) => (
            <div key={title} style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ width:32, height:32, background:"#7c3aed22", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{em}</div>
              <div>
                <div style={{ color:"#e9d5ff", fontSize:12, fontWeight:700 }}>{title}</div>
                <div style={{ color:"#6b5a8e", fontSize:10, marginTop:1, lineHeight:1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
          <button onClick={activateCompleto} style={{ width:"100%", marginTop:6, padding:13, background:"linear-gradient(135deg,#7c3aed,#5b21b6)", border:"none", borderRadius:12, color:"white", fontSize:14, fontWeight:900, cursor:"pointer", animation:"pulseBtn 2s ease-in-out infinite" }}>
            💎 {en?"Unlock Completo":"Desbloquear Completo"}
          </button>
        </div>

        <div style={{ color:"#3a2a1a", fontSize:11, textAlign:"center", lineHeight:1.6 }}>
          {en?"Demo mode: tap to simulate purchase. Real payments coming soon.":"Modo demo: tocá para simular la compra. Pagos reales próximamente."}
        </div>
      </div>
    </div>
  );
}

// ── SMALL HELPERS ─────────────────────────────────────────────────
function StepBar({ step, total, label, idioma="es" }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", gap:5, marginBottom:7 }}>
        {[...Array(total)].map((_, i) => <div key={i} style={{ flex:1, height:3, borderRadius:2, background:i<step?"#ff8c42":"#2a1a0a" }} />)}
      </div>
      <div style={{ color:"#f0e6d3", fontSize:15, fontWeight:700 }}>{label}</div>
      <div style={{ color:"#555", fontSize:11 }}>{t(idioma,"paso")} {step} {t(idioma,"de")} {total}</div>
    </div>
  );
}
function Card({ title, children }) {
  return (
    <div style={{ background:"#1a1005", borderRadius:14, padding:"13px 15px", marginBottom:11, border:"1px solid #2a1a0a" }}>
      <div style={{ color:"#ff8c42", fontSize:12, fontWeight:700, marginBottom:9 }}>{title}</div>
      {children}
    </div>
  );
}
function SimBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{ width:"100%", padding:14, background:"linear-gradient(135deg,#c1440e,#6d1500)", border:"none", borderRadius:14, color:"white", fontSize:14, fontWeight:700, cursor:"pointer", marginTop:4, marginBottom:14, animation:"pulseBtn 3s ease-in-out infinite" }}>
      {label}
    </button>
  );
}
function ChkBadge({ active, color }) {
  return (
    <div style={{ width:24, height:24, borderRadius:"50%", background:active?color:"transparent", border:`2px solid ${active?color:"#444"}`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:13, transition:"all .2s", flexShrink:0 }}>
      {active ? "✓" : ""}
    </div>
  );
}
function AlturaVis({ cm }) {
  const pct = Math.round((cm / 30) * 100);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:10, height:55 }}>
      <div style={{ width:14, height:55, background:"#1a1a0a", borderRadius:7, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${pct}%`, background:"linear-gradient(180deg,#4fc3f7,#0288d1)", borderRadius:7, transition:"height 1.5s cubic-bezier(.34,1.56,.64,1)" }} />
      </div>
      <div>
        <div style={{ color:"#4fc3f7", fontSize:22, fontWeight:900, lineHeight:1 }}>{cm}</div>
        <div style={{ color:"#555", fontSize:10 }}>cm del fuego</div>
      </div>
    </div>
  );
}
function TxtInput({ value, onChange, placeholder, maxLength }) {
  return (
    <input type="text" value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} style={{ background:"#1a1005", border:"1px solid #3a2a1a", borderRadius:10, color:"#f0e6d3", fontSize:14, padding:"10px 14px", width:"100%", outline:"none", fontFamily:"'Inter',sans-serif", marginBottom:16 }} />
  );
}

// ── COMMENTS MODAL ────────────────────────────────────────────────
function CommentsModal({ post, authUser, store, idioma, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fbGetComments(post.id).then(c => { setComments(c); setLoading(false); });
  }, [post.id]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await fbAddComment(post.id, authUser?.uid, store.user, text.trim());
    const updated = await fbGetComments(post.id);
    setComments(updated);
    setText('');
    setSending(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", display:"flex", flexDirection:"column", justifyContent:"flex-end", zIndex:100 }} onClick={onClose}>
      <div style={{ background:"#1a1005", borderRadius:"20px 20px 0 0", maxHeight:"80vh", display:"flex", flexDirection:"column", animation:"slideUpModal .3s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"16px 18px 10px", borderBottom:"1px solid #2a1a0a", flexShrink:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ color:"#ff8c42", fontSize:14, fontWeight:700 }}>💬 {t(idioma,"ranking_comentarios")}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#555", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"12px 18px" }}>
          {loading ? (
            <div style={{ textAlign:"center", color:"#555", padding:24 }}>...</div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign:"center", color:"#555", fontSize:13, padding:24 }}>
              {idioma==="en" ? "No comments yet. Be the first!" : "Sin comentarios todavía. ¡Sé el primero!"}
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ width:32, height:32, background:"#ff8c4222", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{c.userEmoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <div style={{ color:"#f0e6d3", fontSize:12, fontWeight:700 }}>{c.userNombre}</div>
                    <div style={{ color:"#555", fontSize:10 }}>{timeAgo(c.timestamp, idioma)}</div>
                  </div>
                  <div style={{ color:"#c9b49a", fontSize:13, marginTop:2, lineHeight:1.5 }}>{c.texto}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ padding:"10px 18px 24px", borderTop:"1px solid #2a1a0a", flexShrink:0, display:"flex", gap:10 }}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder={t(idioma,"ranking_comentario_ph")} onKeyDown={e => e.key==="Enter" && send()} style={{ flex:1, background:"#2a1a0a", border:"1px solid #3a2a1a", borderRadius:10, color:"#f0e6d3", fontSize:13, padding:"10px 14px", outline:"none", fontFamily:"'Inter',sans-serif" }} />
          <button onClick={send} disabled={sending || !text.trim()} style={{ padding:"10px 16px", background:"linear-gradient(135deg,#c1440e,#8B2500)", border:"none", borderRadius:10, color:"white", fontSize:13, fontWeight:700, cursor:"pointer", flexShrink:0, opacity:(!text.trim()||sending)?0.5:1 }}>
            {t(idioma,"ranking_enviar")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── POST CARD ─────────────────────────────────────────────────────
function PostCard({ post, authUser, idioma, onComment, onVote }) {
  const hasVoted = post.llamas?.includes(authUser?.uid);
  const [voting, setVoting] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleVote = async () => {
    if (voting || !authUser) return;
    setVoting(true);
    setAnimating(true);
    await onVote(post.id, hasVoted);
    setVoting(false);
    setTimeout(() => setAnimating(false), 400);
  };

  return (
    <div style={{ background:"#1a1005", borderRadius:16, marginBottom:12, border:"1px solid #2a1a0a", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px 8px" }}>
        <div style={{ width:36, height:36, background:"#ff8c4222", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{post.userEmoji}</div>
        <div style={{ flex:1 }}>
          <div style={{ color:"#f0e6d3", fontSize:13, fontWeight:700 }}>{post.userNombre}</div>
          <div style={{ color:"#555", fontSize:10 }}>{post.userCiudad ? `${post.userCiudad} · ` : ''}{timeAgo(post.timestamp, idioma)}</div>
        </div>
        <div style={{ background:"#2a1a0a", borderRadius:8, padding:"3px 10px", fontSize:10, color:"#ff8c42", fontWeight:700 }}>Nv.{post.userNivel || 1}</div>
      </div>
      {post.foto && <img src={post.foto} alt="asado" style={{ width:"100%", height:200, objectFit:"cover", display:"block" }} />}
      <div style={{ padding:"10px 14px" }}>
        {post.cortes?.length > 0 && (
          <div style={{ color:"#c9b49a", fontSize:12, marginBottom:4 }}>🥩 {post.cortes.join(" · ")}</div>
        )}
        {post.nota && (
          <div style={{ color:"#8b7355", fontSize:13, lineHeight:1.5, marginBottom:8 }}>"{post.nota}"</div>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={handleVote} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:authUser?"pointer":"default", padding:0 }}>
            <span style={{ fontSize:22, filter:hasVoted?"none":"grayscale(1)", transition:"filter .2s", display:"inline-block", animation:animating?"llamaVote .4s ease":undefined }}>{animating && !hasVoted ? "🔥" : "🔥"}</span>
            <span style={{ color:hasVoted?"#ff8c42":"#555", fontSize:14, fontWeight:700, transition:"color .2s" }}>{post.llamasCount || 0}</span>
          </button>
          <button onClick={onComment} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", padding:0 }}>
            <span style={{ fontSize:18 }}>💬</span>
            <span style={{ color:"#555", fontSize:13 }}>{post.comentariosCount || 0}</span>
          </button>
          <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
            <span style={{ background:`${rankColor(post.rating)}22`, borderRadius:6, padding:"3px 8px", color:rankColor(post.rating), fontSize:10, fontWeight:700 }}>{rankEmoji(post.rating)}</span>
            <span style={{ background:"#2a1a0a", borderRadius:6, padding:"3px 8px", color:"#8b7355", fontSize:10 }}>{getCoccionLabel(post.coccion, idioma)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RANKING ───────────────────────────────────────────────────────
function Ranking({ store, persist, go, idioma="es", authUser }) {
  const [tab, setTab] = useState('semana');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentPost, setCommentPost] = useState(null);
  const week = getWeekId();
  const ciudad = store.user?.ciudad || '';

  const loadPosts = async () => {
    setLoading(true);
    const data = await fbGetPosts(tab, ciudad, week);
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, [tab]);

  const handleVote = async (postId, hasVoted) => {
    if (!authUser) return;
    await fbToggleLlama(postId, authUser.uid, hasVoted);
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      llamas: hasVoted ? (p.llamas || []).filter(id => id !== authUser.uid) : [...(p.llamas || []), authUser.uid],
      llamasCount: (p.llamasCount || 0) + (hasVoted ? -1 : 1),
    } : p));
  };

  const tabs = [
    { id:'semana', label:t(idioma,"ranking_tab_semana") },
    { id:'ciudad', label:t(idioma,"ranking_tab_ciudad") },
    { id:'todos', label:t(idioma,"ranking_tab_todos") },
  ];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#0d0a07" }}>
      <div style={{ padding:"48px 18px 0", background:"linear-gradient(180deg,#1a0800,#0d0a07)", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => go("home")} style={{ background:"none", border:"none", color:"#ff8c42", fontSize:24, cursor:"pointer", padding:0 }}>‹</button>
            <span style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:24, fontWeight:900 }}>{t(idioma,"ranking")}</span>
          </div>
          <div style={{ background:"#2a1a0a", borderRadius:8, padding:"3px 10px", color:"#ff8c42", fontSize:10, fontWeight:700 }}>{week}</div>
        </div>
        <div style={{ color:"#6b5a3e", fontSize:11, marginBottom:12, paddingLeft:32 }}>{t(idioma,"ranking_sub")}</div>
        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #2a1a0a" }}>
          {tabs.map(tab_item => (
            <button key={tab_item.id} onClick={() => setTab(tab_item.id)} style={{ flex:1, padding:"9px 4px", background:"none", border:"none", borderBottom:`2px solid ${tab===tab_item.id?"#ff8c42":"transparent"}`, color:tab===tab_item.id?"#ff8c42":"#555", fontSize:11, fontWeight:700, cursor:"pointer", transition:"all .2s" }}>
              {tab_item.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px 32px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:48 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🔥</div>
            <div style={{ color:"#555", fontSize:13 }}>{idioma==="en" ? "Loading..." : "Cargando..."}</div>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 24px" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏆</div>
            <div style={{ color:"#ff8c42", fontSize:16, fontWeight:700, marginBottom:6 }}>{t(idioma,"ranking_unirte")}</div>
            <div style={{ color:"#555", fontSize:13, lineHeight:1.6, marginBottom:20 }}>{t(idioma,"ranking_empty")}</div>
            <button onClick={() => go("simulacion")} style={{ padding:"12px 24px", background:"linear-gradient(135deg,#c1440e,#8B2500)", border:"none", borderRadius:14, color:"white", fontSize:14, fontWeight:700, cursor:"pointer", animation:"pulseBtn 3s ease-in-out infinite" }}>
              {idioma==="en" ? "🔥 Start a BBQ" : "🔥 Hacer un asado"}
            </button>
          </div>
        ) : (
          posts.map((post, idx) => (
            <div key={post.id}>
              {idx < 3 && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, paddingLeft:2 }}>
                  <span style={{ fontSize:18 }}>{idx===0?"🥇":idx===1?"🥈":"🥉"}</span>
                  <span style={{ color:"#555", fontSize:11 }}>#{idx+1}</span>
                </div>
              )}
              <PostCard post={post} authUser={authUser} idioma={idioma} onVote={handleVote} onComment={() => setCommentPost(post)} />
            </div>
          ))
        )}
      </div>

      {commentPost && (
        <CommentsModal post={commentPost} authUser={authUser} store={store} idioma={idioma} onClose={() => setCommentPost(null)} />
      )}
    </div>
  );
}
