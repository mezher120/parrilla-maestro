import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

// ── DATA ──────────────────────────────────────────────────────────
const CORTES_VACUNO = [
  { id:"asado-tira", nombre:"Asado de Tira", emoji:"🥩", descripcion:"El rey de la parrilla argentina. Corte transversal del costillar con hueso.", preparacion:"Retirar del frío 1 hora antes. Salar con sal gruesa 30 min antes. Colocar con el hueso hacia abajo.", tiempo:"60–90 min", temperatura:"Brasa media-alta", servir:"Servir con chimichurri y ensalada criolla.", color:"#8B1A1A" },
  { id:"vacio", nombre:"Vacío", emoji:"🥩", descripcion:"Corte del flanco lateral, jugoso y sabroso.", preparacion:"Marcar el lado de la grasa con cortes superficiales. Sal gruesa antes.", tiempo:"45–60 min", temperatura:"Brasa media", servir:"Cortar en diagonal contra la fibra. Con papas al rescoldo.", color:"#7A1818" },
  { id:"entraña", nombre:"Entraña", emoji:"🥩", descripcion:"Corte del diafragma, muy tierno y de sabor intenso. Cocción rápida.", preparacion:"Retirar la membrana exterior. Salar al momento de poner en la parrilla.", tiempo:"15–20 min", temperatura:"Brasa alta", servir:"Cortar en tiras anchas. Ideal con salsa criolla o al limón.", color:"#9B2226" },
  { id:"lomo", nombre:"Lomo", emoji:"🥩", descripcion:"El corte más noble y tierno del vacuno.", preparacion:"Atar con hilo de cocina. Sellar a fuego alto primero.", tiempo:"30–40 min", temperatura:"Brasa alta para sellar, luego media", servir:"Cortar en medallones de 3 cm.", color:"#AE2012" },
  { id:"cuadril", nombre:"Cuadril", emoji:"🥩", descripcion:"Corte magro del cuarto trasero. Versátil y económico.", preparacion:"Pedir con la tapa de grasa. No quitar la grasa antes de cocinar.", tiempo:"40–50 min", temperatura:"Brasa media", servir:"Cortar fino en lonchas.", color:"#BB3E03" },
  { id:"colita-cuadril", nombre:"Colita de Cuadril", emoji:"🥩", descripcion:"Pequeño corte triangular, sabroso y económico.", preparacion:"Colocar el lado de la grasa hacia abajo los primeros 20 minutos.", tiempo:"35–45 min", temperatura:"Brasa media", servir:"Cortar en lonchas finas con chimichurri.", color:"#CA6702" },
  { id:"matambre", nombre:"Matambre", emoji:"🥩", descripcion:"Corte fino entre el cuero y las costillas. Muy popular relleno o enrollado. Desafío para el parrillero.", preparacion:"Aplanar bien. Se puede cocinar directo o relleno con huevo duro, morrón y verduras. Salar y llevar a brasa suave.", tiempo:"40–60 min", temperatura:"Brasa baja-media", servir:"Cortar en rodajas si está relleno. Solo con ensalada y limón. Excelente frío al día siguiente.", color:"#C0392B" },
  { id:"bife-chorizo", nombre:"Bife de Chorizo", emoji:"🥩", descripcion:"Corte premium del lomo bajo, con cobertura de grasa lateral. Jugoso, tierno y con sabor intenso.", preparacion:"Retirar del frío 1 hora antes. Sellar primero a fuego alto para formar costra. Salar solo al momento de poner en la parrilla.", tiempo:"15–25 min", temperatura:"Brasa alta para sellar, luego media", servir:"Servir entero o en dos mitades. Ideal con papas fritas y una copa de Malbec.", color:"#922B21" },
  { id:"ojo-bife", nombre:"Ojo de Bife", emoji:"🥩", descripcion:"La parte central del bife de costilla sin hueso. El corte más marmolado y sabroso del vacuno. Pura ternura.", preparacion:"Temperatura ambiente 1 hora antes. Sellar fuerte 2 min por lado. Nunca pinchar. Sal gruesa al final.", tiempo:"12–20 min", temperatura:"Brasa muy alta para sellar, luego media", servir:"Reposar 3 min antes de cortar. Solo sal gruesa y unas gotas de limón. No necesita nada más.", color:"#A93226" },
  { id:"tapa-asado", nombre:"Tapa de Asado", emoji:"🥩", descripcion:"La cobertura del costillar, muy jugosa y gelatinosa. Poco conocida pero muy apreciada por los entendidos.", preparacion:"Cocinar con el lado de la grasa hacia arriba primero. Dejar que la grasa se derrita lentamente. Salar generoso.", tiempo:"50–70 min", temperatura:"Brasa media-baja", servir:"Cortar en tiras contra la fibra. El líquido que suelta es oro. Mojar pan ahí.", color:"#B03A2E" },
];
const CORTES_CERDO = [
  { id:"bondiola", nombre:"Bondiola de Cerdo", emoji:"🐷", descripcion:"Corte graso del cuello del cerdo. Muy sabroso.", preparacion:"Marinar con ajo, pimentón y romero al menos 2 horas.", tiempo:"90–120 min", temperatura:"Brasa baja-media", servir:"Cortar en lonchas gruesas con mostaza.", color:"#D4A017" },
  { id:"costillas-cerdo", nombre:"Costillas de Cerdo", emoji:"🐷", descripcion:"Las clásicas ribs. Cocción lenta para lograr el caído del hueso.", preparacion:"Retirar membrana del revés. Marinar con miel y limón 12 horas.", tiempo:"120–180 min", temperatura:"Brasa muy baja", servir:"Cortar entre hueso y hueso.", color:"#E09F3E" },
  { id:"lomo-cerdo", nombre:"Lomo de Cerdo", emoji:"🐷", descripcion:"Corte magro y tierno. Cuidar la cocción para no resecar.", preparacion:"Envolver en panceta para mantener la humedad.", tiempo:"40–50 min", temperatura:"Brasa media", servir:"Cortar en medallones con manzana asada.", color:"#EE9B00" },
  { id:"matambre-cerdo", nombre:"Matambre de Cerdo", emoji:"🐷", descripcion:"Versión porcina del matambre. Más fino y rápido que el vacuno. Sabor suave y muy tierno cuando se hace bien.", preparacion:"Marinar con ajo, perejil, sal y pimienta al menos 1 hora. Se puede enrollar con morrón y aceitunas. Cocción indirecta.", tiempo:"30–45 min", temperatura:"Brasa media-baja", servir:"Cortar en rodajas. Ideal como entrada con un vaso de vino. Frío al día siguiente también está increíble.", color:"#E67E22" },
  { id:"pechito-cerdo", nombre:"Pechito de Cerdo", emoji:"🐷", descripcion:"Costillar de cerdo con mucha grasa entreverada. Súper jugoso y sabroso. Ideal para cocción lenta.", preparacion:"Marinar con chimichurri seco, pimentón y ajo. Dejar reposar en heladera 4 horas o toda la noche. Cocinar con el hueso hacia abajo.", tiempo:"60–90 min", temperatura:"Brasa baja", servir:"Cortar entre huesos. Se debe desprender solo. Servir con ensalada fresca y morrón asado.", color:"#D35400" },
];
const ACHURAS = [
  { id:"chorizos", nombre:"Chorizos", emoji:"🌭", descripcion:"El acompañante infaltable.", preparacion:"Pinchar con tenedor. Empezar a fuego bajo.", tiempo:"20–25 min", temperatura:"Brasa media", servir:"En pan con chimichurri. ¡El choripán!", color:"#94452A" },
  { id:"morcilla", nombre:"Morcilla", emoji:"🩸", descripcion:"Embutido de sangre cocida. Sabor intenso.", preparacion:"NO pinchar. Fuego muy bajo, dar vuelta con cuidado.", tiempo:"15–20 min", temperatura:"Brasa muy baja", servir:"Cortar en rodajas con pan y limón.", color:"#3D0C02" },
  { id:"mollejas", nombre:"Mollejas", emoji:"🫀", descripcion:"Glándula del timo. El corte más preciado.", preparacion:"Blanquear 5 min. Limpiar telillas. Salar y poner a la parrilla.", tiempo:"20–30 min", temperatura:"Brasa media-alta", servir:"Exprimir limón. Comer caliente inmediatamente.", color:"#6A040F" },
  { id:"chinchulines", nombre:"Chinchulines", emoji:"🔄", descripcion:"Intestino delgado trenzado. Crocante por fuera.", preparacion:"Limpiar muy bien. Trenzar. Marinar con limón y ajo.", tiempo:"45–60 min", temperatura:"Brasa media", servir:"Cortar en trozos con abundante limón.", color:"#7B2D00" },
  { id:"riñon", nombre:"Riñón", emoji:"🫘", descripcion:"Achura de sabor fuerte y característico. Para paladares audaces. Bien preparado es una delicia.", preparacion:"Limpiar muy bien quitando la membrana y los canalículos internos. Remojar en agua con limón 30 min. Salar y poner a brasa alta. NO cocinar de más.", tiempo:"10–15 min", temperatura:"Brasa alta", servir:"Cortar en rodajas gruesas. Exprimir limón generoso. Comer inmediatamente que pierden textura rápido.", color:"#884EA0" },
  { id:"provoleta", nombre:"Provoleta", emoji:"🧀", descripcion:"Queso provolone a la parrilla. La entrada perfecta de todo asado argentino. Crujiente por fuera, derretida por dentro.", preparacion:"Colocar directo sobre la parrilla fría mientras prende. El calor gradual hace la magia. Espolvorear orégano y ají molido. No mover hasta que esté dorada.", tiempo:"8–12 min", temperatura:"Brasa media", servir:"Servir en el mismo molde o tabla. Comer caliente con pan. Agregar aceite de oliva y tomate si se tiene.", color:"#F39C12" },
];
const PREMIUM_CORTES = [
  { id:"lechon", nombre:"Lechón", emoji:"🐷" },
  { id:"pollo", nombre:"Pollo", emoji:"🐔" },
  { id:"cordero", nombre:"Cordero", emoji:"🐑" },
  { id:"tbone", nombre:"T-Bone", emoji:"🦴" },
  { id:"picanha", nombre:"Picanha", emoji:"🥩" },
  { id:"morron", nombre:"Morrón", emoji:"🫑" },
  { id:"tomate", nombre:"Tomate", emoji:"🍅" },
  { id:"choclo", nombre:"Choclo", emoji:"🌽" },
];

// ── CORTE IMAGES ─────────────────────────────────────────────────
const _FB = "https://firebasestorage.googleapis.com/v0/b/asadapp-28206.firebasestorage.app/o/cortes%2F";
const _Q  = "?alt=media";
const CORTE_IMAGES = {
  "asado-tira":     `${_FB}asado-tira.jpg${_Q}`,
  "vacio":          `${_FB}vacio.jpg${_Q}`,
  "entraña":        `${_FB}entra%C3%B1a.jpg${_Q}`,
  "lomo":           `${_FB}lomo.jpg${_Q}`,
  "cuadril":        `${_FB}cuadril.jpg${_Q}`,
  "colita-cuadril": `${_FB}colita-cuadril.jpg${_Q}`,
  "matambre":       `${_FB}matambre.jpg${_Q}`,
  "bife-chorizo":   `${_FB}bife-chorizo.jpg${_Q}`,
  "ojo-bife":       `${_FB}ojo-bife.jpg${_Q}`,
  "tapa-asado":     `${_FB}tapa-asado.jpg${_Q}`,
  "bondiola":       `${_FB}bondiola.jpg${_Q}`,
  "costillas-cerdo":`${_FB}costillas-cerdo.jpg${_Q}`,
  "lomo-cerdo":     `${_FB}lomo-cerdo.jpg${_Q}`,
  "matambre-cerdo": `${_FB}matambre-cerdo.jpg${_Q}`,
  "pechito-cerdo":  `${_FB}pechito-cerdo.jpg${_Q}`,
  "chorizos":       `${_FB}chorizos.jpg${_Q}`,
  "morcilla":       `${_FB}morcilla.jpg${_Q}`,
  "mollejas":       `${_FB}mollejas.jpg${_Q}`,
  "chinchulines":   `${_FB}chinchulines.jpg${_Q}`,
  "riñon":          `${_FB}ri%C3%B1on.jpg${_Q}`,
  "provoleta":      `${_FB}provoleta.jpg${_Q}`,
};

const METODOS_FUEGO = [
  { id:"piramide", titulo:"Pirámide Clásica", emoji:"🔺", descripcion:"El método más usado. Apila el carbón en forma de pirámide dejando espacio para el aire. Enciende desde abajo con papel.", tiempo:"20–25 min", dificultad:"Fácil" },
  { id:"chimenea", titulo:"Chimenea de Carbón", emoji:"🏛️", descripcion:"Usa una chimenea metálica. La convección enciende el carbón uniformemente. El método más eficiente y limpio.", tiempo:"15–20 min", dificultad:"Muy Fácil" },
  { id:"minion", titulo:"Método Minion", emoji:"🌀", descripcion:"Para cocción larga. Carbón frío alrededor, brasa encendida en el centro. El carbón se enciende lentamente manteniendo temperatura constante.", tiempo:"4–6 horas", dificultad:"Intermedio" },
  { id:"leña", titulo:"Con Leña", emoji:"🪵", descripcion:"El método tradicional. Usa maderas duras como quebracho o espinillo. Nunca maderas resinosas. Da más aroma y sabor.", tiempo:"45–60 min", dificultad:"Avanzado" },
];
const SIMULACION_CORTES = [
  // ── VACUNO ──────────────────────────────────────────────────────
  { id:"asado-tira", nombre:"Asado de Tira", emoji:"🥩", color:"#8B1A1A", tiempo:75,
    eventos:[{min:0,msg:"Colocar con el hueso hacia abajo. Fuego medio-alto."},{min:15,msg:"Bajar la grilla 10 cm. El hueso debe estar dorándose."},{min:30,msg:"No mover aún. Escuchar el chisporroteo."},{min:45,msg:"Dar vuelta. Sal gruesa por arriba."},{min:60,msg:"Verificar cocción. Debe estar dorado y jugoso."},{min:75,msg:"¡LISTO! Reposar 5 min antes de cortar."}] },
  { id:"vacio", nombre:"Vacío", emoji:"🥩", color:"#7A1818", tiempo:55,
    eventos:[{min:0,msg:"Vacío con grasa hacia abajo. Brasa media."},{min:15,msg:"La grasa debe estar derritiéndose bien. Mantener."},{min:25,msg:"Dar vuelta. La grasa dorada es buena señal."},{min:40,msg:"Verificar punto apretando con el dedo."},{min:55,msg:"¡LISTO! Cortar en diagonal contra la fibra."}] },
  { id:"entraña", nombre:"Entraña", emoji:"🥩", color:"#9B2226", tiempo:20,
    eventos:[{min:0,msg:"Fuego alto. Entraña limpia sin membrana."},{min:6,msg:"Dar vuelta. Debe tener buen sellado."},{min:12,msg:"Verificar punto. Debe ceder al tacto."},{min:18,msg:"Casi lista. Retirar del fuego directo."},{min:20,msg:"¡LISTA! Cortar en tiras y servir de inmediato."}] },
  { id:"lomo", nombre:"Lomo", emoji:"🥩", color:"#AE2012", tiempo:35,
    eventos:[{min:0,msg:"Lomo a temperatura ambiente. Brasa alta. Sellar fuerte."},{min:4,msg:"Dar vuelta. Costra formada. Bajar a brasa media."},{min:15,msg:"Rotar 90°. Dorar parejo todo el cilindro."},{min:25,msg:"Verificar punto presionando. Debe ceder levemente."},{min:35,msg:"¡LISTO! Reposar 5 min tapado con papel aluminio."}] },
  { id:"cuadril", nombre:"Cuadril", emoji:"🥩", color:"#BB3E03", tiempo:45,
    eventos:[{min:0,msg:"Cuadril con la grasa hacia arriba. Brasa media."},{min:15,msg:"La grasa se está fundiendo. Bañá la carne con ella."},{min:25,msg:"Dar vuelta. Grasa hacia abajo ahora."},{min:38,msg:"Verificar cocción. Debe estar firme pero no duro."},{min:45,msg:"¡LISTO! Cortar fino en lonchas."}] },
  { id:"matambre", nombre:"Matambre", emoji:"🥩", color:"#C0392B", tiempo:50,
    eventos:[{min:0,msg:"Matambre bien aplanado. Brasa baja-media."},{min:12,msg:"Sin apuro. Cocción lenta es la clave."},{min:25,msg:"Dar vuelta con cuidado. Debe estar dorado."},{min:38,msg:"Verificar que esté cocido parejo en toda la superficie."},{min:50,msg:"¡LISTO! Dejar reposar 5 min. Cortar en rodajas."}] },
  { id:"bife-chorizo", nombre:"Bife de Chorizo", emoji:"🥩", color:"#922B21", tiempo:20,
    eventos:[{min:0,msg:"Bife a temperatura ambiente. Brasa muy alta. No tocar."},{min:3,msg:"Sellar el lado de la grasa parado en la parrilla 2 min."},{min:6,msg:"Dar vuelta. Costra dorada perfecta."},{min:12,msg:"Verificar punto presionando. Jugoso al tacto."},{min:20,msg:"¡LISTO! Reposar 3 min. Solo sal gruesa."}] },
  { id:"ojo-bife", nombre:"Ojo de Bife", emoji:"🥩", color:"#A93226", tiempo:16,
    eventos:[{min:0,msg:"Brasa muy alta. Ojo de bife directo. No mover."},{min:3,msg:"Dar vuelta. Costra perfecta."},{min:8,msg:"Bajar brasa a media. Terminar cocción suave."},{min:13,msg:"Verificar punto. Debe ser rosado en el centro."},{min:16,msg:"¡LISTO! Reposar 3 min. Unas gotas de limón."}] },
  { id:"tapa-asado", nombre:"Tapa de Asado", emoji:"🥩", color:"#B03A2E", tiempo:60,
    eventos:[{min:0,msg:"Tapa con la grasa hacia arriba. Brasa media-baja."},{min:15,msg:"La grasa se va derritiendo. Baña la carne sola."},{min:30,msg:"Dar vuelta. La grasa hacia abajo ahora."},{min:45,msg:"Verificar cocción. Debe estar tierna al pinchar."},{min:60,msg:"¡LISTA! Cortar contra la fibra. El jugo es oro."}] },
  { id:"colita-cuadril", nombre:"Colita de Cuadril", emoji:"🥩", color:"#CA6702", tiempo:40,
    eventos:[{min:0,msg:"Grasa hacia abajo primero. Brasa media."},{min:15,msg:"Dar vuelta. La grasa está dorada."},{min:28,msg:"Verificar punto. Debe estar firme con algo de jugo."},{min:40,msg:"¡LISTA! Cortar en lonchas finas."}] },
  // ── CERDO ───────────────────────────────────────────────────────
  { id:"bondiola", nombre:"Bondiola", emoji:"🐷", color:"#D4A017", tiempo:90,
    eventos:[{min:0,msg:"Bondiola marinada. Fuego bajo. Tapa cerrada."},{min:20,msg:"Dar vuelta. Color dorado. Mantener fuego bajo."},{min:40,msg:"Rociar con la marinada. Subir fuego levemente."},{min:60,msg:"Dar vuelta nuevamente. Perfumar con romero."},{min:75,msg:"Casi lista. Verificar temperatura interna."},{min:90,msg:"¡LISTA! Reposar 10 min. Cortar en lonchas gruesas."}] },
  { id:"costillas-cerdo", nombre:"Costillas de Cerdo", emoji:"🐷", color:"#E09F3E", tiempo:150,
    eventos:[{min:0,msg:"Costillas con el hueso hacia abajo. Brasa muy baja."},{min:30,msg:"Sin prisa. La paciencia hace la diferencia."},{min:60,msg:"Dar vuelta con cuidado. Deben estar doradas abajo."},{min:90,msg:"Rociar con la marinada. El aroma es increíble."},{min:120,msg:"Verificar que la carne se despegue del hueso."},{min:150,msg:"¡LISTAS! Se deben desprender solas. A disfrutar."}] },
  { id:"lomo-cerdo", nombre:"Lomo de Cerdo", emoji:"🐷", color:"#EE9B00", tiempo:45,
    eventos:[{min:0,msg:"Lomo de cerdo envuelto en panceta. Brasa media."},{min:12,msg:"La panceta se está dorando. Dar vuelta."},{min:25,msg:"Rotar para dorar parejo. Brasa no muy alta."},{min:38,msg:"Verificar cocción. Importante: cerdo debe estar bien cocido."},{min:45,msg:"¡LISTO! Reposar 5 min. Cortar en medallones."}] },
  { id:"matambre-cerdo", nombre:"Matambre de Cerdo", emoji:"🐷", color:"#E67E22", tiempo:38,
    eventos:[{min:0,msg:"Matambre de cerdo marinado. Brasa media-baja."},{min:10,msg:"Cocción pareja. No apurar el fuego."},{min:20,msg:"Dar vuelta. Debe estar dorado prolijo."},{min:30,msg:"Verificar que esté cocido en toda la superficie."},{min:38,msg:"¡LISTO! Cortar en rodajas. Ideal como entrada."}] },
  { id:"pechito-cerdo", nombre:"Pechito de Cerdo", emoji:"🐷", color:"#D35400", tiempo:75,
    eventos:[{min:0,msg:"Pechito con el hueso hacia abajo. Brasa baja."},{min:20,msg:"La grasa empieza a derretirse. Buen signo."},{min:40,msg:"Dar vuelta. Dorado abajo. Subir brasa levemente."},{min:58,msg:"Verificar que la carne se despegue del hueso."},{min:75,msg:"¡LISTO! Debe desprenderse solo. Cortar entre huesos."}] },
  // ── ACHURAS ─────────────────────────────────────────────────────
  { id:"chorizos", nombre:"Chorizos", emoji:"🌭", color:"#94452A", tiempo:25,
    eventos:[{min:0,msg:"Pinchar los chorizos con tenedor. Fuego bajo."},{min:8,msg:"Dar vuelta. Deben estar dorados de un lado."},{min:15,msg:"Girar un cuarto. Dorar todos los lados."},{min:20,msg:"Subir fuego 2 minutos para dorar la piel."},{min:25,msg:"¡LISTOS! Servir en pan con chimichurri."}] },
  { id:"morcilla", nombre:"Morcilla", emoji:"🩸", color:"#3D0C02", tiempo:18,
    eventos:[{min:0,msg:"NO pinchar la morcilla. Fuego muy bajo."},{min:6,msg:"Dar vuelta con mucho cuidado. Tiene que estar entera."},{min:12,msg:"Girar para dorar el otro lado."},{min:18,msg:"¡LISTA! Cortar en rodajas y servir con pan."}] },
  { id:"mollejas", nombre:"Mollejas", emoji:"🫀", color:"#6A040F", tiempo:30,
    eventos:[{min:0,msg:"Mollejas limpias y blanqueadas. Fuego medio-alto."},{min:10,msg:"Dar vuelta. Deben estar crocantes por abajo."},{min:20,msg:"Girar para dorar todos los lados."},{min:25,msg:"Agregar sal y exprimir limón."},{min:30,msg:"¡LISTAS! Servir inmediatamente con limón."}] },
  { id:"chinchulines", nombre:"Chinchulines", emoji:"🔄", color:"#7B2D00", tiempo:50,
    eventos:[{min:0,msg:"Chinchulines trenzados. Brasa media. Paciencia."},{min:15,msg:"No apurar. Cocción lenta para quedar crocantes."},{min:28,msg:"Dar vuelta. Deben estar dorados y tirantes."},{min:40,msg:"Subir brasa. Los últimos minutos hacen la crocancia."},{min:50,msg:"¡LISTOS! Cortar en trozos y exprimir mucho limón."}] },
  { id:"riñon", nombre:"Riñón", emoji:"🫘", color:"#884EA0", tiempo:12,
    eventos:[{min:0,msg:"Riñones limpios. Brasa alta. Cocción rápida."},{min:4,msg:"Dar vuelta. Deben sellar rápido."},{min:8,msg:"Verificar cocción. No deben quedar crudos adentro."},{min:12,msg:"¡LISTOS! Exprimir limón generoso. Comer ya."}] },
  { id:"provoleta", nombre:"Provoleta", emoji:"🧀", color:"#F39C12", tiempo:10,
    eventos:[{min:0,msg:"Provoleta directo sobre la parrilla. Fuego medio."},{min:3,msg:"Ya debe estar perfumando. No tocar."},{min:6,msg:"Cuando los bordes burbujean está casi lista."},{min:8,msg:"Agregar orégano y ají molido arriba."},{min:10,msg:"¡LISTA! Servir en el acto con pan. No esperar."}] },
  // ── VIP (premium) ───────────────────────────────────────────────
  { id:"lechon",  nombre:"Lechón",    emoji:"🐷", color:"#c0392b", tiempo:180, vip:true, eventos:[{min:0,msg:"VIP: Lechón al asador. Brasa baja y paciencia."},{min:60,msg:"Rociar con grasa. El cuero debe ir dorándose."},{min:120,msg:"Dar vuelta completo. El aroma lo dice todo."},{min:180,msg:"¡LISTO! El cuero debe crujir al golpear."}] },
  { id:"pollo",   nombre:"Pollo",     emoji:"🐔", color:"#e67e22", tiempo:60,  vip:true, eventos:[{min:0,msg:"VIP: Pollo mariposa. Brasa media. Hueso hacia abajo."},{min:20,msg:"Dar vuelta. Piel hacia abajo ahora."},{min:40,msg:"Rociar con chimichurri. Verificar cocción."},{min:60,msg:"¡LISTO! Jugo transparente al pinchar: listo."}] },
  { id:"cordero", nombre:"Cordero",   emoji:"🐑", color:"#8e44ad", tiempo:90,  vip:true, eventos:[{min:0,msg:"VIP: Cordero al palo. Brasa baja constante."},{min:30,msg:"Girar. El aroma a tomillo es increíble."},{min:60,msg:"Pinchar: debe estar tierno. Casi listo."},{min:90,msg:"¡LISTO! Reposar 10 min. Servir con menta."}] },
  { id:"picanha", nombre:"Picanha",   emoji:"🥩", color:"#922b21", tiempo:35,  vip:true, eventos:[{min:0,msg:"VIP: Picanha con grasa hacia arriba. Brasa alta."},{min:8,msg:"Dar vuelta. La grasa se derrite sola."},{min:20,msg:"Sellar fuerte los últimos minutos."},{min:35,msg:"¡LISTA! Cortar en contra de la fibra en tiras."}] },
];
const COCCION_MULT = { crudo:0.78, punto:1.0, cocido:1.25 }; // crudo=menos tiempo, cocido=más tiempo
const COCCION_LABELS = { crudo:"Jugoso", punto:"A Punto", cocido:"Bien Cocido" };
const COCCION_COLORS = { crudo:"#e53935", punto:"#ff8c42", cocido:"#795548" };
const ALTURA_SCHEDULE = [{min:0,cm:25},{min:15,cm:20},{min:30,cm:15},{min:50,cm:20}];
const CARBON_NOTIFS = {
  adjustable:[{min:20,msg:"Revisá el carbón. Si las brasas bajan, agregá un puñado por el costado."},{min:45,msg:"Control de carbón: mantené la brasa pareja para los cortes largos."},{min:70,msg:"Última revisión de carbón. Asegurate tener brasa suficiente."}],
  fixed:[{min:15,msg:"Parrilla fija: revisá las brasas. El carbón debe estar siempre parejo."},{min:35,msg:"Control de carbón. Mantener calor uniforme es clave."},{min:60,msg:"Revisión de brasas. Distribuí el carbón de manera pareja."}],
};
const AVATAR_OPTIONS = ["🧑‍🍳","👨‍🍳","👩‍🍳","🤠","😎","🐂","🔥","⚡"];

// ── UTILS ─────────────────────────────────────────────────────────
function getAlturaAt(mins, tipo) {
  if (tipo === "fixed") return 15;
  let cm = 25;
  for (const h of ALTURA_SCHEDULE) { if (mins >= h.min) cm = h.cm; else break; }
  return cm;
}
function buildEvents(selected, coccion, tipoParrilla, tiempoMult=1, aprendizaje={}) {
  // Each cut can have its own personal multiplier
  const getCutMult = (c) => (aprendizaje[c.nombre]?.[tipoParrilla] || 1) * tiempoMult * COCCION_MULT[coccion];
  const mult = COCCION_MULT[coccion] * tiempoMult; // fallback for non-cut events
  const events = [];
  selected.forEach(c => c.eventos.forEach(ev => {
    const m = Math.round(ev.min * getCutMult(c));
    events.push({ key:`${c.id}-${m}`, min:m, emoji:c.emoji, label:c.nombre, msg:ev.msg, color:c.color });
  }));
  if (tipoParrilla === "adjustable") {
    ALTURA_SCHEDULE.slice(1).forEach(h => {
      events.push({ key:`alt-${h.min}`, min:h.min, emoji:"📏", label:"Grilla", msg:`Ajustá la grilla a ${h.cm} cm del fuego.`, color:"#4fc3f7" });
    });
  }
  const maxTime = selected.length > 0 ? Math.max(...selected.map(c => Math.round(c.tiempo * getCutMult(c)))) : 0;
  CARBON_NOTIFS[tipoParrilla].forEach(cn => {
    if (cn.min < maxTime) events.push({ key:`carbon-${cn.min}`, min:cn.min, emoji:"🪨", label:"Carbón", msg:cn.msg, color:"#78909c" });
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
const TITLE = lvl => ["Encendedor","Fogonero","Parrillero","Maestro","Gran Maestro","Leyenda de la Parrilla"][Math.min(lvl-1,5)];
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
input[type=range] { width:100%; accent-color:#ff8c42; }
::-webkit-scrollbar { width:3px } ::-webkit-scrollbar-track { background:#0d0a07 } ::-webkit-scrollbar-thumb { background:#3a2010; border-radius:2px }
`;

// ── LOCALSTORAGE ──────────────────────────────────────────────────
// ── FIREBASE HELPERS ─────────────────────────────────────────────
const DEFAULT_CONFIG = { idioma:'es', tiempoMult:100, vozSimulacion:false, notifSonido:true, voiceIndex:0, chistes:true };
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
          config: next.config || DEFAULT_CONFIG,
          aprendizaje: next.aprendizaje || {},
        });
      }
      return next;
    });
  }, [authUser]);

  const saveAsado = useCallback(async (asado) => {
    if (!authUser) return;
    let asadoToSave = { ...asado };
    // Upload photo to Storage if base64
    if (asado.foto && asado.foto.startsWith("data:")) {
      const tempId = `asado_${Date.now()}`;
      const fotoUrl = await fbUploadFoto(authUser.uid, tempId, asado.foto);
      asadoToSave = { ...asado, foto: fotoUrl || null };
    }
    const newId = await fbSaveAsado(authUser.uid, asadoToSave);
    setStore(prev => {
      const aprendizaje = actualizarAprendizajeLocal(prev, asadoToSave);
      const newStore = { ...prev, asados:[...prev.asados, { ...asadoToSave, id: newId || asado.id }], aprendizaje };
      // Persist aprendizaje back to Firestore
      if (authUser) fbSaveProfile(authUser.uid, { aprendizaje });
      return newStore;
    });
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
    if (screen === "preparaciones") return <Preparaciones go={go} idioma={idioma} />;
    if (screen === "fuego")   return <Fuego go={go} idioma={idioma} />;
    if (screen === "simulacion") return <Simulacion store={store} persist={persist} go={go} setPendingAsado={setPendingAsado} tiempoMult={(store.config?.tiempoMult||100)/100} idioma={idioma} aprendizaje={store.aprendizaje||{}} chistesOn={store.config?.chistes !== false} />;
    if (screen === "rating")  return <RatingScreen store={store} persist={persist} go={go} pendingAsado={pendingAsado} setPendingAsado={setPendingAsado} saveAsado={saveAsado} idioma={idioma} aprendizaje={store.aprendizaje||{}} />;
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
              <div style={{ color:"#8b7355", fontSize:11 }}>Nv.{lvl} · {TITLE(lvl)}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => go("historial")} style={{ background:"#1a1005", border:"1px solid #2a1a0a", borderRadius:10, padding:"6px 12px", color:"#ff8c42", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              📋 {asados.length}
            </button>
            {!store.config?.premium && (
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
function Preparaciones({ go, idioma='es' }) {
  const [tab, setTab] = useState("vacuno");
  const [sel, setSel] = useState(null);
  const allCortes = { vacuno:CORTES_VACUNO, cerdo:CORTES_CERDO, achuras:ACHURAS };
  if (sel) return <CorteDetail corte={sel} onBack={() => setSel(null)} />;
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
            <div style={{ background:"linear-gradient(135deg,#2d1f00,#1a1200)", border:"1px solid #ff8c42", borderRadius:16, padding:18, marginBottom:14, textAlign:"center" }}>
              <div style={{ fontSize:30, marginBottom:6 }}>⭐</div>
              <div style={{ color:"#ff8c42", fontSize:17, fontWeight:700, marginBottom:8 }}>{t(idioma,"premium_title")}</div>
              <div style={{ color:"#8b7355", fontSize:13, lineHeight:1.6, marginBottom:14 }}>{t(idioma,"premium_desc")}</div>
              <button onClick={() => go("premium")} style={{ background:"linear-gradient(135deg,#ffd700,#ff8c42)", border:"none", borderRadius:12, padding:"11px 28px", color:"#1a0a00", fontWeight:900, fontSize:14, cursor:"pointer" }}>{t(idioma,"premium_btn")}</button>
            </div>
            {PREMIUM_CORTES.map(c => (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 15px", background:"#1a1005", borderRadius:12, marginBottom:8, border:"1px solid #2a1a0a", opacity:.55 }}>
                <span style={{ fontSize:26 }}>{c.emoji}</span>
                <span style={{ color:"#8b7355", fontSize:14 }}>{c.nombre}</span>
                <span style={{ marginLeft:"auto", color:"#ff8c42" }}>🔒</span>
              </div>
            ))}
          </div>
        ) : (
          cortesList.map((c, i) => (
            <button key={c.id} onClick={() => setSel(c)} style={{ width:"100%", display:"flex", alignItems:"center", gap:13, padding:"13px 15px", background:"#1a1005", borderRadius:14, marginBottom:9, border:`1px solid ${c.color}33`, cursor:"pointer", textAlign:"left", animation:`slideUp .3s ease ${i*.05}s both` }}>
              <div style={{ width:50, height:50, background:`${c.color}22`, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0, border:`1px solid ${c.color}33` }}>{c.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ color:"#f0e6d3", fontSize:14, fontWeight:700 }}>{c.nombre}</div>
                <div style={{ color:"#8b7355", fontSize:11, marginTop:2 }}>⏱ {c.tiempo}</div>
                <div style={{ color:"#5a4a32", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:200 }}>{c.descripcion}</div>
              </div>
              <div style={{ color:c.color, fontSize:18 }}>›</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
function CorteDetail({ corte, onBack, idioma='es' }) {
  const [imgOk, setImgOk] = useState(true);
  const rows = [[t(idioma,"prep_detail_preparacion"), corte.preparacion], [t(idioma,"prep_detail_tiempo"), corte.tiempo], [t(idioma,"prep_detail_temp"), corte.temperatura], [t(idioma,"prep_detail_servir"), corte.servir]];
  const imgUrl = CORTE_IMAGES[corte.id];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Hero — real photo or gradient fallback */}
      <div style={{ height:220, position:"relative", flexShrink:0, overflow:"hidden" }}>
        {imgUrl && imgOk ? (
          <>
            <img
              src={imgUrl}
              alt={corte.nombre}
              onError={() => setImgOk(false)}
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
            />
            {/* gradient overlay so text is readable */}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,.0) 40%,rgba(13,10,7,.95) 100%)" }} />
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
            ⏱ {corte.tiempo} · {corte.temperatura}
          </div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 36px" }}>
        <p style={{ color:"#c9b49a", fontSize:13, lineHeight:1.7, marginBottom:16 }}>{corte.descripcion}</p>
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
                <div style={{ color:"#f0e6d3", fontSize:14, fontWeight:700 }}>{m.titulo}</div>
                <div style={{ display:"flex", gap:8, marginTop:3 }}>
                  <span style={{ background:"#ff8c4222", color:"#ff8c42", fontSize:10, padding:"2px 8px", borderRadius:6, fontWeight:600 }}>{m.dificultad}</span>
                  <span style={{ color:"#6b5a3e", fontSize:11 }}>⏱ {m.tiempo}</span>
                </div>
              </div>
            </div>
            <p style={{ color:"#8b7355", fontSize:12, lineHeight:1.65, margin:0 }}>{m.descripcion}</p>
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
            Comprá siempre un 10–15% extra por las dudas. Para {comensales} persona{comensales !== 1 ? "s" : ""}, llevá <span style={{ color:"#ff8c42", fontWeight:700 }}>{Math.ceil(+carbonKg * 1.15 * 10) / 10} kg</span> si querés tener margen.
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
          {Object.entries(COCCION_LABELS).map(([k, lbl]) => (
            <button key={k} onClick={() => setCoccion(k)} style={{ flex:1, padding:"10px 4px", background:coccion===k?`${COCCION_COLORS[k]}33`:"#0d0a07", border:`2px solid ${coccion===k?COCCION_COLORS[k]:"#2a1a0a"}`, borderRadius:10, cursor:"pointer", color:coccion===k?COCCION_COLORS[k]:"#555", fontSize:10, fontWeight:700, textAlign:"center", transition:"all .2s" }}>
              <div style={{ fontSize:18, marginBottom:3 }}>{k==="crudo"?"🔴":k==="punto"?"🟠":"🟤"}</div>
              {lbl}
            </button>
          ))}
        </div>
        <div style={{ color:"#555", fontSize:11, marginTop:8, textAlign:"center" }}>
          {coccion==="crudo" ? "Tiempos +25% — Centro rosado" : coccion==="punto" ? "Tiempos estándar — El clásico" : "Tiempos −22% — Bien cocido"}
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
  const tips = ["✅ Sal gruesa sobre los cortes", "✅ Carne a temperatura ambiente (30 min fuera del frío)", "✅ Parrilla limpia y seca", tipoParrilla==="adjustable" ? "✅ Grilla en posición ALTA (25 cm del fuego)" : "✅ Parrilla fija posicionada (15 cm del fuego)"];
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
          📏 Altura inicial: {tipoParrilla==="adjustable" ? "25 cm del fuego" : "15 cm (fija)"}
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
      <div style={{ color:"#ff8c42", fontSize:13, fontWeight:700, marginBottom:10 }}>⚡ Cortes</div>
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
      <div style={{ color:"#ff8c42", fontSize:13, fontWeight:700, marginBottom:8 }}>🥩 Punto</div>
      <div style={{ display:"flex", gap:7, marginBottom:14 }}>
        {Object.entries(COCCION_LABELS).map(([k, lbl]) => (
          <button key={k} onClick={() => setCoccion(k)} style={{ flex:1, padding:"8px 4px", background:coccion===k?`${COCCION_COLORS[k]}33`:"#1a1005", border:`2px solid ${coccion===k?COCCION_COLORS[k]:"#2a1a0a"}`, borderRadius:10, cursor:"pointer", color:coccion===k?COCCION_COLORS[k]:"#555", fontSize:10, fontWeight:700 }}>
            {k==="crudo" ? "🔴" : k==="punto" ? "🟠" : "🟤"} {lbl}
          </button>
        ))}
      </div>
      <div style={{ color:"#ff8c42", fontSize:13, fontWeight:700, marginBottom:8 }}>📏 Parrilla</div>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {[{id:"adjustable",label:"⬆️⬇️ Graduable"},{id:"fixed",label:"🔒 Fija"}].map(opt => (
          <button key={opt.id} onClick={() => setTipoParrilla(opt.id)} style={{ flex:1, padding:10, background:tipoParrilla===opt.id?"#ff8c4222":"#1a1005", border:`2px solid ${tipoParrilla===opt.id?"#ff8c42":"#2a1a0a"}`, borderRadius:10, cursor:"pointer", color:tipoParrilla===opt.id?"#ff8c42":"#555", fontSize:11, fontWeight:700 }}>
            {opt.label}
          </button>
        ))}
      </div>
      <div style={{ background:"#1a1005", borderRadius:12, padding:13, border:"1px solid #2a1a0a", marginBottom:14 }}>
        <div style={{ color:"#ff8c42", fontSize:13, fontWeight:700, marginBottom:5 }}>🔥 ¿El fuego está listo y la carne en la parrilla?</div>
        <div style={{ color:"#6b5a3e", fontSize:12 }}>Brasas blancas, sin llama, cortes apoyados.</div>
      </div>
      <SimBtn label={`⚡ Iniciar${selected.length > 0 ? ` (${selected.length} corte${selected.length > 1 ? "s" : ""})` : " (todos los cortes)"}`} onClick={startGrilling} />
    </div>
  );
}

function SimGrilling({ selected, mins, secs, progress, currentAltura, tipoParrilla, coccion, activeNotif, notifs, step, onDone, onReset, vozActiva, setVozActiva, idioma="es", aprendizaje={}, tiempoMultGlobal=1 }) {
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
            <div style={{ color:COCCION_COLORS[coccion], fontSize:9, fontWeight:700 }}>COCCIÓN</div>
            <div style={{ color:COCCION_COLORS[coccion], fontSize:11, fontWeight:700 }}>{COCCION_LABELS[coccion]}</div>
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
      <CameraAnalysis cortes={selected.map(c => c.nombre)} idioma={idioma} />
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
    const baseEvents = buildEvents(use, coccion, tipoParrilla, tiempoMult, aprendizaje);
    const maxT = use.length > 0 ? Math.max(...use.map(c => Math.round(c.tiempo * COCCION_MULT[coccion] * (aprendizaje[c.nombre]?.[tipoParrilla]||1) * tiempoMult))) : 60;
    const allEvents = chistesOn
      ? [...baseEvents, ...buildChisteEvents(maxT, idioma)].sort((a,b)=>a.min-b.min)
      : baseEvents;
    setEventList(allEvents);
    eventListRef.current = allEvents;
    firedKeysRef.current = new Set();
    setTimer(0); setNotifs([]); setFiredKeys(new Set()); setActiveNotif(null);
    setStep("grilling");
  };

  const resetSim = () => {
    clearInterval(intervalRef.current);
    firedKeysRef.current = new Set();
    eventListRef.current = [];
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
    intervalRef.current = setInterval(() => {
      setTimer(t => {
        const newT = t + 1;
        const newMin = Math.floor(newT / 60);
        if (newT % 60 === 0) {
          const toFire = eventListRef.current.filter(ev => ev.min === newMin && !firedKeysRef.current.has(ev.key));
          toFire.forEach(ev => {
            firedKeysRef.current.add(ev.key);
            const n = { ...ev, time:newMin, id:`${ev.key}-t${newT}` };
            setNotifs(ns => [n, ...ns.slice(0, 14)]);
            setActiveNotif(n);
            speak(`${ev.label}. ${ev.msg}`, idioma);
            setTimeout(() => setActiveNotif(null), 5000);
          });
        }
        if (newMin >= maxTime && maxTime > 0) { clearInterval(intervalRef.current); setStep("done"); }
        return newT;
      });
    }, 100);
    return () => clearInterval(intervalRef.current);
  }, [step, maxTime]);

  const badge = mode ? (
    <div style={{ background:mode==="pro"?"#ff8c4222":"#4caf5022", border:`1px solid ${mode==="pro"?"#ff8c42":"#4caf50"}`, borderRadius:20, padding:"3px 12px", color:mode==="pro"?"#ff8c42":"#4caf50", fontSize:11, fontWeight:700 }}>
      {mode === "pro" ? "⚡ PRO" : "📖 PRINCIPIANTE"}
    </div>
  ) : null;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>
      <Hdr title="Simulación" sub="ASADO INTERACTIVO" onBack={() => {
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
      {step === "select"        && <SimSelectCortes idioma={idioma} selected={selected} toggleSel={toggleSel} coccion={coccion} setStep={setStep} aprendizaje={aprendizaje} tipoParrilla={tipoParrilla} isPremium={store.config?.premium||false} onGoPremium={() => { resetSim(); go("premium"); }} />}
      {step === "config"        && <SimConfig idioma={idioma} coccion={coccion} setCoccion={setCoccion} tipoParrilla={tipoParrilla} setTipoParrilla={setTipoParrilla} setStep={setStep} />}
      {step === "fireCheck"     && <SimFireCheck idioma={idioma} tipoParrilla={tipoParrilla} setStep={setStep} />}
      {step === "placeCortes"   && <SimPlaceCortes idioma={idioma} selected={selected} coccion={coccion} tipoParrilla={tipoParrilla} startGrilling={startGrilling} aprendizaje={aprendizaje} />}
      {step === "fireCheckPro"  && <SimProFlow idioma={idioma} selected={selected} toggleSel={toggleSel} coccion={coccion} setCoccion={setCoccion} tipoParrilla={tipoParrilla} setTipoParrilla={setTipoParrilla} startGrilling={startGrilling} aprendizaje={aprendizaje} />}
      {(step === "grilling" || step === "done") && <SimGrilling idioma={idioma} selected={selected} mins={mins} secs={secs} progress={progress} currentAltura={currentAltura} tipoParrilla={tipoParrilla} coccion={coccion} activeNotif={activeNotif} notifs={notifs} step={step} onDone={handleDone} onReset={resetSim} vozActiva={vozActiva} setVozActiva={setVozActiva} aprendizaje={aprendizaje} tiempoMultGlobal={tiempoMult} />}
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
function CameraAnalysis({ cortes, idioma }) {
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

function RatingScreen({ store, persist, go, pendingAsado, setPendingAsado, saveAsado, idioma="es", aprendizaje={} }) {
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
      setFotoAnalisisLoading(true);
      const res = await analizarFotoAsado(dataUrl, pendingAsado?.cortes, idioma);
      setFotoAnalisis(res);
      setFotoAnalisisLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const guardar = () => {
    if (!rating || saved) return;
    const asado = { ...pendingAsado, rating, nota, foto };
    saveAsado ? saveAsado(asado) : persist(prev => ({ ...prev, asados:[...prev.asados, asado] }));
    if (rating === "perfecto") setShowConfetti(true);
    setSaved(true);
    setTimeout(() => { setPendingAsado(null); go("historial"); }, rating==="perfecto" ? 2400 : 1400);
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
          <div style={{ color:"#8b7355", fontSize:11, marginBottom:10 }}>{t(idioma,"cortes_hoy")} · {COCCION_LABELS[pendingAsado.coccion]} · {pendingAsado.tipoParrilla==="adjustable"?"Parrilla graduable":"Parrilla fija"}</div>
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
              <div style={{ position:"absolute", top:8, left:8, background:"#4caf50", borderRadius:6, padding:"3px 8px", fontSize:10, fontWeight:700, color:"white" }}>✨ AI</div>
            </div>
            {fotoAnalisisLoading && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
                {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:"#4caf50", animation:`bounce ${0.5+i*0.15}s ease-in-out infinite alternate` }} />)}
                <span style={{ color:"#4caf50", fontSize:11 }}>{idioma==="en" ? "Claude is analyzing the photo…" : "Claude está analizando la foto…"}</span>
              </div>
            )}
            {fotoAnalisis && (
              <div style={{ marginTop:10, background:"linear-gradient(135deg,#0d1a0d,#122012)", border:"1px solid #4caf5044", borderRadius:12, padding:"12px 14px", animation:"popIn .3s ease" }}>
                <div style={{ color:"#4caf50", fontSize:10, fontWeight:700, marginBottom:6 }}>🧠 {idioma==="en" ? "Claude says:" : "Claude dice:"}</div>
                <div style={{ color:"#c9b49a", fontSize:13, lineHeight:1.6 }}>{fotoAnalisis}</div>
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
              <div style={{ color:COCCION_COLORS[a.coccion], fontSize:13, fontWeight:600 }}>{COCCION_LABELS[a.coccion]}</div>
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
                  <span style={{ background:"#1a1a0a", borderRadius:6, padding:"2px 7px", color:"#555", fontSize:10 }}>{COCCION_LABELS[a.coccion]}</span>
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

  const levels = ["Encendedor 🔥","Fogonero 🪵","Parrillero 🥩","Maestro ⚡","Gran Maestro 🏆","Leyenda 🌟"];

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
              <div style={{ color:"#8b7355", fontSize:13, marginTop:4 }}>{t(idioma,"nivel")} {lvl} · {TITLE(lvl)}</div>
              <div style={{ color:"#555", fontSize:11, marginTop:2 }}>{t(idioma,"desde")} {dateStr(user?.joinedAt || Date.now())}</div>
            </div>
          )}
        </div>
        {!editando && (
          <div>
            <div style={{ background:"#1a1005", borderRadius:16, padding:16, marginBottom:14, border:"1px solid #2a1a0a" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <div>
                  <div style={{ color:"#ff8c42", fontSize:22, fontWeight:900 }}>Nv.{lvl}</div>
                  <div style={{ color:"#8b7355", fontSize:12 }}>{TITLE(lvl)}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:"#ff8c42", fontSize:16, fontWeight:700 }}>{xpCur} XP</div>
                  <div style={{ color:"#555", fontSize:11 }}>de {xpNeed} para Nv.{lvl+1}</div>
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
              📋 Ver historial completo
            </button>
            <button onClick={() => signOut(auth)} style={{ width:"100%", padding:11, background:"none", border:"1px solid #ff8c4244", borderRadius:14, color:"#ff8c42", fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:10 }}>
              🚪 Cerrar sesión
            </button>
            <button onClick={() => { if (window.confirm("¿Borrar todos los datos y empezar de cero?")) { signOut(auth); } }} style={{ width:"100%", padding:11, background:"none", border:"1px solid #2a1a0a", borderRadius:14, color:"#3a2a1a", fontSize:12, cursor:"pointer" }}>
              🗑 Borrar cuenta y datos
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
  const features = [
    ["🥩","Cortes VIP","Picanha, Lechón, Cordero, Pollo y más en la simulación"],
    ["🧠","IA sin límites","Aprendizaje acelerado con análisis completo de cada asado"],
    ["📊","Estadísticas avanzadas","Gráficos de progreso, racha de asados perfectos y más"],
    ["🔊","Voz personalizada","Todas las voces disponibles para las notificaciones"],
    ["😄","Chistes premium","Banco exclusivo de 50+ chistes del asador"],
    ["☁️","Sync en la nube","Tu historial en todos tus dispositivos (próximamente)"],
  ];
  const activate = () => {
    // Simulate purchase — in real app this calls payment API
    persist(prev => ({ ...prev, config:{ ...prev.config, premium:true } }));
  };
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#0d0a07" }}>
      {/* Header */}
      <div style={{ padding:"48px 22px 20px", background:"linear-gradient(180deg,#2d1200,#1a0800,#0d0a07)", flexShrink:0 }}>
        <button onClick={() => go("home")} style={{ background:"none", border:"none", color:"#ff8c42", fontSize:24, cursor:"pointer", marginBottom:12, padding:0 }}>‹</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:8 }}>⭐</div>
          <div style={{ fontFamily:"'Playfair Display',serif", color:"#ff8c42", fontSize:26, fontWeight:900 }}>Parrilla Maestro</div>
          <div style={{ fontFamily:"'Playfair Display',serif", color:"#ffd700", fontSize:20, fontWeight:700 }}>Premium</div>
          <div style={{ color:"#8b7355", fontSize:13, marginTop:6 }}>{idioma==="en"?"Everything unlocked. No limits.":"Todo desbloqueado. Sin límites."}</div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"0 18px 32px" }}>
        {isPremium ? (
          <div style={{ textAlign:"center", padding:"40px 20px" }}>
            <div style={{ fontSize:60, marginBottom:16 }}>🏆</div>
            <div style={{ fontFamily:"'Playfair Display',serif", color:"#ffd700", fontSize:22, fontWeight:900, marginBottom:8 }}>
              {idioma==="en"?"You're Premium!":"¡Sos Premium!"}
            </div>
            <div style={{ color:"#8b7355", fontSize:14, lineHeight:1.7 }}>
              {idioma==="en"?"All features unlocked. Enjoy the full experience.":"Todas las funciones desbloqueadas. Disfrutá la experiencia completa."}
            </div>
          </div>
        ) : (
          <>
            {/* Features list */}
            <div style={{ marginBottom:20 }}>
              {features.map(([em, title, desc]) => (
                <div key={title} style={{ display:"flex", gap:14, padding:"12px 0", borderBottom:"1px solid #1a1a0a" }}>
                  <div style={{ width:40, height:40, background:"#ff8c4222", borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{em}</div>
                  <div>
                    <div style={{ color:"#f0e6d3", fontSize:13, fontWeight:700 }}>{title}</div>
                    <div style={{ color:"#6b5a3e", fontSize:11, marginTop:2, lineHeight:1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pricing */}
            <div style={{ background:"linear-gradient(135deg,#2d1f00,#1a1200)", borderRadius:20, padding:20, border:"1px solid #ff8c4244", marginBottom:14, textAlign:"center" }}>
              <div style={{ color:"#8b7355", fontSize:12, marginBottom:4 }}>{idioma==="en"?"One simple price":"Un precio simple"}</div>
              <div style={{ color:"#ffd700", fontSize:40, fontWeight:900, lineHeight:1 }}>$2.99</div>
              <div style={{ color:"#8b7355", fontSize:12, marginTop:4 }}>{idioma==="en"?"/ month · cancel anytime":"/ mes · cancelá cuando quieras"}</div>
            </div>
            <button onClick={activate} style={{ width:"100%", padding:16, background:"linear-gradient(135deg,#ffd700,#ff8c42)", border:"none", borderRadius:16, color:"#1a0a00", fontSize:16, fontWeight:900, cursor:"pointer", marginBottom:10, animation:"pulseBtn 2s ease-in-out infinite" }}>
              ⭐ {idioma==="en"?"Unlock Premium":"Desbloquear Premium"}
            </button>
            <div style={{ color:"#3a2a1a", fontSize:11, textAlign:"center", lineHeight:1.6 }}>
              {idioma==="en"?"Demo mode: tap to simulate purchase. Real payments coming soon.":"Modo demo: tocá para simular la compra. Pagos reales próximamente."}
            </div>
          </>
        )}
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
