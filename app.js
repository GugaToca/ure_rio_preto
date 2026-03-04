/* ================= FIREBASE ================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaFK0vEACoCETtl-_SbUB5_47RPd7qKoU",
  authDomain: "cie-escolas.firebaseapp.com",
  projectId: "cie-escolas",
  storageBucket: "cie-escolas.firebasestorage.app",
  messagingSenderId: "396731204195",
  appId: "1:396731204195:web:728732f81caf71e0a16e56"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ================= DOM ================= */

const $ = (id) => document.getElementById(id);

const loginScreen = $("loginScreen");
const appScreen = $("appScreen");
const loginForm = $("loginForm");
const logoutBtn = $("logoutBtn");
const loginError = $("loginError");
const schoolCount = $("schoolCount");

const form = $("schoolForm");
const cieEl = $("cie");
const nomeEl = $("nome");
const ureEl = $("ure");
const municipioEl = $("municipio");
const formMsg = $("formMsg");

const tbody = $("tbody");
const btnReload = $("btnReload");
const btnClear = $("btnClear");

const searchCie = $("searchCie");
const btnSearchCie = $("btnSearchCie");

const searchNome = $("searchNome");
const btnSearchNome = $("btnSearchNome");

const result = $("result");

const bulk = $("bulk");
const btnBulk = $("btnBulk");
const bulkMsg = $("bulkMsg");

const toggleDark = $("toggleDark");

/* ================= HELPERS ================= */

function onlyDigits(str){
  return (str || "").toString().replace(/\D/g,"");
}

function normalizeName(str){
  return (str || "").toString().trim().replace(/\s+/g," ");
}

function setMsg(el,text,type){
  if(!el) return;
  el.className = "msg" + (type ? ` ${type}` : "");
  el.textContent = text || "";
}

function schoolDocRef(cie){
  return doc(db,"escolas",cie);
}

function escapeHtml(str){
  return (str ?? "")
  .toString()
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;")
  .replaceAll("'","&#039;");
}

function currentUid(){
  return auth.currentUser ? auth.currentUser.uid : null;
}

/* ================= LOGIN ================= */

loginForm?.addEventListener("submit", async (e)=>{

  e.preventDefault();

  loginError.textContent="";

  const email=$("loginEmail").value;
  const password=$("loginPassword").value;

  try{

    await signInWithEmailAndPassword(auth,email,password);

  }catch(err){

    loginError.textContent="Email ou senha inválidos";

  }

});

logoutBtn?.addEventListener("click",async()=>{

  await signOut(auth);

});

onAuthStateChanged(auth,(user)=>{

  if(user){

    loginScreen.style.display="none";
    appScreen.style.display="block";

    loadList();

  }else{

    loginScreen.style.display="flex";
    appScreen.style.display="none";

  }

});

/* ================= SALVAR ================= */

form?.addEventListener("submit", async (e)=>{

  e.preventDefault();

  setMsg(formMsg,"","");

  const cie = onlyDigits(cieEl.value);
  const nome = normalizeName(nomeEl.value);
  const ure = normalizeName(ureEl.value) || "São José do Rio Preto";
  const municipio = normalizeName(municipioEl.value);

  if(!cie) return setMsg(formMsg,"CIE inválido","err");
  if(!nome) return setMsg(formMsg,"Nome inválido","err");

  const ref = schoolDocRef(cie);

  const now = Date.now();

  await setDoc(ref,{
    cie,
    nome,
    nomeLower:nome.toLowerCase(),
    municipio,
    ure,
    updatedAt:now,
    updatedBy:currentUid()
  },{merge:true});

  setMsg(formMsg,"Salvo com sucesso","ok");

  cieEl.value="";
  nomeEl.value="";
  municipioEl.value="";

  loadList();

});

/* ================= LIMPAR ================= */

btnClear?.addEventListener("click",()=>{

  cieEl.value="";
  nomeEl.value="";
  municipioEl.value="";

});

/* ================= LISTA ================= */

async function loadList(){

  const q=query(collection(db,"escolas"),orderBy("nomeLower"));
  const snap=await getDocs(q);

  if(schoolCount){
    schoolCount.textContent=snap.size+" escolas cadastradas";
  }

  let rows="";

  snap.forEach(d=>{

    const s=d.data();

    rows+=`
    <tr>
    <td>${escapeHtml(s.nome)}</td>
    <td><code>${escapeHtml(s.cie)}</code></td>
    <td>${escapeHtml(s.municipio)}</td>
    <td>${escapeHtml(s.ure)}</td>
    <td>
      <button class="btn" data-edit="${s.cie}">Editar</button>
      <button class="btn" data-del="${s.cie}">Excluir</button>
    </td>
    </tr>
    `;

  });

  tbody.innerHTML=rows;

  tbody.querySelectorAll("[data-edit]").forEach(btn=>{

    btn.addEventListener("click",()=>fillForm(btn.dataset.edit));

  });

  tbody.querySelectorAll("[data-del]").forEach(btn=>{

    btn.addEventListener("click",async()=>{

      const cie=btn.dataset.del;

      if(!confirm("Excluir escola "+cie+" ?")) return;

      await deleteDoc(schoolDocRef(cie));

      loadList();

    });

  });

}

/* ================= EDITAR ================= */

async function fillForm(cie){

  const snap=await getDoc(schoolDocRef(cie));

  if(!snap.exists()) return;

  const s=snap.data();

  cieEl.value=s.cie;
  nomeEl.value=s.nome;
  municipioEl.value=s.municipio;
  ureEl.value=s.ure;

  window.scrollTo({top:0,behavior:"smooth"});

}

/* ================= BUSCA CIE ================= */

btnSearchCie?.addEventListener("click",async()=>{

  result.innerHTML="";

  const cie=onlyDigits(searchCie.value);

  if(!cie) return;

  const snap=await getDoc(schoolDocRef(cie));

  if(!snap.exists()){
    result.innerHTML="Não encontrado";
    return;
  }

  const s=snap.data();

  result.innerHTML=`
  <strong>${escapeHtml(s.nome)}</strong><br>
  CIE: ${escapeHtml(s.cie)}<br>
  Município: ${escapeHtml(s.municipio)}
  `;

});

/* ================= BUSCA NOME OU MUNICIPIO ================= */

btnSearchNome?.addEventListener("click",async()=>{

  result.innerHTML="";

  const term=normalizeName(searchNome.value).toLowerCase();

  if(term.length<2) return;

  const snap=await getDocs(collection(db,"escolas"));

  let html="";
  let found=0;

  snap.forEach(d=>{

    const s=d.data();

    if(
      (s.nome||"").toLowerCase().includes(term) ||
      (s.municipio||"").toLowerCase().includes(term)
    ){

      html+=`
      <div>
      <strong>${escapeHtml(s.nome)}</strong>
      — ${escapeHtml(s.cie)}
      — ${escapeHtml(s.municipio)}
      </div>
      `;

      found++;

    }

  });

  if(found===0){
    result.innerHTML="Nenhum resultado";
    return;
  }

  result.innerHTML=html;

});

/* ================= ENTER BUSCA ================= */

searchCie?.addEventListener("keypress",e=>{
  if(e.key==="Enter") btnSearchCie.click();
});

searchNome?.addEventListener("keypress",e=>{
  if(e.key==="Enter") btnSearchNome.click();
});

/* ================= BULK ================= */

btnBulk?.addEventListener("click",async()=>{

  const text=(bulk.value||"").trim();

  if(!text) return;

  const lines=text.split("\n");

  let ok=0;

  for(const line of lines){

    const parts=line.split(/;|,|\t/).map(p=>p.trim());

    const nome=normalizeName(parts[0]);
    const cie=onlyDigits(parts[1]);
    const municipio=normalizeName(parts[2]);

    if(!nome || !cie) continue;

    await setDoc(schoolDocRef(cie),{
      cie,
      nome,
      nomeLower:nome.toLowerCase(),
      municipio,
      ure:"São José do Rio Preto",
      updatedAt:Date.now()
    },{merge:true});

    ok++;

  }

  setMsg(bulkMsg,"Importadas "+ok+" escolas","ok");

  loadList();

});

/* ================= RELOAD ================= */

btnReload?.addEventListener("click",loadList);

/* ================= DARK MODE ================= */

if(localStorage.getItem("darkMode")==="true"){
  document.body.classList.add("dark");
}

toggleDark?.addEventListener("click",()=>{

  document.body.classList.toggle("dark");

  const active=document.body.classList.contains("dark");

  localStorage.setItem("darkMode",active);

});

/* ================= TABS ================= */

const tabs=document.querySelectorAll(".tab");

tabs.forEach(tab=>{

  tab.addEventListener("click",()=>{

    tabs.forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");

    document.querySelectorAll(".tabpanel")
    .forEach(p=>p.classList.remove("active"));

    const target=document.getElementById("tab-"+tab.dataset.tab);

    if(target){
      target.classList.add("active");
    }

  });

});