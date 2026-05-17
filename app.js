/* GymFlow - app web estática deployable.
   Modo demo/local por defecto. Para conectar Supabase, completar SUPABASE_URL y SUPABASE_ANON_KEY. */
const CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DEMO_USERS = [
  { email:'socio@gymflow.com', password:'123456', name:'Socio demo', role:'socio' },
  { email:'profesor@gymflow.com', password:'123456', name:'Profesor demo', role:'profesor' }
];
const seed = {
  students:[
    {id:crypto.randomUUID(), name:'Franco Colas', phone:'', created_at:'2026-02-02', status:'activo', notes:'', routine:'Entrada en calor 10 min\nSentadilla 4x8\nPress banca 4x8\nRemo 3x10\nAbdominales 3x15'},
    {id:crypto.randomUUID(), name:'Mati Cesario', phone:'', created_at:'2026-02-02', status:'activo', notes:'', routine:'Fuerza general\nPeso muerto 4x6\nDominadas 4xMáx\nPress militar 3x8'},
    {id:crypto.randomUUID(), name:'Valen Oliverio', phone:'', created_at:'2026-03-05', status:'activo', notes:'', routine:'Hipertrofia tren inferior\nPrensa 4x10\nEstocadas 3x12\nCurl femoral 3x12'},
    {id:crypto.randomUUID(), name:'Pierina', phone:'', created_at:'2026-03-10', status:'activo', notes:'', routine:'Funcional\nCircuito 5 vueltas\nKettlebell swing 15\nBurpees 10\nPlancha 45 seg'}
  ], payments:[], costs:[
    {id:crypto.randomUUID(), description:'Alquiler', category:'Alquiler', amount:500000, date:'2026-05-01', notes:''},
    {id:crypto.randomUUID(), description:'Sueldos profesores', category:'Sueldos', amount:650000, date:'2026-05-01', notes:''},
    {id:crypto.randomUUID(), description:'Servicios', category:'Servicios', amount:130000, date:'2026-05-01', notes:''}
  ], attendances:[]
};
const plans = ['Dos veces por semana','Tres veces por semana','Libre','Personalizado'];
const initialPayments = [
  ['Franco Colas',40000,'Efectivo','Dos veces por semana','2026-02-02'],['Mati Cesario',42000,'Efectivo','Libre','2026-02-02'],['Valen Oliverio',40000,'Mercado Pago','Tres veces por semana','2026-03-05'],['Pierina',40000,'Mercado Pago','Tres veces por semana','2026-03-10'],
  ['Franco Colas',40000,'Efectivo','Tres veces por semana','2026-04-01'],['Mati Cesario',40000,'Efectivo','Tres veces por semana','2026-04-07'],['Valen Oliverio',40000,'Mercado Pago','Tres veces por semana','2026-04-15'],['Pierina',38000,'Mercado Pago','Dos veces por semana','2026-04-16'],
  ['Franco Colas',40000,'Efectivo','Dos veces por semana','2026-05-01'],['Mati Cesario',44000,'Mercado Pago','Tres veces por semana','2026-05-04'],['Valen Oliverio',44000,'Mercado Pago','Tres veces por semana','2026-05-05'],['Pierina',44000,'Mercado Pago','Tres veces por semana','2026-05-08']
];
initialPayments.forEach(([name,amount,method,plan,date])=>{
  const s=seed.students.find(x=>x.name===name);
  if(s) seed.payments.push({id:crypto.randomUUID(), student_id:s.id, amount, method, plan, date, notes:''});
});

let state = {
  user: JSON.parse(localStorage.getItem('gf_user')||'null'),
  data: JSON.parse(localStorage.getItem('gf_data')||'null') || seed,
  page:'dashboard', selectedMonth: monthKey(new Date()), selectedStudentId:null, modal:null, search:''
};
let supa = null;
if(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase){
  supa = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
}
function save(){ localStorage.setItem('gf_data', JSON.stringify(state.data)); }
function setUser(u){ state.user=u; localStorage.setItem('gf_user', JSON.stringify(u)); render(); }
function fmt(n){ return '$'+Math.round(Number(n)||0).toLocaleString('es-AR'); }
function monthKey(date){ const d = typeof date==='string'? new Date(date+'T00:00:00') : date; return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function monthLabel(k){ const [y,m]=k.split('-').map(Number); return `${MONTH_NAMES[m-1]} ${y}`; }
function months(){ const keys = new Set(); state.data.payments.forEach(p=>keys.add(monthKey(p.date))); state.data.costs.forEach(c=>keys.add(monthKey(c.date))); return Array.from(keys).sort(); }
function canSeeFinancials(){ return state.user && state.user.role !== 'profesor'; }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
function studentName(id){ return state.data.students.find(s=>s.id===id)?.name || '—'; }
function calc(mk){
  const ps=state.data.payments.filter(p=>mk==='all'||monthKey(p.date)===mk), cs=state.data.costs.filter(c=>mk==='all'||monthKey(c.date)===mk);
  const income=ps.reduce((a,p)=>a+Number(p.amount||0),0), costs=cs.reduce((a,c)=>a+Number(c.amount||0),0);
  return {income,costs,net:income-costs,payments:ps,costItems:cs,students:new Set(ps.map(p=>p.student_id)).size};
}
function app(){
  if(!state.user) return loginView();
  const nav = canSeeFinancials()
    ? `<button class="${state.page==='dashboard'?'active':''}" onclick="go('dashboard')">Dashboard</button><button class="${state.page==='students'?'active':''}" onclick="go('students')">Alumnos</button><button class="${state.page==='costs'?'active':''}" onclick="go('costs')">Costos</button>`
    : `<button class="${state.page==='students'?'active':''}" onclick="go('students')">Alumnos y rutinas</button>`;
  if(!canSeeFinancials() && state.page!=='students') state.page='students';
  return `<div class="app-shell"><div class="topbar"><div class="title">GymFlow</div><div class="nav">${nav}</div><div class="userbox"><span>${escapeHtml(state.user.name)}</span><span class="role-pill">${escapeHtml(state.user.role)}</span><button class="btn ghost small" onclick="logout()">Salir</button></div></div><main>${pageView()}</main>${modalView()}</div>`;
}
function loginView(){ return `<section class="login"><div class="login-card"><div class="brand"><div class="logo">GF</div><div><h1>GymFlow</h1><p>Gestión de alumnos, pagos, costos y rutinas</p></div></div><form onsubmit="login(event)"><div class="field"><label>Email</label><input id="email" type="email" value="socio@gymflow.com" required></div><div class="field"><label>Contraseña</label><input id="password" type="password" value="123456" required></div><button class="btn primary full">Ingresar</button></form><div class="hint"><b>Usuarios demo:</b><br>Socio: socio@gymflow.com / 123456<br>Profesor: profesor@gymflow.com / 123456<br><br>Cuando conectes Supabase, estos usuarios se reemplazan por usuarios reales.</div></div></section>`; }
async function login(e){ e.preventDefault(); const email=document.getElementById('email').value.trim().toLowerCase(), password=document.getElementById('password').value;
  if(supa){ const {data,error}=await supa.auth.signInWithPassword({email,password}); if(error){alert(error.message);return;} const {data:profile}=await supa.from('profiles').select('*').eq('id',data.user.id).single(); setUser({id:data.user.id,email,name:profile?.name||email,role:profile?.role||'profesor'}); return; }
  const u=DEMO_USERS.find(x=>x.email===email && x.password===password); if(!u){alert('Usuario o contraseña incorrectos');return;} setUser({email:u.email,name:u.name,role:u.role}); }
function logout(){ localStorage.removeItem('gf_user'); state.user=null; render(); }
function go(p){ state.page=p; render(); }
function pageView(){ if(state.page==='students') return studentsView(); if(state.page==='costs' && canSeeFinancials()) return costsView(); return dashboardView(); }
function monthTabs(includeAll=false){ const ms=months(); const opts=(includeAll?['all']:[]).concat(ms); if(!opts.includes(state.selectedMonth)) state.selectedMonth=opts[opts.length-1]||monthKey(new Date()); return `<div class="tabs">${opts.map(m=>`<button class="tab ${m===state.selectedMonth?'active':''}" onclick="setMonth('${m}')">${m==='all'?'Total acumulado':monthLabel(m)}</button>`).join('')}</div>`; }
function setMonth(m){ state.selectedMonth=m; render(); }
function dashboardView(){ const c=calc(state.selectedMonth); const ms=months(); const max=Math.max(1,...ms.map(m=>calc(m).income)); const max2=Math.max(1,...ms.map(m=>calc(m).costs));
  return `<section class="page"><div class="page-head"><div><h2>Dashboard</h2><div class="sub">Lectura rápida del rendimiento mensual y acumulado.</div></div><button class="btn primary" onclick="openModal('payment')">+ Registrar pago</button></div>${monthTabs(true)}<div class="kpis"><div class="kpi"><label>Ingresos</label><strong>${fmt(c.income)}</strong><span>${c.payments.length} pagos</span></div><div class="kpi"><label>Costos</label><strong>${fmt(c.costs)}</strong><span>${c.costItems.length} ítems</span></div><div class="kpi"><label>Ganancia</label><strong style="color:${c.net>=0?'var(--green)':'var(--red)'}">${fmt(c.net)}</strong><span>${c.net>=0?'Resultado positivo':'Resultado negativo'}</span></div><div class="kpi"><label>Alumnos cobrados</label><strong>${c.students}</strong><span>En el período</span></div></div><div class="grid"><div class="card"><div class="card-title">Comparativo ingresos / costos / ganancia</div><div class="bars">${ms.map(m=>{const x=calc(m), netPct=Math.max(0,Math.round((Math.abs(x.net)/Math.max(max,max2))*100));return `<div class="bar"><div class="bar-name">${monthLabel(m).slice(0,3)}</div><div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(x.income/max*100)}%"></div></div><div class="bar-track" style="margin-top:4px"><div class="bar-fill cost" style="width:${Math.round(x.costs/max2*100)}%"></div></div><div class="bar-track" style="margin-top:4px"><div class="bar-fill net" style="width:${netPct}%"></div></div></div><div class="bar-val">${fmt(x.net)}</div></div>`}).join('')}</div></div><div class="card"><div class="card-title">Últimos pagos</div>${paymentsTable(c.payments.slice(-7).reverse())}</div></div></section>`; }
function paymentsTable(list){ if(!list.length)return '<div class="empty">Sin pagos registrados</div>'; return `<div class="table-wrap"><table><thead><tr><th>Alumno</th><th>Monto</th><th>Medio</th><th>Fecha</th></tr></thead><tbody>${list.map(p=>`<tr><td>${escapeHtml(studentName(p.student_id))}</td><td><b>${fmt(p.amount)}</b></td><td><span class="badge ${p.method==='Efectivo'?'ef':'mp'}">${escapeHtml(p.method)}</span></td><td>${p.date}</td></tr>`).join('')}</tbody></table></div>`; }
function studentsView(){ const q=state.search.toLowerCase(); const list=state.data.students.filter(s=>s.name.toLowerCase().includes(q)); const selected=state.data.students.find(s=>s.id===state.selectedStudentId)||list[0]; if(selected) state.selectedStudentId=selected.id;
  return `<section class="page"><div class="page-head"><div><h2>Alumnos</h2><div class="sub">Ficha completa, historial de pagos y rutina.</div></div><div class="actions"><button class="btn primary" onclick="openModal('student')">+ Nuevo alumno</button>${canSeeFinancials()?'<button class="btn ghost" onclick="openModal(\'payment\')">+ Pago</button>':''}</div></div><div class="toolbar"><input class="search" placeholder="Buscar alumno..." value="${escapeHtml(state.search)}" oninput="state.search=this.value;render()"></div><div class="grid"><div class="card"><div class="card-title">Listado</div>${studentsTable(list)}</div><div class="card"><div class="card-title">Ficha del alumno</div>${selected?studentProfile(selected):'<div class="empty">Seleccioná un alumno</div>'}</div></div></section>`; }
function studentsTable(list){ if(!list.length)return '<div class="empty">Sin alumnos</div>'; return `<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Estado</th><th>Alta</th><th></th></tr></thead><tbody>${list.map(s=>`<tr><td><b>${escapeHtml(s.name)}</b></td><td><span class="badge ${s.status}">${s.status}</span></td><td>${s.created_at||''}</td><td><button class="btn ghost small" onclick="selectStudent('${s.id}')">Ver</button></td></tr>`).join('')}</tbody></table></div>`; }
function selectStudent(id){ state.selectedStudentId=id; render(); }
function studentProfile(s){ const ps=state.data.payments.filter(p=>p.student_id===s.id).sort((a,b)=>b.date.localeCompare(a.date)); const total=ps.reduce((a,p)=>a+Number(p.amount||0),0); const first=ps.length?ps[ps.length-1].date:'—', last=ps.length?ps[0].date:'—';
  return `<div class="profile"><div><div class="detail-list"><div class="detail-row"><span>Nombre</span><b>${escapeHtml(s.name)}</b></div><div class="detail-row"><span>Estado</span><span class="badge ${s.status}">${s.status}</span></div><div class="detail-row"><span>Total abonado</span><b>${fmt(total)}</b></div><div class="detail-row"><span>Meses pagos</span><b>${ps.length}</b></div><div class="detail-row"><span>Primer pago</span><b>${first}</b></div><div class="detail-row"><span>Último pago</span><b>${last}</b></div></div><div style="margin-top:14px" class="actions"><button class="btn ghost small" onclick="openModal('routine')">Editar rutina</button>${canSeeFinancials()?`<button class="btn danger small" onclick="deleteStudent('${s.id}')">Eliminar</button>`:''}</div></div><div><b style="font-size:13px">Rutina actual</b><div class="routine-box" style="margin-top:8px">${escapeHtml(s.routine||'Sin rutina cargada')}</div></div></div><div style="margin-top:16px"><div class="card-title">Historial de pagos</div>${paymentsTable(ps)}</div>`; }
function costsView(){ const c=calc(state.selectedMonth); const list=c.costItems; return `<section class="page"><div class="page-head"><div><h2>Costos</h2><div class="sub">Egresos operativos del gimnasio.</div></div><button class="btn primary" onclick="openModal('cost')">+ Nuevo costo</button></div>${monthTabs(true)}<div class="kpis"><div class="kpi"><label>Total costos</label><strong style="color:var(--red)">${fmt(c.costs)}</strong><span>${list.length} ítems</span></div></div><div class="card"><div class="card-title">Costos registrados</div>${costsTable(list)}</div></section>`; }
function costsTable(list){ if(!list.length)return '<div class="empty">Sin costos</div>'; return `<div class="table-wrap"><table><thead><tr><th>Descripción</th><th>Categoría</th><th>Monto</th><th>Fecha</th><th></th></tr></thead><tbody>${list.map(c=>`<tr><td>${escapeHtml(c.description)}</td><td>${escapeHtml(c.category)}</td><td><b>${fmt(c.amount)}</b></td><td>${c.date}</td><td><button class="btn danger small" onclick="deleteCost('${c.id}')">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`; }
function openModal(m){ state.modal=m; render(); }
function closeModal(){ state.modal=null; render(); }
function modalView(){ if(!state.modal)return ''; const m=state.modal; let body='';
 if(m==='student') body=`<h3>Nuevo alumno</h3><form onsubmit="addStudent(event)"><div class="form-grid"><div class="field full"><label>Nombre</label><input id="s_name" required></div><div class="field"><label>Teléfono</label><input id="s_phone"></div><div class="field"><label>Estado</label><select id="s_status"><option>activo</option><option>inactivo</option><option>baja</option></select></div><div class="field full"><label>Rutina</label><textarea id="s_routine" placeholder="Ejercicios, series, repeticiones..."></textarea></div></div><div class="modal-actions"><button type="button" class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
 if(m==='payment') body=`<h3>Registrar pago</h3><form onsubmit="addPayment(event)"><div class="form-grid"><div class="field full"><label>Alumno</label><select id="p_student">${state.data.students.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select></div><div class="field"><label>Monto</label><input id="p_amount" type="number" required></div><div class="field"><label>Medio</label><select id="p_method"><option>Mercado Pago</option><option>Efectivo</option><option>Transferencia</option></select></div><div class="field"><label>Plan</label><select id="p_plan">${plans.map(p=>`<option>${p}</option>`).join('')}</select></div><div class="field"><label>Fecha</label><input id="p_date" type="date" value="${new Date().toISOString().slice(0,10)}" required></div></div><div class="modal-actions"><button type="button" class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
 if(m==='cost') body=`<h3>Nuevo costo</h3><form onsubmit="addCost(event)"><div class="form-grid"><div class="field full"><label>Descripción</label><input id="c_desc" required></div><div class="field"><label>Categoría</label><select id="c_cat"><option>Alquiler</option><option>Sueldos</option><option>Servicios</option><option>Equipamiento</option><option>Marketing</option><option>Otros</option></select></div><div class="field"><label>Monto</label><input id="c_amount" type="number" required></div><div class="field"><label>Fecha</label><input id="c_date" type="date" value="${new Date().toISOString().slice(0,10)}" required></div></div><div class="modal-actions"><button type="button" class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
 if(m==='routine'){ const s=state.data.students.find(x=>x.id===state.selectedStudentId); body=`<h3>Editar rutina</h3><form onsubmit="saveRoutine(event)"><div class="field"><label>Alumno</label><input value="${escapeHtml(s?.name||'')}" disabled></div><div class="field"><label>Rutina</label><textarea id="r_text">${escapeHtml(s?.routine||'')}</textarea></div><div class="modal-actions"><button type="button" class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`; }
 return `<div class="modal-bg open"><div class="modal">${body}</div></div>`; }
function addStudent(e){ e.preventDefault(); const s={id:crypto.randomUUID(),name:s_name.value.trim(),phone:s_phone.value.trim(),created_at:new Date().toISOString().slice(0,10),status:s_status.value,notes:'',routine:s_routine.value.trim()}; state.data.students.push(s); state.selectedStudentId=s.id; save(); closeModal(); }
function addPayment(e){ e.preventDefault(); state.data.payments.push({id:crypto.randomUUID(),student_id:p_student.value,amount:Number(p_amount.value),method:p_method.value,plan:p_plan.value,date:p_date.value,notes:''}); state.selectedMonth=monthKey(p_date.value); save(); closeModal(); }
function addCost(e){ e.preventDefault(); state.data.costs.push({id:crypto.randomUUID(),description:c_desc.value.trim(),category:c_cat.value,amount:Number(c_amount.value),date:c_date.value,notes:''}); state.selectedMonth=monthKey(c_date.value); save(); closeModal(); }
function saveRoutine(e){ e.preventDefault(); const s=state.data.students.find(x=>x.id===state.selectedStudentId); if(s){s.routine=r_text.value;} save(); closeModal(); }
function deleteStudent(id){ if(!confirm('¿Eliminar alumno y pagos asociados?'))return; state.data.students=state.data.students.filter(s=>s.id!==id); state.data.payments=state.data.payments.filter(p=>p.student_id!==id); state.selectedStudentId=null; save(); render(); }
function deleteCost(id){ if(!confirm('¿Eliminar costo?'))return; state.data.costs=state.data.costs.filter(c=>c.id!==id); save(); render(); }
function render(){ document.getElementById('app').innerHTML=app(); }
render();
