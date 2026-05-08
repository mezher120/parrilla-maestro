import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB98ftiApQlwjWRD_5keM7D-BK2YQRjdl8",
  authDomain: "asadapp-28206.firebaseapp.com",
  projectId: "asadapp-28206",
  storageBucket: "asadapp-28206.firebasestorage.app",
  messagingSenderId: "152769545003",
  appId: "1:152769545003:web:50d639ec461131d0517b6e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const entries = [
  { id:"seed_el_colo",   nombre:"El Colo",    avatar:"🧑‍🍳", ciudad:"Buenos Aires", nivel:"Leyenda",       oros:3, platas:1, cobres:0 },
  { id:"seed_la_bochi",  nombre:"La Bochi",   avatar:"👩‍🍳", ciudad:"Córdoba",      nivel:"Gran Maestro",  oros:2, platas:3, cobres:0 },
  { id:"seed_hernan",    nombre:"Hernán",     avatar:"🤠",   ciudad:"Rosario",      nivel:"Gran Maestro",  oros:2, platas:1, cobres:1 },
  { id:"seed_el_turco",  nombre:"El Turco",   avatar:"😎",   ciudad:"Mendoza",      nivel:"Maestro",       oros:1, platas:2, cobres:2 },
  { id:"seed_nadia",     nombre:"Nadia",      avatar:"👩‍🍳", ciudad:"Buenos Aires", nivel:"Maestro",       oros:1, platas:1, cobres:3 },
  { id:"seed_pipe",      nombre:"Pipe",       avatar:"🔥",   ciudad:"Mar del Plata",nivel:"Parrillero",    oros:0, platas:2, cobres:1 },
  { id:"seed_el_gordo",  nombre:"El Gordo",   avatar:"🐂",   ciudad:"Tucumán",      nivel:"Parrillero",    oros:0, platas:1, cobres:2 },
  { id:"seed_caro",      nombre:"Caro",       avatar:"⚡",   ciudad:"Salta",        nivel:"Parrillero",    oros:0, platas:1, cobres:1 },
  { id:"seed_mati",      nombre:"Mati",       avatar:"🧑‍🍳", ciudad:"La Plata",     nivel:"Fogonero",      oros:0, platas:0, cobres:2 },
  { id:"seed_sol",       nombre:"Sol",        avatar:"👩‍🍳", ciudad:"Neuquén",      nivel:"Fogonero",      oros:0, platas:0, cobres:1 },
];

for (const { id, ...data } of entries) {
  await setDoc(doc(db, 'hof_entries', id), {
    ...data,
    uid: id,
    lastUpdated: Date.now(),
  });
  console.log(`✓ ${data.nombre}`);
}

console.log('\nDone! Hall of Fame seeded.');
process.exit(0);
