// Persönlicher Urlaubskalender mit E-Mail-Magic-Link und Supabase RLS.
const cfg=window.URLAUB_AUTH_CONFIG||{};
const $=id=>document.getElementById(id);
const info=$("accountInfo"),login=$("loginForm"),logout=$("logoutForm"),hint=$("accountHint"),loginButton=$("loginButton");
const enabled=Boolean(cfg.url&&cfg.anonKey);
const validURL=(()=>{try{return new URL(cfg.url).protocol==="https:"}catch{return false}})();
const message=text=>{info.textContent=text};
function loggedOut(){document.body.classList.add("cloud-locked");login.classList.remove("hide");logout.classList.add("hide");message("Mit deiner E-Mail-Adresse anmelden, um deinen persönlichen Urlaubsplan zu öffnen.");hint.textContent="Du erhältst einen einmaligen Anmeldelink. Keine Passwörter nötig."}
function loggedIn(email){login.classList.add("hide");logout.classList.remove("hide");message("Angemeldet als "+email);hint.textContent="Deine Daten werden geschützt online gespeichert und bleiben auch nach dem Löschen des Browserverlaufs erhalten."}
if(!enabled){
  login.classList.add("hide");
  message("Online-Anmeldung ist noch nicht eingerichtet – derzeit nur lokale Speicherung!");
  hint.textContent="Achtung: Beim Löschen von Browserdaten können Urlaubseinträge verloren gehen. Erst mit eingerichteter Cloud-Datenbank sind sie dauerhaft online gesichert.";
}else if(!validURL){
  document.body.classList.add("cloud-locked");login.classList.add("hide");
  message("Ungültige Cloud-Einstellungen. HTTPS-Adresse erforderlich.");
}else{
  document.body.classList.add("cloud-locked");
  message("Anmeldedienst wird geladen …");
  try{
    const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    const client=createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    let userId=null,pending=null,timer=null,writeQueue=Promise.resolve(),loadToken=0;
    async function persist(snapshot,uid){
      if(!uid)throw Error("Nicht angemeldet.");
      writeQueue=writeQueue.catch(()=>{}).then(async()=>{
        const {error}=await client.from("vacation_plans").upsert({user_id:uid,data:snapshot,updated_at:new Date().toISOString()},{onConflict:"user_id"});
        if(error)throw error;
      });
      await writeQueue;
      message("Angemeldet – Urlaubsdaten online gespeichert.");
    }
    async function flush(){
      if(timer!==null){clearTimeout(timer);timer=null}
      if(pending){const snapshot=pending;pending=null;await persist(snapshot,userId)}
      else await writeQueue;
    }
    window.urlaubCloudSave=value=>{
      if(!userId){message("Bitte zuerst anmelden – keine Daten gespeichert.");return}
      pending=JSON.parse(JSON.stringify(value));
      if(timer!==null)clearTimeout(timer);
      message("Änderungen werden online gespeichert …");
      timer=setTimeout(async()=>{timer=null;const snapshot=pending;pending=null;if(snapshot)try{await persist(snapshot,userId)}catch(e){message("Online-Speicherung fehlgeschlagen: "+e.message+". Bitte JSON-Sicherung erstellen.")}},350);
    };
    async function load(session){
      const token=++loadToken;
      if(timer!==null)clearTimeout(timer);
      timer=null;pending=null;userId=null;
      document.body.classList.add("cloud-locked");
      if(!session?.user){loggedOut();return}
      message("Deine Urlaubsdaten werden online geladen …");
      const uid=session.user.id;
      const {data:row,error}=await client.from("vacation_plans").select("data").eq("user_id",uid).maybeSingle();
      if(token!==loadToken)return;
      if(error){message("Online-Daten konnten nicht geladen werden: "+error.message);login.classList.add("hide");return}
      const plan=row?.data||window.urlaubDefaults();
      if(!plan.settings?.["2027"]||!plan.settings?.["2028"]||!Array.isArray(plan.entries)){message("Ungültige gespeicherte Urlaubsdaten.");return}
      userId=uid;
      window.urlaubSetData(plan);
      loggedIn(session.user.email||"dein Konto");
      document.body.classList.remove("cloud-locked");
    }
    loginButton.onclick=async()=>{
      const email=$("loginEmail").value.trim();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){message("Bitte eine gültige E-Mail-Adresse eingeben.");return}
      loginButton.disabled=true;message("Anmeldelink wird angefordert …");
      try{
        const redirectTo=location.origin+location.pathname;
        const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo,shouldCreateUser:true}});
        if(error)throw error;
        message("Anmeldelink angefordert. Bitte E-Mails und Spam-Ordner prüfen.");
      }catch(e){message("Anmeldung fehlgeschlagen: "+e.message)}
      finally{loginButton.disabled=false}
    };
    $("logoutButton").onclick=async()=>{
      try{await flush()}catch(e){message("Änderungen sind noch nicht online gespeichert: "+e.message);return}
      const {error}=await client.auth.signOut();
      if(error){message("Abmelden fehlgeschlagen: "+error.message);return}
      userId=null;loggedOut();
    };
    const {data:{session},error}=await client.auth.getSession();
    if(error)throw error;
    await load(session);
    client.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_IN"&&session?.user?.id!==userId)setTimeout(()=>load(session),0);
      if(event==="SIGNED_OUT"){++loadToken;userId=null;loggedOut()}
    });
    window.addEventListener("beforeunload",event=>{
      if(pending){event.preventDefault();event.returnValue=""}
    });
  }catch(e){document.body.classList.add("cloud-locked");login.classList.add("hide");message("Anmeldedienst konnte nicht gestartet werden: "+e.message)}
}
