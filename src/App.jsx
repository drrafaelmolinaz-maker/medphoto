import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";

const LS = {
  get: (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};
const KEYS = { patients: "medphoto:patients", doctor: "medphoto:doctor" };

const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};
async function exportPatientPDF(patient, doctor) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, margin = 18;
    const headerH = doctor.logo ? 38 : 30;
    doc.setFillColor(8, 18, 34);
    doc.rect(0, 0, W, headerH, "F");
    doc.setFillColor(45, 212, 191);
    doc.rect(0, headerH, W, 1.2, "F");
    if (doctor.logo) {
      try { doc.addImage(doctor.logo, "JPEG", margin, (headerH-24)/2, 24, 24); } catch(_) {}
    }
    const textX = doctor.logo ? margin+32 : margin;
    doc.setTextColor(226,232,240); doc.setFontSize(13); doc.setFont("helvetica","bold");
    doc.text(doctor.name||"Medico", textX, headerH/2-2);
    const sub=[doctor.specialty,doctor.registration?`Mat. ${doctor.registration}`:""].filter(Boolean).join(" · ");
    if(sub){doc.setTextColor(45,212,191);doc.setFontSize(8);doc.setFont("helvetica","normal");doc.text(sub,textX,headerH/2+5);}
    const contact=[doctor.address,doctor.phone,doctor.email].filter(Boolean);
    if(contact.length){doc.setTextColor(100,116,139);doc.setFontSize(7);contact.forEach((line,i)=>{const tw=doc.getTextWidth(line);doc.text(line,W-margin-tw,headerH/2-2+i*5);});}
    let y=headerH+10;
    doc.setTextColor(226,232,240);doc.setFontSize(14);doc.setFont("helvetica","bold");doc.text("Ficha Quirurgica",margin,y);
    doc.setTextColor(100,116,139);doc.setFontSize(8);doc.setFont("helvetica","normal");
    const dateStr=`Generado el ${new Date().toLocaleDateString("es-AR")}`;
    doc.text(dateStr,W-margin-doc.getTextWidth(dateStr),y);
    y+=8;doc.setDrawColor(26,40,64);doc.line(margin,y,W-margin,y);y+=7;
    const fields=[["Nombre",patient.name],["Edad",patient.age?`${patient.age} anos`:"-"],["Diagnostico",patient.diagnosis],["Fecha",fmtDate(patient.surgeryDate)],["Obra social",patient.insurance]];
    const boxH=10+fields.length*8;
    doc.setFillColor(10,22,40);doc.roundedRect(margin,y,W-margin*2,boxH,3,3,"F");
    let fy=y+7;
    fields.forEach(([label,value])=>{
      doc.setTextColor(100,116,139);doc.setFontSize(7.5);doc.setFont("helvetica","normal");doc.text(label.toUpperCase(),margin+5,fy);
      doc.setTextColor(226,232,240);doc.setFontSize(10);doc.setFont("helvetica","bold");doc.text(String(value||"-"),margin+55,fy);fy+=8;
    });
    y+=boxH+7;
    if(patient.notes){
      doc.setTextColor(100,116,139);doc.setFontSize(7.5);doc.setFont("helvetica","normal");doc.text("OBSERVACIONES",margin,y);y+=5;
      const noteLines=doc.splitTextToSize(patient.notes,W-margin*2-10);const noteBoxH=8+noteLines.length*5;
      doc.setFillColor(10,22,40);doc.roundedRect(margin,y,W-margin*2,noteBoxH,2,2,"F");
      doc.setTextColor(200,210,225);doc.setFontSize(9);doc.text(noteLines,margin+5,y+6);y+=noteBoxH+8;
    }
    const imgW=(W-margin*2-10)/2,imgH=70;
    if(y+imgH+18>275){doc.addPage();y=18;}
    for(const[key,label,x,rgb]of[["prePhoto","PRE-QUIRURGICA",margin,[45,212,191]],["postPhoto","POST-QUIRURGICA",margin+imgW+10,[244,114,182]]]){
      doc.setFillColor(...rgb.map(v=>Math.round(v*0.15)));doc.roundedRect(x,y,imgW,7,2,2,"F");
      doc.setTextColor(...rgb);doc.setFontSize(8);doc.setFont("helvetica","bold");doc.text(label,x+imgW/2-doc.getTextWidth(label)/2,y+5);
      if(patient[key]){try{doc.addImage(patient[key],"JPEG",x,y+8,imgW,imgH);}catch(_){}}
      else{doc.setFillColor(6,13,26);doc.rect(x,y+8,imgW,imgH,"F");}
    }
    doc.setFillColor(8,18,34);doc.rect(0,285,W,12,"F");
    doc.setTextColor(40,65,90);doc.setFontSize(7);doc.text("MedPhoto - Registro Quirurgico",margin,291);
    doc.save(`${patient.name.replace(/\s+/g,"_")}_ficha.pdf`);
  }
  function PhotoUpload({ label, photo, onUpload, accent }) {
    const ref = useRef();
    return (
      <div onClick={() => ref.current.click()} style={{ border:`2px dashed ${photo?accent:"#1e2d45"}`, borderRadius:12, background:photo?"#0a1628":"#060d1a", cursor:"pointer", minHeight:150, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", overflow:"hidden", position:"relative" }}>
        <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={(e)=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=(ev)=>onUpload(ev.target.result);r.readAsDataURL(file);}} />
        {photo?(<>
          <img src={photo} alt={label} style={{width:"100%",height:150,objectFit:"cover"}} />
          <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.75))",color:"#fff",fontSize:10,padding:"8px 10px"}}>{label}</div>
          <div style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.65)",borderRadius:6,padding:"2px 8px",fontSize:10,color:"#aaa"}} onClick={(e)=>{e.stopPropagation();onUpload(null);}}>✕</div>
        </>):(<>
          <div style={{fontSize:26,marginBottom:5,opacity:0.3}}>＋</div>
          <div style={{color:"#2a3e58",fontSize:11}}>{label}</div>
        </>)}
      </div>
    );
  }
  
  function Tag({text,color}){return <span style={{fontSize:10,background:color+"1a",color,border:`1px solid ${color}33`,borderRadius:4,padding:"2px 7px"}}>{text}</span>;}
  function Lbl({t}){return <div style={{color:"#64748b",fontSize:10,letterSpacing:1,marginBottom:5,textTransform:"uppercase"}}>{t}</div>;}
  
  function PatientForm({form,errors,onChange,target}){
    const fs=(err)=>({width:"100%",background:"#060d1a",border:`1px solid ${err?"#f87171":"#1a2840"}`,borderRadius:8,color:"#e2e8f0",padding:"10px 14px",fontSize:14,outline:"none",boxSizing:"border-box"});
    return(<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div style={{gridColumn:"span 2"}}><Lbl t="Nombre completo *"/><input value={form.name} onChange={e=>onChange("name",e.target.value,target)} placeholder="Ej: María González" style={fs(errors.name)}/></div>
        <div><Lbl t="Edad *"/><input type="number" value={form.age} onChange={e=>onChange("age",e.target.value,target)} placeholder="45" style={fs(errors.age)}/></div>
        <div><Lbl t="Fecha de cirugía *"/><input type="date" value={form.surgeryDate} onChange={e=>onChange("surgeryDate",e.target.value,target)} style={fs(errors.surgeryDate)}/></div>
        <div style={{gridColumn:"span 2"}}><Lbl t="Diagnóstico *"/><input value={form.diagnosis} onChange={e=>onChange("diagnosis",e.target.value,target)} placeholder="Ej: Hernia inguinal" style={fs(errors.diagnosis)}/></div>
        <div style={{gridColumn:"span 2"}}><Lbl t="Obra social *"/><input value={form.insurance} onChange={e=>onChange("insurance",e.target.value,target)} placeholder="Ej: OSDE 410" style={fs(errors.insurance)}/></div>
        <div style={{gridColumn:"span 2"}}><Lbl t="Notas"/><textarea value={form.notes} onChange={e=>onChange("notes",e.target.value,target)} rows={3} style={{...fs(false),resize:"vertical"}}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        <div><Lbl t="Foto Pre-quirúrgica"/><PhotoUpload label="PRE-OP" photo={form.prePhoto} onUpload={url=>onChange("prePhoto",url,target)} accent="#2dd4bf"/></div>
        <div><Lbl t="Foto Post-quirúrgica"/><PhotoUpload label="POST-OP" photo={form.postPhoto} onUpload={url=>onChange("postPhoto",url,target)} accent="#f472b6"/></div>
      </div>
    </>);
  }
  function DoctorSettings({doctor,onSave,onClose}){
    const [form,setForm]=useState({...doctor});
    const set=(k,v)=>setForm(f=>({...f,[k]:v}));
    const fs={width:"100%",background:"#060d1a",border:"1px solid #1a2840",borderRadius:8,color:"#e2e8f0",padding:"10px 14px",fontSize:13,outline:"none",boxSizing:"border-box"};
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{background:"#0a1628",border:"1px solid #1a2840",borderRadius:18,padding:24,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div><div style={{fontSize:18,fontWeight:800,color:"#e2e8f0"}}>Datos del Médico</div><div style={{color:"#64748b",fontSize:11,marginTop:2}}>Aparecen en el membrete del PDF</div></div>
            <button onClick={onClose} style={{background:"none",border:"1px solid #1a2840",borderRadius:8,color:"#64748b",padding:"6px 12px",cursor:"pointer"}}>✕</button>
          </div>
          <div style={{marginBottom:16}}>
            <Lbl t="Logo"/>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{width:64,height:64,borderRadius:10,overflow:"hidden",background:"#060d1a",border:`2px dashed ${form.logo?"#2dd4bf":"#1a2840"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {form.logo?<img src={form.logo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:22,opacity:0.3}}>🏥</span>}
              </div>
              <div>
                <label style={{display:"inline-block",background:"#0d1b2e",border:"1px solid #1a2840",borderRadius:8,color:"#2dd4bf",fontSize:12,padding:"8px 14px",cursor:"pointer",marginBottom:4}}>
                  Subir logo<input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>set("logo",ev.target.result);r.readAsDataURL(file);}}/>
                </label>
                {form.logo&&<button onClick={()=>set("logo",null)} style={{display:"block",background:"none",border:"none",color:"#f87171",fontSize:11,cursor:"pointer",padding:0}}>✕ Quitar</button>}
              </div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{gridColumn:"span 2"}}><Lbl t="Nombre / Institución"/><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Dr. Juan Pérez" style={fs}/></div>
            <div><Lbl t="Especialidad"/><input value={form.specialty} onChange={e=>set("specialty",e.target.value)} placeholder="Cirugía General" style={fs}/></div>
            <div><Lbl t="Matrícula"/><input value={form.registration} onChange={e=>set("registration",e.target.value)} placeholder="12345" style={fs}/></div>
            <div style={{gridColumn:"span 2"}}><Lbl t="Dirección"/><input value={form.address} onChange={e=>set("address",e.target.value)} placeholder="Av. Corrientes 1234" style={fs}/></div>
            <div><Lbl t="Teléfono"/><input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+54 11 1234-5678" style={fs}/></div>
            <div><Lbl t="Email"/><input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="dr@clinica.com" style={fs}/></div>
          </div>
          <button onClick={()=>{onSave(form);onClose();}} style={{marginTop:16,background:"linear-gradient(135deg,#2dd4bf,#0ea5e9)",border:"none",borderRadius:8,color:"#040b14",fontWeight:700,padding:"12px 0",fontSize:14,cursor:"pointer",width:"100%"}}>Guardar</button>
        </div>
      </div>
    );
  }
  const emptyDoctor={name:"",specialty:"",registration:"",address:"",phone:"",email:"",logo:null};
const emptyPatient={name:"",age:"",diagnosis:"",surgeryDate:"",insurance:"",notes:"",prePhoto:null,postPhoto:null};

export default function App(){
  const [patients,setPatients]=useState(()=>LS.get(KEYS.patients,[]));
  const [doctor,setDoctor]=useState(()=>LS.get(KEYS.doctor,emptyDoctor));
  const [saveStatus,setSaveStatus]=useState(null);
  const [view,setView]=useState("list");
  const [form,setForm]=useState(emptyPatient);
  const [selected,setSelected]=useState(null);
  const [errors,setErrors]=useState({});
  const [exporting,setExporting]=useState(null);
  const [showDoctor,setShowDoctor]=useState(false);
  const [search,setSearch]=useState("");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");
  const [photoFilter,setPhotoFilter]=useState("all");

  const isFirst=useRef(true);
  useEffect(()=>{
    if(isFirst.current){isFirst.current=false;return;}
    setSaveStatus("saving");LS.set(KEYS.patients,patients);setSaveStatus("saved");
    const t=setTimeout(()=>setSaveStatus(null),2000);return()=>clearTimeout(t);
  },[patients]);

  const saveDoctor=(data)=>{setDoctor(data);LS.set(KEYS.doctor,data);};
  const filtered=patients.filter(p=>{
    const kw=search.toLowerCase();
    const matchKw=!kw||[p.name,p.diagnosis,p.insurance,p.notes||""].some(v=>v.toLowerCase().includes(kw));
    const matchFrom=!dateFrom||(p.surgeryDate&&p.surgeryDate>=dateFrom);
    const matchTo=!dateTo||(p.surgeryDate&&p.surgeryDate<=dateTo);
    const hasAll=!!(p.prePhoto&&p.postPhoto);
    const matchPhoto=photoFilter==="all"||(photoFilter==="complete"&&hasAll)||(photoFilter==="incomplete"&&!hasAll);
    return matchKw&&matchFrom&&matchTo&&matchPhoto;
  });
  const hasFilters=search||dateFrom||dateTo||photoFilter!=="all";
  const clearFilters=()=>{setSearch("");setDateFrom("");setDateTo("");setPhotoFilter("all");};
  const validate=()=>{
    const e={};
    if(!form.name.trim())e.name=true;if(!form.age||isNaN(form.age))e.age=true;
    if(!form.diagnosis.trim())e.diagnosis=true;if(!form.surgeryDate)e.surgeryDate=true;
    if(!form.insurance.trim())e.insurance=true;setErrors(e);return!Object.keys(e).length;
  };
  const saveP=()=>{if(!validate())return;setPatients(p=>[{...form,id:Date.now()},...p]);setForm(emptyPatient);setView("list");};
  const updateP=()=>{setPatients(p=>p.map(x=>x.id===selected.id?{...selected}:x));setView("list");setSelected(null);};
  const delP=()=>{if(!confirm("¿Eliminar?"))return;setPatients(p=>p.filter(x=>x.id!==selected.id));setView("list");setSelected(null);};
  const inp=(field,val,target)=>target==="form"?setForm(f=>({...f,[field]:val})):setSelected(s=>({...s,[field]:val}));
  const handleExport=async(patient)=>{setExporting(patient.id);try{await exportPatientPDF(patient,doctor);}catch(e){alert("Error PDF");}setExporting(null);};
  const fs=(err)=>({width:"100%",background:"#060d1a",border:`1px solid ${err?"#f87171":"#1a2840"}`,borderRadius:8,color:"#e2e8f0",padding:"10px 14px",fontSize:14,outline:"none",boxSizing:"border-box"});
  const doctorOk=!!(doctor.name||doctor.logo);

  return(
    <div style={{minHeight:"100vh",background:"#040b14",fontFamily:"system-ui,sans-serif",color:"#e2e8f0"}}>
      <style>{`*{box-sizing:border-box}input,textarea,select{color-scheme:dark}input::placeholder,textarea::placeholder{color:#2a3a50}select option{background:#0a1628}body{margin:0}.pcard{transition:border-color 0.18s,transform 0.18s;cursor:pointer}.pcard:hover{border-color:#2dd4bf !important;transform:translateY(-1px)}`}</style>
      {showDoctor&&<DoctorSettings doctor={doctor} onSave={saveDoctor} onClose={()=>setShowDoctor(false)}/>}
      <div style={{borderBottom:"1px solid #0d1b2e",padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(4,11,20,0.97)",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {doctor.logo?<img src={doctor.logo} style={{width:34,height:34,borderRadius:8,objectFit:"cover"}}/>:<div style={{width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#2dd4bf,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🔬</div>}
          <div>
            <div style={{fontSize:16,fontWeight:800}}>{doctor.name||"MedPhoto"}</div>
            <div style={{fontSize:10,color:"#64748b",display:"flex",gap:6,alignItems:"center"}}>
              {doctor.specialty||"REGISTRO QUIRÚRGICO"}
              {saveStatus==="saving"&&<span style={{color:"#f97316"}}>● guardando</span>}
              {saveStatus==="saved"&&<span style={{color:"#a3e635"}}>✓ guardado</span>}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:7}}>
          <button onClick={()=>setShowDoctor(true)} style={{background:doctorOk?"#0d1b2e":"rgba(45,212,191,0.1)",border:`1px solid ${doctorOk?"#1a2840":"#2dd4bf55"}`,borderRadius:8,color:doctorOk?"#64748b":"#2dd4bf",padding:"6px 12px",fontSize:12,cursor:"pointer"}}>⚙ Médico</button>
          {view!=="list"&&<button onClick={()=>{setView("list");setSelected(null);}} style={{background:"none",border:"1px solid #1a2840",borderRadius:8,color:"#64748b",padding:"6px 12px",fontSize:12,cursor:"pointer"}}>← Volver</button>}
          {view==="list"&&<button onClick={()=>{setForm(emptyPatient);setErrors({});setView("new");}} style={{background:"linear-gradient(135deg,#2dd4bf,#0ea5e9)",border:"none",borderRadius:8,color:"#040b14",fontWeight:700,padding:"7px 14px",fontSize:13,cursor:"pointer"}}>+ Nuevo</button>}
        </div>
      </div>

      <div style={{maxWidth:800,margin:"0 auto",padding:"20px 14px"}}>
        {view==="list"&&(<>
          <div style={{background:"#0a1628",border:"1px solid #1a2840",borderRadius:12,padding:"14px 16px",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:11,color:"#64748b"}}>🔍 FILTROS</span>
              {hasFilters&&<button onClick={clearFilters} style={{background:"none",border:"1px solid #2a1a2a",borderRadius:5,color:"#f472b6",fontSize:10,padding:"2px 8px",cursor:"pointer"}}>✕ limpiar</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{gridColumn:"span 2"}}><Lbl t="Palabra clave"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nombre, diagnóstico…" style={fs(false)}/></div>
              <div><Lbl t="Desde"/><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={fs(false)}/></div>
              <div><Lbl t="Hasta"/><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={fs(false)}/></div>
              <div style={{gridColumn:"span 2"}}><Lbl t="Fotos"/><select value={photoFilter} onChange={e=>setPhotoFilter(e.target.value)} style={{...fs(false),cursor:"pointer"}}><option value="all">Todos</option><option value="complete">Completas</option><option value="incomplete">Incompletas</option></select></div>
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            {[["Total",patients.length,"#64748b"],["Filtrados",filtered.length,"#2dd4bf"],["Con fotos",patients.filter(p=>p.prePhoto&&p.postPhoto).length,"#f472b6"]].map(([label,count,color])=>(
              <div key={label} style={{background:"#0a1628",border:"1px solid #1a2840",borderRadius:10,padding:"7px 14px",display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:18,fontWeight:800,color}}>{count}</span>
                <span style={{fontSize:10,color:"#64748b"}}>{label}</span>
              </div>
            ))}
          </div>
          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"60px 0",color:"#1a2840"}}>
              <div style={{fontSize:40,marginBottom:10}}>🏥</div>
              <div style={{fontSize:18,fontWeight:700}}>{patients.length===0?"Sin pacientes registrados":"Sin resultados"}</div>
              <div style={{fontSize:12,color:"#2a3a50",marginTop:6}}>{patients.length===0?"Tocá + Nuevo para agregar":"Ajustá los filtros"}</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {filtered.map(p=>(
                <div key={p.id} className="pcard" style={{background:"linear-gradient(135deg,#0d1b2e,#0a1628)",border:"1px solid #1a2840",borderRadius:12,padding:"13px 14px",display:"flex",gap:12,alignItems:"center"}} onClick={()=>{setSelected({...p});setView("detail");}}>
                  <div style={{width:46,height:46,borderRadius:9,overflow:"hidden",background:"#0a1628",flexShrink:0,border:"1px solid #1a2840",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {p.prePhoto?<img src={p.prePhoto} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:18}}>🏥</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                    <div style={{color:"#64748b",fontSize:11,marginTop:1}}>{p.age} años · {p.diagnosis}</div>
                    <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
                      {p.surgeryDate&&<Tag text={fmtDate(p.surgeryDate)} color="#2dd4bf"/>}
                      <Tag text={p.insurance} color="#0ea5e9"/>
                      {p.prePhoto&&p.postPhoto?<Tag text="✓ fotos" color="#a3e635"/>:<Tag text="sin fotos" color="#f97316"/>}
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();handleExport(p);}} disabled={exporting===p.id} style={{background:"#0d1b2e",border:"1px solid #1a2840",borderRadius:7,color:"#2dd4bf",fontSize:11,padding:"5px 10px",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    {exporting===p.id?"⏳":"↓ PDF"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>)}

        {view==="new"&&(
          <div>
            <div style={{fontSize:20,fontWeight:800,marginBottom:20}}>Nuevo Paciente</div>
            <PatientForm form={form} errors={errors} onChange={inp} target="form"/>
            {Object.keys(errors).length>0&&<div style={{color:"#f87171",fontSize:12,marginBottom:12}}>⚠ Completá los campos obligatorios (*)</div>}
            <button onClick={saveP} style={{background:"linear-gradient(135deg,#2dd4bf,#0ea5e9)",border:"none",borderRadius:8,color:"#040b14",fontWeight:700,padding:"13px 0",fontSize:15,cursor:"pointer",width:"100%"}}>Guardar Paciente</button>
          </div>
        )}

        {view==="detail"&&selected&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div><div style={{fontSize:20,fontWeight:800}}>{selected.name}</div><div style={{color:"#2dd4bf",fontSize:10,marginTop:2}}>ID #{selected.id}</div></div>
              <button onClick={()=>handleExport(selected)} disabled={exporting===selected.id} style={{background:"linear-gradient(135deg,#0ea5e9,#2dd4bf)",border:"none",borderRadius:8,color:"#040b14",fontWeight:700,padding:"8px 16px",fontSize:13,cursor:"pointer"}}>
                {exporting===selected.id?"⏳…":"↓ PDF"}
              </button>
            </div>
            <PatientForm form={selected} errors={{}} onChange={inp} target="sel"/>
            {selected.prePhoto&&selected.postPhoto&&(
              <div style={{background:"#0a1628",border:"1px solid #1a2840",borderRadius:12,padding:12,marginBottom:18}}>
                <Lbl t="Comparativa Pre / Post"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:8}}>
                  {[["prePhoto","#2dd4bf","PRE-OP"],["postPhoto","#f472b6","POST-OP"]].map(([key,color,tag])=>(
                    <div key={key} style={{position:"relative"}}>
                      <img src={selected[key]} style={{width:"100%",height:170,objectFit:"cover",borderRadius:8}}/>
                      <div style={{position:"absolute",top:6,left:6,background:color,color:"#040b14",fontSize:9,padding:"2px 7px",borderRadius:4,fontWeight:700}}>{tag}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{display:"flex",gap:10}}>
              <button onClick={updateP} style={{background:"linear-gradient(135deg,#2dd4bf,#0ea5e9)",border:"none",borderRadius:8,color:"#040b14",fontWeight:700,padding:"12px 0",fontSize:15,cursor:"pointer",flex:1}}>Guardar cambios</button>
              <button onClick={delP} style={{background:"none",border:"1px solid #7f1d1d",borderRadius:8,color:"#f87171",fontWeight:600,padding:"12px 18px",fontSize:15,cursor:"pointer"}}>Eliminar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
