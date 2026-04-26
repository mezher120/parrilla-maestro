// ── HELPER BILINGÜE ───────────────────────────────────────────────────────────
// Uso: td(objeto, 'campo', idioma)
// Si existe objeto.campo_en y el idioma es 'en', retorna la versión en inglés.
export function td(obj, field, idioma) {
  if (idioma === 'en') {
    const en = obj[field + '_en'];
    if (en !== undefined) return en;
  }
  return obj[field];
}

// COCCION_LABELS con soporte bilingüe
export const COCCION_LABELS    = { crudo: "Jugoso",      punto: "A Punto",  cocido: "Bien Cocido" };
export const COCCION_LABELS_EN = { crudo: "Medium Rare", punto: "Medium",   cocido: "Well Done"   };
export const getCoccionLabel   = (key, idioma) =>
  (idioma === 'en' ? COCCION_LABELS_EN : COCCION_LABELS)[key];

// ── CORTES ───────────────────────────────────────────────────────────────────
export const CORTES_VACUNO = [
  {
    id: "asado-tira", nombre: "Asado de Tira", emoji: "🥩", color: "#8B1A1A",
    descripcion:    "El rey de la parrilla argentina. Corte transversal del costillar con hueso.",
    descripcion_en: "The king of Argentine BBQ. A cross-cut of the rib rack with bone.",
    preparacion:    "Retirar del frío 1 hora antes. Salar con sal gruesa 30 min antes. Colocar con el hueso hacia abajo.",
    preparacion_en: "Remove from the fridge 1 hour before. Season with coarse salt 30 min before. Place bone side down.",
    tiempo: "60–90 min",
    temperatura:    "Brasa media-alta",
    temperatura_en: "Medium-high heat",
    servir:    "Servir con chimichurri y ensalada criolla.",
    servir_en: "Serve with chimichurri and criolla salad.",
  },
  {
    id: "vacio", nombre: "Vacío", emoji: "🥩", color: "#7A1818",
    descripcion:    "Corte del flanco lateral, jugoso y sabroso.",
    descripcion_en: "Flank cut, juicy and flavorful.",
    preparacion:    "Marcar el lado de la grasa con cortes superficiales. Sal gruesa antes.",
    preparacion_en: "Score the fat side with shallow cuts. Coarse salt before cooking.",
    tiempo: "45–60 min",
    temperatura:    "Brasa media",
    temperatura_en: "Medium heat",
    servir:    "Cortar en diagonal contra la fibra. Con papas al rescoldo.",
    servir_en: "Slice diagonally against the grain. Great with roasted potatoes.",
  },
  {
    id: "entraña", nombre: "Entraña", emoji: "🥩", color: "#9B2226",
    descripcion:    "Corte del diafragma, muy tierno y de sabor intenso. Cocción rápida.",
    descripcion_en: "Diaphragm cut, very tender and intensely flavored. Quick cook.",
    preparacion:    "Retirar la membrana exterior. Salar al momento de poner en la parrilla.",
    preparacion_en: "Remove the outer membrane. Season just before placing on the grill.",
    tiempo: "15–20 min",
    temperatura:    "Brasa alta",
    temperatura_en: "High heat",
    servir:    "Cortar en tiras anchas. Ideal con salsa criolla o al limón.",
    servir_en: "Slice into wide strips. Great with criolla sauce or lemon.",
  },
  {
    id: "lomo", nombre: "Lomo", emoji: "🥩", color: "#AE2012",
    descripcion:    "El corte más noble y tierno del vacuno.",
    descripcion_en: "The most noble and tender beef cut.",
    preparacion:    "Atar con hilo de cocina. Sellar a fuego alto primero.",
    preparacion_en: "Tie with kitchen string. Sear over high heat first.",
    tiempo: "30–40 min",
    temperatura:    "Brasa alta para sellar, luego media",
    temperatura_en: "High heat to sear, then medium",
    servir:    "Cortar en medallones de 3 cm.",
    servir_en: "Slice into 3 cm medallions.",
  },
  {
    id: "cuadril", nombre: "Cuadril", emoji: "🥩", color: "#BB3E03",
    descripcion:    "Corte magro del cuarto trasero. Versátil y económico.",
    descripcion_en: "Lean cut from the hindquarter. Versatile and affordable.",
    preparacion:    "Pedir con la tapa de grasa. No quitar la grasa antes de cocinar.",
    preparacion_en: "Ask for it with the fat cap. Don't remove the fat before cooking.",
    tiempo: "40–50 min",
    temperatura:    "Brasa media",
    temperatura_en: "Medium heat",
    servir:    "Cortar fino en lonchas.",
    servir_en: "Slice thinly.",
  },
  {
    id: "colita-cuadril", nombre: "Colita de Cuadril", emoji: "🥩", color: "#CA6702",
    descripcion:    "Pequeño corte triangular, sabroso y económico.",
    descripcion_en: "Small triangular cut, tasty and affordable.",
    preparacion:    "Colocar el lado de la grasa hacia abajo los primeros 20 minutos.",
    preparacion_en: "Place fat side down for the first 20 minutes.",
    tiempo: "35–45 min",
    temperatura:    "Brasa media",
    temperatura_en: "Medium heat",
    servir:    "Cortar en lonchas finas con chimichurri.",
    servir_en: "Slice thin with chimichurri.",
  },
  {
    id: "matambre", nombre: "Matambre", emoji: "🥩", color: "#C0392B",
    descripcion:    "Corte fino entre el cuero y las costillas. Muy popular relleno o enrollado. Desafío para el parrillero.",
    descripcion_en: "Thin cut between the hide and ribs. Popular stuffed or rolled. A challenge for the pitmaster.",
    preparacion:    "Aplanar bien. Se puede cocinar directo o relleno con huevo duro, morrón y verduras. Salar y llevar a brasa suave.",
    preparacion_en: "Flatten well. Can be cooked plain or stuffed with hard-boiled egg, peppers and greens. Season and cook over low heat.",
    tiempo: "40–60 min",
    temperatura:    "Brasa baja-media",
    temperatura_en: "Low to medium heat",
    servir:    "Cortar en rodajas si está relleno. Solo con ensalada y limón. Excelente frío al día siguiente.",
    servir_en: "Slice into rounds if stuffed. With salad and lemon. Excellent cold the next day.",
  },
  {
    id: "bife-chorizo", nombre: "Bife de Chorizo", emoji: "🥩", color: "#922B21",
    descripcion:    "Corte premium del lomo bajo, con cobertura de grasa lateral. Jugoso, tierno y con sabor intenso.",
    descripcion_en: "Premium strip loin cut with a fat cap. Juicy, tender and intensely flavorful.",
    preparacion:    "Retirar del frío 1 hora antes. Sellar primero a fuego alto para formar costra. Salar solo al momento de poner en la parrilla.",
    preparacion_en: "Remove from fridge 1 hour before. Sear over high heat to form a crust. Salt only when placing on the grill.",
    tiempo: "15–25 min",
    temperatura:    "Brasa alta para sellar, luego media",
    temperatura_en: "High heat to sear, then medium",
    servir:    "Servir entero o en dos mitades. Ideal con papas fritas y una copa de Malbec.",
    servir_en: "Serve whole or halved. Ideal with fries and a glass of Malbec.",
  },
  {
    id: "ojo-bife", nombre: "Ojo de Bife", emoji: "🥩", color: "#A93226",
    descripcion:    "La parte central del bife de costilla sin hueso. El corte más marmolado y sabroso del vacuno. Pura ternura.",
    descripcion_en: "The boneless center of the rib steak. The most marbled and flavorful beef cut. Pure tenderness.",
    preparacion:    "Temperatura ambiente 1 hora antes. Sellar fuerte 2 min por lado. Nunca pinchar. Sal gruesa al final.",
    preparacion_en: "Room temperature 1 hour before. Sear hard 2 min per side. Never pierce. Coarse salt at the end.",
    tiempo: "12–20 min",
    temperatura:    "Brasa muy alta para sellar, luego media",
    temperatura_en: "Very high heat to sear, then medium",
    servir:    "Reposar 3 min antes de cortar. Solo sal gruesa y unas gotas de limón. No necesita nada más.",
    servir_en: "Rest 3 min before cutting. Just coarse salt and a few drops of lemon. Needs nothing more.",
  },
  {
    id: "tapa-asado", nombre: "Tapa de Asado", emoji: "🥩", color: "#B03A2E",
    descripcion:    "La cobertura del costillar, muy jugosa y gelatinosa. Poco conocida pero muy apreciada por los entendidos.",
    descripcion_en: "The rib cap, very juicy and gelatinous. Little known but prized by connoisseurs.",
    preparacion:    "Cocinar con el lado de la grasa hacia arriba primero. Dejar que la grasa se derrita lentamente. Salar generoso.",
    preparacion_en: "Cook fat side up first. Let the fat melt slowly. Season generously.",
    tiempo: "50–70 min",
    temperatura:    "Brasa media-baja",
    temperatura_en: "Medium-low heat",
    servir:    "Cortar en tiras contra la fibra. El líquido que suelta es oro. Mojar pan ahí.",
    servir_en: "Slice against the grain. Those juices are gold. Dip bread in them.",
  },
];

export const CORTES_CERDO = [
  {
    id: "bondiola", nombre: "Bondiola de Cerdo", emoji: "🐷", color: "#D4A017",
    descripcion:    "Corte graso del cuello del cerdo. Muy sabroso.",
    descripcion_en: "Fatty cut from the pork neck. Very flavorful.",
    preparacion:    "Marinar con ajo, pimentón y romero al menos 2 horas.",
    preparacion_en: "Marinate with garlic, paprika and rosemary for at least 2 hours.",
    tiempo: "90–120 min",
    temperatura:    "Brasa baja-media",
    temperatura_en: "Low to medium heat",
    servir:    "Cortar en lonchas gruesas con mostaza.",
    servir_en: "Slice thick with mustard.",
  },
  {
    id: "costillas-cerdo", nombre: "Costillas de Cerdo", emoji: "🐷", color: "#E09F3E",
    descripcion:    "Las clásicas ribs. Cocción lenta para lograr el caído del hueso.",
    descripcion_en: "Classic ribs. Slow cook to achieve fall-off-the-bone perfection.",
    preparacion:    "Retirar membrana del revés. Marinar con miel y limón 12 horas.",
    preparacion_en: "Remove the membrane from the back. Marinate with honey and lemon for 12 hours.",
    tiempo: "120–180 min",
    temperatura:    "Brasa muy baja",
    temperatura_en: "Very low heat",
    servir:    "Cortar entre hueso y hueso.",
    servir_en: "Cut between each bone.",
  },
  {
    id: "lomo-cerdo", nombre: "Lomo de Cerdo", emoji: "🐷", color: "#EE9B00",
    descripcion:    "Corte magro y tierno. Cuidar la cocción para no resecar.",
    descripcion_en: "Lean and tender cut. Watch the cooking time to avoid drying out.",
    preparacion:    "Envolver en panceta para mantener la humedad.",
    preparacion_en: "Wrap in bacon to retain moisture.",
    tiempo: "40–50 min",
    temperatura:    "Brasa media",
    temperatura_en: "Medium heat",
    servir:    "Cortar en medallones con manzana asada.",
    servir_en: "Slice into medallions with roasted apple.",
  },
  {
    id: "matambre-cerdo", nombre: "Matambre de Cerdo", emoji: "🐷", color: "#E67E22",
    descripcion:    "Versión porcina del matambre. Más fino y rápido que el vacuno. Sabor suave y muy tierno cuando se hace bien.",
    descripcion_en: "Pork version of matambre. Thinner and quicker than beef. Mild and very tender when done right.",
    preparacion:    "Marinar con ajo, perejil, sal y pimienta al menos 1 hora. Se puede enrollar con morrón y aceitunas. Cocción indirecta.",
    preparacion_en: "Marinate with garlic, parsley, salt and pepper for at least 1 hour. Can be rolled with peppers and olives. Indirect cooking.",
    tiempo: "30–45 min",
    temperatura:    "Brasa media-baja",
    temperatura_en: "Low to medium heat",
    servir:    "Cortar en rodajas. Ideal como entrada con un vaso de vino. Frío al día siguiente también está increíble.",
    servir_en: "Slice into rounds. Great as a starter with wine. Also excellent cold the next day.",
  },
  {
    id: "pechito-cerdo", nombre: "Pechito de Cerdo", emoji: "🐷", color: "#D35400",
    descripcion:    "Costillar de cerdo con mucha grasa entreverada. Súper jugoso y sabroso. Ideal para cocción lenta.",
    descripcion_en: "Pork belly with lots of marbled fat. Super juicy and flavorful. Ideal for slow cooking.",
    preparacion:    "Marinar con chimichurri seco, pimentón y ajo. Dejar reposar en heladera 4 horas o toda la noche. Cocinar con el hueso hacia abajo.",
    preparacion_en: "Marinate with dry chimichurri, paprika and garlic. Rest in the fridge 4 hours or overnight. Cook bone side down.",
    tiempo: "60–90 min",
    temperatura:    "Brasa baja",
    temperatura_en: "Low heat",
    servir:    "Cortar entre huesos. Se debe desprender solo. Servir con ensalada fresca y morrón asado.",
    servir_en: "Cut between bones. Should pull apart on its own. Serve with fresh salad and roasted peppers.",
  },
];

export const ACHURAS = [
  {
    id: "chorizos", nombre: "Chorizos", emoji: "🌭", color: "#94452A",
    descripcion:    "El acompañante infaltable.",
    descripcion_en: "The essential side.",
    preparacion:    "Pinchar con tenedor. Empezar a fuego bajo.",
    preparacion_en: "Pierce with a fork. Start on low heat.",
    tiempo: "20–25 min",
    temperatura:    "Brasa media",
    temperatura_en: "Medium heat",
    servir:    "En pan con chimichurri. ¡El choripán!",
    servir_en: "In a roll with chimichurri. The classic choripán!",
  },
  {
    id: "morcilla", nombre: "Morcilla", emoji: "🩸", color: "#3D0C02",
    descripcion:    "Embutido de sangre cocida. Sabor intenso.",
    descripcion_en: "Blood sausage. Intense flavor.",
    preparacion:    "NO pinchar. Fuego muy bajo, dar vuelta con cuidado.",
    preparacion_en: "DO NOT pierce. Very low heat, turn carefully.",
    tiempo: "15–20 min",
    temperatura:    "Brasa muy baja",
    temperatura_en: "Very low heat",
    servir:    "Cortar en rodajas con pan y limón.",
    servir_en: "Slice into rounds with bread and lemon.",
  },
  {
    id: "mollejas", nombre: "Mollejas", emoji: "🫀", color: "#6A040F",
    descripcion:    "Glándula del timo. El corte más preciado.",
    descripcion_en: "Sweetbreads. The most prized offal.",
    preparacion:    "Blanquear 5 min. Limpiar telillas. Salar y poner a la parrilla.",
    preparacion_en: "Blanch 5 min. Clean membranes. Season and place on grill.",
    tiempo: "20–30 min",
    temperatura:    "Brasa media-alta",
    temperatura_en: "Medium-high heat",
    servir:    "Exprimir limón. Comer caliente inmediatamente.",
    servir_en: "Squeeze lemon. Eat hot immediately.",
  },
  {
    id: "chinchulines", nombre: "Chinchulines", emoji: "🔄", color: "#7B2D00",
    descripcion:    "Intestino delgado trenzado. Crocante por fuera.",
    descripcion_en: "Braided small intestine. Crispy on the outside.",
    preparacion:    "Limpiar muy bien. Trenzar. Marinar con limón y ajo.",
    preparacion_en: "Clean thoroughly. Braid. Marinate with lemon and garlic.",
    tiempo: "45–60 min",
    temperatura:    "Brasa media",
    temperatura_en: "Medium heat",
    servir:    "Cortar en trozos con abundante limón.",
    servir_en: "Cut into pieces with plenty of lemon.",
  },
  {
    id: "riñon", nombre: "Riñón", emoji: "🫘", color: "#884EA0",
    descripcion:    "Achura de sabor fuerte y característico. Para paladares audaces. Bien preparado es una delicia.",
    descripcion_en: "Strong and distinctive offal. For adventurous palates. A delicacy when properly prepared.",
    preparacion:    "Limpiar muy bien quitando la membrana y los canalículos internos. Remojar en agua con limón 30 min. Salar y poner a brasa alta. NO cocinar de más.",
    preparacion_en: "Clean thoroughly removing the membrane and inner channels. Soak in water with lemon for 30 min. Season and place on high heat. DO NOT overcook.",
    tiempo: "10–15 min",
    temperatura:    "Brasa alta",
    temperatura_en: "High heat",
    servir:    "Cortar en rodajas gruesas. Exprimir limón generoso. Comer inmediatamente que pierden textura rápido.",
    servir_en: "Slice thick. Squeeze generous lemon. Eat immediately as they lose texture fast.",
  },
  {
    id: "provoleta", nombre: "Provoleta", emoji: "🧀", color: "#F39C12",
    descripcion:    "Queso provolone a la parrilla. La entrada perfecta de todo asado argentino. Crujiente por fuera, derretida por dentro.",
    descripcion_en: "Grilled provolone cheese. The perfect starter of every Argentine BBQ. Crispy outside, melted inside.",
    preparacion:    "Colocar directo sobre la parrilla fría mientras prende. El calor gradual hace la magia. Espolvorear orégano y ají molido. No mover hasta que esté dorada.",
    preparacion_en: "Place directly on the cold grill while it heats. The gradual heat does the magic. Sprinkle oregano and chili flakes. Don't move until golden.",
    tiempo: "8–12 min",
    temperatura:    "Brasa media",
    temperatura_en: "Medium heat",
    servir:    "Servir en el mismo molde o tabla. Comer caliente con pan. Agregar aceite de oliva y tomate si se tiene.",
    servir_en: "Serve in the mold or on a board. Eat hot with bread. Add olive oil and tomato if available.",
  },
];

// ── CORTES VIP ────────────────────────────────────────────────────────────────
export const PREMIUM_CORTES = [
  {
    id: "lechon", nombre: "Lechón", emoji: "🐷", color: "#c0392b",
    descripcion:    "La gran joya de la parrilla. Cocción lenta de 3 a 4 horas que rinde con un cuero crujiente y carne tierna. Requiere preparación total y dedicación.",
    descripcion_en: "The great jewel of the grill. 3–4 hour slow cook yielding crispy skin and tender meat. Requires total preparation and dedication.",
    preparacion:    "Abrir en mariposa o enganchar al asador. Marinar con sal gruesa, ajo y limón la noche anterior. Comenzar con brasa muy baja y aumentar gradualmente cada hora.",
    preparacion_en: "Butterfly or spit-roast. Marinate with coarse salt, garlic and lemon the night before. Start on very low heat and gradually increase each hour.",
    tiempo: "180–240 min",
    temperatura:    "Brasa baja constante",
    temperatura_en: "Constant low heat",
    servir:    "Trinchar en la tabla. El cuero debe crujir al cortar. Servir con chimichurri y ensalada criolla.",
    servir_en: "Carve on the board. The skin should crackle when cut. Serve with chimichurri and criolla salad.",
  },
  {
    id: "pollo", nombre: "Pollo", emoji: "🐔", color: "#e67e22",
    descripcion:    "El pollo a la parrilla bien hecho es una delicia. Abierto en mariposa, queda dorado y jugoso. Más difícil de lo que parece — hay que controlarlo bien.",
    descripcion_en: "A well-done grilled chicken is a delight. Butterflied, it comes out golden and juicy. Harder than it looks — you have to keep an eye on it.",
    preparacion:    "Abrir en mariposa cortando el espinazo. Aplanar bien. Marinar con limón, ajo, orégano y aceite al menos 2 horas. Colocar con el hueso hacia abajo primero.",
    preparacion_en: "Butterfly by cutting the backbone. Flatten well. Marinate with lemon, garlic, oregano and oil for at least 2 hours. Place bone side down first.",
    tiempo: "50–70 min",
    temperatura:    "Brasa media",
    temperatura_en: "Medium heat",
    servir:    "Trinchar en presas. Exprimir limón. Acompañar con ensalada y papas.",
    servir_en: "Carve into pieces. Squeeze lemon. Serve with salad and potatoes.",
  },
  {
    id: "cordero", nombre: "Cordero", emoji: "🐑", color: "#8e44ad",
    descripcion:    "El rey de los asados del sur. Sabor inigualable con aromas a campo patagónico. Cocción lenta al palo o a la parrilla. Una experiencia única e inolvidable.",
    descripcion_en: "The king of southern BBQ. Unmatched flavor with aromas of Patagonian countryside. Slow cook on a spit or grill. A unique and unforgettable experience.",
    preparacion:    "Abrir en mariposa. Frotar con sal gruesa, tomillo, romero y ajo. Dejar reposar 12 horas en heladera. Cocinar lento con brasa baja y constante.",
    preparacion_en: "Butterfly. Rub with coarse salt, thyme, rosemary and garlic. Rest 12 hours in the fridge. Cook slow on constant low heat.",
    tiempo: "90–120 min",
    temperatura:    "Brasa baja constante",
    temperatura_en: "Constant low heat",
    servir:    "Reposar 10 min antes de trinchar. Servir con salsa de menta o chimichurri de hierbas.",
    servir_en: "Rest 10 min before carving. Serve with mint sauce or herb chimichurri.",
  },
  {
    id: "tbone", nombre: "T-Bone", emoji: "🦴", color: "#6d1a0a",
    descripcion:    "El corte que combina lomo y bife de chorizo separados por el hueso en T. Sabor doble, textura perfecta. Un clásico adoptado por los mejores parrilleros.",
    descripcion_en: "The cut that combines tenderloin and strip steak separated by the T-bone. Double flavor, perfect texture. A classic adopted by the best pitmasters.",
    preparacion:    "Temperatura ambiente 1 hora antes. Salar solo al momento de poner en la parrilla. Sellar a brasa muy alta. El hueso conduce calor al centro parejo.",
    preparacion_en: "Room temperature 1 hour before. Salt only when placing on the grill. Sear on very high heat. The bone conducts heat to the center evenly.",
    tiempo: "15–22 min",
    temperatura:    "Brasa muy alta para sellar, luego media",
    temperatura_en: "Very high heat to sear, then medium",
    servir:    "Reposar 4 min. Cortar a cada lado del hueso. Solo sal gruesa y pimienta negra. No necesita nada más.",
    servir_en: "Rest 4 min. Cut on each side of the bone. Just coarse salt and black pepper. Needs nothing more.",
  },
  {
    id: "picanha", nombre: "Picanha", emoji: "🥩", color: "#922b21",
    descripcion:    "El corte brasileño que conquistó el mundo. Tapa de cuadril con su generosa capa de grasa. Sencillo de preparar, impresionante de sabor.",
    descripcion_en: "The Brazilian cut that conquered the world. Rump cap with its generous fat layer. Simple to prepare, impressive in flavor.",
    preparacion:    "No quitar la grasa. Sal gruesa y nada más. Colocar con la grasa hacia arriba primero. La grasa se derrite sola y baña toda la carne.",
    preparacion_en: "Don't trim the fat. Coarse salt and nothing else. Place fat side up first. The fat melts on its own and bastes the meat.",
    tiempo: "30–40 min",
    temperatura:    "Brasa alta para sellar, luego media",
    temperatura_en: "High heat to sear, then medium",
    servir:    "Cortar en tiras gruesas en contra de la fibra. Solo sal gruesa. No necesita nada más.",
    servir_en: "Slice thick against the grain. Just coarse salt. Needs nothing more.",
  },
  {
    id: "morron", nombre: "Morrón", emoji: "🫑", color: "#c0392b",
    descripcion:    "El vegetal estrella de toda parrilla que se precie. Asado entero, la piel se carboniza y el interior queda dulce, ahumado y irresistible.",
    descripcion_en: "The star vegetable of any self-respecting BBQ. Roasted whole, the skin chars and the inside becomes sweet, smoky and irresistible.",
    preparacion:    "Poner entero directo sobre la brasa o la parrilla caliente. No necesita aceite ni preparación. Dar vuelta cuando un lado esté completamente ennegrecido.",
    preparacion_en: "Place whole directly on hot coals or grill. No oil or preparation needed. Turn when one side is completely blackened.",
    tiempo: "20–30 min",
    temperatura:    "Brasa media-alta",
    temperatura_en: "Medium-high heat",
    servir:    "Pelar bajo agua fría. Cortar en tiras. Condimentar con aceite de oliva, ajo y sal. Increíble frío al día siguiente.",
    servir_en: "Peel under cold water. Slice into strips. Season with olive oil, garlic and salt. Incredible cold the next day.",
  },
  {
    id: "tomate", nombre: "Tomate", emoji: "🍅", color: "#e74c3c",
    descripcion:    "El tomate asado concentra su sabor, se carameliza y queda con una textura increíble. El acompañamiento perfecto y más fácil de todo asado.",
    descripcion_en: "Roasted tomato concentrates its flavor, caramelizes and gets an incredible texture. The perfect and easiest side of any BBQ.",
    preparacion:    "Cortar al medio horizontalmente. Colocar con el corte hacia arriba. Agregar sal, orégano y un chorrito de aceite de oliva.",
    preparacion_en: "Halve horizontally. Place cut side up. Add salt, oregano and a drizzle of olive oil.",
    tiempo: "12–18 min",
    temperatura:    "Brasa media",
    temperatura_en: "Medium heat",
    servir:    "Servir caliente con pan para absorber los jugos. Ideal como guarnición o entrada rápida.",
    servir_en: "Serve hot with bread to soak up the juices. Ideal as a side or quick starter.",
  },
  {
    id: "choclo", nombre: "Choclo", emoji: "🌽", color: "#f39c12",
    descripcion:    "El choclo asado es el snack clásico de toda espera de asado. La parrilla le da un sabor ahumado irresistible que el hervido nunca logra.",
    descripcion_en: "Grilled corn is the classic snack of any BBQ wait. The grill gives it an irresistible smoky flavor that boiling never achieves.",
    preparacion:    "Con chala: remojar 15 min en agua antes de poner. Sin chala: untar con manteca y sal. Colocar directo sobre la parrilla o las brasas.",
    preparacion_en: "With husk: soak 15 min in water first. Without husk: coat with butter and salt. Place directly on the grill or coals.",
    tiempo: "25–35 min",
    temperatura:    "Brasa media",
    temperatura_en: "Medium heat",
    servir:    "Untar con manteca, sal gruesa y limón al sacar. Comer de inmediato. Opcional: queso rallado encima.",
    servir_en: "Coat with butter, coarse salt and lemon when done. Eat immediately. Optional: grated cheese on top.",
  },
];

// ── IMÁGENES ──────────────────────────────────────────────────────────────────
const _FB = "https://firebasestorage.googleapis.com/v0/b/asadapp-28206.firebasestorage.app/o/cortes%2F";
const _Q  = "?alt=media";
export const CORTE_IMAGES = {
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
  "lechon":         `${_FB}lechon.jpg${_Q}`,
  "pollo":          `${_FB}pollo.jpg${_Q}`,
  "cordero":        `${_FB}cordero.jpg${_Q}`,
  "tbone":          `${_FB}tbone.jpg${_Q}`,
  "picanha":        `${_FB}picanha.jpg${_Q}`,
  "morron":         `${_FB}morron.jpg${_Q}`,
  "tomate":         `${_FB}tomate.jpg${_Q}`,
  "choclo":         `${_FB}choclo.jpg${_Q}`,
};

// ── MÉTODOS DE FUEGO ─────────────────────────────────────────────────────────
export const METODOS_FUEGO = [
  {
    id: "piramide",
    titulo:    "Pirámide Clásica",    titulo_en:    "Classic Pyramid",
    emoji: "🔺", dificultad: "Fácil", dificultad_en: "Easy",
    tiempo: "20–25 min",
    descripcion:    "El método más usado. Apila el carbón en forma de pirámide dejando espacio para el aire. Enciende desde abajo con papel.",
    descripcion_en: "The most common method. Stack charcoal in a pyramid leaving space for air. Light from below with paper.",
  },
  {
    id: "chimenea",
    titulo:    "Chimenea de Carbón", titulo_en:    "Charcoal Chimney",
    emoji: "🏛️", dificultad: "Muy Fácil", dificultad_en: "Very Easy",
    tiempo: "15–20 min",
    descripcion:    "Usa una chimenea metálica. La convección enciende el carbón uniformemente. El método más eficiente y limpio.",
    descripcion_en: "Use a metal chimney starter. Convection lights charcoal evenly. The most efficient and cleanest method.",
  },
  {
    id: "minion",
    titulo:    "Método Minion",      titulo_en:    "Minion Method",
    emoji: "🌀", dificultad: "Intermedio", dificultad_en: "Intermediate",
    tiempo: "4–6 horas",
    descripcion:    "Para cocción larga. Carbón frío alrededor, brasa encendida en el centro. El carbón se enciende lentamente manteniendo temperatura constante.",
    descripcion_en: "For long cooks. Cold charcoal around the outside, lit coals in the center. Charcoal lights slowly maintaining constant temperature.",
  },
  {
    id: "leña",
    titulo:    "Con Leña",           titulo_en:    "With Wood",
    emoji: "🪵", dificultad: "Avanzado", dificultad_en: "Advanced",
    tiempo: "45–60 min",
    descripcion:    "El método tradicional. Usa maderas duras como quebracho o espinillo. Nunca maderas resinosas. Da más aroma y sabor.",
    descripcion_en: "The traditional method. Use hardwoods like quebracho or carob. Never resinous woods. Adds more aroma and flavor.",
  },
];

// ── SIMULACIÓN ───────────────────────────────────────────────────────────────
// "tiempo" = minutos totales de cocción base (a punto). Controla el timer.
// "eventos" = avisos durante la cocción. "min" es el minuto en que se dispara.
// Agregar "msg_en" a cada evento para la versión en inglés.
export const SIMULACION_CORTES = [
  // ── VACUNO ──────────────────────────────────────────────────────────────────
  {
    id: "asado-tira", nombre: "Asado de Tira", emoji: "🥩", color: "#8B1A1A", tiempo: 75,
    eventos: [
      { min: 0,  msg: "Colocar con el hueso hacia abajo. Fuego medio-alto.",       msg_en: "Place bone side down. Medium-high heat." },
      { min: 15, msg: "Bajar la grilla 10 cm. El hueso debe estar dorándose.",     msg_en: "Lower grill 10 cm. Bone should be browning." },
      { min: 30, msg: "No mover aún. Escuchar el chisporroteo.",                   msg_en: "Don't move yet. Listen for the sizzle." },
      { min: 45, msg: "Dar vuelta. Sal gruesa por arriba.",                        msg_en: "Flip. Coarse salt on top." },
      { min: 60, msg: "Verificar cocción. Debe estar dorado y jugoso.",            msg_en: "Check doneness. Should be golden and juicy." },
      { min: 75, msg: "¡LISTO! Reposar 5 min antes de cortar.",                   msg_en: "DONE! Rest 5 min before slicing." },
    ],
  },
  {
    id: "vacio", nombre: "Vacío", emoji: "🥩", color: "#7A1818", tiempo: 55,
    eventos: [
      { min: 0,  msg: "Vacío con grasa hacia abajo. Brasa media.",                msg_en: "Vacío fat side down. Medium heat." },
      { min: 15, msg: "La grasa debe estar derritiéndose bien. Mantener.",        msg_en: "Fat should be rendering well. Keep going." },
      { min: 25, msg: "Dar vuelta. La grasa dorada es buena señal.",              msg_en: "Flip. Golden fat is a good sign." },
      { min: 40, msg: "Verificar punto apretando con el dedo.",                   msg_en: "Check doneness by pressing with your finger." },
      { min: 55, msg: "¡LISTO! Cortar en diagonal contra la fibra.",             msg_en: "DONE! Slice diagonally against the grain." },
    ],
  },
  {
    id: "entraña", nombre: "Entraña", emoji: "🥩", color: "#9B2226", tiempo: 20,
    eventos: [
      { min: 0,  msg: "Fuego alto. Entraña limpia sin membrana.",                 msg_en: "High heat. Clean skirt steak without membrane." },
      { min: 6,  msg: "Dar vuelta. Debe tener buen sellado.",                     msg_en: "Flip. Should have a good sear." },
      { min: 12, msg: "Verificar punto. Debe ceder al tacto.",                    msg_en: "Check doneness. Should give when touched." },
      { min: 18, msg: "Casi lista. Retirar del fuego directo.",                   msg_en: "Almost done. Move away from direct heat." },
      { min: 20, msg: "¡LISTA! Cortar en tiras y servir de inmediato.",          msg_en: "DONE! Slice into strips and serve immediately." },
    ],
  },
  {
    id: "lomo", nombre: "Lomo", emoji: "🥩", color: "#AE2012", tiempo: 35,
    eventos: [
      { min: 0,  msg: "Lomo a temperatura ambiente. Brasa alta. Sellar fuerte.",  msg_en: "Lomo at room temperature. High heat. Sear hard." },
      { min: 4,  msg: "Dar vuelta. Costra formada. Bajar a brasa media.",         msg_en: "Flip. Crust formed. Lower to medium heat." },
      { min: 15, msg: "Rotar 90°. Dorar parejo todo el cilindro.",               msg_en: "Rotate 90°. Brown evenly all around." },
      { min: 25, msg: "Verificar punto presionando. Debe ceder levemente.",       msg_en: "Check doneness by pressing. Should give slightly." },
      { min: 35, msg: "¡LISTO! Reposar 5 min tapado con papel aluminio.",        msg_en: "DONE! Rest 5 min covered with foil." },
    ],
  },
  {
    id: "cuadril", nombre: "Cuadril", emoji: "🥩", color: "#BB3E03", tiempo: 45,
    eventos: [
      { min: 0,  msg: "Cuadril con la grasa hacia arriba. Brasa media.",          msg_en: "Cuadril fat side up. Medium heat." },
      { min: 15, msg: "La grasa se está fundiendo. Bañá la carne con ella.",      msg_en: "Fat is melting. Baste the meat with it." },
      { min: 25, msg: "Dar vuelta. Grasa hacia abajo ahora.",                     msg_en: "Flip. Fat side down now." },
      { min: 38, msg: "Verificar cocción. Debe estar firme pero no duro.",        msg_en: "Check doneness. Should be firm but not hard." },
      { min: 45, msg: "¡LISTO! Cortar fino en lonchas.",                         msg_en: "DONE! Slice thinly." },
    ],
  },
  {
    id: "matambre", nombre: "Matambre", emoji: "🥩", color: "#C0392B", tiempo: 50,
    eventos: [
      { min: 0,  msg: "Matambre bien aplanado. Brasa baja-media.",               msg_en: "Matambre well flattened. Low to medium heat." },
      { min: 12, msg: "Sin apuro. Cocción lenta es la clave.",                   msg_en: "No rush. Slow cooking is the key." },
      { min: 25, msg: "Dar vuelta con cuidado. Debe estar dorado.",              msg_en: "Flip carefully. Should be golden." },
      { min: 38, msg: "Verificar que esté cocido parejo en toda la superficie.", msg_en: "Check it's cooked evenly over the entire surface." },
      { min: 50, msg: "¡LISTO! Dejar reposar 5 min. Cortar en rodajas.",        msg_en: "DONE! Rest 5 min. Slice into rounds." },
    ],
  },
  {
    id: "bife-chorizo", nombre: "Bife de Chorizo", emoji: "🥩", color: "#922B21", tiempo: 20,
    eventos: [
      { min: 0,  msg: "Bife a temperatura ambiente. Brasa muy alta. No tocar.",  msg_en: "Strip loin at room temperature. Very high heat. Don't touch." },
      { min: 3,  msg: "Sellar el lado de la grasa parado en la parrilla 2 min.", msg_en: "Sear the fat side standing up on the grill for 2 min." },
      { min: 6,  msg: "Dar vuelta. Costra dorada perfecta.",                     msg_en: "Flip. Perfect golden crust." },
      { min: 12, msg: "Verificar punto presionando. Jugoso al tacto.",           msg_en: "Check doneness by pressing. Juicy to the touch." },
      { min: 20, msg: "¡LISTO! Reposar 3 min. Solo sal gruesa.",                msg_en: "DONE! Rest 3 min. Just coarse salt." },
    ],
  },
  {
    id: "ojo-bife", nombre: "Ojo de Bife", emoji: "🥩", color: "#A93226", tiempo: 16,
    eventos: [
      { min: 0,  msg: "Brasa muy alta. Ojo de bife directo. No mover.",          msg_en: "Very high heat. Rib eye directly on. Don't move." },
      { min: 3,  msg: "Dar vuelta. Costra perfecta.",                            msg_en: "Flip. Perfect crust." },
      { min: 8,  msg: "Bajar brasa a media. Terminar cocción suave.",            msg_en: "Lower to medium heat. Finish cooking gently." },
      { min: 13, msg: "Verificar punto. Debe ser rosado en el centro.",          msg_en: "Check doneness. Should be pink in the center." },
      { min: 16, msg: "¡LISTO! Reposar 3 min. Unas gotas de limón.",            msg_en: "DONE! Rest 3 min. A few drops of lemon." },
    ],
  },
  {
    id: "tapa-asado", nombre: "Tapa de Asado", emoji: "🥩", color: "#B03A2E", tiempo: 60,
    eventos: [
      { min: 0,  msg: "Tapa con la grasa hacia arriba. Brasa media-baja.",       msg_en: "Rib cap fat side up. Medium-low heat." },
      { min: 15, msg: "La grasa se va derritiendo. Baña la carne sola.",         msg_en: "Fat is rendering. Bastes the meat on its own." },
      { min: 30, msg: "Dar vuelta. La grasa hacia abajo ahora.",                 msg_en: "Flip. Fat side down now." },
      { min: 45, msg: "Verificar cocción. Debe estar tierna al pinchar.",        msg_en: "Check doneness. Should be tender when pierced." },
      { min: 60, msg: "¡LISTA! Cortar contra la fibra. El jugo es oro.",        msg_en: "DONE! Slice against the grain. Those juices are gold." },
    ],
  },
  {
    id: "colita-cuadril", nombre: "Colita de Cuadril", emoji: "🥩", color: "#CA6702", tiempo: 40,
    eventos: [
      { min: 0,  msg: "Grasa hacia abajo primero. Brasa media.",                 msg_en: "Fat side down first. Medium heat." },
      { min: 15, msg: "Dar vuelta. La grasa está dorada.",                       msg_en: "Flip. Fat is golden." },
      { min: 28, msg: "Verificar punto. Debe estar firme con algo de jugo.",     msg_en: "Check doneness. Should be firm with some juiciness." },
      { min: 40, msg: "¡LISTA! Cortar en lonchas finas.",                       msg_en: "DONE! Slice thinly." },
    ],
  },
  // ── CERDO ────────────────────────────────────────────────────────────────────
  {
    id: "bondiola", nombre: "Bondiola", emoji: "🐷", color: "#D4A017", tiempo: 90,
    eventos: [
      { min: 0,  msg: "Bondiola marinada. Fuego bajo. Tapa cerrada.",            msg_en: "Marinated bondiola. Low heat. Lid closed." },
      { min: 20, msg: "Dar vuelta. Color dorado. Mantener fuego bajo.",          msg_en: "Flip. Golden color. Keep low heat." },
      { min: 40, msg: "Rociar con la marinada. Subir fuego levemente.",          msg_en: "Baste with marinade. Raise heat slightly." },
      { min: 60, msg: "Dar vuelta nuevamente. Perfumar con romero.",             msg_en: "Flip again. Perfume with rosemary." },
      { min: 75, msg: "Casi lista. Verificar temperatura interna.",              msg_en: "Almost done. Check internal temperature." },
      { min: 90, msg: "¡LISTA! Reposar 10 min. Cortar en lonchas gruesas.",     msg_en: "DONE! Rest 10 min. Slice thick." },
    ],
  },
  {
    id: "costillas-cerdo", nombre: "Costillas de Cerdo", emoji: "🐷", color: "#E09F3E", tiempo: 150,
    eventos: [
      { min: 0,   msg: "Costillas con el hueso hacia abajo. Brasa muy baja.",    msg_en: "Ribs bone side down. Very low heat." },
      { min: 30,  msg: "Sin prisa. La paciencia hace la diferencia.",            msg_en: "No rush. Patience makes the difference." },
      { min: 60,  msg: "Dar vuelta con cuidado. Deben estar doradas abajo.",     msg_en: "Flip carefully. Should be golden underneath." },
      { min: 90,  msg: "Rociar con la marinada. El aroma es increíble.",         msg_en: "Baste with marinade. The aroma is incredible." },
      { min: 120, msg: "Verificar que la carne se despegue del hueso.",          msg_en: "Check that the meat pulls away from the bone." },
      { min: 150, msg: "¡LISTAS! Se deben desprender solas. A disfrutar.",      msg_en: "DONE! Should fall off the bone on their own." },
    ],
  },
  {
    id: "lomo-cerdo", nombre: "Lomo de Cerdo", emoji: "🐷", color: "#EE9B00", tiempo: 45,
    eventos: [
      { min: 0,  msg: "Lomo de cerdo envuelto en panceta. Brasa media.",         msg_en: "Pork loin wrapped in bacon. Medium heat." },
      { min: 12, msg: "La panceta se está dorando. Dar vuelta.",                 msg_en: "Bacon is browning. Flip." },
      { min: 25, msg: "Rotar para dorar parejo. Brasa no muy alta.",             msg_en: "Rotate to brown evenly. Not too high heat." },
      { min: 38, msg: "Verificar cocción. Importante: cerdo debe estar bien cocido.", msg_en: "Check doneness. Important: pork must be well cooked." },
      { min: 45, msg: "¡LISTO! Reposar 5 min. Cortar en medallones.",           msg_en: "DONE! Rest 5 min. Slice into medallions." },
    ],
  },
  {
    id: "matambre-cerdo", nombre: "Matambre de Cerdo", emoji: "🐷", color: "#E67E22", tiempo: 38,
    eventos: [
      { min: 0,  msg: "Matambre de cerdo marinado. Brasa media-baja.",           msg_en: "Marinated pork matambre. Low to medium heat." },
      { min: 10, msg: "Cocción pareja. No apurar el fuego.",                     msg_en: "Even cooking. Don't rush the heat." },
      { min: 20, msg: "Dar vuelta. Debe estar dorado prolijo.",                  msg_en: "Flip. Should be neatly golden." },
      { min: 30, msg: "Verificar que esté cocido en toda la superficie.",        msg_en: "Check it's cooked over the entire surface." },
      { min: 38, msg: "¡LISTO! Cortar en rodajas. Ideal como entrada.",         msg_en: "DONE! Slice into rounds. Great as a starter." },
    ],
  },
  {
    id: "pechito-cerdo", nombre: "Pechito de Cerdo", emoji: "🐷", color: "#D35400", tiempo: 75,
    eventos: [
      { min: 0,  msg: "Pechito con el hueso hacia abajo. Brasa baja.",           msg_en: "Pork belly bone side down. Low heat." },
      { min: 20, msg: "La grasa empieza a derretirse. Buen signo.",              msg_en: "Fat starts rendering. Good sign." },
      { min: 40, msg: "Dar vuelta. Dorado abajo. Subir brasa levemente.",        msg_en: "Flip. Golden underneath. Raise heat slightly." },
      { min: 58, msg: "Verificar que la carne se despegue del hueso.",           msg_en: "Check the meat pulls away from the bone." },
      { min: 75, msg: "¡LISTO! Debe desprenderse solo. Cortar entre huesos.",   msg_en: "DONE! Should pull apart on its own. Cut between bones." },
    ],
  },
  // ── ACHURAS ──────────────────────────────────────────────────────────────────
  {
    id: "chorizos", nombre: "Chorizos", emoji: "🌭", color: "#94452A", tiempo: 25,
    eventos: [
      { min: 0,  msg: "Pinchar los chorizos con tenedor. Fuego bajo.",           msg_en: "Pierce chorizos with a fork. Low heat." },
      { min: 8,  msg: "Dar vuelta. Deben estar dorados de un lado.",             msg_en: "Flip. Should be golden on one side." },
      { min: 15, msg: "Girar un cuarto. Dorar todos los lados.",                 msg_en: "Quarter turn. Brown all sides." },
      { min: 20, msg: "Subir fuego 2 minutos para dorar la piel.",              msg_en: "Raise heat 2 minutes to crisp the skin." },
      { min: 25, msg: "¡LISTOS! Servir en pan con chimichurri.",                msg_en: "DONE! Serve in a roll with chimichurri." },
    ],
  },
  {
    id: "morcilla", nombre: "Morcilla", emoji: "🩸", color: "#3D0C02", tiempo: 18,
    eventos: [
      { min: 0,  msg: "NO pinchar la morcilla. Fuego muy bajo.",                 msg_en: "DO NOT pierce the blood sausage. Very low heat." },
      { min: 6,  msg: "Dar vuelta con mucho cuidado. Tiene que estar entera.",   msg_en: "Turn very carefully. Must stay intact." },
      { min: 12, msg: "Girar para dorar el otro lado.",                          msg_en: "Rotate to brown the other side." },
      { min: 18, msg: "¡LISTA! Cortar en rodajas y servir con pan.",            msg_en: "DONE! Slice into rounds and serve with bread." },
    ],
  },
  {
    id: "mollejas", nombre: "Mollejas", emoji: "🫀", color: "#6A040F", tiempo: 30,
    eventos: [
      { min: 0,  msg: "Mollejas limpias y blanqueadas. Fuego medio-alto.",       msg_en: "Cleaned and blanched sweetbreads. Medium-high heat." },
      { min: 10, msg: "Dar vuelta. Deben estar crocantes por abajo.",            msg_en: "Flip. Should be crispy on the bottom." },
      { min: 20, msg: "Girar para dorar todos los lados.",                       msg_en: "Rotate to brown all sides." },
      { min: 25, msg: "Agregar sal y exprimir limón.",                           msg_en: "Add salt and squeeze lemon." },
      { min: 30, msg: "¡LISTAS! Servir inmediatamente con limón.",              msg_en: "DONE! Serve immediately with lemon." },
    ],
  },
  {
    id: "chinchulines", nombre: "Chinchulines", emoji: "🔄", color: "#7B2D00", tiempo: 50,
    eventos: [
      { min: 0,  msg: "Chinchulines trenzados. Brasa media. Paciencia.",         msg_en: "Braided chinchulines. Medium heat. Patience." },
      { min: 15, msg: "No apurar. Cocción lenta para quedar crocantes.",         msg_en: "Don't rush. Slow cooking makes them crispy." },
      { min: 28, msg: "Dar vuelta. Deben estar dorados y tirantes.",             msg_en: "Flip. Should be golden and taut." },
      { min: 40, msg: "Subir brasa. Los últimos minutos hacen la crocancia.",    msg_en: "Raise heat. The last minutes create the crunch." },
      { min: 50, msg: "¡LISTOS! Cortar en trozos y exprimir mucho limón.",      msg_en: "DONE! Cut into pieces and squeeze plenty of lemon." },
    ],
  },
  {
    id: "riñon", nombre: "Riñón", emoji: "🫘", color: "#884EA0", tiempo: 12,
    eventos: [
      { min: 0,  msg: "Riñones limpios. Brasa alta. Cocción rápida.",            msg_en: "Clean kidneys. High heat. Quick cook." },
      { min: 4,  msg: "Dar vuelta. Deben sellar rápido.",                        msg_en: "Flip. Should sear quickly." },
      { min: 8,  msg: "Verificar cocción. No deben quedar crudos adentro.",      msg_en: "Check doneness. Shouldn't be raw inside." },
      { min: 12, msg: "¡LISTOS! Exprimir limón generoso. Comer ya.",            msg_en: "DONE! Generous squeeze of lemon. Eat now." },
    ],
  },
  {
    id: "provoleta", nombre: "Provoleta", emoji: "🧀", color: "#F39C12", tiempo: 10,
    eventos: [
      { min: 0,  msg: "Provoleta directo sobre la parrilla. Fuego medio.",       msg_en: "Provoleta directly on the grill. Medium heat." },
      { min: 3,  msg: "Ya debe estar perfumando. No tocar.",                     msg_en: "Should be fragrant already. Don't touch." },
      { min: 6,  msg: "Cuando los bordes burbujean está casi lista.",            msg_en: "When the edges bubble it's almost done." },
      { min: 8,  msg: "Agregar orégano y ají molido arriba.",                   msg_en: "Sprinkle oregano and chili flakes on top." },
      { min: 10, msg: "¡LISTA! Servir en el acto con pan. No esperar.",         msg_en: "DONE! Serve right away with bread. Don't wait." },
    ],
  },
  // ── VIP ──────────────────────────────────────────────────────────────────────
  {
    id: "lechon", nombre: "Lechón", emoji: "🐷", color: "#c0392b", tiempo: 180, vip: true,
    eventos: [
      { min: 0,   msg: "Lechón al asador. Brasa baja y paciencia.",              msg_en: "Suckling pig on the spit. Low heat and patience." },
      { min: 60,  msg: "Rociar con grasa. El cuero debe ir dorándose.",          msg_en: "Baste with drippings. Skin should be browning." },
      { min: 120, msg: "Dar vuelta completo. El aroma lo dice todo.",            msg_en: "Flip completely. The aroma says it all." },
      { min: 180, msg: "¡LISTO! El cuero debe crujir al golpear.",              msg_en: "DONE! Skin should crack when tapped." },
    ],
  },
  {
    id: "pollo", nombre: "Pollo", emoji: "🐔", color: "#e67e22", tiempo: 60, vip: true,
    eventos: [
      { min: 0,  msg: "Pollo mariposa. Brasa media. Hueso hacia abajo.",        msg_en: "Butterflied chicken. Medium heat. Bone side down." },
      { min: 20, msg: "Dar vuelta. Piel hacia abajo ahora.",                    msg_en: "Flip. Skin side down now." },
      { min: 40, msg: "Rociar con chimichurri. Verificar cocción.",             msg_en: "Baste with chimichurri. Check doneness." },
      { min: 60, msg: "¡LISTO! Jugo transparente al pinchar: listo.",          msg_en: "DONE! Clear juices when pierced: it's ready." },
    ],
  },
  {
    id: "cordero", nombre: "Cordero", emoji: "🐑", color: "#8e44ad", tiempo: 90, vip: true,
    eventos: [
      { min: 0,  msg: "Cordero al palo. Brasa baja constante.",                 msg_en: "Lamb on the spit. Constant low heat." },
      { min: 30, msg: "Girar. El aroma a tomillo es increíble.",                msg_en: "Rotate. The thyme aroma is incredible." },
      { min: 60, msg: "Pinchar: debe estar tierno. Casi listo.",                msg_en: "Pierce: should be tender. Almost done." },
      { min: 90, msg: "¡LISTO! Reposar 10 min. Servir con menta.",             msg_en: "DONE! Rest 10 min. Serve with mint." },
    ],
  },
  {
    id: "picanha", nombre: "Picanha", emoji: "🥩", color: "#922b21", tiempo: 35, vip: true,
    eventos: [
      { min: 0,  msg: "Picanha con grasa hacia arriba. Brasa alta.",            msg_en: "Picanha fat side up. High heat." },
      { min: 8,  msg: "Dar vuelta. La grasa se derrite sola.",                  msg_en: "Flip. The fat renders on its own." },
      { min: 20, msg: "Sellar fuerte los últimos minutos.",                     msg_en: "Sear hard in the last few minutes." },
      { min: 35, msg: "¡LISTA! Cortar en contra de la fibra en tiras.",        msg_en: "DONE! Slice against the grain into strips." },
    ],
  },
];

// ── COCCIÓN ───────────────────────────────────────────────────────────────────
export const COCCION_MULT   = { crudo: 0.78, punto: 1.0, cocido: 1.25 };
export const COCCION_COLORS = { crudo: "#e53935", punto: "#ff8c42", cocido: "#795548" };

// ── PARRILLA GRADUABLE ────────────────────────────────────────────────────────
export const ALTURA_SCHEDULE = [
  { min: 0,  cm: 25 },
  { min: 15, cm: 20 },
  { min: 30, cm: 15 },
  { min: 50, cm: 20 },
];

// ── NOTIFICACIONES DE CARBÓN ──────────────────────────────────────────────────
export const CARBON_NOTIFS = {
  adjustable: [
    { min: 20, msg: "Revisá el carbón. Si las brasas bajan, agregá un puñado por el costado.",          msg_en: "Check the charcoal. If coals drop, add a handful on the side." },
    { min: 45, msg: "Control de carbón: mantené la brasa pareja para los cortes largos.",               msg_en: "Charcoal check: keep the coals even for the longer cuts." },
    { min: 70, msg: "Última revisión de carbón. Asegurate tener brasa suficiente.",                     msg_en: "Last charcoal check. Make sure you have enough coals." },
  ],
  fixed: [
    { min: 15, msg: "Parrilla fija: revisá las brasas. El carbón debe estar siempre parejo.",           msg_en: "Fixed grill: check the coals. Charcoal should always be even." },
    { min: 35, msg: "Control de carbón. Mantener calor uniforme es clave.",                             msg_en: "Charcoal check. Keeping uniform heat is key." },
    { min: 60, msg: "Revisión de brasas. Distribuí el carbón de manera pareja.",                        msg_en: "Coals check. Spread the charcoal evenly." },
  ],
};

// ── AVATARES ──────────────────────────────────────────────────────────────────
export const AVATAR_OPTIONS = ["🧑‍🍳", "👨‍🍳", "👩‍🍳", "🤠", "😎", "🐂", "🔥", "⚡"];
