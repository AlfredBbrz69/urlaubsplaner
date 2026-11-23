// Persönlicher Urlaubskalender mit E-Mail-Magic-Link und Supabase RLS.
const cfg=window.URLAUB_AUTH_CONFIG||{};
const $=id=>document.getElementById(id);
const info=$("accountInfo"),login=$("loginForm"),logout=$("logoutForm"),hint=$("accountHint"),loginButton=$("loginButton");
const passwordLoginButton = $("passwordLoginButton");
const loginPassword = $("loginPassword");
const passwordForm = $("passwordForm");
const newPassword = $("newPassword");
const passwordStatus = $("passwordStatus");
const savePasswordButton = $("savePasswordButton");
const enabled=Boolean(cfg.url&&cfg.anonKey);
const validURL=(()=>{try{return new URL(cfg.url).protocol==="https:"}catch{return false}})();
const message=text=>{info.textContent=text};
function loggedOut(){if(loginPassword)loginPassword.value="";if(passwordForm){passwordForm.reset();passwordStatus.textContent="";}document.body.classList.add("cloud-locked");login.classList.remove("hide");logout.classList.add("hide");message("Mit deiner E-Mail-Adresse anmelden, um deinen persönlichen Urlaubsplan zu öffnen.");hint.textContent="Beim ersten Mal oder bei vergessenem Passwort kannst du einen Anmeldelink anfordern."}
function loggedIn(email){login.classList.add("hide");logout.classList.remove("hide");message("Angemeldet als "+email);hint.textContent="Deine Daten werden geschützt online gespeichert und bleiben auch nach dem Löschen des Browserverlaufs erhalten."}
if(!enabled){
  login.classList.remove("hide");loginButton.disabled=true;if(passwordLoginButton)passwordLoginButton.disabled=true;
  message("Online-Anmeldung ist noch nicht eingerichtet – derzeit nur lokale Speicherung!");
  hint.textContent="Achtung: Beim Löschen von Browserdaten können Urlaubseinträge verloren gehen. Erst mit eingerichteter Cloud-Datenbank sind sie dauerhaft online gesichert.";
}else if(!validURL){
  document.body.classList.add("cloud-locked");login.classList.remove("hide");loginButton.disabled=true;if(passwordLoginButton)passwordLoginButton.disabled=true;
  message("Ungültige Cloud-Einstellungen. HTTPS-Adresse erforderlich.");
}else{
  document.body.classList.add("cloud-locked");
  message("Anmeldedienst wird geladen …");
  try{
    const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    const client=createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    let userId=null,accountId=null,pending=null,timer=null,writeQueue=Promise.resolve(),loadToken=0;
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
      accountId = session?.user?.id ?? null;
      if (!accountId) { loggedOut(); return; }
      const uid = accountId;
      loggedIn(session.user.email || "dein Konto");
      passwordForm.classList.add("hide");
      message("Dein Konto wird geprüft …");

      const { data: hasPassword, error: passwordCheckError } = await client.rpc("vacation_plan_has_password");
      if (token !== loadToken) return;
      if (passwordCheckError) {
        message("Dein Konto konnte nicht geprüft werden. Bitte lade die Seite neu.");
        return;
      }

      passwordForm.classList.remove("hide");
      $("passwordTitle").textContent = hasPassword ? "Passwort ändern" : "Passwort festlegen";
      if (!hasPassword) {
        message("E-Mail-Adresse bestätigt. Lege jetzt ein Passwort fest, um deinen Urlaubsplan zu öffnen.");
        hint.textContent = "Beim nächsten Mal kannst du dich direkt mit E-Mail-Adresse und Passwort anmelden.";
        return;
      }
      message("Deine Urlaubsdaten werden online geladen …");
      const {data:row,error}=await client.from("vacation_plans").select("data").eq("user_id",uid).maybeSingle();
      if(token!==loadToken)return;
      if(error){message("Online-Daten konnten nicht geladen werden: "+error.message+". Bitte Seite neu laden.");login.classList.remove("hide");return}
      const plan=row?.data||window.urlaubDefaults();
      if(!plan.settings?.["2027"]||!plan.settings?.["2028"]||!Array.isArray(plan.entries)){message("Ungültige gespeicherte Urlaubsdaten.");return}
      userId=uid;
      window.urlaubSetData(plan);
      loggedIn(session.user.email||"dein Konto");
      document.body.classList.remove("cloud-locked");
    }
    if (passwordLoginButton) {
      login.onsubmit = async event => {
        event.preventDefault();
        const email = $("loginEmail").value.trim();
        const password = loginPassword.value;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
          message("Bitte gib deine E-Mail-Adresse und dein Passwort ein.");
          return;
        }
        passwordLoginButton.disabled = true;
        loginButton.disabled = true;
        message("Du wirst angemeldet …");
        try {
          const { error } = await client.auth.signInWithPassword({ email, password });
          if (error) throw error;
          loginPassword.value = "";
        } catch (error) {
          message(error.code === "invalid_credentials"
            ? "E-Mail-Adresse oder Passwort stimmt nicht. Du kannst auch einen Anmeldelink anfordern."
            : "Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
        } finally {
          passwordLoginButton.disabled = false;
          loginButton.disabled = false;
        }
      };
    }
    if (passwordForm) {
      passwordForm.onsubmit = async event => {
        event.preventDefault();
        if (!accountId || newPassword.value.length < 8) return;
        const uid = accountId;
        savePasswordButton.disabled = true;
        passwordStatus.textContent = "Passwort wird gespeichert …";
        try {
          const { error } = await client.auth.updateUser({ password: newPassword.value });
          if (error) throw error;
          if (uid !== accountId) return;
          passwordForm.reset();
          if (!userId) {
            const { data: { session }, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (session?.user?.id !== uid || accountId !== uid) return;
            await load(session);
          }
          if (uid !== accountId) return;
          passwordStatus.textContent = "Passwort gespeichert. Du kannst dich künftig mit E-Mail und Passwort anmelden.";
        } catch (error) {
          passwordStatus.textContent = "Passwort konnte nicht gespeichert werden. " + error.message;
        } finally {
          savePasswordButton.disabled = false;
        }
      };
    }
    loginButton.onclick=async()=>{
      const email=$("loginEmail").value.trim();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){message("Bitte eine gültige E-Mail-Adresse eingeben.");return}
      loginButton.disabled=true;if(passwordLoginButton)passwordLoginButton.disabled=true;message("Anmeldelink wird angefordert …");
      try{
        const redirectTo=location.origin+location.pathname;
        const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo,shouldCreateUser:true}});
        if(error)throw error;
        message("Anmeldelink angefordert. Bitte E-Mails und Spam-Ordner prüfen.");
      }catch(e){message("Anmeldung fehlgeschlagen: "+e.message)}
      finally{loginButton.disabled=false;if(passwordLoginButton)passwordLoginButton.disabled=false}
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
      if(event==="SIGNED_IN"&&session?.user?.id!==accountId)setTimeout(()=>load(session),0);
      if(event==="SIGNED_OUT"){++loadToken;accountId=null;userId=null;loggedOut()}
    });
    window.addEventListener("beforeunload",event=>{
      if(pending){event.preventDefault();event.returnValue=""}
    });
  }catch(e){document.body.classList.add("cloud-locked");login.classList.remove("hide");loginButton.disabled=true;if(passwordLoginButton)passwordLoginButton.disabled=true;message("Anmeldedienst konnte nicht gestartet werden: "+e.message+". Bitte Internetverbindung prüfen und die Seite neu laden.")}
}
