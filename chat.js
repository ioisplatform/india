/* =========================================================
   IOIS COMMUNITY CHAT HUB
   Supabase Auth + Realtime + RLS
   ========================================================= */
(function(){
"use strict";

const client = window.ioisSupabase;
const table = "community_messages";
let currentUser = null;
let currentProfile = null;
let channel = null;
let presenceChannel = null;
let loading = false;

const $ = id => document.getElementById(id);
const input = $("messageInput");
const list = $("chatMessages");
const status = $("chatStatus");
const online = $("onlineCount");

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function timeLabel(value){
  try { return new Intl.DateTimeFormat("hi-IN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"short"}).format(new Date(value)); }
  catch { return ""; }
}

function setStatus(text, ok=false){
  status.textContent=text;
  status.className="status-pill"+(ok?" text-green-300":"");
}

function avatarHtml(row){
  if(row.sender_avatar_url){ return `<div class="avatar"><img src="${esc(row.sender_avatar_url)}" alt=""></div>`; }
  const initial=esc((row.sender_name||"M").trim().charAt(0).toUpperCase()||"M");
  return `<div class="avatar">${initial}</div>`;
}

function renderMessage(row){
  const mine = currentUser && row.user_id === currentUser.id;
  const wrap=document.createElement("div");
  wrap.className="msg"+(mine?" mine":"");
  wrap.dataset.id=row.id;
  wrap.innerHTML=`
    ${mine?"":avatarHtml(row)}
    <div class="bubble-wrap">
      <div class="sender">${esc(row.sender_name||"IOIS Member")}</div>
      <div class="bubble">${esc(row.message)}</div>
      <div class="meta">${esc(timeLabel(row.created_at))}${mine?" · You":""}</div>
    </div>
    ${mine?avatarHtml(row):""}`;
  return wrap;
}

function appendMessage(row, scroll=true){
  if(!row || !row.id) return;
  if(list.querySelector(`[data-id="${CSS.escape(row.id)}"]`)) return;
  const empty=list.querySelector(".empty-chat");
  if(empty) list.innerHTML="";
  list.appendChild(renderMessage(row));
  if(scroll) list.scrollTop=list.scrollHeight;
}

function renderMessages(rows){
  list.innerHTML="";
  if(!rows || !rows.length){
    list.innerHTML='<div class="empty-chat"><i class="fa-solid fa-comments text-4xl mb-4 text-amber-400"></i><p>अभी कोई message नहीं है। पहला message आप भेजें।</p></div>';
    return;
  }
  rows.forEach(row=>appendMessage(row,false));
  list.scrollTop=list.scrollHeight;
}

async function getSession(){
  if(!client) throw new Error("Supabase client unavailable");
  const {data,error}=await client.auth.getSession();
  if(error) throw error;
  return data.session;
}

async function loadProfile(){
  if(!currentUser) return;
  const {data}=await client.from("profiles").select("full_name,avatar_url,unique_user_id,user_id").eq("id",currentUser.id).maybeSingle();
  currentProfile=data||null;
}

async function loadMessages(){
  const {data,error}=await client.from(table).select("id,user_id,sender_name,sender_avatar_url,message,created_at").order("created_at",{ascending:false}).limit(100);
  if(error){ console.error(error); setStatus("Chat database unavailable"); list.innerHTML='<div class="empty-chat"><i class="fa-solid fa-triangle-exclamation text-3xl text-red-400 mb-3"></i><p>Chat database setup required है। Supabase में supplied SQL run करें।</p></div>'; return; }
  renderMessages((data||[]).reverse());
}

function subscribeMessages(){
  channel=client.channel("iois-community-messages")
    .on("postgres_changes",{event:"INSERT",schema:"public",table},payload=>appendMessage(payload.new,true))
    .on("postgres_changes",{event:"DELETE",schema:"public",table},payload=>{
      const el=list.querySelector(`[data-id="${CSS.escape(payload.old.id)}"]`); if(el) el.remove();
    })
    .subscribe(state=>{ if(state==="SUBSCRIBED") setStatus("Live",true); });
}

function subscribePresence(){
  presenceChannel=client.channel("iois-community-presence",{config:{presence:{key:currentUser.id}}});
  presenceChannel.on("presence",{event:"sync"},()=>{
    const state=presenceChannel.presenceState();
    const count=Object.keys(state).length;
    online.textContent=`${count} online member${count===1?"":"s"}`;
  }).subscribe(async state=>{
    if(state==="SUBSCRIBED") await presenceChannel.track({user_id:currentUser.id,at:new Date().toISOString()});
  });
}

async function sendMessage(){
  if(loading) return;
  const message=input.value.trim();
  if(!message) return;
  if(message.length>1000) return;
  loading=true;
  $("sendBtn").disabled=true;
  try{
    const {error}=await client.from(table).insert({user_id:currentUser.id,message});
    if(error) throw error;
    input.value="";
  }catch(error){
    console.error(error);
    alert(error.message||"Message send नहीं हुआ।");
  }finally{
    loading=false;
    $("sendBtn").disabled=false;
    input.focus();
  }
}

async function logout(){
  await client.auth.signOut();
  location.href="login.html";
}

async function init(){
  if(!client){ setStatus("Supabase unavailable"); return; }
  try{
    const session=await getSession();
    if(!session){ location.href="login.html?redirect=chat.html"; return; }
    currentUser=session.user;
    await loadProfile();
    await loadMessages();
    subscribeMessages();
    subscribePresence();
    setStatus("Live",true);
  }catch(error){
    console.error(error);
    setStatus("Connection error");
  }
}

$("sendBtn").addEventListener("click",sendMessage);
input.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} });
input.addEventListener("input",()=>{ if(input.value.length>950) $("typingIndicator").textContent=`${input.value.length}/1000`; else $("typingIndicator").textContent=""; });
document.querySelectorAll("[data-text]").forEach(btn=>btn.addEventListener("click",()=>{input.value+=(input.value?" ":"")+btn.dataset.text;input.focus();}));
$("logoutBtn").addEventListener("click",logout);
window.addEventListener("beforeunload",()=>{ try{ if(channel) client.removeChannel(channel); if(presenceChannel) client.removeChannel(presenceChannel); }catch(_){} });

document.addEventListener("DOMContentLoaded",init,{once:true});
})();
